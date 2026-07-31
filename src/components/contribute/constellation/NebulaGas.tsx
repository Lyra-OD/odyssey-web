"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";

/**
 * Nébuleuse / gaz galactique — bande douce mauve + turquoise derrière les étoiles.
 * Étape 1 polish ciel (réf. voie lactée) — 1ère version.
 */
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uMauve;
uniform vec3 uTeal;
uniform vec3 uDeep;

varying vec2 vUv;

// Hash / value noise (léger, pas de texture)
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  // Espace centré : bande horizontale type Voie lactée
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= 1.6;

  // Dérive très lente du gaz
  vec2 drift = vec2(uTime * 0.008, uTime * 0.004);

  float n1 = fbm(p * 2.2 + drift);
  float n2 = fbm(p * 4.5 - drift * 1.3 + 3.1);
  float n3 = fbm(p * 1.1 + vec2(-drift.y, drift.x) * 0.6);

  // Masque de bande : dense au centre, fondu haut/bas
  float band = exp(-pow(p.y * 1.15 - n3 * 0.35, 2.0) * 2.8);
  band *= smoothstep(1.35, 0.15, abs(p.x) * 0.55);

  float dens = band * (0.35 + 0.65 * n1);
  dens *= 0.55 + 0.45 * n2;

  // Poches sombres (turbulence)
  dens *= smoothstep(0.15, 0.75, n2 + n1 * 0.4);

  // Mix mauve (cœur) ↔ turquoise (franges)
  float cool = smoothstep(0.25, 0.85, n2);
  vec3 gas = mix(uMauve, uTeal, cool * 0.65);
  gas = mix(uDeep, gas, 0.55 + 0.45 * n1);

  float alpha = dens * uOpacity;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(gas, alpha);
}
`;

type NebulaGasProps = {
  tier: VisualTier;
};

export function NebulaGas({ tier }: NebulaGasProps) {
  const matRef = useRef<ShaderMaterial>(null);

  const opacity =
    tier === "reduced" ? 0.22 : tier === "mobile" ? 0.32 : 0.42;

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: opacity },
          // Mauve Quiet Luxury (pas violet flashy)
          uMauve: { value: new Color("#6b5a8a") },
          // Turquoise Odyssey / Lueur
          uTeal: { value: new Color("#3d9a94") },
          uDeep: { value: new Color("#1a1530") },
        },
      }),
    [opacity],
  );

  useFrame(({ clock }) => {
    const mat = matRef.current ?? material;
    mat.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh position={[0, 0, -6]} scale={[28, 16, 1]} frustumCulled={false}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}
