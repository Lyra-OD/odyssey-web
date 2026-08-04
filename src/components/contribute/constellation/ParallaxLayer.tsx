"use client";

import { createContext, useContext, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";

const ParallaxIntensityContext = createContext(1);

/** Stub plan D : enveloppe l’intensité (fond ×0.4 / immersif ×1). */
export function ParallaxProvider({
  intensity = 1,
  children,
}: {
  intensity?: number;
  children: React.ReactNode;
}) {
  return (
    <ParallaxIntensityContext.Provider value={intensity}>
      {children}
    </ParallaxIntensityContext.Provider>
  );
}

export function useParallaxIntensity() {
  return useContext(ParallaxIntensityContext);
}

/**
 * Courbe non-linéaire : petit geste souris = peu d’effet, grand geste = plus.
 * pointer R3F est déjà ~[-1, 1].
 */
export function shapePointer(v: number): number {
  const s = Math.sign(v);
  const a = Math.min(1, Math.abs(v));
  return s * Math.pow(a, 1.4);
}

type ParallaxLayerProps = {
  /** Amplitude relative (négatif = micro-parallaxe inverse, ex. gaz). */
  factor: number;
  /** Vitesse de poursuite (plus bas = plus d’inertie / plus loin). */
  lerp?: number;
  children: React.ReactNode;
};

/**
 * Parallaxe XY + léger Z — profondeur ciné.
 * Pause pendant drag âme (même flag que CameraRig).
 */
export function ParallaxLayer({
  factor,
  lerp = 0.045,
  children,
}: ParallaxLayerProps) {
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
    const k = factor * intensity;

    const targetX = px * k * 0.48;
    const targetY = py * k * 0.32;
    // Z léger : avance/recul selon le geste (volume)
    const targetZ = (-px * 0.12 + py * 0.08) * k * 0.55;

    g.position.x += (targetX - g.position.x) * lerp;
    g.position.y += (targetY - g.position.y) * lerp;
    g.position.z += (targetZ - g.position.z) * lerp;
  });

  return <group ref={group}>{children}</group>;
}
