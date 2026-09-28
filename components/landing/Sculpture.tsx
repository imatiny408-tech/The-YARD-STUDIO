"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** 0..1 scroll progress through the hero; drives rotation and reveal. */
  progress: { get: () => number };
  /** Explore mode swaps the steel braid for a warm copper weave. */
  explore: boolean;
  /** Increments whenever the user "hits" the sculpture (pulse). */
  pulse: number;
  onHotspots?: (pts: { x: number; y: number }[]) => void;
};

type V3 = [number, number, number];
type Seg = { x1: number; y1: number; x2: number; y2: number; z: number; w: number; c: string };

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const LIGHT = norm([-0.45, 0.65, -0.6]);

/**
 * A braided audio cable over a glossy core, drawn on a 2D canvas with a small
 * perspective projector. It's the single "product on a black stage" the car
 * sites use: it turns with scroll, leans toward the cursor, and vibrates like
 * a plucked string when clicked.
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
    const mobile = w < 640;

    // Spine: quadratic Bézier rising from below the frame to the upper right.
    const P0: V3 = [-0.5, -1.7, 0];
    const P1: V3 = [0.0, 0.2, 0];
    const P2: V3 = [1.25, 0.85, 0.15];

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

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const S = Math.min(w * (mobile ? 1.5 : 1), h) * 0.5;
      const rotY = -0.35 + p * 1.3 + m.x * 0.22 + (reduce ? 0 : Math.sin(t * 0.35) * 0.04);
      const rotX = 0.1 - p * 0.25 + m.y * 0.12;
      const rotZ = p * 0.35;
      const [cy, sy, cx, sx, cz, sz] = [Math.cos(rotY), Math.sin(rotY), Math.cos(rotX), Math.sin(rotX), Math.cos(rotZ), Math.sin(rotZ)];
      const cam = 3.4;
      const ox = w * (mobile ? 0.5 : 0.56) - p * w * 0.06;
      const oy = h * 0.56 + p * h * 0.05;

      const rot = (v: V3): V3 => {
        const x0 = v[0] * cz - v[1] * sz;
        const y0 = v[0] * sz + v[1] * cz;
        const x1 = x0 * cy + v[2] * sy;
        const z1 = -x0 * sy + v[2] * cy;
        const y1 = y0 * cx - z1 * sx;
        const z2 = y0 * sx + z1 * cx;
        return [x1, y1, z2];
      };
      const project = (v: V3) => {
        const r = rot(v);
        const k = cam / (cam + r[2]);
        return { x: ox + r[0] * k * S, y: oy - r[1] * k * S, z: r[2], k };
      };

      // Plucked-string vibration after a click.
      const age = t - hit.current.t;
      const amp = age < 2.5 ? Math.exp(-age * 2.4) * 0.07 : 0;

      const spine = (u: number) => {
        const a = (1 - u) * (1 - u);
        const b = 2 * u * (1 - u);
        const c = u * u;
        const pos: V3 = [a * P0[0] + b * P1[0] + c * P2[0], a * P0[1] + b * P1[1] + c * P2[1], a * P0[2] + b * P1[2] + c * P2[2]];
        const tan = norm([2 * (1 - u) * (P1[0] - P0[0]) + 2 * u * (P2[0] - P1[0]), 2 * (1 - u) * (P1[1] - P0[1]) + 2 * u * (P2[1] - P1[1]), 0]);
        const N: V3 = [-tan[1], tan[0], 0];
        const wob = amp * Math.sin(u * Math.PI * 4) * Math.sin(age * 40);
        pos[0] += N[0] * wob;
        pos[1] += N[1] * wob;
        return { pos, N, B: [0, 0, 1] as V3 };
      };

      const braidEnd = 0.8 - 0.1 * p + 0.06 * md;
      const coreR = 0.1;
      const braidR = 0.135;
      const segs: Seg[] = [];
      const back: Seg[] = [];

      // Wires.
      for (let k = 0; k < CARRIERS; k++) {
        const dir = k % 2 ? 1 : -1;
        const base = (Math.PI * 2 * Math.floor(k / 2)) / (CARRIERS / 2);
        const accent = md < 0.5 && k === 5;
        for (let wi = 0; wi < WIRES; wi++) {
          const phase = base + wi * 0.09;
          let last: { x: number; y: number; z: number; k: number } | null = null;
          for (let i = 0; i <= STEPS; i++) {
            const u = (i / STEPS) * braidEnd;
            const s = spine(u);
            const phi = phase + dir * 24 * u + (reduce ? 0 : t * 0.12 * dir);
            // Over/under: each carrier rides high when crossing half the opposite set.
            const weave = Math.sin((CARRIERS / 4) * (phi - dir * 24 * u - base) * 2 + (dir > 0 ? 0 : Math.PI));
            const r = braidR + 0.012 * weave;
            const cph = Math.cos(phi);
            const sph = Math.sin(phi);
            const nrm: V3 = [cph * s.N[0] + sph * s.B[0], cph * s.N[1] + sph * s.B[1], cph * s.N[2] + sph * s.B[2]];
            const pt = project([s.pos[0] + r * nrm[0], s.pos[1] + r * nrm[1], s.pos[2] + r * nrm[2]]);
            if (last) {
              const vn = rot(nrm);
              const diff = Math.max(0, vn[0] * LIGHT[0] + vn[1] * LIGHT[1] + vn[2] * LIGHT[2]);
              const rim = Math.max(0, -vn[2]);
              const spec = Math.pow(diff, 12);
              const lum = 0.08 + diff * 0.5 + spec * 0.55 + (weave > 0 ? 0.08 : -0.06);
              let col: string;
              if (accent) col = `rgb(${Math.round(150 + lum * 110)},${Math.round(30 + lum * 90)},${Math.round(80 + lum * 110)})`;
              else {
                const v = Math.min(255, lum * 255);
                col = `rgb(${Math.round(Math.min(255, v + md * 70))},${Math.round(v + md * 18)},${Math.round(Math.max(0, v - md * 30))})`;
              }
              const seg = { x1: last.x, y1: last.y, x2: pt.x, y2: pt.y, z: pt.z, w: Math.max(0.8, 0.017 * pt.k * S), c: col };
              (rim > 0.05 ? segs : back).push(seg);
            }
            last = pt;
          }
        }
      }

      const draw = (list: Seg[]) => {
        list.sort((a, b) => b.z - a.z);
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

      ctx.lineCap = "round";
      draw(back);

      // Core: dark under the braid, glossy where it's exposed.
      const coreSteps = 90;
      const pts = Array.from({ length: coreSteps + 1 }, (_, i) => {
        const u = i / coreSteps;
        return { u, ...project(spine(u).pos) };
      });
      const layers = [
        { f: 1, c: (e: boolean) => (e ? `rgb(${120 + md * 40},${120 + md * 10},${125 - md * 20})` : "#141414"), off: 0 },
        { f: 0.62, c: (e: boolean) => (e ? `rgb(${190 + md * 30},${192},${198 - md * 30})` : "#1d1d1d"), off: -0.18 },
        { f: 0.2, c: (e: boolean) => (e ? "rgba(255,255,255,0.95)" : "#2a2a2a"), off: -0.42 },
      ];
      for (const L of layers) {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1];
          const b = pts[i];
          const exposed = b.u > braidEnd - 0.01;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const rad = coreR * b.k * S;
          const nx = (-dy / len) * rad * L.off;
          const ny = (dx / len) * rad * L.off;
          ctx.strokeStyle = L.c(exposed);
          ctx.lineWidth = rad * 2 * L.f;
          ctx.beginPath();
          ctx.moveTo(a.x + nx, a.y + ny);
          ctx.lineTo(b.x + nx, b.y + ny);
          ctx.stroke();
        }
      }

      draw(segs);

      // Soft glow at the exposed tip; brighter just after a pluck.
      const tip = pts[pts.length - 1];
      const glow = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, S * 0.5);
      glow.addColorStop(0, `rgba(255,${md ? 180 : 120},${md ? 140 : 190},${0.07 + amp * 3})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      if (hotspotCb.current) {
        hotspotCb.current(
          [0.32, 0.5, 0.68, 0.96].map((u) => {
            const s = spine(u > 0.9 ? u : u * braidEnd * 1.15);
            const off = u > 0.9 ? 0 : braidR;
            const pt = project([s.pos[0], s.pos[1], s.pos[2] - off]);
            return { x: pt.x, y: pt.y };
          }),
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
