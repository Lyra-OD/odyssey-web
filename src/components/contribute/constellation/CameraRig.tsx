"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";

import { shapePointer, useParallaxIntensity } from "./ParallaxLayer";

/** Rotation douce — amplitudes × intensity (stub mode fond / immersif). */
export function CameraRig({ children }: { children: React.ReactNode }) {
  const group = useRef<Group>(null);
  const { pointer } = useThree();
  const intensity = useParallaxIntensity();

  useFrame(() => {
    if (
      typeof document !== "undefined" &&
      document.body.dataset.soulDrag === "1"
    ) {
      return;
    }
    const g = group.current;
    if (!g) return;
    const px = shapePointer(pointer.x);
    const py = shapePointer(pointer.y);
    const targetX = py * 0.055 * intensity;
    const targetY = px * 0.075 * intensity;
    g.rotation.x += (targetX - g.rotation.x) * 0.032;
    g.rotation.y += (targetY - g.rotation.y) * 0.032;
  });

  return <group ref={group}>{children}</group>;
}
