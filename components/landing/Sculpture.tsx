"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type Props = {
  /** 0..1 scroll progress through the hero; drives rotation and reveal. */
  progress: { get: () => number };
  /** Explore mode swaps the steel finish for gold and copper. */
  explore: boolean;
  /** Increments whenever the user taps the stand (pulse). */
  pulse: number;
  onHotspots?: (pts: { x: number; y: number }[]) => void;
};

/* ---------------------------------------------------------------------------
 * Procedural textures (drawn once on canvases, no image assets needed)
 * -------------------------------------------------------------------------*/

/** Herringbone braided-sleeve pattern, used as colour and bump map. */
function braidTexture(fine: boolean) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#050505";
  g.fillRect(0, 0, size, size);
  const cols = fine ? 14 : 10;
  const cell = size / cols;
  const strands = fine ? 3 : 4;
  for (let i = 0; i < cols; i++) {
    const dir = i % 2 ? 1 : -1;
    for (let j = -1; j <= cols; j++) {
      const x0 = i * cell;
      const y0 = (j + (i % 2) * 0.5) * cell;
      g.save();
      g.beginPath();
      g.rect(x0, y0, cell, cell);
      g.clip();
      for (let s = 0; s < strands; s++) {
        const off = ((s + 0.5) / strands - 0.5) * cell * 1.25;
        const ax = x0 + cell / 2 - cell * 0.7;
        const bx = x0 + cell / 2 + cell * 0.7;
        const ay = y0 + cell / 2 + off - dir * cell * 0.7;
        const by = y0 + cell / 2 + off + dir * cell * 0.7;
        const w = (cell / strands) * 0.95;
        for (const [lw, col] of [[w, "#3a3a3a"], [w * 0.62, "#8d8d8d"], [w * 0.28, "#f2f2f2"]] as const) {
          g.strokeStyle = col;
          g.lineWidth = lw;
          g.lineCap = "round";
          g.beginPath();
          g.moveTo(ax, ay);
          g.lineTo(bx, by);
          g.stroke();
        }
      }
      // Shadow where the strands dive under the neighbouring column.
      const sh = g.createLinearGradient(x0, y0, x0, y0 + cell);
      sh.addColorStop(0, "rgba(0,0,0,0.55)");
      sh.addColorStop(0.25, "rgba(0,0,0,0)");
      sh.addColorStop(0.75, "rgba(0,0,0,0)");
      sh.addColorStop(1, "rgba(0,0,0,0.55)");
      g.fillStyle = sh;
      g.fillRect(x0, y0, cell, cell);
      g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Woven wire mesh for the ball grille (white = wire), used as alpha map. */
function meshTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, size, size);
  const step = 16;
  g.strokeStyle = "#fff";
  g.lineWidth = 5;
  for (let x = 0; x <= size; x += step) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, size);
    g.stroke();
  }
  for (let y = 0; y <= size; y += step) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(size, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Slight grain for the matte rubber and foam parts. */
function noiseTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 60;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** ON / OFF slide switch label, like a classic handheld vocal mic. */
function switchTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0b0b0c";
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = "#1c1c1f";
  g.fillRect(36, 70, 56, 116);
  g.fillStyle = "#2b2b30";
  g.fillRect(44, 84, 40, 44);
  g.fillStyle = "#d9d9de";
  g.font = "bold 26px sans-serif";
  g.textAlign = "center";
  g.fillText("ON", 64, 52);
  g.fillText("OFF", 64, 226);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * A mic stand with a handheld vocal mic, rendered with Three.js and physically
 * based materials. The pole is a braided steel sleeve that cuts away to an
 * inner braid and a mirror-chrome tube (after the cordex shot). The mic has a
 * glossy black handle, an ON/OFF switch, a woven mesh ball grille over dark
 * foam and a rubber ring; its cable hangs down. The rig turns with scroll,
 * leans toward the cursor, and a tap shakes it and sends rings from the grille.
 */
export default function Sculpture({ progress, explore, pulse, onHotspots }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hit = useRef(-10);
  const modeTarget = useRef(explore ? 1 : 0);
  const hotspotCb = useRef(onHotspots);
  hotspotCb.current = onHotspots;

  useEffect(() => {
    modeTarget.current = explore ? 1 : 0;
  }, [explore]);

  useEffect(() => {
    if (pulse > 0) hit.current = performance.now() / 1000;
  }, [pulse]);

  useEffect(() => {
    const canvas = ref.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // No WebGL: the hero still reads without the object.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0.35, 5.3);

    // Lights: soft key from the upper left, cool rim from behind right.
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-3, 4, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfd4ff, 2.6);
    rim.position.set(3, 2, -4);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(2, -1, 3);
    scene.add(fill);

    /* ---------------------------------------------------------- materials */
    const braidMap = braidTexture(false);
    const braidFineMap = braidTexture(true);
    const noise = noiseTexture();
    const steelTint = new THREE.Color(0xffffff);
    const goldTint = new THREE.Color(0xe7b867);
    const copperTint = new THREE.Color(0xd08a55);

    const braidMat = new THREE.MeshStandardMaterial({
      map: braidMap, bumpMap: braidMap, bumpScale: 2.2, metalness: 1, roughness: 0.32, color: 0xffffff,
    });
    const braidInnerMat = new THREE.MeshStandardMaterial({
      map: braidFineMap, bumpMap: braidFineMap, bumpScale: 1.6, metalness: 1, roughness: 0.4, color: 0xb9b9bd,
    });
    const chromeMat = new THREE.MeshPhysicalMaterial({ color: 0xf2f3f6, metalness: 1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 });
    const glossBlack = new THREE.MeshPhysicalMaterial({ color: 0x040405, metalness: 0.05, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.35 });
    const satinBlack = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: 0.4, roughness: 0.5, bumpMap: noise, bumpScale: 0.3 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, metalness: 0, roughness: 0.85, bumpMap: noise, bumpScale: 0.6 });
    const grilleMat = new THREE.MeshStandardMaterial({
      color: 0xc9ccd4, metalness: 0.9, roughness: 0.32, alphaMap: meshTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    grilleMat.alphaMap!.repeat.set(2.5, 1.25);
    grilleMat.bumpMap = grilleMat.alphaMap;
    grilleMat.bumpScale = 1.5;
    const foamMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 1, bumpMap: noise, bumpScale: 1 });
    const cableMat = new THREE.MeshPhysicalMaterial({ color: 0x060607, metalness: 0.1, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 });
    const switchMat = new THREE.MeshStandardMaterial({ map: switchTexture(), metalness: 0.2, roughness: 0.45 });

    /* ---------------------------------------------------------- geometry */
    const rig = new THREE.Group();
    scene.add(rig);

    // Pole: outer braid, cut away to an inner braid, then a chrome tube.
    const POLE_BOTTOM = -5;
    const OUTER_END = -0.12;
    const INNER_END = 0.16;
    const TOP = 0.4;
    const cyl = (r: number, y0: number, y1: number, mat: THREE.Material, repeatV?: number, openEnded = true) => {
      const geo = new THREE.CylinderGeometry(r, r, y1 - y0, 96, 1, openEnded);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = (y0 + y1) / 2;
      if (repeatV) {
        const m = mat as THREE.MeshStandardMaterial;
        m.map!.repeat.set(1, repeatV);
      }
      rig.add(mesh);
      return mesh;
    };
    const outerLen = OUTER_END - POLE_BOTTOM;
    braidMap.repeat.set(1, outerLen / (2 * Math.PI * 0.095) * 1.1);
    braidFineMap.repeat.set(1, (INNER_END - POLE_BOTTOM) / (2 * Math.PI * 0.076) * 1.1);
    cyl(0.095, POLE_BOTTOM, OUTER_END, braidMat);
    cyl(0.076, POLE_BOTTOM, INNER_END, braidInnerMat);
    cyl(0.058, POLE_BOTTOM, TOP, chromeMat, undefined, false);
    // Crimped ferrules where each braid layer ends.
    const ferrule = (r: number, y: number) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 16, 96), chromeMat);
      t.rotation.x = Math.PI / 2;
      t.position.y = y;
      rig.add(t);
    };
    ferrule(0.096, OUTER_END);
    ferrule(0.077, INNER_END);

    // Swivel holder on top of the pole.
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.22, 48), satinBlack);
    holder.position.y = TOP + 0.08;
    rig.add(holder);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 32), satinBlack);
    knob.rotation.z = Math.PI / 2;
    knob.position.set(0.1, TOP + 0.1, 0);
    rig.add(knob);

    // Mic assembly, angled up and out to the left.
    const mic = new THREE.Group();
    mic.position.set(0, TOP + 0.3, 0);
    mic.rotation.z = 0.92;
    mic.rotation.y = -0.25;
    rig.add(mic);

    const handleProfile = [
      [0, -0.62], [0.05, -0.615], [0.072, -0.6], [0.078, -0.55], [0.086, -0.2], [0.1, 0.25], [0.118, 0.6], [0.124, 0.66], [0.124, 0.7], [0, 0.7],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const handle = new THREE.Mesh(new THREE.LatheGeometry(handleProfile, 96), glossBlack);
    mic.add(handle);
    // Strain relief and jack at the butt.
    const relief = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.16, 32), rubber);
    relief.position.y = -0.68;
    mic.add(relief);
    // Clip that holds the mic in the stand.
    const clip = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.1, 0.26, 48, 1, true), satinBlack);
    clip.position.y = -0.05;
    (clip.material as THREE.Material).side = THREE.DoubleSide;
    mic.add(clip);
    // ON/OFF switch plate on the front of the handle.
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.02), [satinBlack, satinBlack, satinBlack, satinBlack, switchMat, satinBlack]);
    sw.position.set(0, 0.28, 0.103);
    sw.rotation.x = -0.04;
    mic.add(sw);
    // Chrome seam band and rubber ring under the grille.
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.127, 0.127, 0.03, 64), chromeMat);
    band.position.y = 0.705;
    mic.add(band);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 20, 96), rubber);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.76;
    mic.add(ring);
    // Ball grille: dark foam inside a woven wire mesh.
    const BALL_Y = 0.9;
    const foam = new THREE.Mesh(new THREE.SphereGeometry(0.168, 48, 32), foamMat);
    foam.position.y = BALL_Y;
    mic.add(foam);
    const grille = new THREE.Mesh(new THREE.SphereGeometry(0.19, 96, 64, 0, Math.PI * 2, 0, Math.PI * 0.78), grilleMat);
    grille.position.y = BALL_Y;
    mic.add(grille);

    // Cable from the butt of the mic, hanging down past the frame.
    const buttLocal = new THREE.Vector3(0, -0.78, 0);
    const makeCable = () => {
      mic.updateMatrixWorld(true);
      rig.updateMatrixWorld(true);
      const butt = buttLocal.clone().applyMatrix4(mic.matrix);
      const dir = new THREE.Vector3(0, -1, 0).applyEuler(mic.rotation);
      const pts = [
        butt,
        butt.clone().add(dir.clone().multiplyScalar(0.25)),
        new THREE.Vector3(butt.x + 0.55, butt.y - 0.35, 0.12),
        new THREE.Vector3(butt.x + 0.7, butt.y - 1.2, 0.18),
        new THREE.Vector3(butt.x + 0.74, -5, 0.2),
      ];
      return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.024, 20, false), cableMat);
    };
    rig.add(makeCable());

    // Rings that pulse out of the grille when tapped.
    const rings = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.98, 1, 96),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }),
      );
      scene.add(m);
      return m;
    });

    /* ---------------------------------------------------------- layout */
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      // Place the rig to the right on desktop, centred-right on phones.
      const dist = camera.position.z;
      const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
      const visW = visH * camera.aspect;
      const mobile = w < 640;
      rig.position.x = visW * (mobile ? 0.25 : 0.13);
      rig.position.y = mobile ? 0.12 : -0.35;
      const s = mobile ? Math.min(1, (visW / 3.2) * 1.15) : 1;
      rig.scale.setScalar(s);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let md = modeTarget.current;
    let raf = 0;
    const tmp = new THREE.Vector3();
    const toScreen = (v: THREE.Vector3) => {
      tmp.copy(v).project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h };
    };

    const frame = (ms: number) => {
      raf = requestAnimationFrame(frame);
      const box = canvas.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= window.innerHeight || document.hidden) return;
      const t = ms / 1000;
      const p = progress.get();
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      md += (modeTarget.current - md) * 0.06;

      // Finish: steel in Full mode, gold and copper in Explore mode.
      braidMat.color.copy(steelTint).lerp(copperTint, md);
      braidInnerMat.color.set(0xb9b9bd).lerp(goldTint, md);
      chromeMat.color.set(0xf2f3f6).lerp(goldTint, md);
      grilleMat.color.set(0xd4d7de).lerp(goldTint, md * 0.8);

      const age = t - hit.current;
      const amp = age < 2 ? Math.exp(-age * 2.8) * 0.08 : 0;
      rig.rotation.y = -0.55 + p * 1.5 + mouse.x * 0.3 + (reduce ? 0 : Math.sin(t * 0.3) * 0.08);
      rig.rotation.x = 0.06 + mouse.y * 0.06 - p * 0.05;
      rig.rotation.z = Math.sin(age * 30) * amp;
      mic.rotation.z = 0.92 + Math.sin(age * 38 + 1) * amp * 0.6;

      // Sound rings, billboarded toward the camera.
      rig.updateMatrixWorld(true);
      const ball = new THREE.Vector3(0, BALL_Y, 0).applyMatrix4(mic.matrixWorld);
      rings.forEach((r, i) => {
        const tt = age - i * 0.18;
        const mat = r.material as THREE.MeshBasicMaterial;
        if (tt < 0 || tt > 1.6) {
          mat.opacity = 0;
          return;
        }
        r.position.copy(ball);
        r.quaternion.copy(camera.quaternion);
        r.scale.setScalar(0.25 + tt * 0.75);
        mat.opacity = Math.max(0, 0.5 - tt * 0.32);
      });

      renderer.render(scene, camera);

      if (hotspotCb.current) {
        const pts = [
          new THREE.Vector3(0, -0.7, 0.1).applyMatrix4(rig.matrixWorld), // braided sleeve
          new THREE.Vector3(0, 0.02, 0.08).applyMatrix4(rig.matrixWorld), // cutaway
          new THREE.Vector3(0, -0.05, 0.11).applyMatrix4(mic.matrixWorld), // clip
          ball,
        ];
        hotspotCb.current(pts.map(toScreen));
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((mm) => {
          Object.values(mm).forEach((v) => v instanceof THREE.Texture && v.dispose());
          mm.dispose();
        });
      });
      pmrem.dispose();
      renderer.dispose();
    };
  }, [progress]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}
