"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";

/**
 * Gaz soft : (A) patches alignés StarDust + mauve
 * + (B) couche « 1ère version » bande soft teal/mauve.
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

// Nuage allongé le long de la bande d’étoiles (dir StarDust)
float cloudBlob(vec2 p, vec2 center, float radius, vec2 alongDir, vec2 perpDir) {
  vec2 d = p - center;
  float u = dot(d, alongDir);
  float v = dot(d, perpDir);
  float dist = length(vec2(u * 0.55, v * 1.35));
  return 1.0 - smoothstep(radius * 0.2, radius, dist);
}

// Blob UV de la 1ère version (espace normalisé)
float softBlob(vec2 p, vec2 center, float radius, float stretch) {
  vec2 d = p - center;
  d.x *= stretch;
  float dist = length(d);
  return 1.0 - smoothstep(radius * 0.25, radius, dist);
}

void main() {
  vec2 world = (vUv - 0.5) * vec2(28.0, 16.0);
  vec2 pUv = vUv * 2.0 - 1.0;
  pUv.x *= 1.6;

  vec2 alongDir = normalize(vec2(0.85, 0.22));
  vec2 perpDir = vec2(-alongDir.y, alongDir.x);

  vec2 driftW = vec2(uTime * 0.07, uTime * 0.035);
  vec2 driftUv = vec2(uTime * 0.008, uTime * 0.004);

  float n1 = fbm(world * 0.14 + driftW);
  float n2 = fbm(world * 0.28 - driftW * 1.2 + 4.1);
  float n3 = fbm(world * 0.09 + vec2(-driftW.y, driftW.x) * 0.5 + 2.0);

  float n1uv = fbm(pUv * 2.2 + driftUv);
  float n2uv = fbm(pUv * 4.5 - driftUv * 1.3 + 3.1);
  float n3uv = fbm(pUv * 1.1 + vec2(-driftUv.y, driftUv.x) * 0.6);

  // ========== A — Patches alignés ligne d’étoiles ==========
  float b1 = cloudBlob(world, vec2(-7.65, -1.98), 4.2, alongDir, perpDir);
  float b2 = cloudBlob(world, vec2(-2.55, -0.66), 3.4, alongDir, perpDir);
  float b3 = cloudBlob(world, vec2(2.55, 0.66), 3.8, alongDir, perpDir);
  float b4 = cloudBlob(world, vec2(7.65, 1.98), 4.0, alongDir, perpDir);
  float islands = max(max(b1, b2), max(b3, b4));

  float sculpt = smoothstep(0.28, 0.72, n1 * 0.55 + n2 * 0.45);
  float maskA = islands * sculpt;
  maskA *= 0.4 + 0.6 * smoothstep(0.2, 0.75, n3);

  float tealDensA = maskA * (0.35 + 0.65 * n1) * (0.5 + 0.5 * n2);
  vec3 tealColA = mix(uDeep, uTeal, 0.55 + 0.45 * n1);

  float mauveSculpt = smoothstep(0.32, 0.78, n2 * 0.5 + n3 * 0.5);
  float mauveIslands =
    cloudBlob(world, vec2(-5.1, -1.32) + perpDir * 0.35, 3.2, alongDir, perpDir) * 0.9 +
    cloudBlob(world, vec2(0.0, 0.0) - perpDir * 0.25, 3.0, alongDir, perpDir) * 0.85 +
    cloudBlob(world, vec2(5.95, 1.54) + perpDir * 0.2, 3.5, alongDir, perpDir) * 0.8;
  mauveIslands = clamp(mauveIslands, 0.0, 1.0);
  float mauveDensA = mauveIslands * mauveSculpt * (0.45 + 0.55 * n3);
  vec3 mauveColA = mix(uDeep, uMauve, 0.6 + 0.4 * n2);

  // ========== B — 1ère version soft (bande + mix mauve/teal) ==========
  float band = exp(-pow(pUv.y * 1.15 - n3uv * 0.35, 2.0) * 2.8);
  band *= smoothstep(1.35, 0.15, abs(pUv.x) * 0.55);
  float densB = band * (0.35 + 0.65 * n1uv);
  densB *= 0.55 + 0.45 * n2uv;
  densB *= smoothstep(0.15, 0.75, n2uv + n1uv * 0.4);
  float coolB = smoothstep(0.25, 0.85, n2uv);
  vec3 colB = mix(uMauve, uTeal, coolB * 0.65);
  colB = mix(uDeep, colB, 0.55 + 0.45 * n1uv);

  // Patches soft UV d’avant (organiques hors bande seule)
  float softIslands =
    softBlob(pUv, vec2(-0.55, -0.35), 0.95, 1.35) +
    softBlob(pUv, vec2(0.15, 0.05), 0.7, 1.5) * 0.9 +
    softBlob(pUv, vec2(0.75, 0.45), 0.85, 1.25);
  softIslands = clamp(softIslands, 0.0, 1.0);
  float densSoft = softIslands * smoothstep(0.28, 0.72, n1uv * 0.55 + n2uv * 0.45);
  densSoft *= 0.4 + 0.6 * smoothstep(0.2, 0.75, n3uv);
  densB = max(densB, densSoft * 0.85);

  // ========== Composite A + B ==========
  float tealA = tealDensA * uOpacity;
  float mauveA = mauveDensA * uOpacity * 0.85;
  float legacyA = densB * uOpacity * 0.9;

  vec3 col =
    tealColA * tealA +
    mauveColA * mauveA +
    colB * legacyA;
  float alpha = clamp(tealA + mauveA * 0.9 + legacyA, 0.0, 0.78);
  if (alpha < 0.012) discard;

  col = col / max(alpha, 0.001);
  gl_FragColor = vec4(col, alpha);
}
`;

type NebulaGasProps = {
  tier: VisualTier;
};

export function NebulaGas({ tier }: NebulaGasProps) {
  const matRef = useRef<ShaderMaterial>(null);

  const opacity =
    tier === "reduced" ? 0.28 : tier === "mobile" ? 0.38 : 0.48;

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
          uMauve: { value: new Color("#7a628e") },
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
