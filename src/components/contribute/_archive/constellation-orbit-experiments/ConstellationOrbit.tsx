"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

type StarOnOrbitProps = {
  radius: number;
  /** rad/s */
  speed: number;
  /** décalage initial (rad) */
  phase: number;
  children: React.ReactNode;
};

function orbitPaused() {
  if (typeof document === "undefined") return false;
  return document.body.dataset.skyFocus === "1";
}

/**
 * Étoile qui circule sur un cercle fixe (plan local XY du parent).
 */
export function StarOnOrbit({
  radius,
  speed,
  phase,
  children,
}: StarOnOrbitProps) {
  const ref = useRef<Group>(null);
  const angle = useRef(phase);

  useFrame((_, dt) => {
    if (orbitPaused()) return;
    const g = ref.current;
    if (!g) return;
    angle.current += dt * speed;
    g.position.set(
      Math.cos(angle.current) * radius,
      Math.sin(angle.current) * radius,
      0,
    );
  });

  return (
    <group
      ref={ref}
      position={[Math.cos(phase) * radius, Math.sin(phase) * radius, 0]}
    >
      {children}
    </group>
  );
}

/**
 * Plan orbital fixe — orientation figée pour l’effet cage 3D.
 * Les étoiles bougent dessus ; le cercle ne tourne pas.
 */
export function OrbitPlane({
  children,
  rotation,
}: {
  children: React.ReactNode;
  rotation: [number, number, number];
}) {
  return <group rotation={rotation}>{children}</group>;
}
