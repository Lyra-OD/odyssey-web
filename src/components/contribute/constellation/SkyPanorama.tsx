"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Mesh, MeshBasicMaterial, SRGBColorSpace } from "three";

import type { VisualTier } from "./useVisualTier";
import { opacityForTier, useSkyTheme } from "./skyTheme";
import { skyIntroMul } from "./SkyIntroEclipse";

export const SKY_PANORAMA_TEXTURE = "/craft/sky/milky-way-v1.jpg";

type SkyPanoramaProps = {
  tier: VisualTier;
};

/**
 * Fond photo voie lactée (S2 hybride).
 * Plan large — photo plate 2:1, **pas** une sphère 360 (sinon déformée).
 * Opt-in via layer `panorama` (off en prod par défaut).
 */
export function SkyPanorama({ tier }: SkyPanoramaProps) {
  const meshRef = useRef<Mesh>(null);
  const cfg = useSkyTheme().skyPanorama;
  const opacity = opacityForTier(cfg.opacity, tier);
  const texture = useTexture(cfg.texturePath);

  const material = useMemo(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return new MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      fog: false,
    });
  }, [texture]);

  useFrame(() => {
    material.color.setScalar(cfg.dim);
    material.opacity = opacity * skyIntroMul(1);
  });

  if (tier !== "desktop" || opacity < 0.001) return null;

  return (
    <mesh
      ref={meshRef}
      frustumCulled={false}
      renderOrder={cfg.renderOrder}
      position={cfg.position}
      scale={cfg.scale}
      rotation={cfg.rotation}
    >
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
