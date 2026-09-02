"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Line,
  LineBasicMaterial,
  Camera,
  Vector3,
} from "three";

import {
  hubStarWorldReadyRef,
  hubStarWorldRef,
  parcoursCloseStreakLockRef,
  resolveHubStarAnchorForClose,
} from "@/src/components/tribute/hubStarAnchorRef";
const SEGMENTS = 16;
const LIFE_SEC = 0.58;
/** Tête arrive @ centre Hero — puis absorption (plus de traverse). */
const IMPACT_U = 0.46;
const TIP = "#e8fffe";
const MID = "#00e8f0";
const TAIL = "#0a4a52";

const tmpEnd = new Vector3();
const tmpStart = new Vector3();
const tmpHead = new Vector3();
const tmpDir = new Vector3();
const tmpFallback = new Vector3(0, 0, -1.8);

function paintLineColors(
  line: Line,
  tipHex: string,
  midHex: string,
  tailHex: string,
) {
  const tip = new Color(tipHex);
  const mid = new Color(midHex);
  const tail = new Color(tailHex);
  const colAttr = line.geometry.getAttribute("color") as BufferAttribute;
  const colors = colAttr.array as Float32Array;
  for (let s = 0; s < SEGMENTS; s += 1) {
    const t = s / (SEGMENTS - 1);
    const c = tail
      .clone()
      .lerp(mid, Math.min(1, Math.pow(t, 1.12) * 1.3))
      .lerp(tip, Math.max(0, t - 0.62) / 0.38);
    const i3 = s * 3;
    colors[i3] = c.r;
    colors[i3 + 1] = c.g;
    colors[i3 + 2] = c.b;
  }
  colAttr.needsUpdate = true;
}

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

function cinematicFade(u: number, impactU: number): number {
  if (u < 0.08) {
    const t = u / 0.08;
    return t * t * (3 - 2 * t);
  }
  if (u < impactU) return 1;
  const t = Math.max(0, (1 - u) / (1 - impactU));
  return Math.pow(t, 1.45);
}

function readGlassLaunchPercent(): { x: number; y: number } {
  if (typeof document === "undefined") return { x: 50, y: 38 };
  const root = document.documentElement;
  const lx = parseFloat(
    root.style.getPropertyValue("--parcours-glass-launch-x").replace("%", ""),
  );
  const ly = parseFloat(
    root.style.getPropertyValue("--parcours-glass-launch-y").replace("%", ""),
  );
  if (Number.isFinite(lx) && Number.isFinite(ly)) return { x: lx, y: ly };
  const gx = parseFloat(
    root.style.getPropertyValue("--parcours-glass-x").replace("%", ""),
  );
  const gy = parseFloat(
    root.style.getPropertyValue("--parcours-glass-y").replace("%", ""),
  );
  if (Number.isFinite(gx) && Number.isFinite(gy)) {
    return { x: gx, y: Math.max(8, gy - 11) };
  }
  return { x: 50, y: 38 };
}

function screenPxToWorldAtRefDepth(
  px: number,
  py: number,
  depthRef: Vector3,
  camera: Camera,
  width: number,
  height: number,
  out: Vector3,
): Vector3 {
  const depthNdc = depthRef.clone().project(camera).z;
  out.set((px / width) * 2 - 1, -(py / height) * 2 + 1, depthNdc);
  return out.unproject(camera);
}

function resolveStarWorld(
  camera: Camera,
  width: number,
  height: number,
  out: Vector3,
): void {
  if (hubStarWorldReadyRef.current) {
    out.copy(hubStarWorldRef.current);
    return;
  }
  const anchor = resolveHubStarAnchorForClose();
  screenPxToWorldAtRefDepth(
    (anchor.x / 100) * width,
    (anchor.y / 100) * height,
    tmpFallback,
    camera,
    width,
    height,
    out,
  );
}

type ParcoursCloseStreakProps = {
  /** Beat collapse — verre dissolve · calque WebGL monte vite (180 ms). */
  fire: boolean;
};

/**
 * Filante verre (haut) → étoile Hero — arm @ useFrame · cible live · absorption @ impact.
 */
