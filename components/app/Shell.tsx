"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Briefcase, FileSignature, Heart, Home, Maximize2, Pause, Play, Plus, Search, SkipBack, SkipForward, Users, Volume2, X, AudioLines } from "lucide-react";
import Cover from "@/components/Cover";
import { CommunityMark, LiquidY, VinylBlob, Wordmark } from "@/components/Logo";
import { CREATORS } from "@/lib/data";
import { PlayerProvider, fmtTime, usePlayer } from "./Player";

const NAV = [
  { href: "/home", label: "Home", Icon: Home },
  { href: "/discover", label: "Discover", Icon: Search },
  { href: "/studio", label: "Studio", Icon: AudioLines },
  { href: "/bounties", label: "Bounties", Icon: Briefcase },
  { href: "/squad", label: "Squad", Icon: Users },
  { href: "/splits", label: "Splits", Icon: FileSignature },
];

function Sidebar() {
  const path = usePathname();
  const [tab, setTab] = useState("Rooms");
  const library = {
    Rooms: [
      { t: "Night Session", s: "Room · Nia Shift", hue: 340 },
      { t: "Hook Factory", s: "Room · Vee Saint", hue: 280 },
    ],
    Stems: [
      { t: "Glass House (Remix)", s: "8 stems · V2", hue: 350 },
      { t: "Halo Tint", s: "Instrumental", hue: 290 },
    ],
    Drafts: [
      { t: "Untitled 07", s: "Beat Pad · 92 BPM", hue: 60 },
      { t: "Porch Light vox", s: "Voice memo", hue: 45 },
    ],
  } as const;
  return (
    <aside className="hidden w-[250px] shrink-0 flex-col gap-3 lg:flex">
      <div className="glass rounded-3xl p-3">
        <Link href="/" className="mb-3 flex items-center gap-2 px-2 pt-1">
          <LiquidY className="h-7 w-7" />
          <Wordmark className="text-lg" sparkle={false} />
        </Link>
        {NAV.map(({ href, label, Icon }) => {
          const on = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${on ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
              {on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--color-signal)]" />}
            </Link>
          );
        })}
      </div>
      <div className="glass flex min-h-0 flex-1 flex-col rounded-3xl p-4">
        <div className="flex items-center justify-between text-sm text-white/80">
          <span className="flex items-center gap-2"><VinylBlob className="h-5 w-5 text-white/80 [--hole:#2a2522]" /> Your Library</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {Object.keys(library).map((k) => (
            <button key={k} data-active={tab === k} onClick={() => setTab(k)} className="chip">{k}</button>
          ))}
        </div>
        <div className="thin-scroll mt-3 flex-1 space-y-1 overflow-y-auto">
          {library[tab as keyof typeof library].map((it) => (
            <div key={it.t} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-white/5">
              <Cover seed={it.t} hue={it.hue} className="h-11 w-11 shrink-0 rounded-lg" />
              <div className="min-w-0">
                <div className="truncate text-sm">{it.t}</div>
                <div className="truncate text-[11px] text-white/45">{it.s}</div>
              </div>
            </div>
          ))}
        </div>
        <Link href="/studio" className="btn btn-ghost mt-3 w-full"><Plus size={15} /> New room</Link>
      </div>
    </aside>
  );
}

function RightPanel() {
  const [liked, setLiked] = useState<Record<string, boolean>>({ u1: true, u3: true });
  const [promo, setPromo] = useState(true);
  return (
    <aside className="hidden w-[270px] shrink-0 flex-col gap-3 xl:flex">
      <div className="glass flex min-h-0 flex-1 flex-col rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Near you now</span>
          <Link href="/discover" className="text-[11px] text-white/50 hover:text-white">See all</Link>
        </div>
        <div className="thin-scroll mt-3 flex-1 space-y-1 overflow-y-auto">
          {CREATORS.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-white/5">
              <Link href={`/u/${c.id}`} className="relative shrink-0">
                <Cover seed={c.id} hue={c.hue} className="h-10 w-10 rounded-lg" />
                {c.lastActiveDays === 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--color-lime)] ring-2 ring-[#241f1c]" />}
              </Link>
              <Link href={`/u/${c.id}`} className="min-w-0 flex-1">
                <div className="truncate text-sm">{c.name}</div>
                <div className="truncate text-[11px] text-white/45">{c.roles.join(", ")}</div>
              </Link>
              <button aria-label="Follow" onClick={() => setLiked((l) => ({ ...l, [c.id]: !l[c.id] }))} className="p-1">
                <Heart size={15} className={liked[c.id] ? "fill-white text-white" : "text-white/50"} />
              </button>
            </div>
          ))}
        </div>
      </div>
      {promo && (
        <div className="relative rounded-3xl bg-[var(--color-signal)] p-4 text-white shadow-[0_20px_50px_-20px_rgba(255,77,157,0.7)]">
          <button onClick={() => setPromo(false)} aria-label="Dismiss" className="absolute right-3 top-3 rounded-full bg-white/20 p-0.5"><X size={12} /></button>
          <div className="flex items-center gap-2 text-sm font-semibold"><CommunityMark className="h-5 w-5" /> Start a Camp</div>
          <p className="mt-1 text-xs text-white/85">Shared vault, split sheets and escrow for your whole squad.</p>
          <Link href="/squad" className="mt-3 block rounded-full bg-white py-2 text-center text-sm font-semibold text-black">Go Pro</Link>
        </div>
      )}
    </aside>
  );
}

