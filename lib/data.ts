// Seed data for the prototype. Shapes mirror the tables in db/schema.sql so the
// UI can be pointed at the real API later without reshaping components.

export type Role =
  | "Rapper"
  | "Producer"
  | "Vocalist"
  | "Audio Engineer"
  | "Videographer"
  | "Graphic Artist"
  | "Manager";

export const ROLES: Role[] = [
  "Rapper",
  "Producer",
  "Vocalist",
  "Audio Engineer",
  "Videographer",
  "Graphic Artist",
  "Manager",
];

export const GENRES = [
  "Trap",
  "Drill",
  "R&B",
  "Alt Rap",
  "Pop-Punk",
  "Afrobeats",
  "House",
  "Lo-fi",
  "Jersey Club",
] as const;
export type Genre = (typeof GENRES)[number];

export type Credit = { title: string; isrc: string; role: string; year: number; streams: number };

export type Creator = {
  id: string;
  handle: string;
  name: string;
  roles: Role[];
  genres: Genre[];
  city: string;
  lat: number;
  lng: number;
  available: boolean;
  rateMin: number;
  rateMax: number;
  lastActiveDays: number;
  hue: number;
  bio: string;
  gear: string[];
  credits: Credit[];
};

// Home base for the signed-in demo user (Atlanta, GA).
export const ME = { id: "u_me", handle: "@yardkid", name: "Jay Rivers", lat: 33.749, lng: -84.388, city: "Atlanta, GA" };

export const CREATORS: Creator[] = [
  {
    id: "u1",
    handle: "@nightshift",
    name: "Nia Shift",
    roles: ["Producer", "Audio Engineer"],
    genres: ["Trap", "R&B"],
    city: "Atlanta, GA",
    lat: 33.77,
    lng: -84.36,
    available: true,
    rateMin: 150,
    rateMax: 600,
    lastActiveDays: 0,
    hue: 350,
    bio: "Dark 808s, glassy pads. Mixing vocals is my love language.",
    gear: ["Ableton 12", "UAD Apollo Twin", "Neumann TLM 103"],
    credits: [
      { title: "Glass House", isrc: "USQX92400112", role: "Producer", year: 2025, streams: 1_240_000 },
      { title: "Late Checkout", isrc: "USQX92400341", role: "Mix Engineer", year: 2025, streams: 380_000 },
      { title: "Vapor", isrc: "USQX92300990", role: "Producer", year: 2024, streams: 92_000 },
    ],
  },
  {
    id: "u2",
    handle: "@k.ofori",
    name: "Kwame Ofori",
    roles: ["Producer"],
    genres: ["Afrobeats", "House"],
    city: "Decatur, GA",
    lat: 33.7748,
    lng: -84.2963,
    available: true,
    rateMin: 80,
    rateMax: 300,
    lastActiveDays: 2,
    hue: 28,
    bio: "Log drums, talking drums, live percussion stems on request.",
    gear: ["FL Studio", "Akai MPC Live II"],
    credits: [{ title: "Owambe Season", isrc: "GBKPL2500021", role: "Producer", year: 2025, streams: 540_000 }],
  },
  {
    id: "u3",
    handle: "@saintvee",
    name: "Vee Saint",
    roles: ["Vocalist", "Rapper"],
    genres: ["R&B", "Alt Rap"],
    city: "Marietta, GA",
    lat: 33.9526,
    lng: -84.5499,
    available: false,
    rateMin: 200,
    rateMax: 900,
    lastActiveDays: 1,
    hue: 290,
    bio: "Toplines, hooks, harmonies stacked 12 deep.",
    gear: ["Shure SM7B", "Logic Pro"],
    credits: [
      { title: "Halo Tint", isrc: "USQX92500077", role: "Featured Artist", year: 2025, streams: 2_100_000 },
      { title: "Soft Serve", isrc: "USQX92400888", role: "Songwriter", year: 2024, streams: 610_000 },
    ],
  },
  {
    id: "u4",
    handle: "@ghostframe",
    name: "Dre Castillo",
    roles: ["Videographer"],
    genres: ["Drill", "Trap"],
    city: "Atlanta, GA",
    lat: 33.73,
    lng: -84.42,
    available: true,
    rateMin: 300,
    rateMax: 2500,
    lastActiveDays: 0,
    hue: 200,
    bio: "Music videos on anamorphic glass. Drone certified.",
    gear: ["RED Komodo 6K", "DJI Inspire 3"],
    credits: [{ title: "Glass House (Official Video)", isrc: "USQX92400112", role: "Director", year: 2025, streams: 870_000 }],
  },
  {
    id: "u5",
    handle: "@pixelpriest",
    name: "Mira Okon",
    roles: ["Graphic Artist"],
    genres: ["Alt Rap", "Lo-fi", "Pop-Punk"],
    city: "Athens, GA",
    lat: 33.9519,
    lng: -83.3576,
    available: true,
    rateMin: 100,
    rateMax: 450,
    lastActiveDays: 4,
    hue: 160,
    bio: "Cover art, visualizers, merch. 3D + collage.",
    gear: ["Blender", "Procreate"],
    credits: [{ title: "Vapor (Cover)", isrc: "USQX92300990", role: "Art Direction", year: 2024, streams: 92_000 }],
  },
  {
    id: "u6",
    handle: "@loudhands",
    name: "Tess Marlow",
    roles: ["Audio Engineer"],
    genres: ["Pop-Punk", "Alt Rap"],
    city: "Chattanooga, TN",
    lat: 35.0456,
    lng: -85.3097,
    available: true,
    rateMin: 120,
    rateMax: 500,
    lastActiveDays: 1,
    hue: 12,
    bio: "Live-room drums, parallel compression, mastering for streaming.",
    gear: ["Pro Tools", "SSL Bus+", "Neve 1073"],
    credits: [
      { title: "Bad Signal", isrc: "USQX92500203", role: "Mastering", year: 2025, streams: 420_000 },
      { title: "Porch Light", isrc: "USQX92400712", role: "Mix Engineer", year: 2024, streams: 150_000 },
    ],
  },
  {
    id: "u7",
    handle: "@ceo.lena",
    name: "Lena Brooks",
    roles: ["Manager"],
    genres: ["R&B", "Trap"],
    city: "Atlanta, GA",
    lat: 33.79,
    lng: -84.39,
    available: true,
    rateMin: 0,
    rateMax: 0,
    lastActiveDays: 0,
    hue: 45,
    bio: "Rollouts, bookings, sync. Looking for unsigned R&B.",
    gear: [],
    credits: [{ title: "Halo Tint", isrc: "USQX92500077", role: "Management", year: 2025, streams: 2_100_000 }],
  },
  {
    id: "u8",
    handle: "@clubkid",
    name: "Rico Vance",
    roles: ["Producer", "Rapper"],
    genres: ["Jersey Club", "Drill"],
    city: "Birmingham, AL",
    lat: 33.5186,
    lng: -86.8104,
    available: false,
    rateMin: 60,
    rateMax: 200,
    lastActiveDays: 9,
    hue: 250,
    bio: "Bed squeaks and kick rolls. Remixes in 48h.",
    gear: ["FL Studio"],
    credits: [],
  },
];

