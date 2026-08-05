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
import { useSkyTheme, type RareSkyTarget } from "./skyTheme";
import { idleCameraRef } from "./IdleCameraDrift";

/**
 * Mix Kubrick × Premium :
 * - grâce / froid / pas de gros Points additif (évite la boule blanche)
 * - lisibilité au-dessus du Kubrick pur (opacité, longueur, fréquence)
 * Archive flashy : `_archive/ShootingStarsPremiumV1.tsx`
 */

const POOL = 5;
const SEGMENTS = 12;
const SPAWN_GAP_MIN = 4.5;
const SPAWN_GAP_MAX = 10.5;
const LARGE_GAP_MIN = 36;
const LARGE_GAP_MAX = 62;

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
  brightness: number;
  /** Filante rare — programme un echo à la fin. */
  special: boolean;
};

type EchoPending = {
  wait: number;
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
  speed: number;
  length: number;
  tip: string;
  mid: string;
  tail: string;
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
    brightness: 1,
    special: false,
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
      .lerp(mid, Math.min(1, Math.pow(t, 1.15) * 1.35))
      .lerp(tip, Math.max(0, t - 0.65) / 0.35);
    const i3 = s * 3;
    colors[i3] = c.r;
    colors[i3 + 1] = c.g;
    colors[i3 + 2] = c.b;
  }
  colAttr.needsUpdate = true;
}

function spawnStreak(
  s: StreakState,
  dir: Vector3,
  kind: StreakKind,
  special = false,
) {
  randomUnitDirection(dir);
  s.active = true;
  s.kind = kind;
  s.age = 0;
  s.special = special;
  s.dx = dir.x;
  s.dy = dir.y;
  s.dz = dir.z;
  s.ox = (Math.random() - 0.5) * 16 - dir.x * 4;
  s.oy = (Math.random() - 0.5) * 10 - dir.y * 4;
  s.oz = -2 + Math.random() * 3 - dir.z * 2;

  if (kind === "large") {
    s.life = 0.95 + Math.random() * 0.4 + (special ? 0.25 : 0);
    s.speed = 8.5 + Math.random() * 4;
    s.length = 0.75 + Math.random() * 0.5 + (special ? 0.35 : 0);
    s.brightness = special ? 1.05 : 0.88;
  } else {
    s.life = 0.48 + Math.random() * 0.38;
    s.speed = 9.5 + Math.random() * 4.5;
    s.length = 0.38 + Math.random() * 0.32;
    s.brightness = 0.7 + Math.random() * 0.18;
  }
}

function cinematicFade(u: number): number {
  if (u < 0.12) {
    const t = u / 0.12;
    return t * t * (3 - 2 * t);
  }
  if (u > 0.4) {
    const t = Math.max(0, (1 - u) / 0.6);
    return Math.pow(t, 1.3);
  }
  return 1;
}

type ShootingStarsProps = {
  tier: VisualTier;
};

/**
 * Filantes mix — lisibles, élégantes, sans flash de tête.
 * StreakEcho : fantôme soft ~0.4s après une filante spéciale (rare).
 */