function PlayerBar() {
  const p = usePlayer();
  const pct = p.duration ? (p.position / p.duration) * 100 : 0;
  return (
    <div className="glass-strong flex items-center gap-4 rounded-3xl px-4 py-3 md:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:w-56 md:flex-none">
        <Cover seed={p.track.id} hue={p.track.hue} className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <div className="truncate text-sm">{p.track.title}</div>
          <div className="truncate text-[11px] text-white/50">{p.track.artist}</div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 md:flex-1">
        <div className="flex items-center gap-5">
          <button onClick={() => p.next(-1)} aria-label="Previous" className="hidden text-white/80 hover:text-white sm:block"><SkipBack size={18} fill="currentColor" /></button>
          <button onClick={p.toggle} aria-label={p.playing ? "Pause" : "Play"} className="grid h-9 w-9 place-items-center rounded-full bg-white text-black">
            {p.loading ? <CommunityMark className="h-4 w-4" spin /> : p.playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
          <button onClick={() => p.next(1)} aria-label="Next" className="hidden text-white/80 hover:text-white sm:block"><SkipForward size={18} fill="currentColor" /></button>
        </div>
        <div className="hidden w-full max-w-md items-center gap-2 font-mono text-[10px] text-white/45 md:flex">
          <span>{fmtTime(p.position)}</span>
          <div
            className="relative h-1 flex-1 cursor-pointer rounded-full bg-white/15"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              p.seek(((e.clientX - r.left) / r.width) * p.duration);
            }}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${pct}%` }} />
          </div>
          <span>-{fmtTime(Math.max(0, p.duration - p.position))}</span>
        </div>
      </div>
      <div className="hidden w-40 items-center gap-2 md:flex">
        <Volume2 size={16} className="text-white/60" />
        <input type="range" min={0} max={1} step={0.01} value={p.volume} onChange={(e) => p.setVolume(+e.target.value)} className="fader" aria-label="Volume" />
        <Maximize2 size={14} className="text-white/40" />
      </div>
    </div>
  );
}

function MobileNav() {
  const path = usePathname();
  return (
    <nav className="glass-strong fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-2xl py-2 lg:hidden">
      {NAV.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 px-2 text-[10px] ${path.startsWith(href) ? "text-white" : "text-white/45"}`}>
          <Icon size={18} strokeWidth={1.8} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Backdrop() {
  const { track } = usePlayer();
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#1b1714]">
      <div
        className="absolute -left-[10%] top-[-20%] h-[70vh] w-[70vw] rounded-full opacity-60 blur-[120px] transition-colors duration-[1500ms]"
        style={{ background: `hsl(${track.hue} 45% 32%)` }}
      />
      <div className="absolute bottom-[-25%] right-[-10%] h-[70vh] w-[60vw] rounded-full bg-[#5a4636] opacity-50 blur-[140px]" />
      <div className="absolute bottom-0 left-1/4 h-[40vh] w-[50vw] rounded-full bg-[#2e2620] opacity-80 blur-[100px]" />
      <div className="absolute inset-0 bg-[radial-gradient(transparent_0%,rgba(0,0,0,0.35)_100%)]" />
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <Backdrop />
      <div className="flex h-svh gap-3 p-3">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <main className="glass thin-scroll min-h-0 flex-1 overflow-y-auto rounded-3xl p-4 pb-24 md:p-6 lg:pb-6">{children}</main>
          <div className="mb-16 lg:mb-0">
            <PlayerBar />
          </div>
        </div>
        <RightPanel />
      </div>
      <MobileNav />
    </PlayerProvider>
  );
}