export type Track = { id: string; title: string; artist: string; plays: number; likes: number; length: string; hue: number };

export const TRACKS: Track[] = [
  { id: "t1", title: "Glass House", artist: "Nia Shift", plays: 1_240_000, likes: 81_000, length: "3:12", hue: 350 },
  { id: "t2", title: "Halo Tint", artist: "Vee Saint", plays: 2_100_000, likes: 154_000, length: "2:48", hue: 290 },
  { id: "t3", title: "Owambe Season", artist: "Kwame Ofori", plays: 540_000, likes: 40_200, length: "3:40", hue: 28 },
  { id: "t4", title: "Bad Signal", artist: "Tess Marlow", plays: 420_000, likes: 31_000, length: "2:59", hue: 12 },
  { id: "t5", title: "Late Checkout", artist: "Nia Shift", plays: 380_000, likes: 22_800, length: "3:05", hue: 200 },
  { id: "t6", title: "Soft Serve", artist: "Vee Saint", plays: 610_000, likes: 47_000, length: "2:31", hue: 160 },
  { id: "t7", title: "Porch Light", artist: "Tess Marlow", plays: 150_000, likes: 9_400, length: "4:02", hue: 45 },
];

export type Room = { id: string; title: string; host: string; blurb: string; listeners: number; hue: number; hue2: number; tag: string };

export const ROOMS: Room[] = [
  { id: "r1", title: "Night Session", host: "Nia Shift", blurb: "Vocal comp for Glass House (Remix) — lossless from Ableton", listeners: 38, hue: 340, hue2: 260, tag: "Live · 24-bit" },
  { id: "r2", title: "Drum Room", host: "Tess Marlow", blurb: "Parallel comp masterclass on live-room drums", listeners: 112, hue: 18, hue2: 350, tag: "Live · Mix" },
  { id: "r3", title: "Afro Lab", host: "Kwame Ofori", blurb: "Building a log-drum pocket from scratch", listeners: 64, hue: 32, hue2: 140, tag: "Live · Beat" },
  { id: "r4", title: "Hook Factory", host: "Vee Saint", blurb: "Open topline session — bring a beat", listeners: 91, hue: 280, hue2: 210, tag: "Open mic" },
];

export type BountyStatus = "open" | "in_review" | "revision" | "approved" | "disputed";

