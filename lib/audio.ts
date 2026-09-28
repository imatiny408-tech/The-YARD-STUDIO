// Browser audio engine for The Yard's studio tools.
// Stems are synthesised offline so the prototype ships with no audio assets;
// tempo and key changes re-render the stems, which keeps pitch and tempo
// independent (a real time-stretch/pitch-shift on uploaded audio would swap in
// a phase-vocoder worklet here).

export const SR = 44100;

export type StemId = "kick" | "snare" | "hats" | "808" | "keys" | "lead" | "vox" | "fx";
export const STEMS: { id: StemId; name: string; hue: number }[] = [
  { id: "kick", name: "Kick", hue: 355 },
  { id: "snare", name: "Snare / Clap", hue: 20 },
  { id: "hats", name: "Hats", hue: 45 },
  { id: "808", name: "808 Bass", hue: 270 },
  { id: "keys", name: "Keys", hue: 200 },
  { id: "lead", name: "Melody", hue: 170 },
  { id: "vox", name: "Vocals", hue: 320 },
  { id: "fx", name: "FX", hue: 230 },
];

export const BARS = 8;

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// i – VI – III – VII in A minor, voiced for pads.
const PROGRESSION = [
  [57, 60, 64, 67],
  [53, 57, 60, 64],
  [48, 52, 55, 59],
  [55, 59, 62, 65],
];
const BASS_ROOTS = [33, 29, 36, 31];
const LEAD = [76, 74, 72, 71, 72, 74, 76, 79, 77, 76, 74, 72, 71, 72, 69, 67];
const VOX = [69, 72, 71, 67];

function envGain(ctx: BaseAudioContext, t: number, a: number, peak: number, d: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  return g;
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function schedule(ctx: OfflineAudioContext, id: StemId, bpm: number, semis: number, out: AudioNode) {
  const beat = 60 / bpm;
  const bar = beat * 4;
  const T = (m: number) => m + semis;
  const noise = noiseBuffer(ctx, 1);

  for (let b = 0; b < BARS; b++) {
    const t0 = b * bar;
    if (id === "kick") {
      [0, 1.5, 2.5].forEach((p) => kick(ctx, t0 + p * beat, out));
      if (b % 2 === 1) kick(ctx, t0 + 3.75 * beat, out);
    }
    if (id === "snare") [1, 3].forEach((p) => snare(ctx, noise, t0 + p * beat, out));
    if (id === "hats") {
      for (let s = 0; s < 8; s++) hat(ctx, noise, t0 + s * beat * 0.5, out, s % 2 ? 0.12 : 0.22);
      if (b % 2) for (let r = 0; r < 4; r++) hat(ctx, noise, t0 + 3 * beat + (r * beat) / 4, out, 0.1);
    }
    if (id === "808") {
      const root = T(BASS_ROOTS[b % 4]);
      bass(ctx, t0, bar * 0.7, root, out);
      bass(ctx, t0 + 2.5 * beat, beat * 1.2, root + (b % 2 ? 12 : 7), out);
    }
    if (id === "keys") PROGRESSION[b % 4].forEach((n) => pad(ctx, t0, bar, T(n), out));
    if (id === "lead")
      for (let s = 0; s < 4; s++) pluck(ctx, t0 + s * beat, beat * 0.9, T(LEAD[(b * 4 + s) % LEAD.length]), out);
    if (id === "vox") voice(ctx, t0 + beat * 0.5, bar * 0.8, T(VOX[b % 4]), out);
    if (id === "fx" && b === BARS - 1) riser(ctx, noise, t0, bar, out);
    if (id === "fx" && b % 4 === 0) impact(ctx, noise, t0, out);
  }
}

function kick(ctx: BaseAudioContext, t: number, out: AudioNode) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  const g = envGain(ctx, t, 0.002, 0.9, 0.35);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.4);
}

function snare(ctx: BaseAudioContext, noise: AudioBuffer, t: number, out: AudioNode) {
  const n = ctx.createBufferSource();
  n.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 0.7;
  const g = envGain(ctx, t, 0.001, 0.55, 0.22);
  n.connect(bp).connect(g).connect(out);
  n.start(t);
  n.stop(t + 0.3);
  const o = ctx.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(220, t);
  const g2 = envGain(ctx, t, 0.001, 0.25, 0.08);
  o.connect(g2).connect(out);
  o.start(t);
  o.stop(t + 0.12);
}

function hat(ctx: BaseAudioContext, noise: AudioBuffer, t: number, out: AudioNode, level: number) {
  const n = ctx.createBufferSource();
  n.buffer = noise;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 8000;
  const g = envGain(ctx, t, 0.001, level, 0.05);
  n.connect(hp).connect(g).connect(out);
  n.start(t);
  n.stop(t + 0.08);
}

function bass(ctx: BaseAudioContext, t: number, len: number, note: number, out: AudioNode) {
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(midiHz(note + 12) * 1.5, t);
  o.frequency.exponentialRampToValueAtTime(midiHz(note), t + 0.06);
  const sat = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) curve[i] = Math.tanh(((i / 255) * 2 - 1) * 2.2);
  sat.curve = curve;
  const g = envGain(ctx, t, 0.005, 0.6, len);
  o.connect(sat).connect(g).connect(out);
  o.start(t);
  o.stop(t + len + 0.05);
}

