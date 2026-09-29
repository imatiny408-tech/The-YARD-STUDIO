"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import Lenis from "lenis";
import { ArrowDown, ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import Logo, { CommunityMark, LiquidY, VinylBlob, Wordmark } from "@/components/Logo";
import Cover from "@/components/Cover";
import Sculpture from "./Sculpture";
import Reveal from "./Reveal";
import { EscrowVisual, MixerVisual, PadVisual, RoomVisual, SplitVisual, VaultVisual } from "./ToolVisuals";
import { renderKit } from "@/lib/audio";
import { CREATORS } from "@/lib/data";

/* ----------------------------------------------------------------------------
 * Nav: floating pill with a Full mode / Explore toggle. It flips between light
 * and dark depending on which section is underneath it.
 * --------------------------------------------------------------------------*/
function Nav({ explore, setExplore, light }: { explore: boolean; setExplore: (v: boolean) => void; light: boolean }) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-50 flex items-center justify-between px-4 md:top-4 md:px-6">
      <div className={`pointer-events-auto hidden text-sm transition-colors md:block ${light ? "text-black" : "text-white"}`}>
        <Logo />
      </div>
      <nav
        className={`pointer-events-auto mx-auto flex items-center gap-1 rounded-full p-1 pl-4 text-xs backdrop-blur-xl transition-colors md:mx-0 ${
          light ? "bg-black/5 text-black ring-1 ring-black/5" : "bg-white/8 text-white ring-1 ring-white/10"
        }`}
      >
        <span className="mr-2 md:hidden"><Logo /></span>
        {[
          ["Full mode", false],
          ["Explore", true],
        ].map(([label, val]) => (
          <button
            key={label as string}
            onClick={() => {
              setExplore(val as boolean);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`rounded-full px-3 py-1.5 font-medium transition ${
              explore === val ? (light ? "bg-black text-white" : "bg-black text-white ring-1 ring-white/10") : "opacity-50 hover:opacity-100"
            }`}
          >
            {label as string}
          </button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-current opacity-15 sm:block" />
        <a href="#tools" className="hidden px-2 opacity-60 hover:opacity-100 sm:block">Tools</a>
        <a href="#play" className="hidden px-2 opacity-60 hover:opacity-100 sm:block">Play</a>
      </nav>
      <Link
        href="/home"
        className={`pointer-events-auto hidden rounded-full px-4 py-2 text-xs font-medium transition md:block ${light ? "bg-black text-white" : "bg-white text-black"}`}
      >
        Enter the Yard
      </Link>
    </header>
  );
}

/* ----------------------------------------------------------------------------
 * Hero: pinned stage with the braided mic stand. Tap it to play a chord.
 * --------------------------------------------------------------------------*/
const HOTSPOTS = [
  { title: "Proof-of-Work profiles", spec: [["Verified via", "ISRC + streaming metadata"], ["Score", "0 – 100, live"]], roles: "Rappers · Vocalists" },
  { title: "DAW-Sync rooms", spec: [["Audio", "24-bit / 48kHz lossless"], ["Sync", "Host playhead, ms-accurate"]], roles: "Producers · Engineers" },
  { title: "Split sheets + escrow", spec: [["Payments", "Stripe Connect escrow"], ["Unlock", "100% signatures"]], roles: "Managers · Artists" },
  { title: "Camp Vault", spec: [["Versions", "V1 → Final Master"], ["Integrity", "Checksum verified"]], roles: "Squads · Collectives" },
];

function Hero({ explore, onPluck }: { explore: boolean; onPluck: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [pulse, setPulse] = useState(0);
  const [active, setActive] = useState(1);
  const dots = useRef<(HTMLButtonElement | null)[]>([]);

  const headY = useTransform(scrollYProgress, [0, 0.5], [0, -80]);
  const headO = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const bigX = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const bigBlur = useTransform(scrollYProgress, [0, 0.6, 0.9], [0, 0, 12]);
  const bigFilter = useTransform(bigBlur, (b) => `blur(${b}px)`);
  const fade = useTransform(scrollYProgress, [0.75, 1], [1, 0]);

  const setHotspots = useCallback((pts: { x: number; y: number }[]) => {
    pts.forEach((p, i) => {
      const el = dots.current[i];
      if (el) el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%,-50%)`;
    });
  }, []);

  return (
    <section ref={ref} data-theme="dark" className="relative h-[260vh] bg-black">
      <motion.div style={{ opacity: fade }} className="sticky top-0 h-svh overflow-hidden">
        <div
          className="absolute inset-0 transition-colors duration-700"
          style={{
            background: explore
              ? "radial-gradient(80% 70% at 70% 50%, #3a2a22 0%, #16110f 55%, #0a0908 100%)"
              : "radial-gradient(70% 60% at 65% 45%, #1a1a1a 0%, #060606 60%, #000 100%)",
          }}
        />
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={() => {
            setPulse((p) => p + 1);
            onPluck();
          }}
        >
          <Sculpture progress={scrollYProgress} explore={explore} pulse={pulse} onHotspots={explore ? setHotspots : undefined} />
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-3/4 bg-gradient-to-r from-black/80 via-black/40 to-transparent md:hidden" />
        <motion.h1
          style={{ y: headY, opacity: headO }}
          className="pointer-events-none absolute left-4 top-24 max-w-[16ch] text-[clamp(2rem,4.2vw,3.4rem)] leading-[1.05] tracking-tight text-white md:left-8"
        >
          We build the underground,<br />
          <span className="text-white/45">one session at a time</span>
        </motion.h1>

        <AnimatePresence mode="wait">
          {!explore ? (
            <motion.div
              key="full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pointer-events-none absolute left-4 top-[48%] max-w-[260px] text-sm text-white/85 md:left-8"
            >
              <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] backdrop-blur">
                <MapPin size={11} /> Atlanta, GA · 214 online
              </span>
              <p>The producer you need, the engineer you trust, the cover artist who gets it. One yard, no middlemen.</p>
              <p className="mt-3 text-[11px] text-white/40">Tap the mic.</p>
            </motion.div>
          ) : (
            <motion.div
              key="explore"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass absolute left-4 top-[40%] w-[230px] rounded-2xl p-4 text-sm md:left-8"
            >
              <div className="mb-2 text-[11px] text-white/45">Who it's for</div>
              {HOTSPOTS.map((h, i) => (
                <button key={h.title} onClick={() => setActive(i)} className={`block w-full py-1.5 text-left transition ${active === i ? "text-white" : "text-white/40 hover:text-white/70"}`}>
                  {h.roles}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {explore &&
          HOTSPOTS.map((h, i) => (
            <button
              key={h.title}
              ref={(el) => {
                dots.current[i] = el;
              }}
              onClick={() => setActive(i)}
              aria-label={h.title}
              className="absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-full"
            >
              <span className={`absolute inset-0 rounded-full border border-white/70 ${active === i ? "animate-ping" : ""}`} />
              <span className={`h-2.5 w-2.5 rounded-full ${active === i ? "bg-white" : "bg-white/60"}`} />
            </button>
          ))}

        <AnimatePresence mode="wait">
          {explore && (
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(8px)" }}
              className="glass absolute bottom-6 right-4 w-[min(320px,calc(100%-2rem))] rounded-2xl p-5 md:bottom-10 md:right-8"
            >
              <div className="text-xl font-medium tracking-tight">{HOTSPOTS[active].title}</div>
              <div className="mt-4 space-y-3">
                {HOTSPOTS[active].spec.map(([k, v]) => (
                  <div key={k} className="border-l-2 border-[var(--color-signal)] pl-3">
                    <div className="text-[10px] uppercase tracking-widest text-white/45">{k}</div>
                    <div className="text-sm">{v}</div>
                  </div>
                ))}
              </div>
              <Link href="/home" className="btn btn-ghost mt-4 w-full text-xs">Open in the Yard</Link>
            </motion.div>
          )}
        </AnimatePresence>

        {!explore && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            style={{ x: bigX, filter: bigFilter }}
            className="pointer-events-none absolute bottom-6 right-6 flex items-end gap-6 md:bottom-8 md:right-14 md:gap-16"
          >
            <span className="hidden text-[clamp(2.5rem,7vw,6rem)] leading-[0.9] tracking-tight text-white/35 sm:block">Studio</span>
            <Wordmark stacked className="text-right text-[clamp(3rem,9vw,8rem)] text-[var(--color-signal)] drop-shadow-[0_10px_40px_rgba(255,77,157,0.45)]" />
          </motion.div>
        )}

        <div className="pointer-events-none absolute bottom-8 left-4 flex items-center gap-1 text-xs text-white/70 md:left-8">
          Scroll <ArrowDown size={12} className="animate-bounce" />
        </div>
      </motion.div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * Statement: white stage, big copy revealed word by word, creator strip below.
 * --------------------------------------------------------------------------*/
function Statement() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const stripX = useTransform(scrollYProgress, [0, 1], ["10%", "-55%"]);
  return (
    <section ref={ref} data-theme="light" className="relative h-[220vh] bg-[var(--color-bone)] text-black">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
        <Reveal
          progress={scrollYProgress}
          from={0.02}
          to={0.62}
          className="mx-auto max-w-[22ch] px-4 text-center text-[clamp(1.7rem,3.6vw,3rem)] font-medium leading-[1.12] tracking-tight"
          text="A private network, not a group chat: rappers to engineers, videographers to managers, each one verified, credited and within ten miles of your studio."
        />
        <motion.div style={{ x: stripX }} className="mt-14 flex gap-5 pl-4">
          {[...CREATORS, ...CREATORS].map((c, i) => (
            <div key={i} className="w-[220px] shrink-0">
              <Cover seed={c.id + "strip"} hue={c.hue} className="aspect-[4/3] rounded-2xl shadow-[0_30px_40px_-20px_rgba(0,0,0,0.45)]" />
              <div className="mt-3 flex items-baseline justify-between text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-black/45">{c.roles[0]}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * Arrive: split layout, lines light up one at a time.
 * --------------------------------------------------------------------------*/
const ARRIVE = ["It's not about getting heard.", "It's about who's in the room.", "Your team meets you there,", "synced, lossless,", "signed."];

function Arrive() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0.1, 0.5], [0.86, 1]);
  const imgY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  return (
    <section ref={ref} data-theme="light" className="relative bg-[var(--color-bone)] px-4 py-[18vh] text-black md:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
        <motion.div style={{ scale, y: imgY }} className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_40%,rgba(255,77,157,0.55),transparent_70%)]" />
          <div className="absolute inset-0 flex items-center gap-[3px] px-8">
            {Array.from({ length: 64 }, (_, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-full bg-white/80"
                animate={{ height: [`${20 + ((i * 37) % 60)}%`, `${10 + ((i * 53) % 40)}%`, `${20 + ((i * 37) % 60)}%`] }}
                transition={{ duration: 1.6 + (i % 5) * 0.2, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </div>
          <span className="absolute bottom-4 left-4 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white backdrop-blur">Glass House (Remix) · V2</span>
        </motion.div>
        <div className="text-[clamp(1.6rem,3vw,2.5rem)] font-medium leading-[1.15] tracking-tight">
          {ARRIVE.map((l, i) => (
            <motion.div
              key={l}
              initial={{ opacity: 0.12, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, filter: "blur(0px)" }}
              viewport={{ margin: "-35% 0px -35% 0px" }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
            >
              {l}
            </motion.div>
          ))}
          <Link href="/studio" className="mt-8 inline-flex rounded-lg bg-black/5 px-4 py-2 text-sm font-normal hover:bg-black/10">
            Open a room
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * Tools: the "fleet" carousel. Big product on white, spec card underneath.
 * --------------------------------------------------------------------------*/
const TOOLS = [
  { name: "DAW-Sync Room", line: "Lossless from your DAW. Everyone hears the same millisecond.", tag: "Live", price: "Free", unit: "per room", href: "/studio", V: RoomVisual, specs: ["24-bit / 48kHz WAV/FLAC over WebRTC", "Host-locked play, pause and scrub", "Time-stamped markers with notes"] },
  { name: "Stem Mixer", line: "Eight stems, faders, solo, mute, pan, tempo and key.", tag: "Studio", price: "Free", unit: "per session", href: "/studio?tab=mixer", V: MixerVisual, specs: ["8 concurrent stems in Web Audio", "Tempo change without pitch shift", "Export stems or full mix as WAV"] },
  { name: "Beat Pad", line: "Sixteen pads on your keyboard or MIDI controller.", tag: "Studio", price: "Free", unit: "per session", href: "/studio?tab=pads", V: PadVisual, specs: ["QWERTY + WebMIDI mapping", "Drop a loop, auto-chop on transients", "Pitch, attack, decay, reverb per pad"] },
  { name: "Split Sheets", line: "Who owns what, signed before anything unlocks.", tag: "Legal", price: "$0", unit: "per song", href: "/splits", V: SplitVisual, specs: ["PRO IDs (ASCAP / BMI)", "E-signature requests to every writer", "Masters gated until 100% signed"] },
  { name: "Escrow", line: "Money held until the work is approved. No more ghosting.", tag: "Payments", price: "5%", unit: "platform fee", href: "/bounties", V: EscrowVisual, specs: ["Stripe Connect holding account", "Watermarked previews until approval", "Automatic dispute holds"] },
  { name: "Camp Vault", line: "One folder for the whole squad, every version tracked.", tag: "Squads", price: "$9", unit: "per camp / mo", href: "/squad", V: VaultVisual, specs: ["V1 → V2 → Final Master", "Owner / EP / Contributor permissions", "Checksum-verified uploads"] },
];

function Tools() {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [specs, setSpecs] = useState(false);
  const go = useCallback((d: number) => {
    setDir(d);
    setSpecs(false);
    setI((x) => (x + d + TOOLS.length) % TOOLS.length);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.getElementById("tools");
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top > window.innerHeight / 2 || r.bottom < window.innerHeight / 2) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);
  const tool = TOOLS[i];
  return (
    <section id="tools" data-theme="light" className="relative flex min-h-svh flex-col justify-between bg-white px-4 pb-6 pt-24 text-black md:px-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm text-black/45">The toolkit</h2>
        <span className="font-mono text-xs text-black/45">
          {String(i + 1).padStart(2, "0")} / {String(TOOLS.length).padStart(2, "0")}
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden py-10">
        <AnimatePresence mode="popLayout" custom={dir}>
          <motion.div
            key={tool.name}
            custom={dir}
            initial={{ x: dir * 420, opacity: 0, filter: "blur(10px)" }}
            animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ x: dir * -420, opacity: 0, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 140, damping: 22 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) go(1);
              if (info.offset.x > 80) go(-1);
            }}
            className="w-full cursor-grab active:cursor-grabbing"
          >
            <tool.V />
          </motion.div>
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {specs && (
          <motion.ul
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mx-auto mb-3 grid w-full max-w-3xl gap-2 sm:grid-cols-3"
          >
            {tool.specs.map((s) => (
              <li key={s} className="rounded-2xl bg-black/[0.04] p-4 text-sm">{s}</li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-stretch gap-2 sm:flex-nowrap">
        <button onClick={() => go(-1)} aria-label="Previous tool" className="grid w-14 place-items-center rounded-2xl bg-black/[0.04] hover:bg-black/[0.08]">
          <ArrowLeft size={16} />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-2xl bg-black/[0.04] p-4">
          <div className="min-w-0">
            <div className="text-2xl font-medium tracking-tight">{tool.name}</div>
            <div className="mt-1 truncate text-xs text-black/50">{tool.line}</div>
          </div>
          <button onClick={() => setSpecs((s) => !s)} className="shrink-0 rounded-lg bg-black/[0.06] px-3 py-2 text-xs hover:bg-black/10">
            {specs ? "Hide specs" : "Specifications"}
          </button>
        </div>
        <div className="hidden flex-col items-center justify-center gap-1 rounded-2xl bg-black/[0.04] px-4 sm:flex">
          <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px]">{tool.tag}</span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl bg-black/[0.04] px-4 py-2">
          <span className="text-[10px] text-black/45">{tool.unit}</span>
          <span className="text-lg">{tool.price}</span>
          <Link href={tool.href} className="mt-1 rounded-lg bg-black px-3 py-1 text-xs text-white">Try it</Link>
        </div>
        <button onClick={() => go(1)} aria-label="Next tool" className="grid w-14 place-items-center rounded-2xl bg-black/[0.04] hover:bg-black/[0.08]">
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * Play: eight live pads right on the landing page.
 * --------------------------------------------------------------------------*/
const PLAY_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k"];
const PLAY_PADS = [0, 1, 3, 4, 8, 9, 12, 15];

function Play({ audio }: { audio: React.RefObject<{ ctx: AudioContext; kit: AudioBuffer[]; analyser: AnalyserNode } | null> }) {
  const [lit, setLit] = useState<number | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);

  const trigger = useCallback(
    async (i: number) => {
      const a = await ensureAudio(audio);
      if (!a) return;
      setNames((n) => (n.length ? n : ["Kick", "Snare", "Hat", "808", "Am", "F", "Vox", "Impact"]));
      const src = a.ctx.createBufferSource();
      src.buffer = a.kit[PLAY_PADS[i]];
      src.connect(a.analyser);
      src.start();
      setLit(i);
      setTimeout(() => setLit((l) => (l === i ? null : l)), 140);
    },
    [audio],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey) return;
      const i = PLAY_KEYS.indexOf(e.key.toLowerCase());
      const sec = document.getElementById("play")?.getBoundingClientRect();
      if (i >= 0 && sec && sec.top < window.innerHeight && sec.bottom > 0) trigger(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trigger]);

  useEffect(() => {
    let raf = 0;
    const c = canvas.current!;
    const g = c.getContext("2d")!;
    const draw = () => {
      const a = audio.current;
      const w = (c.width = c.clientWidth);
      const h = (c.height = c.clientHeight);
      g.clearRect(0, 0, w, h);
      if (a) {
        const data = new Uint8Array(a.analyser.frequencyBinCount);
        a.analyser.getByteFrequencyData(data);
        const n = 96;
        for (let i = 0; i < n; i++) {
          const v = data[Math.floor((i / n) ** 1.6 * data.length * 0.7)] / 255;
          const bh = Math.max(2, v * h);
          g.fillStyle = v > 0.6 ? "#ff4d9d" : "rgba(255,255,255,0.8)";
          g.fillRect((i / n) * w + 1, h - bh, w / n - 2, bh);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [audio]);

  return (
    <section id="play" data-theme="dark" className="relative bg-black px-4 py-[16vh] md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-[14ch] text-[clamp(2rem,5vw,4rem)] font-medium leading-[0.95] tracking-tight">Don&apos;t read about it. Play it.</h2>
          <p className="max-w-xs text-sm text-white/55">
            Tap a pad or use <kbd className="rounded bg-white/10 px-1">A</kbd>–<kbd className="rounded bg-white/10 px-1">K</kbd>. It&apos;s the same engine that runs the full sixteen-pad sampler inside.
          </p>
        </div>
        <canvas ref={canvas} className="mt-10 h-28 w-full" aria-hidden />
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {PLAY_KEYS.map((k, i) => (
            <button
              key={k}
              onPointerDown={() => trigger(i)}
              className="relative aspect-square rounded-2xl text-left transition-all duration-100 active:scale-95"
              style={{
                background: lit === i ? "var(--color-signal)" : "rgba(255,255,255,0.06)",
                boxShadow: lit === i ? "0 0 50px rgba(255,77,157,0.6)" : "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              <span className="absolute left-3 top-2 font-mono text-xs uppercase text-white/50">{k}</span>
              <span className="absolute bottom-2 left-3 text-xs text-white/80">{names[i] ?? ""}</span>
            </button>
          ))}
        </div>
        <div className="mt-6 text-right">
          <Link href="/studio?tab=pads" className="btn btn-ghost text-xs">Open the full sampler →</Link>
        </div>
      </div>
    </section>
  );
}

async function ensureAudio(audio: React.RefObject<{ ctx: AudioContext; kit: AudioBuffer[]; analyser: AnalyserNode } | null>) {
  if (audio.current) {
    if (audio.current.ctx.state === "suspended") await audio.current.ctx.resume();
    return audio.current;
  }
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.8;
  analyser.connect(ctx.destination);
  const kit = (await renderKit()).map((k) => k.buffer);
  (audio as React.RefObject<{ ctx: AudioContext; kit: AudioBuffer[]; analyser: AnalyserNode }>).current = { ctx, kit, analyser };
  return audio.current;
}

/* ----------------------------------------------------------------------------
 * Final CTA + footer.
 * --------------------------------------------------------------------------*/
function Cta() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.7, 1]);
  const blur = useTransform(scrollYProgress, [0, 0.8], [16, 0]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  return (
    <section ref={ref} data-theme="dark" className="relative flex min-h-svh flex-col justify-between overflow-hidden bg-black px-4 pb-6 pt-24 md:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_60%,rgba(255,77,157,0.25),transparent_70%)]" />
      <motion.div style={{ scale, filter }} className="relative mt-auto text-center">
        <div className="mb-6 flex items-center justify-center gap-4">
          <VinylBlob className="h-16 w-16 text-[var(--color-lime)] [--hole:#000]" />
          <LiquidY className="h-16 w-16" />
          <CommunityMark className="h-16 w-16 text-[var(--color-lilac)]" />
        </div>
        <div className="font-[family-name:var(--font-bubble)] text-[clamp(4rem,17vw,15rem)] leading-[0.85] tracking-tight">Pull up.</div>
        <p className="mx-auto mt-12 max-w-md text-white/60">Free for creators. Bring your crew, your stems and your city.</p>
        <Link href="/home" className="btn btn-light mt-8 px-6 py-3">Enter the Yard</Link>
      </motion.div>
      <footer className="relative mt-auto flex flex-wrap items-center justify-between gap-3 pt-24 text-xs text-white/40">
        <Logo className="text-white/70" />
        <span>© 2026 The Yard. Built for the underground.</span>
      </footer>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * Page root: Lenis smooth scroll, nav theming, shared audio for plucks + pads.
 * --------------------------------------------------------------------------*/
export default function Landing() {
  const [explore, setExplore] = useState(false);
  const [light, setLight] = useState(false);
  const audio = useRef<{ ctx: AudioContext; kit: AudioBuffer[]; analyser: AnalyserNode } | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.09 });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const under = [...document.querySelectorAll<HTMLElement>("section[data-theme]")].find((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= 36 && r.bottom > 36;
      });
      setLight(under?.dataset.theme === "light");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const pluck = useCallback(async () => {
    const a = await ensureAudio(audio);
    if (!a) return;
    // Am9 strum played when the mic is tapped.
    [57, 64, 67, 71, 72].forEach((m, i) => {
      const t = a.ctx.currentTime + i * 0.035;
      const o = a.ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
      const g = a.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      o.connect(g).connect(a.analyser);
      o.start(t);
      o.stop(t + 1.9);
    });
  }, []);

  return (
    <main>
      <Nav explore={explore} setExplore={setExplore} light={light} />
      <Hero explore={explore} onPluck={pluck} />
      <Statement />
      <Arrive />
      <Tools />
      <Play audio={audio} />
      <Cta />
    </main>
  );
}
