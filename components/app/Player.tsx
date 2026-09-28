"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { mixdown, renderStems } from "@/lib/audio";
import { TRACKS, type Track } from "@/lib/data";

type PlayerState = {
  track: Track;
  playing: boolean;
  loading: boolean;
  position: number;
  duration: number;
  volume: number;
  play: (t?: Track) => void;
  toggle: () => void;
  next: (d?: number) => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
};

const Ctx = createContext<PlayerState | null>(null);
export const usePlayer = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer outside PlayerProvider");
  return c;
};

// Every catalogue track is a generated loop; tempo and key come from the id so
// each one sounds different.
const trackParams = (t: Track) => {
  const n = [...t.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return { bpm: 128 + (n % 5) * 8, semis: (n % 7) - 3 };
};

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [track, setTrack] = useState<Track>(TRACKS[0]);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVol] = useState(0.8);
  const a = useRef<{ ctx: AudioContext; gain: GainNode; src?: AudioBufferSourceNode; buf?: AudioBuffer; startedAt: number; offset: number; id?: string }>(null);
  const cache = useRef(new Map<string, AudioBuffer>());

  const engine = () => {
    if (!a.current) {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
      a.current = { ctx, gain, startedAt: 0, offset: 0 };
    }
    return a.current;
  };

  const bufferFor = async (t: Track) => {
    const hit = cache.current.get(t.id);
    if (hit) return hit;
    const { bpm, semis } = trackParams(t);
    const stems = await renderStems(bpm, semis);
    const buf = mixdown(Object.values(stems), [0.9, 0.8, 0.6, 0.9, 0.8, 0.7, 0.7, 0.6]);
    cache.current.set(t.id, buf);
    return buf;
  };

  const stopSrc = () => {
    const e = a.current;
    if (e?.src) {
      e.src.onended = null;
      e.src.stop();
      e.src = undefined;
    }
  };

  const startAt = useCallback((offset: number) => {
    const e = a.current!;
    stopSrc();
    const src = e.ctx.createBufferSource();
    src.buffer = e.buf!;
    src.loop = true;
    src.connect(e.gain);
    src.start(0, offset % e.buf!.duration);
    e.src = src;
    e.startedAt = e.ctx.currentTime - offset;
    e.offset = offset;
  }, []);

  const play = useCallback(
    async (t?: Track) => {
      const e = engine();
      await e.ctx.resume();
      const target = t ?? track;
      if (target.id !== e.id || !e.buf) {
        setTrack(target);
        setLoading(true);
        e.buf = await bufferFor(target);
        e.id = target.id;
        setDuration(e.buf.duration);
        setLoading(false);
        startAt(0);
      } else startAt(e.offset);
      setPlaying(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [track, startAt],
  );

  const pause = () => {
    const e = a.current;
    if (!e) return;
    e.offset = (e.ctx.currentTime - e.startedAt) % (e.buf?.duration || 1);
    stopSrc();
    setPlaying(false);
  };

  const toggle = () => (playing ? pause() : play());

  const next = (d = 1) => {
    const i = TRACKS.findIndex((x) => x.id === track.id);
    play(TRACKS[(i + d + TRACKS.length) % TRACKS.length]);
  };

  const seek = (sec: number) => {
    const e = a.current;
    if (!e?.buf) return;
    if (playing) startAt(sec);
    else e.offset = sec;
    setPosition(sec);
  };

  const setVolume = (v: number) => {
    setVol(v);
    if (a.current) a.current.gain.gain.setTargetAtTime(v, a.current.ctx.currentTime, 0.02);
  };

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const e = a.current;
      if (e?.buf) setPosition((e.ctx.currentTime - e.startedAt) % e.buf.duration);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => () => void a.current?.ctx.close(), []);

  return (
    <Ctx.Provider value={{ track, playing, loading, position, duration, volume, play, toggle, next, seek, setVolume }}>
      {children}
    </Ctx.Provider>
  );
}

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
