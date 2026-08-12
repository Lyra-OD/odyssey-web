"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { PerspectiveCamera } from "three";
import { Color, ShaderMaterial, type Mesh } from "three";

import { nebulaVertexShader } from "./nebulaCommon";
import { defaultSkyTheme } from "./skyTheme";

/**
 * Knobs — Étape 1 : core destination sur ciel Sanctuaire.
 * (density / velocity reserves pour etapes suivantes)
 */
export type WormholeCraftKnobs = {
  velocity: number;
  density: number;
  alpha: number;
  coreSoft: number;
};

export const WORMHOLE_CRAFT_DEFAULTS: WormholeCraftKnobs = {
  velocity: 0.9,
  density: 1.2,
  alpha: 1,
  coreSoft: 0.12,
};

/**
 * ÉTAPE 1 — Core glow seul (fond = ciel Sanctuaire derriere le canvas).
 * Alpha 0 hors du glow → le ciel transparait.
 */
const fragmentShader = /* glsl */ `
precision highp float;

uniform float uAlpha;
uniform float uCoreSoft;
uniform float uAspect;
uniform vec3 uTeal;
uniform vec3 uAmber;
uniform vec3 uAurora;

varying vec2 vUv;

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uAspect;

  // Point de fuite — moitie superieure
  vec2 corePos = vec2(0.0, 0.3);
  float d = length(uv - corePos);

  float coreR = max(uCoreSoft, 0.04);
  float core = exp(-(d * d) / (coreR * coreR * 0.55));
  float halo = exp(-(d * d) / (coreR * coreR * 6.5));
  float bloom = exp(-(d * d) / (coreR * coreR * 18.0));

  vec3 coreCol = mix(uAmber, uTeal, 0.55);
  coreCol = mix(coreCol, uAurora, 0.25);

  // Couleur = glow ; hors glow = transparent (ciel Sanctuaire)
  float w = clamp(core * 0.95 + halo * 0.55 + bloom * 0.3, 0.0, 1.0);
  vec3 col = mix(mix(uTeal, uAmber, 0.35), coreCol, halo);
  col = mix(col, mix(uTeal, uAmber, 0.3), core);

  float alpha = w * uAlpha;

  gl_FragColor = vec4(col, alpha);
}
`;

export function WormholeCraftPlane({
  knobs,
}: {
  knobs: WormholeCraftKnobs;
}) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const { viewport } = useThree();

  const uniforms = useMemo(() => {
    const theme = defaultSkyTheme;
    return {
      uAlpha: { value: knobs.alpha },
      uCoreSoft: { value: knobs.coreSoft },
      uAspect: { value: 1 },
      uTeal: { value: new Color(theme.gasTeal.color) },
      uAmber: { value: new Color(theme.zodiacal.core) },
      uAurora: { value: new Color(theme.aurora.edge) },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- synced in useFrame
  }, []);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    mat.uniforms.uAlpha.value = knobs.alpha;
    mat.uniforms.uCoreSoft.value = knobs.coreSoft;
    mat.uniforms.uAspect.value = viewport.aspect || 1;

    const cam = camera as PerspectiveCamera;
    mesh.position.copy(cam.position);
    mesh.quaternion.copy(cam.quaternion);
    mesh.translateZ(-1.6);
    const h = 2 * Math.tan((cam.fov * Math.PI) / 360) * 1.6;
    const w = h * (viewport.aspect || 1);
    mesh.scale.set(w * 1.05, h * 1.05, 1);
  });

  return (
    <mesh ref={meshRef} renderOrder={50} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={nebulaVertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
