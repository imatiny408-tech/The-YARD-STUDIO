"use client";

import { useEffect, useState } from "react";

function useTick(ms: number) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

const Slab = ({ children }: { children: React.ReactNode }) => (
  <div className="relative mx-auto aspect-[16/9] w-full max-w-[640px] rounded-[28px] bg-[#0b0b0b] p-6 shadow-[0_60px_80px_-30px_rgba(0,0,0,0.55),0_30px_30px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/10">
    <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/10 to-transparent" />
    {children}
  </div>
);

export function RoomVisual() {
  const t = useTick(50);
  const bars = 72;
  const head = (t % 200) / 200;
  return (
    <Slab>
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[var(--color-signal)]" /> LIVE · 24-bit / 48kHz</span>
        <span className="font-mono">{(head * 192).toFixed(2)}s</span>
      </div>
      <div className="relative mt-6 flex h-[55%] items-center gap-[3px]">
        {Array.from({ length: bars }, (_, i) => {
          const v = Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.11)) * 0.85 + 0.12;
          return <div key={i} className="flex-1 rounded-full" style={{ height: `${v * 100}%`, background: i / bars < head ? "#fff" : "rgba(255,255,255,0.22)" }} />;
        })}
        <div className="absolute inset-y-[-8px] w-px bg-[var(--color-signal)]" style={{ left: `${head * 100}%` }} />
        {[0.22, 0.61].map((m) => (
          <div key={m} className="absolute -top-5 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[10px] text-black" style={{ left: `${m * 100}%` }}>
            {m < 0.5 ? "0:42 vox too loud" : "1:57 ride out"}
          </div>
        ))}
      </div>
      <div className="absolute bottom-6 left-6 flex -space-x-2">
        {[350, 200, 45, 290].map((h) => (
          <span key={h} className="h-7 w-7 rounded-full ring-2 ring-[#0b0b0b]" style={{ background: `hsl(${h} 70% 55%)` }} />
        ))}
      </div>
      <span className="absolute bottom-7 right-6 text-[11px] text-white/50">4 in sync · 12ms</span>
    </Slab>
  );
}

export function MixerVisual() {
  const t = useTick(90);
  return (
    <Slab>
      <div className="flex h-full items-end justify-between gap-3 pb-2">
        {["KICK", "SNR", "HAT", "808", "KEYS", "LEAD", "VOX", "FX"].map((n, i) => {
          const v = 0.35 + 0.5 * Math.abs(Math.sin(t * 0.12 + i * 0.9));
          return (
            <div key={n} className="flex h-full flex-1 flex-col items-center gap-2">
              <div className="relative w-full flex-1 overflow-hidden rounded-lg bg-white/5">
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/70 to-white/10 transition-all duration-100" style={{ height: `${v * 100}%` }} />
                {i === 6 && <div className="absolute inset-x-0 bottom-0 h-full bg-[var(--color-signal)]/30" />}
              </div>
              <span className="text-[9px] tracking-widest text-white/50">{n}</span>
            </div>
          );
        })}
      </div>
    </Slab>
  );
}

export function PadVisual() {
  const t = useTick(140);
  const pattern = [0, 5, 10, 15, 3, 6, 9, 12];
  return (
    <Slab>
      <div className="mx-auto grid h-full max-w-[60%] grid-cols-4 gap-2">
        {Array.from({ length: 16 }, (_, i) => {
          const on = pattern[t % pattern.length] === i || (t % 4 === 0 && i === 0);
          return (
            <div
              key={i}
              className="rounded-xl transition-all duration-150"
              style={{
                background: on ? "var(--color-signal)" : "rgba(255,255,255,0.07)",
                boxShadow: on ? "0 0 30px var(--color-signal)" : "none",
              }}
            />
          );
        })}
      </div>
    </Slab>
  );
}

export function SplitVisual() {
  const parts = [
    { p: 40, c: "#fff", n: "Producer" },
    { p: 35, c: "var(--color-signal)", n: "Artist" },
    { p: 25, c: "#777", n: "Writer" },
  ];
  let acc = 0;
  return (
    <Slab>
      <div className="flex h-full items-center gap-8">
        <svg viewBox="0 0 42 42" className="h-full -rotate-90">
          {parts.map((s) => {
            const el = <circle key={s.n} cx="21" cy="21" r="15.9" fill="none" stroke={s.c} strokeWidth="4" strokeDasharray={`${s.p - 1} ${101 - s.p}`} strokeDashoffset={-acc} />;
            acc += s.p;
            return el;
          })}
        </svg>
        <div className="flex-1 space-y-3 text-sm text-white">
          {parts.map((s, i) => (
            <div key={s.n} className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full" style={{ background: s.c }} />{s.n}</span>
              <span className="text-white/60">{s.p}% {i < 2 ? "✓ signed" : "· pending"}</span>
            </div>
          ))}
          <div className="text-[11px] text-white/40">Masters unlock at 100% signatures</div>
        </div>
      </div>
    </Slab>
  );
}

export function EscrowVisual() {
  const t = useTick(700);
  const step = t % 4;
  const steps = ["Deposit", "Held", "Approved", "Released"];
  return (
    <Slab>
      <div className="flex h-full flex-col justify-center gap-6">
        <div className="text-center text-5xl font-medium tracking-tight text-white">$600.00</div>
        <div className="flex items-center justify-between gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-2">
              <div className="h-1.5 w-full rounded-full transition-colors duration-500" style={{ background: i <= step ? (i === 3 ? "var(--color-signal)" : "#fff") : "rgba(255,255,255,0.12)" }} />
              <span className={`text-[11px] ${i <= step ? "text-white" : "text-white/35"}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </Slab>
  );
}

export function VaultVisual() {
  const files = ["V1 · rough.wav", "V2 · vox up.wav", "Stems.zip", "Final Master.wav"];
  return (
    <Slab>
      <div className="relative h-full">
        {files.map((f, i) => (
          <div
            key={f}
            className="absolute left-1/2 flex w-[70%] items-center justify-between rounded-xl border border-white/10 bg-[#161616] px-4 py-3 text-sm text-white shadow-xl"
            style={{ top: `${8 + i * 20}%`, transform: `translateX(-50%) scale(${0.88 + i * 0.04})` }}
          >
            <span>{f}</span>
            <span className="font-mono text-[10px] text-white/40">sha {(0x9f2c1e7a + i * 7919).toString(16).slice(0, 8)}</span>
          </div>
        ))}
      </div>
    </Slab>
  );
}
