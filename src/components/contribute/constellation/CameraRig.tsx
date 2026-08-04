"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

import {
  shapePointer,
  useParallaxIntensity,
  useParallaxPointerRef,
} from "./ParallaxLayer";

/** Rotation douce — pointeur fenêtre + dérive idle (vivant en mode fond). */
export function CameraRig({ children }: { children: React.ReactNode }) {
  const group = useRef<Group>(null);
  const intensity = useParallaxIntensity();
  const pointerRef = useParallaxPointerRef();

  useFrame(({ clock }) => {
    if (
      typeof document !== "undefined" &&
      document.body.dataset.soulDrag === "1"
    ) {
      return;
    }
    const g = group.current;
    if (!g) return;

    const t = clock.elapsedTime;
    const idleX = Math.sin(t * 0.07) * 0.12;
    const idleY = Math.cos(t * 0.055) * 0.1;
    const rawX = pointerRef?.current.x ?? 0;
    const rawY = pointerRef?.current.y ?? 0;
    const px = shapePointer(rawX) + idleX;
    const py = shapePointer(rawY) + idleY;

    const targetX = py * 0.055 * intensity;
    const targetY = px * 0.075 * intensity;
    g.rotation.x += (targetX - g.rotation.x) * 0.032;
    g.rotation.y += (targetY - g.rotation.y) * 0.032;
  });

  return <group ref={group}>{children}</group>;
}
