"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** 0..1 scroll progress through the hero; drives rotation and reveal. */
  progress: { get: () => number };
  /** Explore mode swaps the steel finish for gold and copper. */
  explore: boolean;
  /** Increments whenever the user taps the stand (pulse). */
  pulse: number;
  onHotspots?: (pts: { x: number; y: number }[]) => void;
};

type V3 = [number, number, number];
type RGB = [number, number, number];
type Seg = { x1: number; y1: number; x2: number; y2: number; z: number; w: number; c: string };
type Quad = { pts: { x: number; y: number }[]; z: number; fill: string };
type Material = { base: RGB; spec: number; shine: number; rim: RGB; ambient: number };

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const LIGHT = norm([-0.45, 0.65, -0.6]);
const FILL = norm([0.8, -0.1, -0.4]);

// Stand layout in world units (y up).
const POLE_X = 0.35;
const POLE_TOP = 0.42;
const OUTER_END = -0.25; // outer braid stops here, cordex-style cutaway
const INNER_END = 0.02; // inner braid stops here; glossy core above
const OUTER_R = 0.085;
const INNER_R = 0.066;
const CORE_R = 0.05;

/**
 * A mic stand with a handheld vocal mic, drawn on a 2D canvas with a small
 * perspective projector. The pole is a braided steel sleeve with a cutaway
 * that reveals an inner braid and a glossy core (after the cordex product
 * shot). The mic sits in a clip at the top, angled up, with its cable hanging
 * down. It turns with scroll, leans toward the cursor, and a tap sends sound
 * rings out of the grille.
 */
