"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Pause, Play, RotateCcw } from "lucide-react";
import { CommunityMark } from "@/components/Logo";
import { STEMS, download, encodeWav, mixdown, renderStems, type StemId } from "@/lib/audio";

type Ch = { vol: number; pan: number; mute: boolean; solo: boolean };
const initial = (): Record<StemId, Ch> =>
  Object.fromEntries(STEMS.map((s) => [s.id, { vol: 0.8, pan: 0, mute: false, solo: false }])) as Record<StemId, Ch>;

type Node = { gain: GainNode; pan: StereoPannerNode; meter: AnalyserNode; src?: AudioBufferSourceNode };

export default function Mixer() {
  const [bpm, setBpm] = useState(140);
  const [semis, setSemis] = useState(0);
  const [ch, setCh] = useState(initial);
  const [playing, setPlaying] = useState(false);
  const [rendering, setRendering] = useState(true);
  const [pos, setPos] = useState(0);

  const ctx = useRef<AudioContext | null>(null);
  const nodes = useRef<Partial<Record<StemId, Node>>>({});
  const bufs = useRef<Record<StemId, AudioBuffer> | null>(null);
  const clock = useRef({ startedAt: 0, offset: 0 });
  const meters = useRef<Record<string, HTMLDivElement | null>>({});
  const master = useRef<HTMLDivElement>(null);

  const audio = () => {
    if (!ctx.current) {
      const c = new AudioContext();
      const out = c.createGain();
      out.connect(c.destination);
      STEMS.forEach(({ id }) => {
        const gain = c.createGain();
        const pan = c.createStereoPanner();
        const meter = c.createAnalyser();
        meter.fftSize = 512;
        gain.connect(pan).connect(meter).connect(out);
        nodes.current[id] = { gain, pan, meter };
      });
      ctx.current = c;
    }
    return ctx.current;
  };

  const duration = () => bufs.current?.kick.duration ?? 1;
  const current = () => {
    const c = ctx.current;
    if (!c || !playing) return clock.current.offset;
    return (c.currentTime - clock.current.startedAt) % duration();
  };

  const stopAll = () => {
    Object.values(nodes.current).forEach((n) => {
      if (n?.src) {
        n.src.stop();
        n.src = undefined;
      }
    });
  };

  const startAll = useCallback((offset: number) => {
    const c = ctx.current!;
    stopAll();
    const when = c.currentTime + 0.03;
    STEMS.forEach(({ id }) => {
      const n = nodes.current[id]!;
      const src = c.createBufferSource();
      src.buffer = bufs.current![id];
      src.loop = true;
      src.connect(n.gain);
      src.start(when, offset);
      n.src = src;
    });
    clock.current = { startedAt: when - offset, offset };
  }, []);

  // (Re)render stems when tempo or key change, keeping the playhead in the
  // same musical position.
  useEffect(() => {
    let alive = true;
    const ratio = bufs.current ? current() / duration() : 0;
    setRendering(true);
    const t = setTimeout(async () => {
      const b = await renderStems(bpm, semis);
      if (!alive) return;
      bufs.current = b;
      setRendering(false);
      if (playing) startAll(ratio * b.kick.duration);
      else clock.current.offset = ratio * b.kick.duration;
    }, 180);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, semis]);

  // Apply fader / pan / mute / solo.
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    const anySolo = STEMS.some((s) => ch[s.id].solo);
    STEMS.forEach(({ id }) => {
      const n = nodes.current[id]!;
      const s = ch[id];
      const audible = !s.mute && (!anySolo || s.solo);
      n.gain.gain.setTargetAtTime(audible ? s.vol : 0, c.currentTime, 0.015);
      n.pan.pan.setTargetAtTime(s.pan, c.currentTime, 0.015);
    });
  }, [ch, playing]);

  // Meters + playhead.
  useEffect(() => {
    let raf = 0;
    const data = new Float32Array(256);
    const held: Record<string, number> = {};
    // Peak meter on a -48..0 dBFS scale with a falling hold, like a DAW channel.
    const toMeter = (peak: number) => Math.max(0, Math.min(1, (20 * Math.log10(peak + 1e-6) + 48) / 48));
    const loop = () => {
      let master_ = 0;
      STEMS.forEach(({ id }) => {
        const n = nodes.current[id];
        const el = meters.current[id];
        if (!n || !el) return;
        n.meter.getFloatTimeDomainData(data);
        let m = 0;
        for (const v of data) m = Math.max(m, Math.abs(v));
        const lvl = Math.max(playing ? toMeter(m) : 0, (held[id] ?? 0) * 0.92);
        held[id] = lvl;
        master_ = Math.max(master_, lvl);
        el.style.transform = `scaleY(${lvl})`;
      });
      if (master.current) master.current.style.transform = `scaleX(${master_})`;
      if (playing) setPos(current());
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => () => void ctx.current?.close(), []);

  const toggle = async () => {
    const c = audio();
    await c.resume();
    if (!bufs.current) return;
    if (playing) {
      clock.current.offset = current();
      stopAll();
      setPlaying(false);
    } else {
      startAll(clock.current.offset);
      setPlaying(true);
    }
  };

  const set = (id: StemId, patch: Partial<Ch>) => setCh((c) => ({ ...c, [id]: { ...c[id], ...patch } }));

  const exportMix = () => {
    if (!bufs.current) return;
    const anySolo = STEMS.some((s) => ch[s.id].solo);
    const gains = STEMS.map((s) => (!ch[s.id].mute && (!anySolo || ch[s.id].solo) ? ch[s.id].vol : 0));
    const mix = mixdown(STEMS.map((s) => bufs.current![s.id]), gains, STEMS.map((s) => ch[s.id].pan));
    download(encodeWav(mix), `yard_mix_${bpm}bpm_${semis >= 0 ? "+" : ""}${semis}st.wav`);
  };

  const exportStem = (id: StemId) => bufs.current && download(encodeWav(bufs.current[id]), `yard_${id}_${bpm}bpm.wav`);

  const exportConfig = () =>
    download(new Blob([JSON.stringify({ bpm, semitones: semis, channels: ch }, null, 2)], { type: "application/json" }), "yard_mix_config.json");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
        <button onClick={toggle} disabled={rendering && !bufs.current} className="grid h-11 w-11 place-items-center rounded-full bg-white text-black disabled:opacity-50" aria-label={playing ? "Stop" : "Play"}>
          {rendering && !bufs.current ? <CommunityMark className="h-5 w-5" spin /> : playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>
        <div className="relative h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-0 bg-white/70" style={{ width: `${(pos / duration()) * 100}%` }} />
        </div>
        <label className="flex items-center gap-2 text-xs text-white/60">
          BPM
          <input type="range" className="fader w-28" min={70} max={180} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
          <span className="w-8 font-mono text-white">{bpm}</span>
        </label>
        <div className="flex items-center gap-1 text-xs text-white/60">
          Key
          <button className="chip" onClick={() => setSemis((s) => Math.max(-12, s - 1))}>−</button>
          <span className="w-10 text-center font-mono text-white">{semis > 0 ? "+" : ""}{semis} st</span>
          <button className="chip" onClick={() => setSemis((s) => Math.min(12, s + 1))}>+</button>
        </div>
        {rendering && bufs.current && <span className="flex items-center gap-1 text-[11px] text-white/50"><CommunityMark className="h-3 w-3" spin /> re-rendering</span>}
        <button className="chip flex items-center gap-1" onClick={() => { setCh(initial()); setBpm(140); setSemis(0); }}><RotateCcw size={11} /> Reset</button>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-white/5">
        <div ref={master} className="h-full origin-left bg-gradient-to-r from-white via-white to-[var(--color-signal)] transition-transform duration-75" />
      </div>

      <div className="no-scrollbar grid grid-flow-col auto-cols-[minmax(92px,1fr)] gap-2 overflow-x-auto pb-1">
        {STEMS.map((s) => {
          const c = ch[s.id];
          return (
            <div key={s.id} className="flex flex-col items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
              <div className="flex w-full items-center justify-between">
                <span className="h-2 w-2 rounded-full" style={{ background: `hsl(${s.hue} 80% 60%)` }} />
                <button onClick={() => exportStem(s.id)} aria-label={`Download ${s.name}`} className="text-white/35 hover:text-white"><Download size={12} /></button>
              </div>
              <div className="w-full text-center text-[11px] leading-tight text-white/80">{s.name}</div>
              <label className="w-full text-center text-[10px] text-white/40">
                Pan{" "}{c.pan === 0 ? "C" : c.pan < 0 ? `L${Math.round(-c.pan * 100)}` : `R${Math.round(c.pan * 100)}`}
                <input type="range" className="fader mt-1" min={-1} max={1} step={0.01} value={c.pan} onChange={(e) => set(s.id, { pan: +e.target.value })} onDoubleClick={() => set(s.id, { pan: 0 })} />
              </label>
              <div className="flex h-44 items-stretch gap-2">
                <div className="relative w-1.5 overflow-hidden rounded-full bg-white/10">
                  <div ref={(el) => { meters.current[s.id] = el; }} className="absolute inset-0 origin-bottom" style={{ background: `linear-gradient(to top, hsl(${s.hue} 80% 60%), #fff)`, transform: "scaleY(0)" }} />
                </div>
                <input
                  type="range"
                  aria-label={`${s.name} volume`}
                  min={0}
                  max={1.2}
                  step={0.01}
                  value={c.vol}
                  onChange={(e) => set(s.id, { vol: +e.target.value })}
                  className="fader h-44 w-6 [direction:rtl] [writing-mode:vertical-lr]"
                />
              </div>
              <div className="font-mono text-[10px] text-white/50">{c.vol === 0 ? "-∞" : (20 * Math.log10(c.vol)).toFixed(1)} dB</div>
              <div className="flex gap-1">
                <button onClick={() => set(s.id, { mute: !c.mute })} className={`h-7 w-7 rounded-lg text-[11px] font-semibold ${c.mute ? "bg-[var(--color-signal)] text-white" : "bg-white/8 text-white/60"}`}>M</button>
                <button onClick={() => set(s.id, { solo: !c.solo })} className={`h-7 w-7 rounded-lg text-[11px] font-semibold ${c.solo ? "bg-[var(--color-lime)] text-black" : "bg-white/8 text-white/60"}`}>S</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.04] p-4">
        <div>
          <div className="text-sm">Export matrix</div>
          <div className="text-[11px] text-white/45">24-bit WAV. Mutes, solos, pans, tempo and key are printed into the mix.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => STEMS.forEach((s, i) => setTimeout(() => exportStem(s.id), i * 250))} className="btn btn-ghost text-xs">All stems</button>
          <button onClick={exportConfig} className="btn btn-ghost text-xs">Split config</button>
          <button onClick={exportMix} className="btn btn-light text-xs"><Download size={13} /> Mix preview</button>
        </div>
      </div>
    </div>
  );
}