export function ParcoursCloseStreak({ fire }: ParcoursCloseStreakProps) {
  const { camera, size } = useThree();
  const pendingRef = useRef(false);
  const activeRef = useRef(false);
  const ageRef = useRef(0);
  const waitFramesRef = useRef(0);
  const startRef = useRef(new Vector3());
  const flightDirRef = useRef(new Vector3());
  const baseLengthRef = useRef(0.55);
  const fireLatchRef = useRef(false);
  const impactFiredRef = useRef(false);

  const line = useMemo(() => {
    const positions = new Float32Array(SEGMENTS * 3);
    const colors = new Float32Array(SEGMENTS * 3);
    const posAttr = new BufferAttribute(positions, 3);
    const colAttr = new BufferAttribute(colors, 3);
    posAttr.setUsage(DynamicDrawUsage);
    colAttr.setUsage(DynamicDrawUsage);
    const geo = new BufferGeometry();
    geo.setAttribute("position", posAttr);
    geo.setAttribute("color", colAttr);
    const mat = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    const l = new Line(geo, mat);
    l.frustumCulled = false;
    l.renderOrder = 220;
    l.visible = false;
    paintLineColors(l, TIP, MID, TAIL);
    return l;
  }, []);

  useEffect(() => {
    if (!fire) {
      pendingRef.current = false;
      activeRef.current = false;
      fireLatchRef.current = false;
      impactFiredRef.current = false;
      ageRef.current = 0;
      waitFramesRef.current = 0;
      parcoursCloseStreakLockRef.current = false;
      const mat = line.material as LineBasicMaterial;
      mat.opacity = 0;
      line.visible = false;
      return;
    }
    if (fireLatchRef.current) return;
    pendingRef.current = true;
  }, [fire, line]);

  useFrame((_, delta) => {
    const mat = line.material as LineBasicMaterial;
    const w = size.width;
    const h = size.height;

    if (pendingRef.current && !fireLatchRef.current) {
      if (!hubStarWorldReadyRef.current) {
        waitFramesRef.current += 1;
        if (waitFramesRef.current < 30) return;
      }

      resolveStarWorld(camera, w, h, tmpEnd);

      const launch = readGlassLaunchPercent();
      screenPxToWorldAtRefDepth(
        (launch.x / 100) * w,
        (launch.y / 100) * h,
        tmpEnd,
        camera,
        w,
        h,
        tmpStart,
      );

      const dist = tmpStart.distanceTo(tmpEnd);
      if (dist < 0.06) return;

      startRef.current.copy(tmpStart);
      flightDirRef.current.copy(tmpEnd).sub(tmpStart).normalize();
      baseLengthRef.current = Math.min(1.05, dist * 0.42);
      ageRef.current = 0;
      waitFramesRef.current = 0;
      activeRef.current = true;
      pendingRef.current = false;
      fireLatchRef.current = true;
      parcoursCloseStreakLockRef.current = true;
    }

    if (!activeRef.current) {
      mat.opacity = 0;
      line.visible = false;
      return;
    }

    const dt = Math.min(delta, 0.05);
    ageRef.current += dt;
    const u = ageRef.current / LIFE_SEC;

    if (u >= 1) {
      activeRef.current = false;
      parcoursCloseStreakLockRef.current = false;
      mat.opacity = 0;
      line.visible = false;
      return;
    }

    resolveStarWorld(camera, w, h, tmpEnd);
    tmpDir.copy(tmpEnd).sub(startRef.current);
    if (tmpDir.lengthSq() > 1e-8) {
      flightDirRef.current.copy(tmpDir).normalize();
    }

    const approachT = Math.min(1, u / IMPACT_U);
    const eased = easeOutCubic(approachT);
    if (u >= IMPACT_U && !impactFiredRef.current) {
      impactFiredRef.current = true;
    }
    if (u < IMPACT_U) {
      tmpHead.lerpVectors(startRef.current, tmpEnd, eased);
    } else {
      tmpHead.copy(tmpEnd);
    }

    const absorbT =
      u < IMPACT_U ? 0 : (u - IMPACT_U) / Math.max(0.001, 1 - IMPACT_U);
    const tailLen =
      baseLengthRef.current *
      (u < IMPACT_U
        ? 0.78
        : Math.max(0, 1 - easeOutCubic(absorbT) * 1.35));

    const dx = flightDirRef.current.x;
    const dy = flightDirRef.current.y;
    const dz = flightDirRef.current.z;
    const pos = line.geometry.attributes.position as BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let p = 0; p < SEGMENTS; p += 1) {
      const t = p / (SEGMENTS - 1);
      const along = Math.pow(1 - t, 1.65) * tailLen;
      const i3 = p * 3;
      arr[i3] = tmpHead.x - dx * along;
      arr[i3 + 1] = tmpHead.y - dy * along;
      arr[i3 + 2] = tmpHead.z - dz * along;
    }
    pos.needsUpdate = true;

    const fade = cinematicFade(u, IMPACT_U);
    const impactBoost =
      u >= IMPACT_U * 0.88 && u < IMPACT_U + 0.14 ? 1.55 : u < IMPACT_U ? 1.08 : 0.72;
    mat.opacity =
      Math.min(1, (0.72 + 0.28 * fade) * impactBoost) *
      (u < IMPACT_U ? 1 : Math.max(0.15, 1 - absorbT * 0.85));
    line.visible = fade > 0.03 || absorbT < 0.95;
  });

  return <primitive object={line} />;
}
