"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** 0..1 scroll progress through the hero; drives rotation and reveal. */
  progress: { get: () => number };
  /** Explore mode swaps the steel braid for a warm copper weave and gold mic. */
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

/**
 * A braided gooseneck mic stand holding a handheld vocal mic, drawn on a 2D
 * canvas with a small perspective projector. The braided arm is the original
 * "cable" sculpture; it rises out of frame, arcs over and points the mic down
 * at the singer. It turns with scroll, leans toward the cursor, wobbles when
 * tapped and sends sound rings out of the grille.
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

    const CARRIERS = 16; // 8 each direction, like a real 2-over-2 braid
    const WIRES = 3; // fine wires per carrier
    const STEPS = 110;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Gooseneck spine: rises from below the frame, arcs over, ends pointing down-left.
    const P0: V3 = [0.55, -1.95, 0];
    const P1: V3 = [0.5, 1.2, 0];
    const P2: V3 = [0.02, 0.62, 0.12];
    const BRAID_END = 0.9;

    // Handheld mic, in its own frame: y runs along the mic toward the grille.
    const HANDLE: [number, number][] = [
      [0.118, 0.9], [0.124, 0.87], [0.118, 0.84], [0.1, 0.45], [0.088, 0.1], [0.082, -0.1],
      [0.078, -0.16], [0.06, -0.2], [0.03, -0.215], [0, -0.22],
    ];
    const COLLAR: [number, number][] = [[0.12, 0.97], [0.128, 0.95], [0.128, 0.9], [0.12, 0.885]];
    const CLIP: [number, number][] = [[0.1, 0.22], [0.108, 0.2], [0.108, 0.02], [0.1, 0]];
    const BALL_C = 1.1;
    const BALL_R = 0.19;
    const BALL_IN: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI;
      BALL_IN.push([BALL_R * 0.9 * Math.sin(a), BALL_C + BALL_R * 0.9 * Math.cos(a)]);
    }

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

      const S = Math.min(w * (mobile ? 1.25 : 1), h) * 0.44;
      const rotY = -0.3 + p * 1.0 + m.x * 0.2 + (reduce ? 0 : Math.sin(t * 0.35) * 0.05);
      const rotX = 0.1 - p * 0.2 + m.y * 0.1;
      const rotZ = p * 0.25;
      const [cy, sy, cx, sx, cz, sz] = [Math.cos(rotY), Math.sin(rotY), Math.cos(rotX), Math.sin(rotX), Math.cos(rotZ), Math.sin(rotZ)];
      const cam = 3.4;
      const ox = w * (mobile ? 0.84 : 0.63) - p * w * 0.05;
      const oy = h * (mobile ? 0.4 : 0.48) + p * h * 0.05;

      const rot = (v: V3): V3 => {
        const x0 = v[0] * cz - v[1] * sz;
        const y0 = v[0] * sz + v[1] * cz;
        const x1 = x0 * cy + v[2] * sy;
        const z1 = -x0 * sy + v[2] * cy;
        return [x1, y0 * cx - z1 * sx, y0 * sx + z1 * cx];
      };
      const toScreen = (r: V3) => {
        const k = cam / (cam + r[2]);
        return { x: ox + r[0] * k * S, y: oy - r[1] * k * S, z: r[2], k };
      };
      const project = (v: V3) => toScreen(rot(v));

      // Tap: the arm wobbles like a gooseneck and the grille sends rings.
      const age = t - hit.current.t;
      const amp = age < 2.5 ? Math.exp(-age * 2.4) * 0.07 : 0;

      const spine = (u: number) => {
        const a = (1 - u) * (1 - u);
        const b = 2 * u * (1 - u);
        const c = u * u;
        const pos: V3 = [a * P0[0] + b * P1[0] + c * P2[0], a * P0[1] + b * P1[1] + c * P2[1], a * P0[2] + b * P1[2] + c * P2[2]];
        const tan3 = norm([
          2 * (1 - u) * (P1[0] - P0[0]) + 2 * u * (P2[0] - P1[0]),
          2 * (1 - u) * (P1[1] - P0[1]) + 2 * u * (P2[1] - P1[1]),
          2 * (1 - u) * (P1[2] - P0[2]) + 2 * u * (P2[2] - P1[2]),
        ]);
        const N = norm([-tan3[1], tan3[0], 0]);
        const wob = amp * Math.sin(u * Math.PI) * Math.sin(age * 34);
        pos[0] += N[0] * wob;
        pos[1] += N[1] * wob;
        return { pos, N, B: norm(cross(tan3, N)), T: tan3 };
      };

      // Blinn-Phong-ish light with a coloured rim, for the mic's solid parts.
      const light = (n: V3, mat: Material, pos: V3): string => {
        const view = norm([-pos[0], -pos[1], -cam - pos[2]]);
        const key = Math.max(0, dot(n, LIGHT));
        const fill = Math.max(0, dot(n, FILL)) * 0.25;
        const spec = Math.pow(Math.max(0, dot(n, norm([LIGHT[0] + view[0], LIGHT[1] + view[1], LIGHT[2] + view[2]]))), mat.shine) * mat.spec;
        const rim = Math.pow(1 - Math.max(0, dot(n, view)), 3);
        const c = mat.base.map((b, i) => b * (mat.ambient + key * 0.85 + fill) + 255 * spec + mat.rim[i] * rim * 0.6);
        return `rgb(${c.map((v) => Math.round(Math.min(255, v))).join(",")})`;
      };

      // ---------------------------------------------------------------- braid
      const braidR = 0.1;
      const coreR = 0.075;
      const front: Seg[] = [];
      const back: Seg[] = [];
      for (let k = 0; k < CARRIERS; k++) {
        const dir = k % 2 ? 1 : -1;
        const base = (Math.PI * 2 * Math.floor(k / 2)) / (CARRIERS / 2);
        const accent = md < 0.5 && k === 5;
        for (let wi = 0; wi < WIRES; wi++) {
          const phase = base + wi * 0.09;
          let last: ReturnType<typeof toScreen> | null = null;
          for (let i = 0; i <= STEPS; i++) {
            const u = (i / STEPS) * BRAID_END;
            const s = spine(u);
            const phi = phase + dir * 30 * u + (reduce ? 0 : t * 0.12 * dir);
            const weave = Math.sin((CARRIERS / 4) * (phi - dir * 30 * u - base) * 2 + (dir > 0 ? 0 : Math.PI));
            const r = braidR + 0.009 * weave;
            const cph = Math.cos(phi);
            const sph = Math.sin(phi);
            const nrm: V3 = [cph * s.N[0] + sph * s.B[0], cph * s.N[1] + sph * s.B[1], cph * s.N[2] + sph * s.B[2]];
            const pt = project([s.pos[0] + r * nrm[0], s.pos[1] + r * nrm[1], s.pos[2] + r * nrm[2]]);
            if (last) {
              const vn = rot(nrm);
              const diff = Math.max(0, dot(vn, LIGHT));
              const spec = Math.pow(diff, 12);
              const lum = 0.08 + diff * 0.5 + spec * 0.55 + (weave > 0 ? 0.08 : -0.06);
              let col: string;
              if (accent) col = `rgb(${Math.round(150 + lum * 110)},${Math.round(30 + lum * 90)},${Math.round(80 + lum * 110)})`;
              else {
                const v = Math.min(255, lum * 255);
                col = `rgb(${Math.round(Math.min(255, v + md * 70))},${Math.round(v + md * 18)},${Math.round(Math.max(0, v - md * 30))})`;
              }
              (vn[2] < -0.05 ? front : back).push({ x1: last.x, y1: last.y, x2: pt.x, y2: pt.y, z: pt.z, w: Math.max(0.8, 0.013 * pt.k * S), c: col });
            }
            last = pt;
          }
        }
      }

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

      drawSegs(back);

      // Core: dark under the braid, a short chrome ferrule where it's exposed.
      const coreSteps = 90;
      const pts = Array.from({ length: coreSteps + 1 }, (_, i) => {
        const u = i / coreSteps;
        return { u, ...project(spine(u).pos) };
      });
      const layers = [
        { f: 1, c: (e: boolean) => (e ? `rgb(${120 + md * 40},${120 + md * 10},${125 - md * 20})` : "#141414"), off: 0 },
        { f: 0.62, c: (e: boolean) => (e ? `rgb(${190 + md * 30},192,${198 - md * 30})` : "#1d1d1d"), off: -0.18 },
        { f: 0.2, c: (e: boolean) => (e ? "rgba(255,255,255,0.95)" : "#2a2a2a"), off: -0.42 },
      ];
      ctx.lineCap = "round";
      for (const L of layers) {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1];
          const b = pts[i];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const rad = coreR * b.k * S;
          const nx = (-dy / len) * rad * L.off;
          const ny = (dx / len) * rad * L.off;
          ctx.strokeStyle = L.c(b.u > BRAID_END - 0.01);
          ctx.lineWidth = rad * 2 * L.f;
          ctx.beginPath();
          ctx.moveTo(a.x + nx, a.y + ny);
          ctx.lineTo(b.x + nx, b.y + ny);
          ctx.stroke();
        }
      }
      drawSegs(front);

      // ------------------------------------------------------------------ mic
      // Local frame at the tip of the arm; the mic continues along the arm.
      const tip = spine(1);
      const A = tip.T;
      const U = tip.N;
      const V = norm(cross(A, U));
      const local = (x: number, y: number, z: number): V3 => [
        tip.pos[0] + x * U[0] + y * A[0] + z * V[0],
        tip.pos[1] + x * U[1] + y * A[1] + z * V[1],
        tip.pos[2] + x * U[2] + y * A[2] + z * V[2],
      ];
      const localDir = (x: number, y: number, z: number): V3 => norm([x * U[0] + y * A[0] + z * V[0], x * U[1] + y * A[1] + z * V[1], x * U[2] + y * A[2] + z * V[2]]);

      const quads: Quad[] = [];
      const lathe = (profile: [number, number][], mat: Material, segs = 56) => {
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
            const n = rot(localDir(-dy * Math.cos(ang), dr, -dy * Math.sin(ang)));
            if (dot(n, [ctr[0], ctr[1], ctr[2] + cam]) > 0) continue;
            quads.push({ pts: [a, b, c, d].map((v) => toScreen(v)), z: ctr[2], fill: light(n, mat, ctr) });
          }
        }
      };

      const blackMat: Material = { base: mix([26, 26, 29], [196, 150, 62], md), spec: 0.9, shine: 40, rim: mix([255, 77, 157], [255, 200, 120], md), ambient: 0.35 };
      const clipMat: Material = { base: [20, 20, 22], spec: 0.4, shine: 16, rim: [120, 120, 130], ambient: 0.4 };
      const chromeMat: Material = { base: mix([150, 152, 160], [220, 176, 90], md), spec: 1, shine: 60, rim: [255, 120, 180], ambient: 0.3 };
      const pinkMat: Material = { base: [255, 60, 150], spec: 0.8, shine: 30, rim: [255, 190, 220], ambient: 0.4 };
      const innerMat: Material = { base: [12, 12, 14], spec: 0.2, shine: 10, rim: [255, 77, 157], ambient: 0.4 };

      lathe(HANDLE, blackMat);
      lathe(COLLAR, pinkMat);
      lathe(CLIP, clipMat, 40);

      // Ball grille wires: meridians and parallels over a sphere.
      const gFront: Seg[] = [];
      const gBack: Seg[] = [];
      const ballPt = (theta: number, a: number): { pos: V3; n: V3 } => {
        const n = localDir(Math.sin(theta) * Math.cos(a), Math.cos(theta), Math.sin(theta) * Math.sin(a));
        return { pos: local(BALL_R * Math.sin(theta) * Math.cos(a), BALL_C + BALL_R * Math.cos(theta), BALL_R * Math.sin(theta) * Math.sin(a)), n };
      };
      const gWire = (a: { pos: V3; n: V3 }, b: { pos: V3; n: V3 }, width: number) => {
        const ra = rot(a.pos);
        const rb = rot(b.pos);
        const rn = rot(b.n);
        const facing = dot(rn, [rb[0], rb[1], rb[2] + cam]) < 0;
        const pa = toScreen(ra);
        const pb = toScreen(rb);
        (facing ? gFront : gBack).push({
          x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, z: (ra[2] + rb[2]) / 2,
          w: Math.max(0.6, width * pb.k * S),
          c: facing ? light(rn, chromeMat, rb) : "rgba(90,90,96,0.5)",
        });
      };
      const TH_MAX = Math.PI * 0.86; // grille stops where it meets the collar
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2;
        let prev = ballPt(0.001, a);
        for (let j = 1; j <= 16; j++) {
          const cur = ballPt((j / 16) * TH_MAX, a);
          gWire(prev, cur, 0.006);
          prev = cur;
        }
      }
      for (let j = 1; j <= 9; j++) {
        const th = (j / 9) * TH_MAX;
        let prev = ballPt(th, 0);
        for (let i = 1; i <= 40; i++) {
          const cur = ballPt(th, (i / 40) * Math.PI * 2);
          gWire(prev, cur, 0.006);
          prev = cur;
        }
      }

      const inner: Quad[] = [];
      const n0 = quads.length;
      lathe(BALL_IN, innerMat, 32);
      inner.push(...quads.splice(n0));

      drawSegs(gBack);
      drawQuads(inner);
      drawQuads(quads);
      drawSegs(gFront);

      // Sound rings out of the grille after a tap, plus a faint idle pulse.
      const ball = project(local(0, BALL_C, 0));
      const br = BALL_R * ball.k * S;
      for (const d of age < 1.8 ? [0, 0.18, 0.36] : []) {
        const tt = age - d;
        if (tt < 0) continue;
        ctx.strokeStyle = `rgba(255,77,157,${Math.max(0, 0.6 - tt * 0.4)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, br * (1.3 + tt * 5), 0, Math.PI * 2);
        ctx.stroke();
      }
      const ph = (t * 0.35) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.12 * (1 - ph)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, br * (1.4 + ph * 2), 0, Math.PI * 2);
      ctx.stroke();

      // Stage glow around the mic head, drawn behind everything.
      const glow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, S * 1.3);
      glow.addColorStop(0, `rgba(255,${md ? 170 : 77},${md ? 90 : 157},${0.14 + amp * 3})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      if (hotspotCb.current) {
        const arm = (u: number) => {
          const s = spine(u);
          return project([s.pos[0], s.pos[1], s.pos[2] - braidR]);
        };
        hotspotCb.current(
          [arm(0.35), arm(0.62), project(local(0, 0.1, -0.11)), ball].map((pt) => ({ x: pt.x, y: pt.y })),
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
