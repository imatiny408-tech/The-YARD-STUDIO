"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Heart, MoreVertical, Pause, Play, Radio, Search, ThumbsUp, Users } from "lucide-react";
import Cover from "@/components/Cover";
import { usePlayer } from "@/components/app/Player";
import { CREATORS, ROOMS, TRACKS, fmtNum, type Track } from "@/lib/data";

const MOODS = ["All", "Late night", "Studio", "Drill", "R&B", "Afro", "Pop-Punk", "Club", "Lo-fi"];

function RoomCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((x) => (x + 1) % ROOMS.length), 6000);
    return () => clearInterval(id);
  }, [paused]);
  const r = ROOMS[i];
  return (
    <div
      className="relative h-[300px] overflow-hidden rounded-3xl md:h-[340px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={r.id}
          initial={{ opacity: 0, scale: 1.08, x: 60 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.98, x: -60 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
          style={{ background: `linear-gradient(120deg, hsl(${r.hue} 70% 32%) 0%, hsl(${r.hue2} 70% 22%) 60%, #0b0b0b 100%)` }}
        >
          <Cover seed={r.id + "hero"} hue={r.hue} className="absolute right-[-5%] top-[-20%] h-[140%] w-[65%] rotate-6 rounded-[40px] opacity-80 mix-blend-screen [mask-image:linear-gradient(to_right,transparent,black_45%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative flex h-full flex-col justify-between p-6 md:p-8">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-signal)] px-2.5 py-1 font-medium"><Radio size={12} /> LIVE</span>
          <span className="rounded-full bg-black/30 px-2.5 py-1 backdrop-blur">{r.tag}</span>
        </div>
        <div>
          <AnimatePresence mode="wait">
            <motion.div key={r.id} initial={{ opacity: 0, y: 20, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10, filter: "blur(8px)" }} transition={{ duration: 0.5 }}>
              <h1 className="text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-none tracking-tight">{r.title}</h1>
              <p className="mt-2 max-w-md text-sm text-white/75">{r.blurb}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/55"><Users size={12} /> {r.listeners} in the room · hosted by {r.host}</p>
            </motion.div>
          </AnimatePresence>
          <div className="mt-5 flex items-center justify-between">
            <div className="flex gap-1.5">
              {ROOMS.map((x, j) => (
                <button key={x.id} aria-label={`Show ${x.title}`} onClick={() => setI(j)} className={`h-1.5 rounded-full transition-all ${j === i ? "w-6 bg-white" : "w-1.5 bg-white/40"}`} />
              ))}
            </div>
            <Link href="/studio" className="flex items-center gap-2 text-xs font-semibold tracking-widest">
              JOIN <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white"><Play size={14} fill="currentColor" /></span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackTable() {
  const p = usePlayer();
  const [liked, setLiked] = useState<Record<string, boolean>>({ t2: true });
  const [tab, setTab] = useState("Tracks");
  return (
    <div>
      <div className="flex gap-5 border-b border-white/10 text-sm">
        {["Tracks", "Creators", "Rooms"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 pb-2 transition ${tab === t ? "border-white text-white" : "border-transparent text-white/45 hover:text-white/80"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Tracks" && (
        <div className="mt-2">
          {TRACKS.map((t, i) => {
            const current = p.track.id === t.id;
            return (
              <div key={t.id} className={`group grid grid-cols-[24px_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5 md:grid-cols-[24px_1.4fr_1fr_70px_60px] ${current ? "bg-white/[0.06]" : ""}`}>
                <button onClick={() => (current ? p.toggle() : p.play(t))} className="text-xs text-white/45" aria-label={`Play ${t.title}`}>
                  {current && p.playing ? <Pause size={14} className="text-white" fill="currentColor" /> : <span className="group-hover:hidden">{i + 1}</span>}
                  {!(current && p.playing) && <Play size={14} className="hidden text-white group-hover:block" fill="currentColor" />}
                </button>
                <div className="flex min-w-0 items-center gap-3">
                  <Cover seed={t.id} hue={t.hue} className="h-10 w-10 shrink-0 rounded-lg" />
                  <span className={`truncate text-sm ${current ? "text-[var(--color-signal)]" : ""}`}>{t.title}</span>
                </div>
                <span className="hidden truncate text-sm text-white/55 md:block">{t.artist}</span>
                <span className="hidden font-mono text-xs text-white/45 md:block">{t.length}</span>
                <div className="flex items-center gap-2 justify-self-end">
                  <button aria-label="Like" onClick={() => setLiked((l) => ({ ...l, [t.id]: !l[t.id] }))}>
                    <Heart size={15} className={liked[t.id] ? "fill-[var(--color-signal)] text-[var(--color-signal)]" : "text-white/45"} />
                  </button>
                  <MoreVertical size={15} className="text-white/35" />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab === "Creators" && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CREATORS.slice(0, 8).map((c) => (
            <Link key={c.id} href={`/u/${c.id}`} className="rounded-2xl p-2 transition hover:bg-white/5">
              <Cover seed={c.id} hue={c.hue} className="aspect-square rounded-full" />
              <div className="mt-2 truncate text-center text-sm">{c.name}</div>
              <div className="truncate text-center text-[11px] text-white/45">{c.roles[0]}</div>
            </Link>
          ))}
        </div>
      )}
      {tab === "Rooms" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ROOMS.map((r) => (
            <Link key={r.id} href="/studio" className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 hover:bg-white/[0.08]">
              <Cover seed={r.id} hue={r.hue} className="h-14 w-14 rounded-xl" />
              <div className="min-w-0">
                <div className="text-sm">{r.title}</div>
                <div className="truncate text-[11px] text-white/45">{r.host} · {r.listeners} listening</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Leaderboard() {
  const top = useMemo(() => [...TRACKS].sort((a, b) => b.likes - a.likes), []);
  const p = usePlayer();
  return (
    <div className="rounded-3xl bg-white p-4 text-black md:p-5">
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {top.slice(0, 3).map((t, i) => (
          <button key={t.id} onClick={() => p.play(t)} className="group relative rounded-2xl bg-black/[0.04] p-3 pt-6 text-left transition hover:bg-black/[0.07]">
            <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 font-[family-name:var(--font-bubble)] text-4xl text-black/10 md:text-5xl">{["1st", "2nd", "3rd"][i]}</span>
            <Cover seed={t.id} hue={t.hue} className="relative mx-auto aspect-square w-[85%] rounded-2xl shadow-[0_18px_30px_-12px_rgba(0,0,0,0.45)] transition group-hover:-translate-y-1" />
            <div className="mt-3 truncate text-sm font-medium">{t.title}</div>
            <div className="truncate text-[11px] text-black/50">{t.artist}</div>
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2 text-sm font-medium"><ThumbsUp size={15} /> Top songs by likes</div>
      <div className="mt-3 grid grid-cols-[1fr_70px_60px] text-[11px] text-black/45"><span>Track</span><span>Plays</span><span>Likes</span></div>
      {top.slice(0, 4).map((t) => (
        <div key={t.id} className="grid grid-cols-[1fr_70px_60px] items-center border-t border-black/5 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <Cover seed={t.id} hue={t.hue} className="h-8 w-8 shrink-0 rounded-lg" />
            <span className="truncate">{t.title}</span>
          </span>
          <span className="text-xs">{fmtNum(t.plays)}</span>
          <span className="text-xs">{fmtNum(t.likes)}</span>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [mood, setMood] = useState("All");
  const [q, setQ] = useState("");
  const p = usePlayer();
  const results: { href: string; label: string; sub: string; track?: Track }[] = q.trim()
    ? [
        ...CREATORS.filter((c) => (c.name + c.handle + c.roles.join()).toLowerCase().includes(q.toLowerCase())).map((c) => ({ href: `/u/${c.id}`, label: c.name, sub: c.roles.join(", ") })),
        ...TRACKS.filter((t) => (t.title + t.artist).toLowerCase().includes(q.toLowerCase())).map((t) => ({ href: "#", label: t.title, sub: t.artist, track: t })),
      ].slice(0, 6)
    : [];
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 md:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search creators, songs or rooms" className="field rounded-full pl-9" />
          {results.length > 0 && (
            <div className="glass-strong absolute inset-x-0 top-11 z-20 rounded-2xl p-2">
              {results.map((r) =>
                r.track ? (
                  <button key={r.label} onClick={() => { p.play(r.track); setQ(""); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10">
                    {r.label} <span className="text-white/40">· {r.sub}</span>
                  </button>
                ) : (
                  <Link key={r.label} href={r.href} className="block rounded-xl px-3 py-2 text-sm hover:bg-white/10">
                    {r.label} <span className="text-white/40">· {r.sub}</span>
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
        <Link href="/u/u1" className="ml-auto h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/20">
          <Cover seed="me" hue={10} className="h-full w-full" />
        </Link>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {MOODS.map((m) => (
          <button key={m} data-active={mood === m} onClick={() => setMood(m)} className="chip shrink-0">{m}</button>
        ))}
      </div>

      <RoomCarousel />

      <div className="grid gap-6 2xl:grid-cols-[1fr_380px]">
        <TrackTable />
        <Leaderboard />
      </div>
    </div>
  );
}