export type Submission = { id: string; by: string; note: string; at: string; status: "pending" | "approved" | "rejected" | "revision" };

export type Bounty = {
  id: string;
  title: string;
  type: string;
  payout: number;
  deadline: string;
  poster: string;
  city: string;
  escrow: "unfunded" | "held" | "released" | "frozen";
  status: BountyStatus;
  revisionCap: number;
  revisions: number;
  tags: string[];
  submissions: Submission[];
};

export const BOUNTIES: Bounty[] = [
  {
    id: "b1",
    title: "Cover art for 5-track EP",
    type: "Design EP Cover",
    payout: 150,
    deadline: "2026-10-12",
    poster: "Jay Rivers",
    city: "Atlanta, GA",
    escrow: "held",
    status: "in_review",
    revisionCap: 2,
    revisions: 0,
    tags: ["Graphic Artist", "Alt Rap"],
    submissions: [
      { id: "s1", by: "Mira Okon", note: "Chrome collage direction, 3 variants", at: "2h ago", status: "pending" },
      { id: "s2", by: "Dre Castillo", note: "Photo-based concept w/ film grain", at: "5h ago", status: "pending" },
    ],
  },
  {
    id: "b2",
    title: "Mix 3 songs — R&B, vocal heavy",
    type: "Mix 3 Songs",
    payout: 600,
    deadline: "2026-10-20",
    poster: "Lena Brooks",
    city: "Atlanta, GA",
    escrow: "held",
    status: "open",
    revisionCap: 3,
    revisions: 0,
    tags: ["Audio Engineer", "R&B"],
    submissions: [],
  },
  {
    id: "b3",
    title: "Opener for Masquerade slot (Oct 30)",
    type: "Live Performance",
    payout: 250,
    deadline: "2026-10-05",
    poster: "Lena Brooks",
    city: "Atlanta, GA",
    escrow: "unfunded",
    status: "open",
    revisionCap: 0,
    revisions: 0,
    tags: ["Rapper", "Vocalist"],
    submissions: [],
  },
  {
    id: "b4",
    title: "30s visualizer loop",
    type: "Video",
    payout: 300,
    deadline: "2026-10-09",
    poster: "Nia Shift",
    city: "Remote",
    escrow: "held",
    status: "revision",
    revisionCap: 2,
    revisions: 2,
    tags: ["Videographer", "Graphic Artist"],
    submissions: [{ id: "s3", by: "Mira Okon", note: "v3 — slower camera move", at: "1d ago", status: "revision" }],
  },
];

export type SquadRole = "Owner" | "Executive Producer" | "Contributor";

export const SQUAD = {
  id: "sq1",
  name: "East Yard Camp",
  members: [
    { id: "u_me", name: "Jay Rivers", role: "Owner" as SquadRole, hue: 10 },
    { id: "u1", name: "Nia Shift", role: "Executive Producer" as SquadRole, hue: 350 },
    { id: "u3", name: "Vee Saint", role: "Contributor" as SquadRole, hue: 290 },
    { id: "u5", name: "Mira Okon", role: "Contributor" as SquadRole, hue: 160 },
  ],
};

export type VaultKind = "V1" | "V2" | "Final Master" | "Instrumental" | "Stems" | "Artwork";
export type VaultFile = { id: string; song: string; kind: VaultKind; name: string; size: string; by: string; at: string; checksum: string; locked: boolean };

export const VAULT: VaultFile[] = [
  { id: "f1", song: "Glass House (Remix)", kind: "V1", name: "glass_house_rmx_v1.wav", size: "48.2 MB", by: "Nia Shift", at: "Sep 14", checksum: "9f2c1e7a", locked: false },
  { id: "f2", song: "Glass House (Remix)", kind: "V2", name: "glass_house_rmx_v2.wav", size: "49.0 MB", by: "Nia Shift", at: "Sep 21", checksum: "c04d8b13", locked: false },
  { id: "f3", song: "Glass House (Remix)", kind: "Stems", name: "glass_house_rmx_stems.zip", size: "412 MB", by: "Nia Shift", at: "Sep 22", checksum: "71ab09fe", locked: true },
  { id: "f4", song: "Glass House (Remix)", kind: "Final Master", name: "glass_house_rmx_master.wav", size: "51.7 MB", by: "Tess Marlow", at: "Sep 26", checksum: "e3f5aa20", locked: true },
  { id: "f5", song: "Halo Tint", kind: "Instrumental", name: "halo_tint_inst.wav", size: "44.9 MB", by: "Nia Shift", at: "Aug 30", checksum: "5d6e0c91", locked: false },
  { id: "f6", song: "Halo Tint", kind: "Artwork", name: "halo_tint_cover_3000.png", size: "8.1 MB", by: "Mira Okon", at: "Sep 02", checksum: "a8b7c6d5", locked: false },
];

export const fmtNum = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`;
