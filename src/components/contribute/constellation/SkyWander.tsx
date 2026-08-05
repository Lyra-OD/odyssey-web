"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";

import { markSkyActivity } from "./IdleCameraDrift";

/**
 * Promenade illusion — drag pour se déplacer ; la constellation suit (leash).
 * Opt-in via toggle UI (OFF par défaut). Soft-clamp serré (décor fini).
 */

export const skyWanderRef = {
  x: 0,
  y: 0,
  dragging: false,
  /** Distance pointeur (px) depuis pointerdown — pour distinguer tap / drag. */
  gesturePx: 0,
};

/** Amplitude serrée — reste dans le cœur de la voie lactée (pas de wrap encore). */
const WANDER_MAX = 5.5;
const DRAG_THRESHOLD_PX = 8;
const SENS = 0.009;

function skyFocusActive() {
  return (
    typeof document !== "undefined" && document.body.dataset.skyFocus === "1"
  );
}

function softClamp(v: number, max: number) {
  return Math.tanh(v / max) * max;
}

type SkyWanderProps = {
  enabled: boolean;
};

/**
 * Drag sur le canvas → accumule pan monde.
 * Skip si focus mémoire ou mode OFF.
 */
export function SkyWander({ enabled }: SkyWanderProps) {
  const gl = useThree((s) => s.gl);
  const startRef = useRef<{
    x: number;
    y: number;
    wx: number;
    wy: number;
  } | null>(null);

  // Retour doux au centre quand on coupe la promenade
  useFrame((_, delta) => {
    if (enabled) return;
    const ease = Math.min(1, delta * 2.2);
    skyWanderRef.x += (0 - skyWanderRef.x) * ease;
    skyWanderRef.y += (0 - skyWanderRef.y) * ease;
    if (skyWanderRef.dragging) {
      skyWanderRef.dragging = false;
      delete document.body.dataset.skyWander;
    }
  });

  useEffect(() => {
    if (!enabled) {
      startRef.current = null;
      skyWanderRef.dragging = false;
      skyWanderRef.gesturePx = 0;
      delete document.body.dataset.skyWander;
      return;
    }

    const el = gl.domElement;

    const onDown = (e: PointerEvent) => {
      if (skyFocusActive()) return;
      if (e.button !== 0) return;
      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        wx: skyWanderRef.x,
        wy: skyWanderRef.y,
      };
      skyWanderRef.gesturePx = 0;
      skyWanderRef.dragging = false;
    };

    const onMove = (e: PointerEvent) => {
      const start = startRef.current;
      if (!start || skyFocusActive()) return;
      if ((e.buttons & 1) === 0) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const dist = Math.hypot(dx, dy);
      skyWanderRef.gesturePx = dist;

      if (dist < DRAG_THRESHOLD_PX) return;

      if (!skyWanderRef.dragging) {
        skyWanderRef.dragging = true;
        document.body.dataset.skyWander = "1";
      }

      markSkyActivity();
      const nextX = start.wx - dx * SENS;
      const nextY = start.wy + dy * SENS;
      skyWanderRef.x = softClamp(nextX, WANDER_MAX);
      skyWanderRef.y = softClamp(nextY, WANDER_MAX);
    };

    const onUp = () => {
      startRef.current = null;
      if (skyWanderRef.dragging) {
        skyWanderRef.dragging = false;
        delete document.body.dataset.skyWander;
      }
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      delete document.body.dataset.skyWander;
      skyWanderRef.dragging = false;
    };
  }, [enabled, gl]);

  return null;
}

/** true si le geste courant est un drag (pas un tap). */
export function skyWanderWasDrag() {
  return (
    skyWanderRef.dragging || skyWanderRef.gesturePx >= DRAG_THRESHOLD_PX
  );
}

type LeashProps = {
  children: ReactNode;
  /** Vitesse de suivi (plus bas = plus de lag compagnon). */
  lerp?: number;
};

/**
 * La constellation suit le point de promenade — léger retard = compagnon.
 */
export function ConstellationLeash({ children, lerp = 0.085 }: LeashProps) {
  const group = useRef<Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    if (
      typeof document !== "undefined" &&
      document.body.dataset.skyFocus === "1"
    ) {
      g.position.x = skyWanderRef.x;
      g.position.y = skyWanderRef.y;
      return;
    }
    g.position.x += (skyWanderRef.x - g.position.x) * lerp;
    g.position.y += (skyWanderRef.y - g.position.y) * lerp;
  });

  return <group ref={group}>{children}</group>;
}
