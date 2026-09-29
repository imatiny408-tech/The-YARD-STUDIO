"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** 0..1 scroll progress through the hero; drives rotation and reveal. */
  progress: { get: () => number };
  /** Explore mode swaps the black-and-chrome finish for gold. */
  explore: boolean;
  /** Increments whenever the user taps the mic (pulse). */
  pulse: number;
  onHotspots?: (pts: { x: number; y: number }[]) => void;
};

type V3 = [number, number, number];
type Seg = { x1: number; y1: number; x2: number; y2: number; z: number; w: number; c: string };

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const LIGHT = norm([-0.5, 0.6, -0.65]);

/**
 * A large-diaphragm studio condenser mic, the centrepiece of every modern
 * rap / pop / R&B vocal booth, drawn on a 2D canvas with a small perspective
 * projector. The mesh grille spins with scroll, the mic leans toward the
 * cursor, and a tap sends sound rings out of the capsule.
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

    // Mic geometry along its own axis (y up), in world units.
    const GR = 0.46; // grille radius
    const G_TOP = 1.05; // centre of the grille's top dome
    const G_BOT = 0.2; // bottom of the grille cylinder
    const BAND = [0.04, 0.2]; // accent ring under the grille
    const BODY_TOP = 0.04;
    const BODY_BOT = -1.2;
    const MERIDIANS = 40;
    const PARALLELS = 16;

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

      // Tap: a quick wobble plus rings out of the capsule.
      const age = t - hit.current.t;
      const amp = age < 1.6 ? Math.exp(-age * 3) * 0.08 : 0;

      const S = Math.min(w * (mobile ? 1.4 : 1), h) * 0.27;
      const spin = p * Math.PI * 1.6 + (reduce ? 0 : t * 0.25);
      const tiltZ = -0.32 + m.x * 0.12 + Math.sin(age * 30) * amp + p * 0.2;
      const tiltX = 0.18 + m.y * 0.1;
      const [cs, ss, cz, sz, cx, sx] = [Math.cos(spin), Math.sin(spin), Math.cos(tiltZ), Math.sin(tiltZ), Math.cos(tiltX), Math.sin(tiltX)];
      const cam = 4;
      const ox = w * (mobile ? 0.55 : 0.6) - p * w * 0.05;
      const oy = h * 0.44 + p * h * 0.04;

      // Spin around the mic's own axis, then lean it, then tilt toward the camera.
      const rotDir = (v: V3): V3 => {
        const x0 = v[0] * cs + v[2] * ss;
        const z0 = -v[0] * ss + v[2] * cs;
        const x1 = x0 * cz - v[1] * sz;
        const y1 = x0 * sz + v[1] * cz;
        const y2 = y1 * cx - z0 * sx;
        const z2 = y1 * sx + z0 * cx;
        return [x1, y2, z2];
      };
      const project = (v: V3) => {
        const r = rotDir(v);
        const k = cam / (cam + r[2]);
        return { x: ox + r[0] * k * S, y: oy - r[1] * k * S, z: r[2], k };
      };
      const shade = (n: V3) => {
        const vn = rotDir(n);
        const diff = Math.max(0, vn[0] * LIGHT[0] + vn[1] * LIGHT[1] + vn[2] * LIGHT[2]);
        return { diff, spec: Math.pow(diff, 14), front: vn[2] < 0.05 };
      };

      // Metal palette: chrome in Full mode, gold in Explore mode.
      const metal = (lum: number) => {
        const v = Math.min(255, 40 + lum * 215);
        return `rgb(${Math.round(Math.min(255, v + md * 55))},${Math.round(v + md * 20)},${Math.round(Math.max(0, v - md * 70))})`;
      };

      // Grille surface point at (angle a, height y) plus its normal.
      const grille = (a: number, y: number): { pos: V3; n: V3 } => {
        if (y <= G_TOP) {
          const n: V3 = [Math.cos(a), 0, Math.sin(a)];
          return { pos: [GR * n[0], y, GR * n[2]], n };
        }
        const phi = Math.min(Math.PI / 2, ((y - G_TOP) / GR) * (Math.PI / 2));
        const r = GR * Math.cos(phi);
        const n: V3 = [Math.cos(a) * Math.cos(phi), Math.sin(phi), Math.sin(a) * Math.cos(phi)];
        return { pos: [r * Math.cos(a), G_TOP + GR * Math.sin(phi), r * Math.sin(a)], n };
      };

      const back: Seg[] = [];
      const front: Seg[] = [];
      const push = (a: V3, b: V3, n: V3, width: number, bright = 1) => {
        const pa = project(a);
        const pb = project(b);
        const s = shade(n);
        const lum = (0.1 + s.diff * 0.6 + s.spec * 0.7) * bright;
        (s.front ? front : back).push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, z: (pa.z + pb.z) / 2, w: Math.max(0.7, width * pb.k * S), c: metal(s.front ? lum : lum * 0.45) });
      };

      // Mesh: meridians up the grille and over the dome, parallels around it.
      const topY = G_TOP + GR;
      const steps = 26;
      for (let i = 0; i < MERIDIANS; i++) {
        const a = (i / MERIDIANS) * Math.PI * 2;
        let prev = grille(a, G_BOT);
        for (let j = 1; j <= steps; j++) {
          const y = G_BOT + ((topY - G_BOT) * j) / steps;
          const cur = grille(a, Math.min(y, topY - 0.001));
          push(prev.pos, cur.pos, cur.n, 0.008);
          prev = cur;
        }
      }
      for (let j = 0; j <= PARALLELS; j++) {
        const y = G_BOT + ((topY - 0.04 - G_BOT) * j) / PARALLELS;
        const seg = 48;
        let prev = grille(0, y);
        for (let i = 1; i <= seg; i++) {
          const cur = grille((i / seg) * Math.PI * 2, y);
          push(prev.pos, cur.pos, cur.n, j === 0 ? 0.03 : 0.008, j === 0 ? 1.3 : 1);
          prev = cur;
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

      // Solid parts drawn as thick strokes along the axis with offset
      // highlight layers, which reads as a lit cylinder.
      const tube = (y0: number, y1: number, r: number, layers: { f: number; off: number; c: string }[]) => {
        const a = project([0, y0, 0]);
        const b = project([0, y1, 0]);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        for (const L of layers) {
          const rad = r * ((a.k + b.k) / 2) * S;
          const nx = (-dy / len) * rad * L.off;
          const ny = (dx / len) * rad * L.off;
          ctx.strokeStyle = L.c;
          ctx.lineWidth = rad * 2 * L.f;
          ctx.lineCap = "butt";
          ctx.beginPath();
          ctx.moveTo(a.x + nx, a.y + ny);
          ctx.lineTo(b.x + nx, b.y + ny);
          ctx.stroke();
        }
      };

      const bodyDark = md ? `rgb(${Math.round(120 + md * 40)},${Math.round(92 + md * 20)},40)` : "#141414";
      const bodyMid = md ? `rgb(${Math.round(190 + md * 30)},${Math.round(150 + md * 20)},70)` : "rgb(70,70,72)";
      const bodyHi = md ? "rgba(255,240,200,0.85)" : "rgba(255,255,255,0.55)";

      // Body with a rounded bottom cap.
      const bb = project([0, BODY_BOT, 0]);
      ctx.fillStyle = bodyDark;
      ctx.beginPath();
      ctx.arc(bb.x, bb.y, 0.34 * bb.k * S, 0, Math.PI * 2);
      ctx.fill();
      // Many thin, translucent layers blend into a smooth cylindrical shade.
      const bodyLayers = [{ f: 1, off: 0, c: bodyDark }];
      for (let i = 0; i < 10; i++) {
        const u = i / 9;
        bodyLayers.push({ f: 0.8 - u * 0.7, off: -0.12 - u * 0.38, c: bodyMid.replace("rgb(", "rgba(").replace(")", `,${0.18 + u * 0.05})`) });
      }
      bodyLayers.push({ f: 0.06, off: -0.52, c: bodyHi });
      tube(BODY_TOP, BODY_BOT, 0.36, bodyLayers);
      // Brand badge: a small pink dot on the body.
      const badge = project([0, -0.45, -0.36]);
      if (badge.z < rotDir([0, 0, 0])[2] + 0.2) {
        ctx.fillStyle = "#ff4d9d";
        ctx.beginPath();
        ctx.arc(badge.x, badge.y, 0.05 * badge.k * S, 0, Math.PI * 2);
        ctx.fill();
      }

      // Back half of the mesh, then the dark capsule inside, then the front.
      draw(back);
      const cap = project([0, G_TOP, 0]);
      const inner = project([0, G_BOT + GR * 0.95, 0]);
      ctx.strokeStyle = md ? "rgba(40,28,14,0.85)" : "rgba(8,8,8,0.82)";
      ctx.lineCap = "round";
      ctx.lineWidth = GR * 1.85 * cap.k * S;
      ctx.beginPath();
      ctx.moveTo(inner.x, inner.y);
      ctx.lineTo(cap.x, cap.y);
      ctx.stroke();
      // The diaphragm glints through the mesh.
      const dia = ctx.createRadialGradient(cap.x, cap.y, 0, cap.x, cap.y, GR * cap.k * S * 0.9);
      dia.addColorStop(0, `rgba(255,${md ? 200 : 110},${md ? 120 : 180},${0.22 + amp * 4})`);
      dia.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = dia;
      ctx.beginPath();
      ctx.arc(cap.x, cap.y, GR * cap.k * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineCap = "round";
      draw(front);

      // Pink accent ring between grille and body.
      tube(BAND[0], BAND[1], GR * 1.02, [
        { f: 1, off: 0, c: "#c41f6c" },
        { f: 0.6, off: -0.2, c: "#ff4d9d" },
        { f: 0.14, off: -0.5, c: "rgba(255,210,235,0.9)" },
      ]);

      // Sound rings out of the capsule after a tap, plus a faint idle ring.
      const rings = age < 1.6 ? [0, 0.18, 0.36] : [];
      for (const d of rings) {
        const tt = age - d;
        if (tt < 0) continue;
        const r = GR * cap.k * S * (1.2 + tt * 3.2);
        ctx.strokeStyle = `rgba(255,77,157,${Math.max(0, 0.55 - tt * 0.4)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cap.x, cap.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      const idle = GR * cap.k * S * (1.25 + ((t * 0.35) % 1) * 1.2);
      ctx.strokeStyle = `rgba(255,255,255,${0.1 * (1 - ((t * 0.35) % 1))})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cap.x, cap.y, idle, 0, Math.PI * 2);
      ctx.stroke();

      // Stage glow behind the capsule.
      const glow = ctx.createRadialGradient(cap.x, cap.y, 0, cap.x, cap.y, S * 2);
      glow.addColorStop(0, `rgba(255,${md ? 170 : 77},${md ? 90 : 157},${0.08 + amp * 2})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      if (hotspotCb.current) {
        hotspotCb.current(
          [
            project([0, topY - 0.05, -GR * 0.4]), // capsule
            project([0, G_TOP - 0.3, -GR]), // grille
            project([0, (BAND[0] + BAND[1]) / 2, -GR]), // ring
            project([0, -0.9, -0.36]), // body
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