export function ShootingStars({ tier }: ShootingStarsProps) {
  const theme = useSkyTheme();
  const streak = theme.shootingStars;
  const statesRef = useRef<StreakState[]>(
    Array.from({ length: POOL }, emptyStreak),
  );
  const echoPendingRef = useRef<EchoPending | null>(null);
  const echoStateRef = useRef(emptyStreak());
  const nextSmallRef = useRef(2.5 + Math.random() * 3);
  const nextLargeRef = useRef(20 + Math.random() * 22);
  const dirTmp = useMemo(() => new Vector3(), []);
  const lastSpecialTintRef = useRef({
    tip: streak.tip,
    mid: streak.mid,
    tail: streak.tail,
  });

  const { lines, echoLine } = useMemo(() => {
    const list: Line[] = [];
    const tip = new Color(streak.tip);
    const mid = new Color(streak.mid);
    const tail = new Color(streak.tail);

    const makeLine = () => {
      const positions = new Float32Array(SEGMENTS * 3);
      const colors = new Float32Array(SEGMENTS * 3);
      const posAttr = new BufferAttribute(positions, 3);
      const colAttr = new BufferAttribute(colors, 3);
      posAttr.setUsage(DynamicDrawUsage);
      colAttr.setUsage(DynamicDrawUsage);

      for (let s = 0; s < SEGMENTS; s += 1) {
        const t = s / (SEGMENTS - 1);
        const c = tail
          .clone()
          .lerp(mid, Math.min(1, Math.pow(t, 1.15) * 1.35))
          .lerp(tip, Math.max(0, t - 0.65) / 0.35);
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
      return line;
    };

    for (let i = 0; i < POOL; i += 1) {
      list.push(makeLine());
    }
    const echo = makeLine();
    echo.renderOrder = 3;
    return { lines: list, echoLine: echo };
  }, [streak.tip, streak.mid, streak.tail]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const states = statesRef.current;
    nextSmallRef.current -= dt;
    nextLargeRef.current -= dt;

    const trySpawn = (kind: StreakKind, special = false) => {
      const idx = states.findIndex((s) => !s.active);
      if (idx < 0) return false;
      const slot = states[idx]!;
      const line = lines[idx];
      if (!line) return false;
      spawnStreak(slot, dirTmp, kind, special);
      if (special) {
        const target = idleCameraRef.rareTarget as RareSkyTarget;
        const tint =
          streak.rareTints[target] ?? {
            tip: streak.tip,
            mid: streak.mid,
            tail: streak.tail,
          };
        lastSpecialTintRef.current = tint;
        paintLineColors(line, tint.tip, tint.mid, tint.tail);
      } else {
        paintLineColors(line, streak.tip, streak.mid, streak.tail);
      }
      return true;
    };

    if (idleCameraRef.requestSpecialStreak) {
      idleCameraRef.requestSpecialStreak = false;
      if (trySpawn("large", true)) {
        nextLargeRef.current =
          LARGE_GAP_MIN + Math.random() * (LARGE_GAP_MAX - LARGE_GAP_MIN);
      }
    }

    if (nextLargeRef.current <= 0) {
      if (trySpawn("large")) {
        nextLargeRef.current =
          LARGE_GAP_MIN + Math.random() * (LARGE_GAP_MAX - LARGE_GAP_MIN);
      } else {
        nextLargeRef.current = 2.5;
      }
    }

    if (nextSmallRef.current <= 0) {
      if (trySpawn("small")) {
        nextSmallRef.current =
          SPAWN_GAP_MIN + Math.random() * (SPAWN_GAP_MAX - SPAWN_GAP_MIN);
      } else {
        nextSmallRef.current = 1;
      }
    }

    const updateLine = (
      s: StreakState,
      line: Line,
      opacityMul: number,
    ) => {
      const mat = line.material as LineBasicMaterial;
      if (!s.active) {
        mat.opacity = 0;
        line.visible = false;
        return;
      }

      s.age += dt;
      if (s.age >= s.life) {
        if (s.special) {
          const tint = lastSpecialTintRef.current;
          echoPendingRef.current = {
            wait: streak.echoDelaySec,
            ox: s.ox,
            oy: s.oy,
            oz: s.oz,
            dx: s.dx,
            dy: s.dy,
            dz: s.dz,
            speed: s.speed * 0.92,
            length: s.length * 1.05,
            tip: tint.tip,
            mid: tint.mid,
            tail: tint.tail,
          };
        }
        s.active = false;
        s.special = false;
        mat.opacity = 0;
        line.visible = false;
        return;
      }

      const fade = cinematicFade(s.age / s.life);
      const headX = s.ox + s.dx * s.speed * s.age;
      const headY = s.oy + s.dy * s.speed * s.age;
      const headZ = s.oz + s.dz * s.speed * s.age;

      const pos = line.geometry.attributes.position as BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let p = 0; p < SEGMENTS; p += 1) {
        const t = p / (SEGMENTS - 1);
        const along = Math.pow(1 - t, 1.6) * s.length;
        const i3 = p * 3;
        arr[i3] = headX - s.dx * along;
        arr[i3 + 1] = headY - s.dy * along;
        arr[i3 + 2] = headZ - s.dz * along;
      }
      pos.needsUpdate = true;

      const base = s.kind === "large" ? 0.48 : 0.4;
      mat.opacity = (base + 0.5 * fade) * s.brightness * opacityMul;
      line.visible = fade > 0.025;
    };

    for (let i = 0; i < POOL; i += 1) {
      const s = states[i];
      const line = lines[i];
      if (!s || !line) continue;
      updateLine(s, line, 1);
    }

    // StreakEcho — fantôme après filante spéciale
    const pending = echoPendingRef.current;
    if (pending) {
      pending.wait -= dt;
      if (pending.wait <= 0) {
        const echo = echoStateRef.current;
        echo.active = true;
        echo.kind = "large";
        echo.age = 0;
        echo.life = 0.55 + Math.random() * 0.2;
        echo.ox = pending.ox;
        echo.oy = pending.oy;
        echo.oz = pending.oz;
        echo.dx = pending.dx;
        echo.dy = pending.dy;
        echo.dz = pending.dz;
        echo.speed = pending.speed;
        echo.length = pending.length;
        echo.brightness = 0.55;
        echo.special = false;
        paintLineColors(echoLine, pending.tip, pending.mid, pending.tail);
        echoPendingRef.current = null;
      }
    }
    updateLine(echoStateRef.current, echoLine, streak.echoOpacity);
  });

  if (tier === "reduced") return null;

  return (
    <group>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
      <primitive object={echoLine} />
    </group>
  );
}
