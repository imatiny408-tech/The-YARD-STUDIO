-- The Yard: PostgreSQL schema
-- Covers identity, matchmaking, squads + vault, rooms, bounties + escrow and split sheets.
-- Requires PostGIS for radius search (ST_DWithin on geography).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------------
-- Identity & profiles
-- ---------------------------------------------------------------------------
CREATE TYPE creator_role AS ENUM (
  'rapper', 'producer', 'vocalist', 'audio_engineer', 'videographer', 'graphic_artist', 'manager'
);

CREATE TABLE users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle           citext UNIQUE NOT NULL,
  display_name     text NOT NULL,
  legal_name       text,
  email            citext UNIQUE NOT NULL,
  bio              text,
  city             text,
  location         geography(Point, 4326),          -- lat/lng for radius filtering
  available        boolean NOT NULL DEFAULT true,
  rate_min_cents   integer,
  rate_max_cents   integer,
  pro              text CHECK (pro IN ('ASCAP', 'BMI', 'SESAC', 'NONE')),
  pro_ipi          text,
  stripe_account   text,                             -- Stripe Connect Express account id
  pow_score        smallint NOT NULL DEFAULT 0,      -- cached Proof-of-Work score (0-100)
  last_active_at   timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX users_location_gix ON users USING gist (location);

CREATE TABLE user_roles (
  user_id uuid REFERENCES users ON DELETE CASCADE,
  role    creator_role NOT NULL,
  PRIMARY KEY (user_id, role)
);

CREATE TABLE user_genres (
  user_id uuid REFERENCES users ON DELETE CASCADE,
  genre   text NOT NULL,
  PRIMARY KEY (user_id, genre)
);

CREATE TABLE user_gear (
  id      bigserial PRIMARY KEY,
  user_id uuid REFERENCES users ON DELETE CASCADE,
  item    text NOT NULL
);

-- Verified credits: releases matched by ISRC / streaming metadata.
CREATE TABLE releases (
  isrc          char(12) PRIMARY KEY,
  title         text NOT NULL,
  released_on   date,
  stream_count  bigint NOT NULL DEFAULT 0,
  source        text NOT NULL,                       -- 'spotify', 'apple', 'distributor', ...
  synced_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE credits (
  user_id   uuid REFERENCES users ON DELETE CASCADE,
  isrc      char(12) REFERENCES releases ON DELETE CASCADE,
  role      text NOT NULL,                           -- 'Producer', 'Mix Engineer', ...
  verified  boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, isrc, role)
);

-- ---------------------------------------------------------------------------
-- Squads / camps
-- ---------------------------------------------------------------------------
CREATE TYPE squad_role AS ENUM ('owner', 'executive_producer', 'contributor');

CREATE TABLE squads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  payout_account  text,                              -- Stripe account for squad earnings
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE squad_members (
  squad_id  uuid REFERENCES squads ON DELETE CASCADE,
  user_id   uuid REFERENCES users ON DELETE CASCADE,
  role      squad_role NOT NULL DEFAULT 'contributor',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (squad_id, user_id)
);
-- Exactly one owner per squad.
CREATE UNIQUE INDEX squad_one_owner ON squad_members (squad_id) WHERE role = 'owner';

CREATE TABLE songs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id   uuid REFERENCES squads ON DELETE SET NULL,
  title      text NOT NULL,
  isrc       char(12) REFERENCES releases,
  created_by uuid REFERENCES users,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE vault_kind AS ENUM ('v1', 'v2', 'final_master', 'instrumental', 'stems', 'artwork', 'other');

CREATE TABLE vault_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id      uuid NOT NULL REFERENCES squads ON DELETE CASCADE,
  song_id       uuid REFERENCES songs ON DELETE CASCADE,
  kind          vault_kind NOT NULL,
  version       integer NOT NULL DEFAULT 1,
  file_name     text NOT NULL,
  storage_key   text NOT NULL,                       -- S3 / Supabase object key
  preview_key   text,                                -- watermarked low-res preview
  bytes         bigint NOT NULL,
  sha256        char(64) NOT NULL,                   -- verified server-side after upload
  sample_rate   integer,
  bit_depth     smallint,
  uploaded_by   uuid REFERENCES users,
  locked        boolean NOT NULL DEFAULT false,      -- gated behind split signatures
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (song_id, kind, version)
);

-- ---------------------------------------------------------------------------
-- Rooms (DAW-Sync) & time-stamped feedback
-- ---------------------------------------------------------------------------
CREATE TABLE rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  host_id     uuid NOT NULL REFERENCES users,
  squad_id    uuid REFERENCES squads,
  file_id     uuid REFERENCES vault_files,
  is_live     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE room_markers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid NOT NULL REFERENCES rooms ON DELETE CASCADE,
  file_id     uuid REFERENCES vault_files,
  author_id   uuid NOT NULL REFERENCES users,
  at_ms       integer NOT NULL CHECK (at_ms >= 0),
  freq_hz     integer,                               -- optional frequency the note targets
  body        text,
  voice_key   text,                                  -- recorded voice note in object storage
  resolved    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX room_markers_room_idx ON room_markers (room_id, at_ms);

