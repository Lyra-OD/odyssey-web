"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Line,
  LineBasicMaterial,
  Vector3,
} from "three";

import type { VisualTier } from "./useVisualTier";

const POOL = 5;
/** Points le long du sillage (tête = dernier) */
const SEGMENTS = 8;
const SPAWN_GAP_MIN = 3.8;
const SPAWN_GAP_MAX = 9.5;
const LIFE_MIN = 0.45;
const LIFE_MAX = 0.9;
const SPEED_MIN = 9;
const SPEED_MAX = 15;
/** Queue courte — effet filante, pas bande */
const LENGTH_MIN = 0.28;
const LENGTH_MAX = 0.65;

type StreakState = {
  active: boolean;
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
};

function emptyStreak(): StreakState {
  return {
    active: false,
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

function spawnStreak(s: StreakState, dir: Vector3) {
  randomUnitDirection(dir);
  s.active = true;
  s.age = 0;
  s.life = LIFE_MIN + Math.random() * (LIFE_MAX - LIFE_MIN);
  s.speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
  s.length = LENGTH_MIN + Math.random() * (LENGTH_MAX - LENGTH_MIN);
  s.dx = dir.x;
  s.dy = dir.y;
  s.dz = dir.z;
  s.ox = (Math.random() - 0.5) * 16 - dir.x * 4;
  s.oy = (Math.random() - 0.5) * 10 - dir.y * 4;
  s.oz = -2 + Math.random() * 3 - dir.z * 2;
}

type ShootingStarsProps = {
  tier: VisualTier;
};

/**
 * Étoiles filantes : tête vive + queue courte en dégradé, directions 3D aléatoires.
 */
export function ShootingStars({ tier }: ShootingStarsProps) {
  const statesRef = useRef<StreakState[]>(
    Array.from({ length: POOL }, emptyStreak),
  );
  const nextSpawnRef = useRef(2 + Math.random() * 3);
  const dirTmp = useMemo(() => new Vector3(), []);

  const lines = useMemo(() => {
    const list: Line[] = [];
    const head = new Color("#f5f8ff");
    const mid = new Color("#c8d4f0");
    const tail = new Color("#6a7a99");

    for (let i = 0; i < POOL; i += 1) {
      const positions = new Float32Array(SEGMENTS * 3);
      const colors = new Float32Array(SEGMENTS * 3);
      const posAttr = new BufferAttribute(positions, 3);
      const colAttr = new BufferAttribute(colors, 3);
      posAttr.setUsage(DynamicDrawUsage);
      colAttr.setUsage(DynamicDrawUsage);

      // Dégradé fixe tête→queue (mis à jour chaque frame avec alpha via couleur * fade)
      for (let s = 0; s < SEGMENTS; s += 1) {
        const t = s / (SEGMENTS - 1); // 0 = queue, 1 = tête
        const c = tail.clone().lerp(mid, Math.min(1, t * 1.4)).lerp(head, Math.max(0, t - 0.45) / 0.55);
        const i3 = s * 3;
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }

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
      const line = new Line(geo, mat);
      line.frustumCulled = false;
      line.renderOrder = 4;
      line.visible = false;
      list.push(line);
    }
    return list;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const states = statesRef.current;
    nextSpawnRef.current -= dt;

    if (nextSpawnRef.current <= 0) {
      const slot = states.find((s) => !s.active);
      if (slot) {
        spawnStreak(slot, dirTmp);
        nextSpawnRef.current =
          SPAWN_GAP_MIN + Math.random() * (SPAWN_GAP_MAX - SPAWN_GAP_MIN);
      } else {
        nextSpawnRef.current = 0.8;
      }
    }

    for (let i = 0; i < POOL; i += 1) {
      const s = states[i];
      const line = lines[i];
      if (!s || !line) continue;
      const geo = line.geometry;
      const mat = line.material as LineBasicMaterial;

      if (!s.active) {
        mat.opacity = 0;
        line.visible = false;
        continue;
      }

      s.age += dt;
      if (s.age >= s.life) {
        s.active = false;
        mat.opacity = 0;
        line.visible = false;
        continue;
      }

      const u = s.age / s.life;
      // Apparition nette, disparition douce
      const fade =
        u < 0.1 ? u / 0.1 : u > 0.5 ? Math.max(0, (1 - u) / 0.5) : 1;

      const headX = s.ox + s.dx * s.speed * s.age;
      const headY = s.oy + s.dy * s.speed * s.age;
      const headZ = s.oz + s.dz * s.speed * s.age;

      const pos = geo.attributes.position as BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let p = 0; p < SEGMENTS; p += 1) {
        // p=0 queue, p=last tête — espacement non linéaire (plus de points près de la tête)
        const t = p / (SEGMENTS - 1);
        const along = Math.pow(1 - t, 1.35) * s.length;
        const i3 = p * 3;
        arr[i3] = headX - s.dx * along;
        arr[i3 + 1] = headY - s.dy * along;
        arr[i3 + 2] = headZ - s.dz * along;
      }
      pos.needsUpdate = true;

      mat.opacity = 0.35 + 0.65 * fade;
      line.visible = fade > 0.02;
    }
  });

  if (tier === "reduced") return null;

  return (
    <group>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}
