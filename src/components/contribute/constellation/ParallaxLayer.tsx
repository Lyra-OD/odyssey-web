"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type MutableRefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

import { cameraZoomRef, ZOOM_DEFAULT } from "./WheelZoom";
import { idleCameraRef, markSkyActivity } from "./IdleCameraDrift";
import { useSkyTheme } from "./skyTheme";

type PointerSample = { x: number; y: number };

type ParallaxContextValue = {
  intensity: number;
  /** Pointeur fenêtre [-1,1] — marche même si le canvas est pointer-events:none */
  pointerRef: MutableRefObject<PointerSample>;
};

const ParallaxContext = createContext<ParallaxContextValue | null>(null);

/**
 * Intensité + pointeur global (ciel toujours vivant derrière l’UI).
 */
export function ParallaxProvider({
  intensity = 1,
  children,
}: {
  intensity?: number;
  children: React.ReactNode;
}) {
  const pointerRef = useRef<PointerSample>({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      markSkyActivity();
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      pointerRef.current.x = (e.clientX / w) * 2 - 1;
      pointerRef.current.y = -((e.clientY / h) * 2 - 1);
    };
    const onDown = () => markSkyActivity();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  const value = useRef<ParallaxContextValue>({ intensity, pointerRef });
  value.current.intensity = intensity;
  value.current.pointerRef = pointerRef;

  return (
    <ParallaxContext.Provider value={value.current}>
      {children}
    </ParallaxContext.Provider>
  );
}

export function useParallaxIntensity() {
  return useContext(ParallaxContext)?.intensity ?? 1;
}

export function useParallaxPointerRef() {
  return useContext(ParallaxContext)?.pointerRef;
}

/**
 * Courbe non-linéaire : petit geste = peu d’effet, grand geste = plus.
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
  /**
   * Si true : amplifie seulement en zoom out (feeling écran constant),
   * sans toucher au zoom défaut / zoom in.
   */
  zoomOutCompensate?: boolean;
  children: React.ReactNode;
};

/**
 * Parallaxe XY + Z + dérive idle — reste vivant sans clic sur le canvas.
 */
export function ParallaxLayer({
  factor,
  lerp = 0.045,
  zoomOutCompensate = false,
  children,
}: ParallaxLayerProps) {
  const group = useRef<Group>(null);
  const ctx = useContext(ParallaxContext);
  const intensity = ctx?.intensity ?? 1;
  const pointerRef = ctx?.pointerRef;
  const breathBoost = useSkyTheme().scene.idle?.breathBoost ?? 0;

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
    // Respiration : idle caméra amplifie la dérive autonome du volume
    const breath = 1 + idleCameraRef.breath * breathBoost;
    const idleX = Math.sin(t * 0.08) * 0.22 * breath;
    const idleY = Math.cos(t * 0.06) * 0.16 * breath;

    const rawX = pointerRef?.current.x ?? 0;
    const rawY = pointerRef?.current.y ?? 0;
    const px = shapePointer(rawX) + idleX;
    const py = shapePointer(rawY) + idleY;
    const zoomScale = zoomOutCompensate
      ? Math.max(1, cameraZoomRef.current / ZOOM_DEFAULT)
      : 1;
    const k = factor * intensity * zoomScale;

    const targetX = px * k * 0.48;
    const targetY = py * k * 0.32;
    const targetZ = (-px * 0.12 + py * 0.08) * k * 0.55;

    g.position.x += (targetX - g.position.x) * lerp;
    g.position.y += (targetY - g.position.y) * lerp;
    g.position.z += (targetZ - g.position.z) * lerp;
  });

  return <group ref={group}>{children}</group>;
}
