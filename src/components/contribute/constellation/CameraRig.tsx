"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";

/** Parallaxe douce — pause pendant le drag d’une âme. */
export function CameraRig({ children }: { children: React.ReactNode }) {
  const group = useRef<Group>(null);
  const { pointer } = useThree();

  useFrame(() => {
    if (
      typeof document !== "undefined" &&
      document.body.dataset.soulDrag === "1"
    ) {
      return;
    }
    const g = group.current;
    if (!g) return;
    const targetX = pointer.y * 0.1;
    const targetY = pointer.x * 0.14;
    g.rotation.x += (targetX - g.rotation.x) * 0.035;
    g.rotation.y += (targetY - g.rotation.y) * 0.035;
  });

  return <group ref={group}>{children}</group>;
}
