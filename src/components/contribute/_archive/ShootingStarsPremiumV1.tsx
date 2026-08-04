"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Line,
  LineBasicMaterial,
  Points,
  PointsMaterial,
  Vector3,
} from "three";

import type { VisualTier } from "./useVisualTier";

const POOL = 6;
const SEGMENTS = 10;
const SPAWN_GAP_MIN = 4.2;
const SPAWN_GAP_MAX = 10;
/** Grandes filantes — rares */
const LARGE_GAP_MIN = 32;
const LARGE_GAP_MAX = 58;

type StreakKind = "small" | "large";

type StreakState = {
  active: boolean;
  kind: StreakKind;
  age: number;
  life: number;
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
  speed: number;
  length: number;
  headSize: number;
  brightness: number;
};

type StreakVisual = {
  line: Line;
  head: Points;
};

function emptyStreak(): StreakState {
  return {
    active: false,
    kind: "small",
    age: 0,
    life: 1,
    ox: 0,
    oy: 0,
    oz: 0,
    dx: 1,
    dy: 0,
    dz: 0,
    speed: 8,
    length: 1,
    headSize: 0.06,
    brightness: 1,
  };
}

function randomUnitDirection(out: Vector3) {
  const x = Math.random() * 2 - 1;
  const y = Math.random() * 2 - 1;
  const z = Math.random() * 2 - 1;
  out.set(x, y, z);
  if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
  else out.normalize();
  return out;
}

function spawnStreak(s: StreakState, dir: Vector3, kind: StreakKind) {
  randomUnitDirection(dir);
  s.active = true;
  s.kind = kind;
  s.age = 0;
  s.dx = dir.x;
  s.dy = dir.y;
  s.dz = dir.z;
  s.ox = (Math.random() - 0.5) * 16 - dir.x * 4;
  s.oy = (Math.random() - 0.5) * 10 - dir.y * 4;
  s.oz = -2 + Math.random() * 3 - dir.z * 2;

  if (kind === "large") {
    s.life = 0.85 + Math.random() * 0.5;
    s.speed = 11 + Math.random() * 6;
    s.length = 0.55 + Math.random() * 0.5;
    s.headSize = 0.16;
    s.brightness = 1;
  } else {
    s.life = 0.4 + Math.random() * 0.4;
    s.speed = 10 + Math.random() * 5;
    s.length = 0.22 + Math.random() * 0.32;
    s.headSize = 0.05 + Math.random() * 0.025;
    s.brightness = 0.75 + Math.random() * 0.2;
  }
}

/** Fade ciné : entrée nette, sortie douce. */
function cinematicFade(u: number): number {
  if (u < 0.12) {
    const t = u / 0.12;
    return t * t * (3 - 2 * t);
  }
  if (u > 0.42) {
    const t = Math.max(0, (1 - u) / 0.58);
    return Math.pow(t, 1.25);
  }
  return 1;
}

type ShootingStarsProps = {
  tier: VisualTier;
};

/**
 * Filantes premium : tête ponctuelle + queue courte dégradée.
 * Petites (fréquentes) + grandes (rares). Directions 3D aléatoires.
 */