export default function Sculpture({ progress, explore, pulse, onHotspots }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const hit = useRef({ t: -10 });
  const mode = useRef(explore ? 1 : 0);
  const modeTarget = useRef(explore ? 1 : 0);
  const hotspotCb = useRef(onHotspots);
  hotspotCb.current = onHotspots;

  useEffect(() => {
    modeTarget.current = explore ? 1 : 0;
  }, [explore]);

  useEffect(() => {
    if (pulse > 0) hit.current = { t: performance.now() / 1000 };
  }, [pulse]);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: PointerEvent) => {
      mouse.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Handheld mic in its own frame: y runs along the mic toward the grille.
    const HANDLE: [number, number][] = [
      [0.118, 0.72], [0.124, 0.69], [0.118, 0.66], [0.1, 0.3], [0.088, -0.05], [0.082, -0.25],
      [0.078, -0.31], [0.06, -0.35], [0.03, -0.365], [0, -0.37],
    ];
    const COLLAR: [number, number][] = [[0.12, 0.79], [0.128, 0.77], [0.128, 0.72], [0.12, 0.705]];
    const CLIP: [number, number][] = [[0.098, 0.12], [0.108, 0.1], [0.108, -0.1], [0.098, -0.12]];
    const BALL_C = 0.92;
    const BALL_R = 0.19;
    const BALL_IN: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI;
      BALL_IN.push([BALL_R * 0.9 * Math.sin(a), BALL_C + BALL_R * 0.9 * Math.cos(a)]);
    }
    // Clip holder: a short swivel cylinder on top of the pole.
    const HOLDER: [number, number][] = [[0, 0.62], [0.05, 0.615], [0.06, 0.6], [0.06, 0.44], [0.05, 0.43], [0, 0.425]];
    // Mic frame: centre at the clip, axis angled up and out to the left.
    const MIC_C: V3 = [POLE_X, 0.72, 0];
    const MIC_A = norm([-0.78, 0.6, 0.12]);

    const frame = (ms: number) => {
      raf = requestAnimationFrame(frame);
      const box = canvas.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= window.innerHeight || document.hidden) return;
      const t = ms / 1000;
      const m = mouse.current;
      m.x += (m.tx - m.x) * 0.06;
      m.y += (m.ty - m.y) * 0.06;
      mode.current += (modeTarget.current - mode.current) * 0.06;
      const p = progress.get();
      const md = mode.current;
      const mobile = w < 640;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const age = t - hit.current.t;
      const amp = age < 2 ? Math.exp(-age * 2.6) * 0.06 : 0;

      const S = Math.min(w * (mobile ? 1.05 : 1), h) * 0.36;
      // Spin the stand around its pole; a tap makes the whole rig shake.
      const rotY = -0.35 + p * 1.4 + m.x * 0.25 + (reduce ? 0 : Math.sin(t * 0.3) * 0.08);
      const rotX = 0.12 - p * 0.1 + m.y * 0.08;
      const rotZ = Math.sin(age * 32) * amp;
      const [cy, sy, cx, sx, cz, sz] = [Math.cos(rotY), Math.sin(rotY), Math.cos(rotX), Math.sin(rotX), Math.cos(rotZ), Math.sin(rotZ)];
      const cam = 3.6;
      const ox = w * (mobile ? 0.7 : 0.6) - p * w * 0.04;
      const oy = h * (mobile ? 0.6 : 0.7) + p * h * 0.04;

      const rot = (v0: V3): V3 => {
        const v: V3 = [v0[0] - POLE_X, v0[1], v0[2]]; // spin about the pole
        const x0 = v[0] * cz - v[1] * sz;
        const y0 = v[0] * sz + v[1] * cz;
        const x1 = x0 * cy + v[2] * sy;
        const z1 = -x0 * sy + v[2] * cy;
        return [x1, y0 * cx - z1 * sx, y0 * sx + z1 * cx];
      };
      const rotN = (n: V3): V3 => {
        const x0 = n[0] * cz - n[1] * sz;
        const y0 = n[0] * sz + n[1] * cz;
        const x1 = x0 * cy + n[2] * sy;
        const z1 = -x0 * sy + n[2] * cy;
        return [x1, y0 * cx - z1 * sx, y0 * sx + z1 * cx];
      };
      const toScreen = (r: V3) => {
        const k = cam / (cam + r[2]);
        return { x: ox + r[0] * k * S, y: oy - r[1] * k * S, z: r[2], k };
      };
      const project = (v: V3) => toScreen(rot(v));

      const light = (n: V3, mat: Material, pos: V3): string => {
        const view = norm([-pos[0], -pos[1], -cam - pos[2]]);
        const key = Math.max(0, dot(n, LIGHT));
        const fill = Math.max(0, dot(n, FILL)) * 0.25;
        const spec = Math.pow(Math.max(0, dot(n, norm([LIGHT[0] + view[0], LIGHT[1] + view[1], LIGHT[2] + view[2]]))), mat.shine) * mat.spec;
        const rim = Math.pow(1 - Math.max(0, dot(n, view)), 3);
        const c = mat.base.map((b, i) => b * (mat.ambient + key * 0.85 + fill) + 255 * spec + mat.rim[i] * rim * 0.55);
        return `rgb(${c.map((v) => Math.round(Math.min(255, v))).join(",")})`;
      };

      // Steel in Full mode, copper/gold in Explore mode; never pink.
      const steel = (lum: number) => {
        const v = Math.min(255, lum * 255);
        return `rgb(${Math.round(Math.min(255, v + md * 70))},${Math.round(v + md * 18)},${Math.round(Math.max(0, v - md * 40))})`;
      };
      const rimTint: RGB = mix([190, 205, 225], [255, 200, 130], md);

      // ------------------------------------------------------------ braids
      const front: Seg[] = [];
      const back: Seg[] = [];
      const braid = (y0: number, y1: number, R: number, carriers: number, wires: number, twist: number, width: number, bright: number) => {
        const steps = Math.max(20, Math.round((y1 - y0) * 70));
        for (let k = 0; k < carriers; k++) {
          const dir = k % 2 ? 1 : -1;
          const base = (Math.PI * 2 * Math.floor(k / 2)) / (carriers / 2);
          for (let wi = 0; wi < wires; wi++) {
            const phase = base + wi * (0.55 / wires);
            let last: ReturnType<typeof toScreen> | null = null;
            for (let i = 0; i <= steps; i++) {
              const y = y0 + ((y1 - y0) * i) / steps;
              const phi = phase + dir * twist * y + (reduce ? 0 : t * 0.1 * dir);
              const weave = Math.sin((carriers / 4) * (phi - dir * twist * y - base) * 2 + (dir > 0 ? 0 : Math.PI));
              const r = R + R * 0.08 * weave;
              const n: V3 = [Math.cos(phi), 0, Math.sin(phi)];
              const pt = project([POLE_X + r * n[0], y, r * n[2]]);
              if (last) {
                const vn = rotN(n);
                const diff = Math.max(0, dot(vn, LIGHT));
                const lum = (0.08 + diff * 0.5 + Math.pow(diff, 12) * 0.6 + (weave > 0 ? 0.08 : -0.06)) * bright;
                (vn[2] < -0.05 ? front : back).push({ x1: last.x, y1: last.y, x2: pt.x, y2: pt.y, z: pt.z, w: Math.max(0.7, width * pt.k * S), c: steel(lum) });
              }
              last = pt;
            }
          }
        }
      };
      braid(-2.4, OUTER_END, OUTER_R, 16, 4, 14, 0.011, 1);
      braid(-2.4, INNER_END, INNER_R, 16, 3, -18, 0.008, 0.75);

      const quads: Quad[] = [];
      const frameLathe = (profile: [number, number][], mat: Material, segs: number, local: (x: number, y: number, z: number) => V3, dirOf: (x: number, y: number, z: number) => V3) => {
        const ring = profile.map(([r, y]) =>
          Array.from({ length: segs }, (_, i) => {
            const a = (i / segs) * Math.PI * 2;
            return rot(local(r * Math.cos(a), y, r * Math.sin(a)));
          }),
        );
        for (let j = 0; j < profile.length - 1; j++) {
          const dr = profile[j + 1][0] - profile[j][0];
          const dy = profile[j + 1][1] - profile[j][1];
          for (let i = 0; i < segs; i++) {
            const i2 = (i + 1) % segs;
            const a = ring[j][i], b = ring[j][i2], c = ring[j + 1][i2], d = ring[j + 1][i];
            const ctr: V3 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
            const ang = ((i + 0.5) / segs) * Math.PI * 2;
            const n = rotN(dirOf(-dy * Math.cos(ang), dr, -dy * Math.sin(ang)));
            if (dot(n, [ctr[0], ctr[1], ctr[2] + cam]) > 0) continue;
            quads.push({ pts: [a, b, c, d].map((v) => toScreen(v)), z: ctr[2], fill: light(n, mat, ctr) });
          }
        }
      };
      const poleLocal = (x: number, y: number, z: number): V3 => [POLE_X + x, y, z];
      const poleDir = (x: number, y: number, z: number): V3 => norm([x, y, z]);

      const chromeMat: Material = { base: mix([160, 164, 172], [225, 180, 95], md), spec: 1, shine: 60, rim: rimTint, ambient: 0.3 };
      const blackMat: Material = { base: mix([24, 24, 27], [40, 32, 22], md), spec: 0.8, shine: 36, rim: rimTint, ambient: 0.35 };
      const clipMat: Material = { base: [18, 18, 20], spec: 0.5, shine: 18, rim: rimTint, ambient: 0.4 };
      const innerMat: Material = { base: [12, 12, 14], spec: 0.2, shine: 10, rim: rimTint, ambient: 0.4 };

      // Dark liner under the braids, then the exposed glossy core up to the holder.
      const liner: [number, number][] = [[CORE_R, INNER_END], [CORE_R, -2.4]];
      frameLathe(liner, { base: [10, 10, 12], spec: 0.1, shine: 8, rim: [40, 40, 50], ambient: 0.5 }, 28, poleLocal, poleDir);
      frameLathe([[CORE_R, POLE_TOP + 0.02], [CORE_R, INNER_END]], chromeMat, 40, poleLocal, poleDir);
      frameLathe(HOLDER, clipMat, 32, poleLocal, poleDir);
      const poleQuads = quads.splice(0);

      // Mic frame.
      const U = norm(cross(MIC_A, [0, 0, 1]));
      const V = norm(cross(MIC_A, U));
      const micLocal = (x: number, y: number, z: number): V3 => [
        MIC_C[0] + x * U[0] + y * MIC_A[0] + z * V[0],
        MIC_C[1] + x * U[1] + y * MIC_A[1] + z * V[1],
        MIC_C[2] + x * U[2] + y * MIC_A[2] + z * V[2],
      ];
      const micDir = (x: number, y: number, z: number): V3 => norm([x * U[0] + y * MIC_A[0] + z * V[0], x * U[1] + y * MIC_A[1] + z * V[1], x * U[2] + y * MIC_A[2] + z * V[2]]);

      frameLathe(HANDLE, blackMat, 56, micLocal, micDir);
      frameLathe(COLLAR, chromeMat, 56, micLocal, micDir);
      frameLathe(CLIP, clipMat, 40, micLocal, micDir);
      const micQuads = quads.splice(0);
      frameLathe(BALL_IN, innerMat, 32, micLocal, micDir);
      const innerQuads = quads.splice(0);

      // Ball grille wires.
      const gFront: Seg[] = [];
      const gBack: Seg[] = [];
      const ballPt = (theta: number, a: number) => ({
        pos: micLocal(BALL_R * Math.sin(theta) * Math.cos(a), BALL_C + BALL_R * Math.cos(theta), BALL_R * Math.sin(theta) * Math.sin(a)),
        n: micDir(Math.sin(theta) * Math.cos(a), Math.cos(theta), Math.sin(theta) * Math.sin(a)),
      });
      const gWire = (a: { pos: V3; n: V3 }, b: { pos: V3; n: V3 }) => {
        const ra = rot(a.pos);
        const rb = rot(b.pos);
        const rn = rotN(b.n);
        const facing = dot(rn, [rb[0], rb[1], rb[2] + cam]) < 0;
        const pa = toScreen(ra);
        const pb = toScreen(rb);
        (facing ? gFront : gBack).push({
          x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, z: (ra[2] + rb[2]) / 2,
          w: Math.max(0.6, 0.006 * pb.k * S),
          c: facing ? light(rn, chromeMat, rb) : "rgba(90,90,96,0.5)",
        });
      };
      const TH_MAX = Math.PI * 0.86;
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2;
        let prev = ballPt(0.001, a);
        for (let j = 1; j <= 16; j++) {
          const cur = ballPt((j / 16) * TH_MAX, a);
          gWire(prev, cur);
          prev = cur;
        }
      }
      for (let j = 1; j <= 9; j++) {
        const th = (j / 9) * TH_MAX;
        let prev = ballPt(th, 0);
        for (let i = 1; i <= 40; i++) {
          const cur = ballPt(th, (i / 40) * Math.PI * 2);
          gWire(prev, cur);
          prev = cur;
        }
      }

      // Cable: out of the handle's end, sags, then hangs straight down.
      const butt = micLocal(0, -0.37, 0);
      const c1: V3 = [butt[0] + 0.28, butt[1] - 0.12, butt[2] + 0.05];
      const c2: V3 = [butt[0] + 0.42, butt[1] - 0.6, butt[2] + 0.08];
      const c3: V3 = [butt[0] + 0.44, -2.6, butt[2] + 0.1];
      const cablePts: ReturnType<typeof toScreen>[] = [];
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        const a = (1 - u) ** 3, b = 3 * u * (1 - u) ** 2, c = 3 * u * u * (1 - u), d = u ** 3;
        cablePts.push(project([
          a * butt[0] + b * c1[0] + c * c2[0] + d * c3[0],
          a * butt[1] + b * c1[1] + c * c2[1] + d * c3[1],
          a * butt[2] + b * c1[2] + c * c2[2] + d * c3[2],
        ]));
      }
      const drawCable = () => {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const [f, off, col] of [[1, 0, "#0c0c0e"], [0.35, -0.3, "rgba(170,178,195,0.35)"]] as const) {
          ctx.strokeStyle = col;
          ctx.lineWidth = 0.022 * S * f;
          ctx.beginPath();
          cablePts.forEach((pt, i) => {
            const o = off * 0.011 * S;
            if (i) ctx.lineTo(pt.x + o, pt.y + o * 0.3);
            else ctx.moveTo(pt.x + o, pt.y + o * 0.3);
          });
          ctx.stroke();
        }
      };

      const drawSegs = (list: Seg[]) => {
        list.sort((a, b) => b.z - a.z);
        ctx.lineCap = "round";
        let cur = "";
        let lw = -1;
        ctx.beginPath();
        for (const s of list) {
          if (s.c !== cur || Math.abs(s.w - lw) > 0.3) {
            ctx.stroke();
            ctx.beginPath();
            ctx.strokeStyle = cur = s.c;
            ctx.lineWidth = lw = s.w;
          }
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
        }
        ctx.stroke();
      };
      const drawQuads = (list: Quad[]) => {
        list.sort((a, b) => b.z - a.z);
        ctx.lineJoin = "round";
        ctx.lineWidth = 0.8;
        for (const q of list) {
          ctx.fillStyle = q.fill;
          ctx.strokeStyle = q.fill;
          ctx.beginPath();
          ctx.moveTo(q.pts[0].x, q.pts[0].y);
          for (let i = 1; i < 4; i++) ctx.lineTo(q.pts[i].x, q.pts[i].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      };

      // Stage glow behind the mic head (neutral white, gold in Explore).
      const ball = project(micLocal(0, BALL_C, 0));
      const glow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, S * 1.6);
      glow.addColorStop(0, `rgba(255,${Math.round(255 - md * 60)},${Math.round(255 - md * 150)},${0.07 + amp * 2})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Back to front: cable (it hangs behind the pole from this angle), pole, mic.
      const cableBehind = cablePts[20].z > project([POLE_X, cablePts[20].y, 0]).z;
      if (cableBehind) drawCable();
      drawSegs(back);
      drawQuads(poleQuads);
      drawSegs(front);
      if (!cableBehind) drawCable();
      drawSegs(gBack);
      drawQuads(innerQuads);
      drawQuads(micQuads);
      drawSegs(gFront);

      // Sound rings after a tap, plus a faint idle pulse.
      const br = BALL_R * ball.k * S;
      for (const d of age < 1.8 ? [0, 0.18, 0.36] : []) {
        const tt = age - d;
        if (tt < 0) continue;
        ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.55 - tt * 0.4)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, br * (1.3 + tt * 5), 0, Math.PI * 2);
        ctx.stroke();
      }
      const ph = (t * 0.35) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.1 * (1 - ph)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, br * (1.4 + ph * 2), 0, Math.PI * 2);
      ctx.stroke();

      if (hotspotCb.current) {
        hotspotCb.current(
          [
            project([POLE_X, -0.9, -OUTER_R]), // braided sleeve
            project([POLE_X, -0.1, -INNER_R]), // cutaway
            project(micLocal(0, 0, -0.11)), // clip
            ball, // grille
          ].map((pt) => ({ x: pt.x, y: pt.y })),
        );
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [progress]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}
