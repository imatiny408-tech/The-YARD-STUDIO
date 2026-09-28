"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BadgeCheck, MapPin, Play } from "lucide-react";
import Cover from "@/components/Cover";
import { usePlayer } from "@/components/app/Player";
import { CREATORS, ME, TRACKS, fmtNum } from "@/lib/data";
import { distanceMiles, proofOfWork } from "@/lib/match";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const c = CREATORS.find((x) => x.id === id);
  const p = usePlayer();
  if (!c) return <div className="p-10 text-center text-white/50">Creator not found. <Link href="/discover" className="underline">Back to Discover</Link></div>;
  const pow = proofOfWork(c);
  const dist = distanceMiles(ME.lat, ME.lng, c.lat, c.lng);
  const tracks = TRACKS.filter((t) => t.artist === c.name || c.credits.some((cr) => cr.title.startsWith(t.title)));

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl" style={{ background: `linear-gradient(120deg, hsl(${c.hue} 60% 30%), hsl(${(c.hue + 60) % 360} 50% 14%) 70%)` }}>
        <Cover seed={c.id + "hero"} hue={c.hue} className="absolute -right-10 -top-16 h-[160%] w-1/2 rotate-6 rounded-[48px] opacity-60 mix-blend-screen [mask-image:linear-gradient(to_right,transparent,black_50%)]" />
        <div className="relative flex flex-wrap items-end gap-5 p-6 md:p-8">
          <Cover seed={c.id} hue={c.hue} className="h-28 w-28 rounded-full ring-4 ring-white/15" />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-white/60">{c.handle}</div>
            <h1 className="flex items-center gap-2 text-4xl font-semibold tracking-tight">{c.name} {c.credits.length > 0 && <BadgeCheck className="text-[var(--color-lilac)]" />}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/70">
              {c.roles.map((r) => <span key={r} className="rounded-full bg-black/25 px-2 py-0.5">{r}</span>)}
              <span className="flex items-center gap-1"><MapPin size={11} />{c.city} · {dist.toFixed(0)} mi away</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/studio" className="btn btn-ghost text-xs">Invite to room</Link>
            <Link href="/bounties" className="btn btn-light text-xs">Hire{c.rateMax ? ` · from $${c.rateMin}` : ""}</Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <p className="text-lg text-white/85">{c.bio}</p>

          <div>
            <div className="mb-2 text-sm">Verified credits</div>
            <div className="overflow-hidden rounded-2xl bg-white/[0.04]">
              <div className="grid grid-cols-[1fr_110px_70px] gap-2 px-4 py-2 text-[11px] text-white/45 sm:grid-cols-[1fr_130px_130px_80px]">
                <span>Title</span><span>Role</span><span className="hidden sm:block">ISRC</span><span>Streams</span>
              </div>
              {c.credits.map((cr) => (
                <div key={cr.isrc + cr.role} className="grid grid-cols-[1fr_110px_70px] items-center gap-2 border-t border-white/5 px-4 py-2.5 text-sm sm:grid-cols-[1fr_130px_130px_80px]">
                  <span className="truncate">{cr.title} <span className="text-white/40">· {cr.year}</span></span>
                  <span className="truncate text-xs text-white/60">{cr.role}</span>
                  <span className="hidden font-mono text-[11px] text-white/45 sm:block">{cr.isrc}</span>
                  <span className="text-xs">{fmtNum(cr.streams)}</span>
                </div>
              ))}
              {!c.credits.length && <div className="border-t border-white/5 px-4 py-4 text-xs text-white/45">No verified releases yet. Credits are matched from ISRC codes and streaming metadata.</div>}
            </div>
          </div>

          {tracks.length > 0 && (
            <div>
              <div className="mb-2 text-sm">Listen</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {tracks.map((t) => (
                  <button key={t.id} onClick={() => p.play(t)} className="group flex items-center gap-3 rounded-2xl bg-white/[0.04] p-2 text-left hover:bg-white/[0.08]">
                    <div className="relative">
                      <Cover seed={t.id} hue={t.hue} className="h-14 w-14 rounded-xl" />
                      <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/40 opacity-0 transition group-hover:opacity-100"><Play size={16} fill="currentColor" /></span>
                    </div>
                    <div>
                      <div className="text-sm">{t.title}</div>
                      <div className="text-[11px] text-white/45">{fmtNum(t.plays)} plays</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-white p-5 text-center text-black">
            <div className="relative mx-auto h-32 w-32">
              <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
                <circle cx="21" cy="21" r="17" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="4" />
                <circle cx="21" cy="21" r="17" fill="none" stroke="#ff4d9d" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(pow / 100) * 106.8} 106.8`} />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div>
                  <div className="text-3xl font-semibold">{pow}</div>
                  <div className="text-[10px] text-black/50">Proof of Work</div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-black/50">Calculated from verified releases, stream counts and recency.</p>
          </div>
          <div className="rounded-3xl bg-white/[0.04] p-4 text-sm">
            <div className="mb-2 text-white/60">Genres</div>
            <div className="flex flex-wrap gap-1.5">{c.genres.map((g) => <span key={g} className="chip">{g}</span>)}</div>
            {c.gear.length > 0 && (
              <>
                <div className="mb-2 mt-4 text-white/60">Gear</div>
                <ul className="space-y-1 text-xs text-white/80">{c.gear.map((g) => <li key={g}>{g}</li>)}</ul>
              </>
            )}
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-white/60">Status</span>
              <span className={c.available ? "text-[var(--color-lime)]" : "text-white/50"}>{c.available ? "Available for work" : "Booked"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