export function ShootingStars({ tier }: ShootingStarsProps) {
  const statesRef = useRef<StreakState[]>(
    Array.from({ length: POOL }, emptyStreak),
  );
  const nextSmallRef = useRef(2 + Math.random() * 3);
  const nextLargeRef = useRef(18 + Math.random() * 20);
  const dirTmp = useMemo(() => new Vector3(), []);

  const visuals = useMemo(() => {
    const list: StreakVisual[] = [];
    const headCol = new Color("#f5f8ff");
    const mid = new Color("#c8d4f0");
    const tail = new Color("#5a6a88");

    for (let i = 0; i < POOL; i += 1) {
      const positions = new Float32Array(SEGMENTS * 3);
      const colors = new Float32Array(SEGMENTS * 3);
      const posAttr = new BufferAttribute(positions, 3);
      const colAttr = new BufferAttribute(colors, 3);
      posAttr.setUsage(DynamicDrawUsage);
      colAttr.setUsage(DynamicDrawUsage);

      for (let s = 0; s < SEGMENTS; s += 1) {
        const t = s / (SEGMENTS - 1);
        // Queue très sombre → tête claire (plus de contraste = filante)
        const c = tail
          .clone()
          .lerp(mid, Math.min(1, t * 1.6))
          .lerp(headCol, Math.max(0, t - 0.55) / 0.45);
        const i3 = s * 3;
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }

      const lineGeo = new BufferGeometry();
      lineGeo.setAttribute("position", posAttr);
      lineGeo.setAttribute("color", colAttr);
      const lineMat = new LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      });
      const line = new Line(lineGeo, lineMat);
      line.frustumCulled = false;
      line.renderOrder = 4;
      line.visible = false;

      const headPos = new Float32Array(3);
      const headAttr = new BufferAttribute(headPos, 3);
      headAttr.setUsage(DynamicDrawUsage);
      const headGeo = new BufferGeometry();
      headGeo.setAttribute("position", headAttr);
      const headMat = new PointsMaterial({
        color: headCol,
        size: 0.06,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        blending: AdditiveBlending,
      });
      const head = new Points(headGeo, headMat);
      head.frustumCulled = false;
      head.renderOrder = 5;
      head.visible = false;

      list.push({ line, head });
    }
    return list;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const states = statesRef.current;
    nextSmallRef.current -= dt;
    nextLargeRef.current -= dt;

    const trySpawn = (kind: StreakKind) => {
      const slot = states.find((s) => !s.active);
      if (!slot) return false;
      spawnStreak(slot, dirTmp, kind);
      return true;
    };

    if (nextLargeRef.current <= 0) {
      if (trySpawn("large")) {
        nextLargeRef.current =
          LARGE_GAP_MIN + Math.random() * (LARGE_GAP_MAX - LARGE_GAP_MIN);
      } else {
        nextLargeRef.current = 2;
      }
    }

    if (nextSmallRef.current <= 0) {
      if (trySpawn("small")) {
        nextSmallRef.current =
          SPAWN_GAP_MIN + Math.random() * (SPAWN_GAP_MAX - SPAWN_GAP_MIN);
      } else {
        nextSmallRef.current = 0.9;
      }
    }

    for (let i = 0; i < POOL; i += 1) {
      const s = states[i];
      const vis = visuals[i];
      if (!s || !vis) continue;

      const lineMat = vis.line.material as LineBasicMaterial;
      const headMat = vis.head.material as PointsMaterial;

      if (!s.active) {
        lineMat.opacity = 0;
        headMat.opacity = 0;
        vis.line.visible = false;
        vis.head.visible = false;
        continue;
      }

      s.age += dt;
      if (s.age >= s.life) {
        s.active = false;
        lineMat.opacity = 0;
        headMat.opacity = 0;
        vis.line.visible = false;
        vis.head.visible = false;
        continue;
      }

      const fade = cinematicFade(s.age / s.life);
      const headX = s.ox + s.dx * s.speed * s.age;
      const headY = s.oy + s.dy * s.speed * s.age;
      const headZ = s.oz + s.dz * s.speed * s.age;

      const pos = vis.line.geometry.attributes.position as BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let p = 0; p < SEGMENTS; p += 1) {
        const t = p / (SEGMENTS - 1);
        // Plus de matière près de la tête
        const along = Math.pow(1 - t, 1.55) * s.length;
        const i3 = p * 3;
        arr[i3] = headX - s.dx * along;
        arr[i3 + 1] = headY - s.dy * along;
        arr[i3 + 2] = headZ - s.dz * along;
      }
      pos.needsUpdate = true;

      const hPos = vis.head.geometry.attributes.position as BufferAttribute;
      const hArr = hPos.array as Float32Array;
      hArr[0] = headX;
      hArr[1] = headY;
      hArr[2] = headZ;
      hPos.needsUpdate = true;

      lineMat.opacity = (0.25 + 0.7 * fade) * s.brightness;
      headMat.size = s.headSize * (0.85 + 0.35 * fade);
      headMat.opacity = (0.35 + 0.55 * fade) * s.brightness;
      // Grandes : tête un peu plus présente
      if (s.kind === "large") {
        headMat.opacity = Math.min(1, headMat.opacity * 1.15);
      }

      const show = fade > 0.02;
      vis.line.visible = show;
      vis.head.visible = show;
    }
  });

  if (tier === "reduced") return null;

  return (
    <group>
      {visuals.map((v, i) => (
        <group key={i}>
          <primitive object={v.line} />
          <primitive object={v.head} />
        </group>
      ))}
    </group>
  );
}
