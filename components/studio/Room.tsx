"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crown, Mic, MicOff, Pause, Play, Plug, Trash2, Upload } from "lucide-react";
import Cover from "@/components/Cover";
import { CommunityMark } from "@/components/Logo";
import { mixdown, peaks, renderStems } from "@/lib/audio";
import { fmtTime } from "@/components/app/Player";

type Marker = { id: string; t: number; text: string; by: string; voice?: string; at: number };
type Msg =
  | { type: "transport"; playing: boolean; pos: number; sent: number; from: string }
  | { type: "markers"; markers: Marker[]; from: string }
  | { type: "hello" | "here"; from: string; name: string; host: boolean }
  | { type: "host"; from: string };

const ROOM = "night-session";
const STORE = `yard:room:${ROOM}:markers`;
const NAMES = ["Jay", "Nia", "Vee", "Tess", "Dre", "Mira", "Kwame", "Lena"];

/**
 * DAW-Sync room. Transport and markers sync between every tab that has this
 * room open (BroadcastChannel stands in for the Socket.io room in production),
 * so opening a second tab shows the host-locked playhead live.
 */
export default function Room() {
  const [me] = useState(() => ({ id: Math.random().toString(36).slice(2, 8), name: NAMES[Math.floor(Math.random() * NAMES.length)] }));
  const [host, setHost] = useState<string | null>(null);
  const [peers, setPeers] = useState<Record<string, { name: string; host: boolean }>>({});
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [buf, setBuf] = useState<AudioBuffer | null>(null);
  const [title, setTitle] = useState("Glass House (Remix) · V2");
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [draft, setDraft] = useState<{ t: number; text: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [voice, setVoice] = useState<string | undefined>();
  const [view, setView] = useState<"spectrum" | "scope">("spectrum");
  const [daw, setDaw] = useState<string>("");
  const [drift, setDrift] = useState(0);

  const isHost = host === me.id;
  const ch = useRef<BroadcastChannel | null>(null);
  const a = useRef<{ ctx: AudioContext; analyser: AnalyserNode; src?: AudioBufferSourceNode; startedAt: number; offset: number; live?: MediaStreamAudioSourceNode } | null>(null);
  const wave = useRef<HTMLCanvasElement>(null);
  const viz = useRef<HTMLCanvasElement>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const bufRef = useRef(buf);
  bufRef.current = buf;
  const hostRef = useRef(host);
  hostRef.current = host;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const [joined, setJoined] = useState(false);

  const engine = () => {
    if (!a.current) {
      const ctx = new AudioContext({ sampleRate: 48000, latencyHint: "interactive" });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.connect(ctx.destination);
      a.current = { ctx, analyser, startedAt: 0, offset: 0 };
    }
    return a.current;
  };

  const send = (m: Msg) => ch.current?.postMessage(m);

  const stopSrc = () => {
    if (a.current?.src) {
      a.current.src.stop();
      a.current.src = undefined;
    }
  };

  const startAt = useCallback((offset: number) => {
    const e = engine();
    const b = bufRef.current;
    if (!b) return;
    stopSrc();
    const src = e.ctx.createBufferSource();
    src.buffer = b;
    src.loop = true;
    src.connect(e.analyser);
    const o = ((offset % b.duration) + b.duration) % b.duration;
    src.start(0, o);
    e.src = src;
    e.startedAt = e.ctx.currentTime - o;
    e.offset = o;
  }, []);

  const now = () => {
    const e = a.current;
    const b = bufRef.current;
    if (!e || !b) return 0;
    return e.src ? (e.ctx.currentTime - e.startedAt) % b.duration : e.offset;
  };

  // Apply transport state from the host (listener side).
  const applyTransport = useCallback(
    (playing: boolean, p: number, sent: number) => {
      const e = engine();
      const latency = (Date.now() - sent) / 1000;
      const target = p + (playing ? latency : 0);
      setDrift(Math.round(Math.abs(now() - target) * 1000));
      if (playing) {
        e.ctx.resume();
        startAt(target);
      } else {
        stopSrc();
        e.offset = p;
        setPos(p);
      }
      setPlaying(playing);
    },
    [startAt],
  );

  // Session audio: a rendered mix of the studio stems.
  useEffect(() => {
    renderStems(140, 0).then((s) => setBuf(mixdown(Object.values(s), [0.9, 0.8, 0.6, 0.9, 0.8, 0.7, 0.8, 0.6])));
    try {
      const saved = localStorage.getItem(STORE);
      setMarkers(
        saved
          ? JSON.parse(saved)
          : [
              { id: "m1", t: 1.7, text: "Vocal sits too loud here", by: "Nia", at: Date.now() },
              { id: "m2", t: 4.9, text: "Love this 808 slide", by: "Vee", at: Date.now() },
            ],
      );
    } catch {}
  }, []);

  // Channel wiring.
  useEffect(() => {
    const c = new BroadcastChannel(`yard-room-${ROOM}`);
    ch.current = c;
    c.onmessage = (ev: MessageEvent<Msg>) => {
      const m = ev.data;
      if (m.type === "hello") {
        setPeers((p) => ({ ...p, [m.from]: { name: m.name, host: m.host } }));
        c.postMessage({ type: "here", from: me.id, name: me.name, host: hostRef.current === me.id } satisfies Msg);
        if (hostRef.current === me.id) c.postMessage({ type: "transport", playing: playingRef.current, pos: now(), sent: Date.now(), from: me.id } satisfies Msg);
      }
      if (m.type === "here") {
        setPeers((p) => ({ ...p, [m.from]: { name: m.name, host: m.host } }));
        if (m.host) setHost(m.from);
      }
      if (m.type === "host") setHost(m.from);
      if (m.type === "transport") applyTransport(m.playing, m.pos, m.sent);
      if (m.type === "markers") setMarkers(m.markers);
    };
    c.postMessage({ type: "hello", from: me.id, name: me.name, host: false } satisfies Msg);
    // If nobody answers as host, take the chair.
    const t = setTimeout(() => setHost((h) => h ?? me.id), 400);
    return () => {
      clearTimeout(t);
      c.close();
    };
  }, [me, applyTransport]);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(markers.filter((m) => !m.voice?.startsWith("blob:"))));
    } catch {}
  }, [markers]);

  useEffect(() => () => void a.current?.ctx.close(), []);

  const toggle = async () => {
    if (!isHost || !buf) return;
    const e = engine();
    await e.ctx.resume();
    const p = now();
    if (playing) {
      stopSrc();
      e.offset = p;
    } else startAt(p);
    setPlaying(!playing);
    send({ type: "transport", playing: !playing, pos: p, sent: Date.now(), from: me.id });
  };

  const seek = (t: number) => {
    if (!isHost) return;
    const e = engine();
    if (playing) startAt(t);
    else e.offset = t;
    setPos(t);
    send({ type: "transport", playing, pos: t, sent: Date.now(), from: me.id });
  };

  const takeHost = () => {
    setHost(me.id);
    send({ type: "host", from: me.id });
  };

  const updateMarkers = (next: Marker[]) => {
    setMarkers(next);
    send({ type: "markers", markers: next, from: me.id });
  };

  const addMarker = () => {
    if (!draft || (!draft.text.trim() && !voice)) return;
    updateMarkers([...markers, { id: Math.random().toString(36).slice(2), t: draft.t, text: draft.text.trim() || "Voice note", by: me.name, voice, at: Date.now() }].sort((x, y) => x.t - y.t));
    setDraft(null);
    setVoice(undefined);
  };

  const toggleRecord = async () => {
    if (recording) {
      rec.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        setVoice(URL.createObjectURL(new Blob(chunks, { type: r.mimeType })));
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
      };
      r.start();
      rec.current = r;
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };

  // Capture the audio interface / DAW output with all browser processing off,
  // at 48kHz. In production this stream goes to peers over WebRTC with Opus
  // disabled in favour of L24 PCM; here it feeds the live analyser.
  const connectDaw = async () => {
    try {
      const e = engine();
      await e.ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 48000, sampleSize: 24, channelCount: 2 },
      });
      const track = stream.getAudioTracks()[0];
      const s = track.getSettings();
      e.live?.disconnect();
      e.live = e.ctx.createMediaStreamSource(stream);
      e.live.connect(e.analyser);
      setDaw(`${track.label || "Input"} · ${s.sampleRate ?? 48000} Hz · ${s.channelCount ?? 2}ch`);
    } catch {
      setDaw("Input permission denied");
    }
  };

  const loadFile = async (f: File) => {
    const e = engine();
    const b = await e.ctx.decodeAudioData(await f.arrayBuffer());
    stopSrc();
    e.offset = 0;
    setPlaying(false);
    setBuf(b);
    setTitle(f.name);
  };

  // Waveform + playhead + markers.
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = wave.current;
      const b = bufRef.current;
      if (c && b) {
        const g = c.getContext("2d")!;
        const dpr = devicePixelRatio || 1;
        const w = c.clientWidth;
        const h = c.clientHeight;
        if (c.width !== w * dpr) {
          c.width = w * dpr;
          c.height = h * dpr;
        }
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        const n = Math.floor(w / 3);
        const pk = peaks(b, n);
        const t = playingRef.current ? now() : a.current?.offset ?? 0;
        if (playingRef.current) setPos(t);
        const head = t / b.duration;
        for (let i = 0; i < n; i++) {
          const v = Math.max(0.02, pk[i]) * h * 0.9;
          g.fillStyle = i / n < head ? "#fff" : "rgba(255,255,255,0.25)";
          g.fillRect(i * 3, (h - v) / 2, 2, v);
        }
        g.fillStyle = "#ff4d9d";
        g.fillRect(head * w - 1, 0, 2, h);
      }
      const v = viz.current;
      if (v && a.current) {
        const g = v.getContext("2d")!;
        const w = (v.width = v.clientWidth);
        const h = (v.height = v.clientHeight);
        g.clearRect(0, 0, w, h);
        const an = a.current.analyser;
        if (view === "spectrum") {
          const d = new Uint8Array(an.frequencyBinCount);
          an.getByteFrequencyData(d);
          const bars = 64;
          for (let i = 0; i < bars; i++) {
            const val = d[Math.floor((i / bars) ** 1.7 * d.length * 0.8)] / 255;
            g.fillStyle = `hsl(${320 - i * 2} 90% ${45 + val * 30}%)`;
            g.fillRect((i / bars) * w, h - val * h, w / bars - 2, val * h);
          }
        } else {
          const d = new Uint8Array(an.fftSize);
          an.getByteTimeDomainData(d);
          g.strokeStyle = "#d7f542";
          g.lineWidth = 1.5;
          g.beginPath();
          d.forEach((x, i) => {
            const px = (i / d.length) * w;
            const py = (x / 255) * h;
            if (i) g.lineTo(px, py);
            else g.moveTo(px, py);
          });
          g.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const dur = buf?.duration ?? 1;
  const people = [{ id: me.id, name: `${me.name} (you)`, host: isHost }, ...Object.entries(peers).map(([id, p]) => ({ id, name: p.name, host: host === id }))];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
          <Cover seed="glass-room" hue={340} className="h-12 w-12 rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm">{title}</div>
            <div className="text-[11px] text-white/45">{buf ? `${buf.sampleRate / 1000} kHz · ${buf.numberOfChannels}ch · ${fmtTime(buf.duration)}` : "rendering session…"}</div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11px] ${isHost ? "bg-[var(--color-signal)]" : "bg-white/10"}`}>{isHost ? "You're hosting" : "Following host"}</span>
          {!isHost && <button onClick={takeHost} className="chip">Take host</button>}
          <label className="chip flex cursor-pointer items-center gap-1">
            <Upload size={11} /> Load WAV/FLAC
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
          </label>
        </div>

        <div className="rounded-3xl bg-black/30 p-4">
          <div className="relative">
            <canvas
              ref={wave}
              className={`h-32 w-full ${isHost ? "cursor-pointer" : "cursor-crosshair"}`}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const t = ((e.clientX - r.left) / r.width) * dur;
                if (e.shiftKey || !isHost) setDraft({ t, text: "" });
                else seek(t);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                setDraft({ t: ((e.clientX - r.left) / r.width) * dur, text: "" });
              }}
            />
            {markers.map((m) => (
              <button
                key={m.id}
                onClick={() => seek(m.t)}
                title={`${fmtTime(m.t)} · ${m.by}: ${m.text}`}
                className="group absolute -top-2 -translate-x-1/2"
                style={{ left: `${(m.t / dur) * 100}%` }}
              >
                <span className="block h-3 w-3 rotate-45 rounded-sm bg-[var(--color-lime)] shadow-[0_0_12px_rgba(215,245,66,0.7)]" />
                <span className="pointer-events-none absolute left-1/2 top-4 z-10 hidden w-max max-w-[200px] -translate-x-1/2 rounded-lg bg-white px-2 py-1 text-[11px] text-black group-hover:block">
                  {m.by}: {m.text}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={toggle} disabled={!isHost || !buf} className="grid h-10 w-10 place-items-center rounded-full bg-white text-black disabled:opacity-40" aria-label={playing ? "Pause" : "Play"}>
              {!buf ? <CommunityMark className="h-4 w-4" spin /> : playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </button>
            <span className="font-mono text-xs text-white/60">{fmtTime(pos)}.{String(Math.floor((pos % 1) * 1000)).padStart(3, "0")}</span>
            <span className="text-[11px] text-white/40">
              {isHost ? "Click to scrub · shift/right-click to drop a marker" : "Host controls playback · click to drop a marker"}
            </span>
            {!isHost && !joined && (
              <button onClick={() => engine().ctx.resume().then(() => setJoined(true))} className="btn btn-signal ml-auto text-xs">Tap to hear the room</button>
            )}
            {!isHost && joined && <span className="ml-auto text-[11px] text-white/40">drift {drift}ms</span>}
          </div>
        </div>

        {draft && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/[0.06] p-3">
            <span className="rounded-md bg-[var(--color-lime)] px-2 py-1 font-mono text-xs text-black">{fmtTime(draft.t)}</span>
            <input
              autoFocus
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addMarker()}
              placeholder="e.g. vocal sits too loud"
              className="field flex-1"
            />
            <button onClick={toggleRecord} className={`btn ${recording ? "btn-signal" : "btn-ghost"} text-xs`} aria-label="Record voice note">
              {recording ? <MicOff size={14} /> : <Mic size={14} />} {recording ? "Stop" : voice ? "Re-record" : "Voice"}
            </button>
            <button onClick={addMarker} className="btn btn-light text-xs">Drop marker</button>
            <button onClick={() => setDraft(null)} className="btn btn-ghost text-xs">Cancel</button>
          </div>
        )}

        <div className="rounded-3xl bg-black/30 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex gap-1.5">
              {(["spectrum", "scope"] as const).map((v) => (
                <button key={v} data-active={view === v} onClick={() => setView(v)} className="chip capitalize">{v === "scope" ? "Oscilloscope" : "Spectrum"}</button>
              ))}
            </div>
            <button onClick={connectDaw} className="chip flex items-center gap-1"><Plug size={11} /> Connect DAW / interface</button>
          </div>
          <canvas ref={viz} className="h-28 w-full" />
          {daw && <div className="mt-2 text-[11px] text-white/50">Live input: {daw}</div>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl bg-white/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span>In the room</span>
            <span className="text-[11px] text-white/45">{people.length} synced</span>
          </div>
          {people.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-1.5 text-sm">
              <Cover seed={p.id} hue={p.name.charCodeAt(0) * 7} className="h-7 w-7 rounded-full" />
              <span className="flex-1 truncate">{p.name}</span>
              {p.host && <Crown size={13} className="text-[var(--color-lime)]" />}
            </div>
          ))}
          <p className="mt-3 text-[11px] text-white/40">Open this page in a second tab to join as a listener and watch the playhead follow the host.</p>
        </div>
        <div className="rounded-3xl bg-white/[0.04] p-4">
          <div className="mb-3 text-sm">Markers</div>
          <div className="thin-scroll max-h-72 space-y-2 overflow-y-auto">
            {markers.map((m) => (
              <div key={m.id} className="group rounded-xl bg-white/[0.04] p-2.5">
                <div className="flex items-center gap-2">
                  <button onClick={() => seek(m.t)} className="rounded bg-[var(--color-lime)] px-1.5 font-mono text-[11px] text-black">{fmtTime(m.t)}</button>
                  <span className="text-[11px] text-white/45">{m.by}</span>
                  <button onClick={() => updateMarkers(markers.filter((x) => x.id !== m.id))} aria-label="Delete marker" className="ml-auto hidden text-white/40 hover:text-white group-hover:block"><Trash2 size={12} /></button>
                </div>
                <div className="mt-1 text-sm">{m.text}</div>
                {m.voice && <audio src={m.voice} controls className="mt-2 h-8 w-full" />}
              </div>
            ))}
            {!markers.length && <div className="text-xs text-white/40">No markers yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