-- ---------------------------------------------------------------------------
-- Bounties, submissions & escrow
-- ---------------------------------------------------------------------------
CREATE TYPE bounty_status AS ENUM ('open', 'in_review', 'revision', 'approved', 'disputed', 'cancelled');
CREATE TYPE escrow_status AS ENUM ('unfunded', 'held', 'released', 'frozen', 'refunded');

CREATE TABLE bounties (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id       uuid NOT NULL REFERENCES users,
  title           text NOT NULL,
  job_type        text NOT NULL,
  description     text,
  payout_cents    integer NOT NULL CHECK (payout_cents > 0),
  deadline        date NOT NULL,
  revision_cap    smallint NOT NULL DEFAULT 2,
  revisions_used  smallint NOT NULL DEFAULT 0,
  location        geography(Point, 4326),
  status          bounty_status NOT NULL DEFAULT 'open',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bounty_tags (
  bounty_id uuid REFERENCES bounties ON DELETE CASCADE,
  tag       text NOT NULL,
  PRIMARY KEY (bounty_id, tag)
);

CREATE TABLE bounty_reference_files (
  bounty_id uuid REFERENCES bounties ON DELETE CASCADE,
  file_id   uuid REFERENCES vault_files ON DELETE CASCADE,
  PRIMARY KEY (bounty_id, file_id)
);

CREATE TABLE submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id    uuid NOT NULL REFERENCES bounties ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES users,
  note         text,
  preview_key  text NOT NULL,                        -- watermarked preview only
  full_key     text,                                 -- released to hirer after approval
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE escrows (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id            uuid UNIQUE NOT NULL REFERENCES bounties ON DELETE CASCADE,
  amount_cents         integer NOT NULL,
  platform_fee_cents   integer NOT NULL,
  status               escrow_status NOT NULL DEFAULT 'unfunded',
  payment_intent_id    text,                         -- Stripe PaymentIntent (funds in platform balance)
  transfer_id          text,                         -- Stripe Transfer to contractor on release
  released_to          uuid REFERENCES users,
  frozen_reason        text,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE escrow_events (
  id          bigserial PRIMARY KEY,
  escrow_id   uuid NOT NULL REFERENCES escrows ON DELETE CASCADE,
  from_status escrow_status,
  to_status   escrow_status NOT NULL,
  actor_id    uuid REFERENCES users,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Split sheets & e-signatures
-- ---------------------------------------------------------------------------
CREATE TABLE split_sheets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id     uuid NOT NULL REFERENCES songs ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES users,
  sent_at     timestamptz,
  executed_at timestamptz,                           -- set when 100% of signatures collected
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE split_parties (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id      uuid NOT NULL REFERENCES split_sheets ON DELETE CASCADE,
  user_id       uuid REFERENCES users,               -- null for off-platform collaborators
  legal_name    text NOT NULL,
  email         citext NOT NULL,
  role          text NOT NULL,
  pro           text CHECK (pro IN ('ASCAP', 'BMI', 'SESAC', 'NONE')),
  pro_ipi       text,
  share_bp      integer NOT NULL CHECK (share_bp > 0 AND share_bp <= 10000), -- basis points
  signed_at     timestamptz,
  signature     text,
  signer_ip     inet
);

-- Shares must total exactly 100% (10000 bp) before a sheet can be sent.
CREATE FUNCTION split_total_ok(sheet uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(share_bp), 0) = 10000 FROM split_parties WHERE sheet_id = sheet
$$;

-- Unlock gated files once every party has signed.
CREATE FUNCTION unlock_on_full_signature() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM split_parties WHERE sheet_id = NEW.sheet_id AND signed_at IS NULL) THEN
    UPDATE split_sheets SET executed_at = now() WHERE id = NEW.sheet_id AND executed_at IS NULL;
    UPDATE vault_files vf SET locked = false
      FROM split_sheets s WHERE s.id = NEW.sheet_id AND vf.song_id = s.song_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER split_signed AFTER UPDATE OF signed_at ON split_parties
  FOR EACH ROW WHEN (NEW.signed_at IS NOT NULL) EXECUTE FUNCTION unlock_on_full_signature();

-- ---------------------------------------------------------------------------
-- Example: radius + skill search (mirrors lib/match.ts ranking)
-- ---------------------------------------------------------------------------
-- SELECT u.*, ST_Distance(u.location, $origin) / 1609.34 AS miles
-- FROM users u
-- JOIN user_roles r ON r.user_id = u.id AND r.role = ANY($roles)
-- WHERE ST_DWithin(u.location, $origin, $radius_miles * 1609.34)
--   AND ($available_only IS FALSE OR u.available)
--   AND ($budget_cents IS NULL OR u.rate_min_cents <= $budget_cents)
-- ORDER BY miles;
