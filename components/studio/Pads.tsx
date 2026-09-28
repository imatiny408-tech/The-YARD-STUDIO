"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Usb } from "lucide-react";
import { CommunityMark } from "@/components/Logo";
import { detectTransients, makeImpulse, renderKit } from "@/lib/audio";

const KEYS = ["1", "2", "3", "4", "q", "w", "e", "r", "a", "s", "d", "f", "z", "x", "c", "v"];
// General MIDI pad controllers usually start at C1 (36).
const MIDI_BASE = 36;

type Pad = { name: string; buffer: AudioBuffer; start: number; end: number; pitch: number; attack: number; decay: number; reverb: number };

type Web = { ctx: AudioContext; dry: GainNode; verb: ConvolverNode; out: GainNode };

export default function Pads() {
  const [pads, setPads] = useState<Pad[]>([]);
  const [sel, setSel] = useState(0);
  const [lit, setLit] = useState<Record<number, number>>({});
  const [midi, setMidi] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [source, setSource] = useState("Yard Kit 01");
  const web = useRef<Web | null>(null);
  const padsRef = useRef(pads);
  padsRef.current = pads;

  useEffect(() => {
    renderKit().then((kit) => setPads(kit.map((k) => ({ ...k, start: 0, end: k.buffer.duration, pitch: 0, attack: 0.002, decay: 1, reverb: 0.1 }))));
  }, []);

  const engine = () => {
    if (!web.current) {
      const ctx = new AudioContext();
      const out = ctx.createGain();
      const dry = ctx.createGain();
      const verb = ctx.createConvolver();
      verb.buffer = makeImpulse(ctx);
      dry.connect(out);
      verb.connect(out);
      out.connect(ctx.destination);
      web.current = { ctx, dry, verb, out };
    }
    return web.current;
  };

  const trigger = useCallback((i: number, velocity = 1) => {
    const p = padsRef.current[i];
    if (!p) return;
    const w = engine();
    w.ctx.resume();
    const t = w.ctx.currentTime;
    const src = w.ctx.createBufferSource();
    src.buffer = p.buffer;
    src.playbackRate.value = Math.pow(2, p.pitch / 12);
    const len = (p.end - p.start) / src.playbackRate.value;
    const env = w.ctx.createGain();
    const peak = 0.9 * velocity;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + p.attack);
    env.gain.setTargetAtTime(0, t + p.attack, Math.max(0.01, (len * p.decay) / 3));
    const send = w.ctx.createGain();
    send.gain.value = p.reverb;
    src.connect(env);
    env.connect(w.dry);
    env.connect(send).connect(w.verb);
    src.start(t, p.start, p.end - p.start);
    setLit((l) => ({ ...l, [i]: Date.now() }));
    setTimeout(() => setLit((l) => (Date.now() - (l[i] ?? 0) >= 110 ? { ...l, [i]: 0 } : l)), 120);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || (e.target as HTMLElement).tagName === "INPUT") return;
      const i = KEYS.indexOf(e.key.toLowerCase());
      if (i >= 0) {
        e.preventDefault();
        trigger(i);
        setSel(i);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trigger]);

  useEffect(() => () => void web.current?.ctx.close(), []);

  const connectMidi = async () => {
    if (!("requestMIDIAccess" in navigator)) {
      setMidi("WebMIDI isn't supported in this browser");
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess();
      const inputs = [...access.inputs.values()];
      inputs.forEach((inp) => {
        inp.onmidimessage = (m) => {
          const [status, note, vel] = m.data ?? [];
          if ((status & 0xf0) === 0x90 && vel > 0) {
            const i = (note - MIDI_BASE + 160) % 16;
            trigger(i, vel / 127);
          }
        };
      });
      setMidi(inputs.length ? `Connected: ${inputs.map((i) => i.name).join(", ")}` : "No MIDI devices found. Plug one in and retry.");
    } catch {
      setMidi("MIDI permission denied");
    }
  };

  const chop = async (file: File) => {
    const w = engine();
    const buf = await w.ctx.decodeAudioData(await file.arrayBuffer());
    const starts = detectTransients(buf, 16);
    setPads(
      starts.map((s, i) => ({
        name: `Slice ${i + 1}`,
        buffer: buf,
        start: s,
        end: starts[i + 1] ?? buf.duration,
        pitch: 0,
        attack: 0.002,
        decay: 1,
        reverb: 0.05,
      })),
    );
    setSource(file.name);
  };

  const update = (patch: Partial<Pad>) => setPads((ps) => ps.map((p, i) => (i === sel ? { ...p, ...patch } : p)));
  const p = pads[sel];

  if (!pads.length)
    return (
      <div className="grid h-80 place-items-center text-sm text-white/50">
        <span className="flex items-center gap-2"><CommunityMark className="h-5 w-5" spin /> Loading kit…</span>
      </div>
    );

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) chop(f);
        }}
        className={`relative rounded-3xl p-3 transition ${dragging ? "bg-[var(--color-signal)]/15 ring-2 ring-[var(--color-signal)]" : "bg-white/[0.03]"}`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/55">
          <span>Source: <span className="text-white">{source}</span></span>
          <div className="flex gap-2">
            <label className="chip flex cursor-pointer items-center gap-1">
              <Upload size={11} /> Drop or pick audio to auto-chop
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && chop(e.target.files[0])} />
            </label>
            <button onClick={connectMidi} className="chip flex items-center gap-1"><Usb size={11} /> MIDI</button>
          </div>
        </div>
        {midi && <div className="mb-3 text-[11px] text-white/50">{midi}</div>}
        <div className="grid grid-cols-4 gap-2">
          {pads.map((pad, i) => {
            const on = !!lit[i];
            return (
              <button
                key={i}
                onPointerDown={() => {
                  trigger(i);
                  setSel(i);
                }}
                className={`relative aspect-square rounded-2xl text-left transition-all duration-75 active:scale-[0.96] ${sel === i ? "ring-2 ring-white/60" : ""}`}
                style={{
                  background: on ? "var(--color-signal)" : `linear-gradient(160deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))`,
                  boxShadow: on ? "0 0 40px rgba(255,77,157,0.55)" : "inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                <span className="absolute left-2.5 top-2 font-mono text-[10px] uppercase text-white/45">{KEYS[i]}</span>
                <span className="absolute bottom-2 left-2.5 right-2 truncate text-[11px] text-white/85">{pad.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 rounded-3xl bg-white/[0.04] p-4">
        <div>
          <div className="text-[11px] text-white/45">Pad {sel + 1} · key {KEYS[sel].toUpperCase()} · MIDI {MIDI_BASE + sel}</div>
          <input value={p.name} onChange={(e) => update({ name: e.target.value })} className="field mt-1 text-base" aria-label="Pad name" />
        </div>
        <Knob label="Pitch" value={p.pitch} min={-12} max={12} step={1} fmt={(v) => `${v > 0 ? "+" : ""}${v} st`} onChange={(v) => update({ pitch: v })} />
        <Knob label="Attack" value={p.attack} min={0.001} max={0.3} step={0.001} fmt={(v) => `${Math.round(v * 1000)} ms`} onChange={(v) => update({ attack: v })} />
        <Knob label="Decay" value={p.decay} min={0.05} max={1} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update({ decay: v })} />
        <Knob label="Reverb" value={p.reverb} min={0} max={1} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update({ reverb: v })} />
        <button onClick={() => trigger(sel)} className="btn btn-light w-full">Audition</button>
      </div>
    </div>
  );
}

/** Rotary knob: drag vertically or use the arrow keys. */
function Knob({ label, value, min, max, step, fmt, onChange }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  const ratio = (value - min) / (max - min);
  const angle = -135 + ratio * 270;
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const drag = (e: React.PointerEvent) => {
    const y0 = e.clientY;
    const v0 = value;
    const move = (ev: PointerEvent) => onChange(clamp(v0 + ((y0 - ev.clientY) / 150) * (max - min)));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div className="flex items-center gap-4">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={drag}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(clamp(value + step * (step < 1 ? 10 : 1)));
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(clamp(value - step * (step < 1 ? 10 : 1)));
        }}
        className="relative h-12 w-12 shrink-0 cursor-ns-resize touch-none rounded-full bg-gradient-to-b from-white/20 to-white/5 shadow-inner outline-none ring-white/40 focus-visible:ring-2"
      >
        <svg viewBox="0 0 48 48" className="absolute inset-0">
          <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" strokeDasharray="99 132" transform="rotate(135 24 24)" />
          <circle cx="24" cy="24" r="21" fill="none" stroke="var(--color-signal)" strokeWidth="3" strokeDasharray={`${ratio * 99} 132`} transform="rotate(135 24 24)" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
          <div className="mx-auto mt-2 h-3 w-0.5 rounded bg-white" />
        </div>
      </div>
      <div className="flex-1">
        <div className="text-xs text-white/55">{label}</div>
        <div className="font-mono text-sm">{fmt(value)}</div>
      </div>
    </div>
  );
}
