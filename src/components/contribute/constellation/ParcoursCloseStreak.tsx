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
  hubStarVisualViewportPx,
  resolveHubStarAnchorForClose,
} from "@/src/components/tribute/hubStarAnchorRef";

const SEGMENTS = 16;
const LIFE_SEC = 0.54;
const TIP = "#e8fffe";
const MID = "#00e8f0";
const TAIL = "#0a4a52";

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

function cinematicFade(u: number): number {
  if (u < 0.1) {
    const t = u / 0.1;
    return t * t * (3 - 2 * t);
  }
  if (u > 0.45) {
    const t = Math.max(0, (1 - u) / 0.55);
    return Math.pow(t, 1.35);
  }
  return 1;
}

function readGlassPercent(): { x: number; y: number } {
  if (typeof document === "undefined") return { x: 50, y: 48 };
  const root = document.documentElement;
  const gx = parseFloat(
    root.style.getPropertyValue("--parcours-glass-x").replace("%", ""),
  );
  const gy = parseFloat(
    root.style.getPropertyValue("--parcours-glass-y").replace("%", ""),
  );
  if (Number.isFinite(gx) && Number.isFinite(gy)) return { x: gx, y: gy };
  return { x: 50, y: 48 };
}

function screenPxToWorld(
  px: number,
  py: number,
  camera: Camera,
  width: number,
  height: number,
  planeZ: number,
): Vector3 {
  const ndc = new Vector3(
    (px / width) * 2 - 1,
    -(py / height) * 2 + 1,
    0.5,
  );
  ndc.unproject(camera);
  const dir = ndc.sub(camera.position).normalize();
  const t = (planeZ - camera.position.z) / dir.z;
  return camera.position.clone().add(dir.multiplyScalar(t));
}

type ParcoursCloseStreakProps = {
  /** Beat collapse — verre dissolve · calque WebGL monte vite (180 ms). */
  fire: boolean;
};

/**
 * Filante dirigée verre → étoile Hero (Chemin 1 fermeture).
 * ADN ShootingStars · pas de blob CSS lens flare.
 */
export function ParcoursCloseStreak({ fire }: ParcoursCloseStreakProps) {
  const { camera, size } = useThree();
  const activeRef = useRef(false);
  const ageRef = useRef(0);
  const originRef = useRef(new Vector3());
  const dirRef = useRef(new Vector3());
  const speedRef = useRef(0);
  const lengthRef = useRef(0.55);
  const firedKeyRef = useRef(false);

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
    l.renderOrder = 24;
    l.visible = false;
    paintLineColors(l, TIP, MID, TAIL);
    return l;
  }, []);

  useEffect(() => {
    if (!fire) {
      firedKeyRef.current = false;
      activeRef.current = false;
      ageRef.current = 0;
      const mat = line.material as LineBasicMaterial;
      mat.opacity = 0;
      line.visible = false;
      return;
    }
    if (firedKeyRef.current) return;

    const arm = () => {
      if (firedKeyRef.current) return;
      firedKeyRef.current = true;

      const glass = readGlassPercent();
      const glassPx = {
        x: (glass.x / 100) * size.width,
        y: (glass.y / 100) * size.height,
      };
      const anchor = resolveHubStarAnchorForClose();
      const starPx = hubStarVisualViewportPx(anchor);
      const endPx = starPx ?? glassPx;

      const planeZ = -1.8;
      const start = screenPxToWorld(
        glassPx.x,
        glassPx.y,
        camera,
        size.width,
        size.height,
        planeZ,
      );
      const end = screenPxToWorld(
        endPx.x,
        endPx.y,
        camera,
        size.width,
        size.height,
        planeZ,
      );
      const delta = end.clone().sub(start);
      const dist = delta.length();
      if (dist < 0.05) {
        firedKeyRef.current = false;
        return;
      }
      delta.normalize();
      originRef.current.copy(start).addScaledVector(delta, -0.42);
      dirRef.current.copy(delta);
      speedRef.current = dist / (LIFE_SEC * 0.68);
      lengthRef.current = Math.min(1.35, dist * 0.52);
      ageRef.current = 0;
      activeRef.current = true;
    };

    requestAnimationFrame(arm);
  }, [fire, camera, size.width, size.height, line]);

  useFrame((_, delta) => {
    const mat = line.material as LineBasicMaterial;
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
      mat.opacity = 0;
      line.visible = false;
      return;
    }
    const fade = cinematicFade(u);
    const head = originRef.current.clone().addScaledVector(
      dirRef.current,
      speedRef.current * ageRef.current,
    );
    const pos = line.geometry.attributes.position as BufferAttribute;
    const arr = pos.array as Float32Array;
    const len = lengthRef.current;
    const dx = dirRef.current.x;
    const dy = dirRef.current.y;
    const dz = dirRef.current.z;
    for (let p = 0; p < SEGMENTS; p += 1) {
      const t = p / (SEGMENTS - 1);
      const along = Math.pow(1 - t, 1.55) * len;
      const i3 = p * 3;
      arr[i3] = head.x - dx * along;
      arr[i3 + 1] = head.y - dy * along;
      arr[i3 + 2] = head.z - dz * along;
    }
    pos.needsUpdate = true;
    mat.opacity = (0.62 + 0.38 * fade) * Math.min(1, fade * 1.15);
    line.visible = fade > 0.03;
  });

  return <primitive object={line} />;
}
