"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, MapPin } from "lucide-react";
import Cover from "@/components/Cover";
import { CREATORS, GENRES, ME, ROLES, type Genre, type Role } from "@/lib/data";
import { rankMatches } from "@/lib/match";

const RADII = [10, 25, 50, 150, Infinity];

function Radar({ matches, radius, hover, setHover }: { matches: ReturnType<typeof rankMatches>; radius: number; hover: string | null; setHover: (id: string | null) => void }) {
  const scale = Number.isFinite(radius) ? radius : 200;
  // Equirectangular projection around the viewer, in miles.
  const pt = (lat: number, lng: number) => {
    const dy = (lat - ME.lat) * 69;
    const dx = (lng - ME.lng) * 69 * Math.cos((ME.lat * Math.PI) / 180);
    const f = 46 / scale;
    return { x: 50 + Math.max(-48, Math.min(48, dx * f)), y: 50 - Math.max(-48, Math.min(48, dy * f)) };
  };
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-black/30">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {[1, 0.66, 0.33].map((r) => (
          <circle key={r} cx="50" cy="50" r={46 * r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
        ))}
        <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
        <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
        <g className="origin-center animate-[spin_6s_linear_infinite]" style={{ transformBox: "view-box" }}>
          <path d="M50 50 L50 4 A46 46 0 0 1 82.5 17.5 Z" fill="url(#sweep)" />
        </g>
        <defs>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff4d9d" stopOpacity="0" />
            <stop offset="1" stopColor="#ff4d9d" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="1.6" fill="#fff" />
        {matches.map((m) => {
          const p = pt(m.creator.lat, m.creator.lng);
          const on = hover === m.creator.id;
          return (
            <g key={m.creator.id} onMouseEnter={() => setHover(m.creator.id)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
              <circle cx={p.x} cy={p.y} r={on ? 3.2 : 2.2} fill={`hsl(${m.creator.hue} 80% 60%)`} stroke="#fff" strokeWidth={on ? 0.6 : 0.3} className="transition-all" />
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-3 left-3 text-[10px] text-white/45">{Number.isFinite(radius) ? `${radius} mi` : "Global"} · {ME.city}</div>
    </div>
  );
}

export default function DiscoverPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [radius, setRadius] = useState(50);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [budget, setBudget] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [invited, setInvited] = useState<Record<string, boolean>>({});

  const matches = useMemo(
    () => rankMatches(CREATORS, { roles, genres, radius, availableOnly, budget, lat: ME.lat, lng: ME.lng }),
    [roles, genres, radius, availableOnly, budget],
  );

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
        <p className="text-xs text-white/50">Ranked by distance, skill overlap, recent activity and verified credits.</p>
      </div>

      <div className="space-y-3 rounded-3xl bg-white/[0.04] p-4">
        <div className="flex flex-wrap gap-1.5">
          <span className="w-16 pt-1 text-[11px] text-white/45">Role</span>
          {ROLES.map((r) => (
            <button key={r} data-active={roles.includes(r)} onClick={() => setRoles((x) => toggle(x, r))} className="chip">{r}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="w-16 pt-1 text-[11px] text-white/45">Genre</span>
          {GENRES.map((g) => (
            <button key={g} data-active={genres.includes(g)} onClick={() => setGenres((x) => toggle(x, g))} className="chip">{g}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-1.5">
            <span className="w-16 text-[11px] text-white/45">Radius</span>
            {RADII.map((r) => (
              <button key={r} data-active={radius === r} onClick={() => setRadius(r)} className="chip">{Number.isFinite(r) ? `${r} mi` : "Global"}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[11px] text-white/45">
            Budget up to
            <input type="range" className="fader w-28" min={0} max={1000} step={25} value={budget} onChange={(e) => setBudget(+e.target.value)} />
            <span className="w-10 font-mono text-white">{budget ? `$${budget}` : "Any"}</span>
          </label>
          <button data-active={availableOnly} onClick={() => setAvailableOnly((v) => !v)} className="chip">Available now</button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-2">
          <div className="text-xs text-white/45">{matches.length} match{matches.length === 1 ? "" : "es"}</div>
          <AnimatePresence initial={false}>
            {matches.map((m, i) => (
              <motion.div
                key={m.creator.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25, delay: i * 0.02 }}
                onMouseEnter={() => setHover(m.creator.id)}
                onMouseLeave={() => setHover(null)}
                className={`flex flex-wrap items-center gap-4 rounded-2xl p-3 transition ${hover === m.creator.id ? "bg-white/[0.09]" : "bg-white/[0.04]"}`}
              >
                <Cover seed={m.creator.id} hue={m.creator.hue} className="h-14 w-14 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${m.creator.id}`} className="flex items-center gap-1.5 text-sm font-medium hover:underline">
                    {m.creator.name} {m.creator.credits.length > 0 && <BadgeCheck size={14} className="text-[var(--color-lilac)]" />}
                  </Link>
                  <div className="text-[11px] text-white/50">{m.creator.roles.join(" · ")} — {m.creator.genres.join(", ")}</div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-white/45">
                    <span className="flex items-center gap-1"><MapPin size={10} />{m.distance < 1 ? "<1" : m.distance.toFixed(0)} mi · {m.creator.city}</span>
                    <span className={m.creator.available ? "text-[var(--color-lime)]" : ""}>{m.creator.available ? "Available" : "Booked"}</span>
                    {m.creator.rateMax > 0 && <span>${m.creator.rateMin}–{m.creator.rateMax}</span>}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">{m.score}</div>
                  <div className="text-[10px] text-white/40">match</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-[var(--color-lilac)]">{m.pow}</div>
                  <div className="text-[10px] text-white/40">PoW</div>
                </div>
                <button onClick={() => setInvited((x) => ({ ...x, [m.creator.id]: true }))} disabled={invited[m.creator.id]} className={`btn text-xs ${invited[m.creator.id] ? "btn-ghost" : "btn-light"}`}>
                  {invited[m.creator.id] ? "Invited ✓" : "Invite"}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {!matches.length && <div className="rounded-2xl bg-white/[0.04] p-8 text-center text-sm text-white/50">Nobody matches yet. Widen the radius or drop a filter.</div>}
        </div>
        <div className="space-y-3">
          <Radar matches={matches} radius={radius} hover={hover} setHover={setHover} />
          <Link href="/bounties" className="block rounded-2xl bg-white/[0.04] p-4 text-sm hover:bg-white/[0.08]">
            Can&apos;t find them? <span className="text-[var(--color-signal)]">Post a bounty →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