function pad(ctx: BaseAudioContext, t: number, len: number, note: number, out: AudioNode) {
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.linearRampToValueAtTime(2200, t + len * 0.5);
  lp.frequency.linearRampToValueAtTime(900, t + len);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.07, t + 0.25);
  g.gain.setValueAtTime(0.07, t + len - 0.2);
  g.gain.linearRampToValueAtTime(0.0001, t + len);
  lp.connect(g).connect(out);
  [-7, 7].forEach((cents) => {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = midiHz(note);
    o.detune.value = cents;
    o.connect(lp);
    o.start(t);
    o.stop(t + len);
  });
}

function pluck(ctx: BaseAudioContext, t: number, len: number, note: number, out: AudioNode) {
  const o = ctx.createOscillator();
  o.type = "square";
  o.frequency.value = midiHz(note);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(4000, t);
  lp.frequency.exponentialRampToValueAtTime(500, t + 0.3);
  const g = envGain(ctx, t, 0.003, 0.12, Math.min(len, 0.45));
  o.connect(lp).connect(g).connect(out);
  o.start(t);
  o.stop(t + len);
}

// Formant-filtered saw that reads as an "ooh/aah" vocal pad.
function voice(ctx: BaseAudioContext, t: number, len: number, note: number, out: AudioNode) {
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = midiHz(note);
  const vib = ctx.createOscillator();
  vib.frequency.value = 5.2;
  const vibAmt = ctx.createGain();
  vibAmt.gain.value = 6;
  vib.connect(vibAmt).connect(o.detune);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.15);
  g.gain.setValueAtTime(0.18, t + len - 0.2);
  g.gain.linearRampToValueAtTime(0.0001, t + len);
  [
    [700, 8],
    [1220, 10],
    [2600, 12],
  ].forEach(([f, q]) => {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f;
    bp.Q.value = q;
    o.connect(bp).connect(g);
  });
  g.connect(out);
  o.start(t);
  vib.start(t);
  o.stop(t + len);
  vib.stop(t + len);
}

function riser(ctx: BaseAudioContext, noise: AudioBuffer, t: number, len: number, out: AudioNode) {
  const n = ctx.createBufferSource();
  n.buffer = noise;
  n.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 3;
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(9000, t + len);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.3, t + len * 0.98);
  g.gain.linearRampToValueAtTime(0, t + len);
  n.connect(bp).connect(g).connect(out);
  n.start(t);
  n.stop(t + len);
}

function impact(ctx: BaseAudioContext, noise: AudioBuffer, t: number, out: AudioNode) {
  const n = ctx.createBufferSource();
  n.buffer = noise;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(6000, t);
  lp.frequency.exponentialRampToValueAtTime(200, t + 0.9);
  const g = envGain(ctx, t, 0.002, 0.35, 0.9);
  n.connect(lp).connect(g).connect(out);
  n.start(t);
  n.stop(t + 1);
}

