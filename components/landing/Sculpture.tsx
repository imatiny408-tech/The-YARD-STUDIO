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
type RGB = [number, number, number];
type Quad = { pts: { x: number; y: number }[]; z: number; fill: string };
type Seg = { x1: number; y1: number; x2: number; y2: number; z: number; w: number; c: string };
type Material = { base: RGB; spec: number; shine: number; rim: RGB; ambient: number };

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Key light from the upper left, a cool fill from the right, pink rim from behind.
const KEY = norm([-0.55, 0.65, -0.55]);
const FILL = norm([0.8, -0.1, -0.4]);

/**
 * A large-diaphragm studio condenser mic, the centrepiece of every modern
 * rap / pop / R&B vocal booth. Solid parts are real surfaces of revolution
 * built from lit, depth-sorted facets; the grille is a wire mesh. The mesh
 * spins with scroll, the mic leans toward the cursor, and a tap sends sound
 * rings out of the capsule.
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
    const G_BOT = 0.22; // bottom of the grille cylinder
    const SEGS = 72;
    const MERIDIANS = 40;
    const PARALLELS = 15;

    // Profiles are [radius, y] pairs, top to bottom.
    const BODY: [number, number][] = [
      [0.4, 0.06], [0.41, 0.02], [0.4, -0.02], [0.37, -0.06], [0.37, -0.5], [0.375, -0.52], [0.37, -0.54],
      [0.35, -1.0], [0.34, -1.08], [0.3, -1.16], [0.22, -1.22], [0.1, -1.25], [0, -1.26],
    ];
    const BAND: [number, number][] = [[0.47, 0.24], [0.49, 0.22], [0.49, 0.08], [0.47, 0.06]];
    const CAPSULE: [number, number][] = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      CAPSULE.push([GR * 0.9 * Math.sin(a), G_TOP + GR * 0.9 * Math.cos(a)]);
    }
    CAPSULE.push([GR * 0.9, G_BOT + 0.02]);

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
      const amp = age < 1.6 ? Math.exp(-age * 3) * 0.08 : 0;

      const S = Math.min(w * (mobile ? 1.4 : 1), h) * 0.27;
      const spin = p * Math.PI * 1.6 + (reduce ? 0 : t * 0.25);
      const tiltZ = -0.32 + m.x * 0.12 + Math.sin(age * 30) * amp + p * 0.2;
      const tiltX = 0.22 + m.y * 0.1;
      const [cs, ss, cz, sz, cx, sx] = [Math.cos(spin), Math.sin(spin), Math.cos(tiltZ), Math.sin(tiltZ), Math.cos(tiltX), Math.sin(tiltX)];
      const cam = 4;
      const ox = w * (mobile ? 0.55 : 0.6) - p * w * 0.05;
      const oy = h * 0.44 + p * h * 0.04;

      const rot = (v: V3): V3 => {
        const x0 = v[0] * cs + v[2] * ss;
        const z0 = -v[0] * ss + v[2] * cs;
        const x1 = x0 * cz - v[1] * sz;
        const y1 = x0 * sz + v[1] * cz;
        return [x1, y1 * cx - z0 * sx, y1 * sx + z0 * cx];
      };
      const toScreen = (r: V3) => {
        const k = cam / (cam + r[2]);
        return { x: ox + r[0] * k * S, y: oy - r[1] * k * S, z: r[2], k };
      };
      const project = (v: V3) => toScreen(rot(v));

      // Blinn-Phong with a key, a fill and a coloured rim light.
      const light = (n: V3, mat: Material, pos: V3): string => {
        const view = norm([-pos[0], -pos[1], -cam - pos[2]]);
        const key = Math.max(0, dot(n, KEY));
        const fill = Math.max(0, dot(n, FILL)) * 0.25;
        const spec = Math.pow(Math.max(0, dot(n, norm([KEY[0] + view[0], KEY[1] + view[1], KEY[2] + view[2]]))), mat.shine) * mat.spec;
        const rim = Math.pow(1 - Math.max(0, dot(n, view)), 3);
        const c = mat.base.map((b, i) => b * (mat.ambient + key * 0.85 + fill) + 255 * spec + mat.rim[i] * rim * 0.7);
        return `rgb(${c.map((v) => Math.round(Math.min(255, v))).join(",")})`;
      };

      const quads: Quad[] = [];
      // Surface of revolution: facets between profile rings, back faces culled.
      const lathe = (profile: [number, number][], mat: Material, segs = SEGS) => {
        const ring = profile.map(([r, y]) =>
          Array.from({ length: segs }, (_, i) => {
            const a = (i / segs) * Math.PI * 2;
            return rot([r * Math.cos(a), y, r * Math.sin(a)]);
          }),
        );
        for (let j = 0; j < profile.length - 1; j++) {
          const dr = profile[j + 1][0] - profile[j][0];
          const dy = profile[j + 1][1] - profile[j][1];
          for (let i = 0; i < segs; i++) {
            const i2 = (i + 1) % segs;
            const a = ring[j][i], b = ring[j][i2], c = ring[j + 1][i2], d = ring[j + 1][i];
            const ctr: V3 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
            // Analytic outward normal of the surface of revolution (smooth shading).
            const ang = ((i + 0.5) / segs) * Math.PI * 2;
            const n = rot(norm([-dy * Math.cos(ang), dr, -dy * Math.sin(ang)]));
            // Cull faces pointing away from the camera.
            if (dot(n, [ctr[0], ctr[1], ctr[2] + cam]) > 0) continue;
            quads.push({ pts: [a, b, c, d].map((v) => toScreen(v)), z: ctr[2], fill: light(n, mat, ctr) });
          }
        }
      };

      // Torus for the shock-mount ring, centred on the axis at height y0.
      const torus = (R: number, tube: number, y0: number, mat: Material) => {
        const us = 56;
        const vs = 12;
        const pt = (u: number, v: number): V3 => {
          const a = (u / us) * Math.PI * 2;
          const b = (v / vs) * Math.PI * 2;
          const r = R + tube * Math.cos(b);
          return rot([r * Math.cos(a), y0 + tube * Math.sin(b), r * Math.sin(a)]);
        };
        for (let u = 0; u < us; u++)
          for (let v = 0; v < vs; v++) {
            const a = pt(u, v), b = pt(u + 1, v), c = pt(u + 1, v + 1), d = pt(u, v + 1);
            const ang = ((u + 0.5) / us) * Math.PI * 2;
            const centre = rot([R * Math.cos(ang), y0, R * Math.sin(ang)]);
            const ctr: V3 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
            const n = norm(sub(ctr, centre));
            if (dot(n, [ctr[0], ctr[1], ctr[2] + cam]) > 0) continue;
            quads.push({ pts: [a, b, c, d].map((v2) => toScreen(v2)), z: ctr[2], fill: light(n, mat, ctr) });
          }
      };

      const gold = md;
      const bodyMat: Material = {
        base: mix([28, 28, 31], [196, 150, 62], gold),
        spec: 0.9,
        shine: 40,
        rim: mix([255, 77, 157], [255, 200, 120], gold),
        ambient: 0.35,
      };
      const chromeMat: Material = { base: mix([150, 152, 160], [220, 176, 90], gold), spec: 1, shine: 60, rim: [255, 120, 180], ambient: 0.3 };
      const bandMat: Material = { base: [255, 60, 150], spec: 0.8, shine: 30, rim: [255, 190, 220], ambient: 0.4 };
      const capsuleMat: Material = { base: mix([14, 14, 16], [50, 36, 18], gold), spec: 0.25, shine: 12, rim: [255, 77, 157], ambient: 0.4 };

      lathe(BODY, bodyMat);
      lathe(BAND, bandMat);
      torus(0.56, 0.035, -0.55, chromeMat);

      // Grille wires, split into back and front halves around the capsule.
      const grille = (a: number, y: number): { pos: V3; n: V3 } => {
        if (y <= G_TOP) {
          const n: V3 = [Math.cos(a), 0, Math.sin(a)];
          return { pos: [GR * n[0], y, GR * n[2]], n };
        }
        const phi = Math.min(Math.PI / 2, ((y - G_TOP) / GR) * (Math.PI / 2));
        const r = GR * Math.cos(phi);
        return {
          pos: [r * Math.cos(a), G_TOP + GR * Math.sin(phi), r * Math.sin(a)],
          n: [Math.cos(a) * Math.cos(phi), Math.sin(phi), Math.sin(a) * Math.cos(phi)],
        };
      };
      const back: Seg[] = [];
      const front: Seg[] = [];
      const wire = (a: V3, b: V3, n: V3, width: number) => {
        const ra = rot(a);
        const rb = rot(b);
        const rn = rot(n);
        const facing = dot(rn, [ra[0], ra[1], ra[2] + cam]) < 0;
        const pa = toScreen(ra);
        const pb = toScreen(rb);
        const c = light(rn, chromeMat, ra);
        (facing ? front : back).push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, z: (ra[2] + rb[2]) / 2, w: Math.max(0.7, width * pb.k * S), c: facing ? c : "rgba(90,90,96,0.55)" });
      };
      const topY = G_TOP + GR;
      for (let i = 0; i < MERIDIANS; i++) {
        const a = (i / MERIDIANS) * Math.PI * 2;
        let prev = grille(a, G_BOT);
        for (let j = 1; j <= 26; j++) {
          const cur = grille(a, Math.min(G_BOT + ((topY - G_BOT) * j) / 26, topY - 0.001));
          wire(prev.pos, cur.pos, cur.n, 0.009);
          prev = cur;
        }
      }
      for (let j = 0; j <= PARALLELS; j++) {
        const y = G_BOT + ((topY - 0.04 - G_BOT) * j) / PARALLELS;
        let prev = grille(0, y);
        for (let i = 1; i <= 48; i++) {
          const cur = grille((i / 48) * Math.PI * 2, y);
          wire(prev.pos, cur.pos, cur.n, j === 0 ? 0.03 : 0.009);
          prev = cur;
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
        ctx.lineWidth = 0.8; // hides hairline seams between facets
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

      // Soft floor shadow under the mic.
      const foot = project([0, -1.35, 0]);
      const shadow = ctx.createRadialGradient(foot.x, foot.y + S * 0.35, 0, foot.x, foot.y + S * 0.35, S * 0.9);
      shadow.addColorStop(0, "rgba(0,0,0,0.55)");
      shadow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = shadow;
      ctx.fillRect(0, 0, w, h);

      // Stage glow behind the capsule.
      const cap = project([0, G_TOP, 0]);
      const glow = ctx.createRadialGradient(cap.x, cap.y, 0, cap.x, cap.y, S * 2.2);
      glow.addColorStop(0, `rgba(255,${md ? 170 : 77},${md ? 90 : 157},${0.12 + amp * 2})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Order: back wires, solid parts (ring, body, band), capsule, front wires.
      drawSegs(back);
      const capsuleQuads: Quad[] = [];
      const before = quads.length;
      lathe(CAPSULE, capsuleMat, 32);
      capsuleQuads.push(...quads.splice(before));
      drawQuads(quads);
      drawQuads(capsuleQuads);
      // The diaphragm glints through the mesh after a tap.
      const dia = ctx.createRadialGradient(cap.x, cap.y, 0, cap.x, cap.y, GR * cap.k * S);
      dia.addColorStop(0, `rgba(255,${md ? 200 : 110},${md ? 120 : 180},${0.18 + amp * 5})`);
      dia.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = dia;
      ctx.beginPath();
      ctx.arc(cap.x, cap.y, GR * cap.k * S, 0, Math.PI * 2);
      ctx.fill();
      drawSegs(front);

      // Sound rings after a tap, plus a faint idle pulse.
      for (const d of age < 1.6 ? [0, 0.18, 0.36] : []) {
        const tt = age - d;
        if (tt < 0) continue;
        ctx.strokeStyle = `rgba(255,77,157,${Math.max(0, 0.55 - tt * 0.4)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cap.x, cap.y, GR * cap.k * S * (1.2 + tt * 3.2), 0, Math.PI * 2);
        ctx.stroke();
      }
      const ph = (t * 0.35) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.1 * (1 - ph)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cap.x, cap.y, GR * cap.k * S * (1.25 + ph * 1.2), 0, Math.PI * 2);
      ctx.stroke();

      if (hotspotCb.current) {
        hotspotCb.current(
          [
            project([0, topY - 0.05, -GR * 0.4]), // capsule
            project([0, G_TOP - 0.3, -GR]), // grille
            project([0, 0.15, -0.49]), // band
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

