# The Yard

An all-in-one home for underground artists, producers, engineers, visual creatives and managers. Find collaborators nearby, run lossless studio sessions, lock splits and get paid through escrow.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build + type check
```

## What's in here

### Landing (`/`)
A scroll-driven, cinematic front page modeled on the car-rental and "cordex" references:
- **Hero stage**: a mic stand rendered in real 3D with Three.js and physically based materials (procedural braid, wire-mesh and switch textures, studio reflections). The pole is a braided sleeve with a cordex-style cutaway to an inner braid and a glossy core. A handheld mic sits in a clip at the top, angled up, with its cable hanging down. The stand turns as you scroll and leans toward the cursor, and a tap shakes the rig and sends sound rings out of the grille. **Full mode / Explore** in the nav switches it to copper and gold, with hotspots and spec cards.
- **Statement**: copy revealed word by word as you scroll, with a creator strip that moves sideways as you scroll down.
- **Toolkit carousel**: the "fleet" section. Swipe, drag or use the arrow keys, open the specs, then jump into the tool.
- **Play**: eight live pads (keys `A`–`K`) with a spectrum readout.

### App (`/home`, `/discover`, `/studio`, `/bounties`, `/squad`, `/splits`, `/u/[id]`)
A dark glass shell modeled on the music-app references: sidebar and library, a "near you" panel, and a persistent player bar.

| Area | Works today |
| --- | --- |
| **Home** | Auto-advancing live-room carousel, track list that plays through the global player, podium plus top songs by likes, search |
| **Discover** | Role, genre, radius, budget and availability filters. Haversine distance, ranking on distance, skill overlap, recency and Proof-of-Work. Radar map |
| **Studio → DAW-Sync Room** | Host-locked play, pause and scrub synced across every open tab (open two tabs to try it). Time-stamped markers with text or recorded voice notes. Spectrum and oscilloscope. **Connect DAW** captures an audio interface at 48 kHz with all browser processing off. Load your own WAV/FLAC |
| **Studio → Stem Mixer** | 8 stems in Web Audio: volume, pan, mute, solo, peak meters. Tempo change without pitch shift and ±12 semitone key change. Exports 24-bit WAV stems, the mix, and the split config |
| **Studio → Beat Pad** | 16 pads on QWERTY (`1234 / QWER / ASDF / ZXCV`) or WebMIDI (notes 36–51). Pitch, attack, decay and reverb knobs per pad. Drop any audio file to auto-chop it on detected transients |
| **Bounties** | Post a job, deposit to escrow, review watermarked submissions, approve to release funds, request revisions. Exceeding the revision cap or missing the deadline freezes the funds for dispute (`lib/escrow.ts`) |
| **Squad** | Camp Vault with versioned files and SHA-256 checksums computed in the browser, plus a **verify** button for local copies. Owner / EP / Contributor permission matrix, with "Viewing as" to preview each role |
| **Splits** | PRO / IPI fields, a 100% total check, even-split helper, e-signature by typed name, and a download gate that unlocks at 100% signed. Export the sheet |
| **Profiles** | EPK with verified credits (ISRC), Proof-of-Work score, gear, and tracks you can play |

All audio is **synthesized in the browser**, so the prototype ships without audio files, samples or artwork. Cover art is generated procedurally (`components/Cover.tsx`).

### Brand
Marks from the brand sheet, redrawn as SVG in `components/Logo.tsx`:
- **Liquid Y**: app mark and favicon, in an acid-lime-to-mint gradient
- **Bubble wordmark**: set in Bagel Fat One
- **Community shape**: squads and the loading indicator
- **Vinyl blob**: studio

Accent colors are bubble pink `#ff4d9d`, lime `#d7f542` and lilac `#b69cff`.

## Backend plan

`db/schema.sql` is the PostgreSQL + PostGIS schema for everything above. It covers users and roles, verified credits, squads and vault, rooms and markers, bounties, submissions, escrow and its event log, and split sheets. A trigger unlocks vault files once every party has signed.

Still to build (the UI and state machines are ready for it):
- **API**: Node/Express, or Next route handlers, over this schema
- **Realtime**: swap the room's `BroadcastChannel` for a Socket.io room using the same message shapes (`transport`, `markers`, `hello/here`, `host`)
- **Lossless streaming**: WebRTC peer connections carrying the captured interface stream (L24/PCM), plus a TURN server
- **Storage**: S3 or Supabase for WAV and stems, with server-side watermarked previews
- **Payments**: Stripe Connect, using a PaymentIntent into the platform balance on deposit and a Transfer on approval. `lib/escrow.ts` already defines the transitions
- **Credits**: an ISRC lookup job that fills `releases` and recomputes `pow_score`
- **Time-stretch on uploaded audio**: a phase-vocoder AudioWorklet. The generated stems currently re-render at the new tempo instead