/** Renders every stem for a given tempo and transposition. */
export async function renderStems(bpm: number, semis: number): Promise<Record<StemId, AudioBuffer>> {
  const seconds = (60 / bpm) * 4 * BARS;
  const entries = await Promise.all(
    STEMS.map(async ({ id }) => {
      const ctx = new OfflineAudioContext(2, Math.ceil(seconds * SR), SR);
      const bus = ctx.createGain();
      bus.connect(ctx.destination);
      schedule(ctx, id, bpm, id === "kick" || id === "snare" || id === "hats" || id === "fx" ? 0 : semis, bus);
      return [id, await ctx.startRendering()] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<StemId, AudioBuffer>;
}

/** Sums buffers with per-stem gain/pan into one stereo buffer. */
export function mixdown(buffers: AudioBuffer[], gains: number[], pans: number[] = []) {
  const len = Math.max(...buffers.map((b) => b.length));
  const out = new AudioBuffer({ length: len, numberOfChannels: 2, sampleRate: SR });
  const L = out.getChannelData(0);
  const R = out.getChannelData(1);
  buffers.forEach((b, i) => {
    const g = gains[i] ?? 1;
    const p = pans[i] ?? 0;
    const gl = g * Math.cos(((p + 1) * Math.PI) / 4);
    const gr = g * Math.sin(((p + 1) * Math.PI) / 4);
    const bl = b.getChannelData(0);
    const br = b.numberOfChannels > 1 ? b.getChannelData(1) : bl;
    for (let s = 0; s < b.length; s++) {
      L[s] += bl[s] * gl * Math.SQRT2;
      R[s] += br[s] * gr * Math.SQRT2;
    }
  });
  return out;
}

/** Encodes an AudioBuffer as a 24-bit PCM WAV blob. */
export function encodeWav(buffer: AudioBuffer, bitDepth: 16 | 24 = 24) {
  const ch = buffer.numberOfChannels;
  const bytes = bitDepth / 8;
  const dataLen = buffer.length * ch * bytes;
  const view = new DataView(new ArrayBuffer(44 + dataLen));
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, ch, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * ch * bytes, true);
  view.setUint16(32, ch * bytes, true);
  view.setUint16(34, bitDepth, true);
  str(36, "data");
  view.setUint32(40, dataLen, true);
  const chans = Array.from({ length: ch }, (_, i) => buffer.getChannelData(i));
  let o = 44;
  const max = 2 ** (bitDepth - 1) - 1;
  for (let s = 0; s < buffer.length; s++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.round(Math.max(-1, Math.min(1, chans[c][s])) * max);
      if (bitDepth === 16) view.setInt16(o, v, true);
      else {
        view.setUint8(o, v & 0xff);
        view.setUint8(o + 1, (v >> 8) & 0xff);
        view.setUint8(o + 2, (v >> 16) & 0xff);
      }
      o += bytes;
    }
  }
  return new Blob([view], { type: "audio/wav" });
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Peak envelope for drawing waveforms. */
export function peaks(buffer: AudioBuffer, buckets: number) {
  const d = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(d.length / buckets));
  const out = new Float32Array(buckets);
  for (let i = 0; i < buckets; i++) {
    let m = 0;
    for (let s = i * step; s < Math.min(d.length, (i + 1) * step); s++) m = Math.max(m, Math.abs(d[s]));
    out[i] = m;
  }
  return out;
}

/**
 * Onset detection for the sampler's auto-chop: spectral-flux-lite on RMS
 * energy, picking the strongest rises with a minimum gap between slices.
 */
export function detectTransients(buffer: AudioBuffer, count = 16) {
  const d = buffer.getChannelData(0);
  const hop = 512;
  const energy: number[] = [];
  for (let i = 0; i + hop < d.length; i += hop) {
    let e = 0;
    for (let s = i; s < i + hop; s++) e += d[s] * d[s];
    energy.push(Math.sqrt(e / hop));
  }
  const flux = energy.map((e, i) => Math.max(0, e - (energy[i - 1] ?? 0)));
  const minGap = Math.floor((0.08 * buffer.sampleRate) / hop);
  const picked: number[] = [];
  [...flux.keys()]
    .sort((a, b) => flux[b] - flux[a])
    .forEach((i) => {
      if (picked.length < count && flux[i] > 0 && picked.every((p) => Math.abs(p - i) > minGap)) picked.push(i);
    });
  const starts = picked.sort((a, b) => a - b).map((i) => (i * hop) / buffer.sampleRate);
  // Fill with even slices when the file has fewer onsets than pads.
  while (starts.length < count) starts.push((buffer.duration / count) * starts.length);
  return starts.sort((a, b) => a - b).slice(0, count);
}

/** Synthetic room impulse response for the sampler's reverb send. */
export function makeImpulse(ctx: BaseAudioContext, seconds = 2.2, decay = 3) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return ir;
}

/** One-shot kit rendered for the 16-pad sampler. */
export async function renderKit(): Promise<{ name: string; buffer: AudioBuffer }[]> {
  const specs: [string, (ctx: OfflineAudioContext, out: AudioNode) => void, number][] = [
    ["Kick", (c, o) => kick(c, 0, o), 0.5],
    ["Snare", (c, o) => snare(c, noiseBuffer(c, 1), 0, o), 0.4],
    ["Clap", (c, o) => [0, 0.012, 0.024].forEach((t) => snare(c, noiseBuffer(c, 1), t, o)), 0.4],
    ["Hat", (c, o) => hat(c, noiseBuffer(c, 1), 0, o, 0.4), 0.15],
    ["808 A", (c, o) => bass(c, 0, 1.1, 33, o), 1.3],
    ["808 C", (c, o) => bass(c, 0, 1.1, 36, o), 1.3],
    ["808 D", (c, o) => bass(c, 0, 1.1, 38, o), 1.3],
    ["808 E", (c, o) => bass(c, 0, 1.1, 40, o), 1.3],
    ["Am", (c, o) => PROGRESSION[0].forEach((n) => pad(c, 0, 1.2, n, o)), 1.3],
    ["F", (c, o) => PROGRESSION[1].forEach((n) => pad(c, 0, 1.2, n, o)), 1.3],
    ["C", (c, o) => PROGRESSION[2].forEach((n) => pad(c, 0, 1.2, n, o)), 1.3],
    ["G", (c, o) => PROGRESSION[3].forEach((n) => pad(c, 0, 1.2, n, o)), 1.3],
    ["Vox A", (c, o) => voice(c, 0, 0.8, 69, o), 0.9],
    ["Vox C", (c, o) => voice(c, 0, 0.8, 72, o), 0.9],
    ["Pluck", (c, o) => pluck(c, 0, 0.5, 76, o), 0.6],
    ["Impact", (c, o) => impact(c, noiseBuffer(c, 1), 0, o), 1.1],
  ];
  return Promise.all(
    specs.map(async ([name, fn, len]) => {
      const ctx = new OfflineAudioContext(2, Math.ceil(len * SR), SR);
      fn(ctx, ctx.destination);
      return { name, buffer: await ctx.startRendering() };
    }),
  );
}
