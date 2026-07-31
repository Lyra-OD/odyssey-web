"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";

/**
 * Gaz soft vivant : patches alignés + legacy, morph nuageux en boucle (~48s).
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
uniform float uLoopPeriod;
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

// Boucle seamless : le domaine du bruit tourne en cercle → revient au départ
vec2 loopWarp(float phase, float radius) {
  return vec2(cos(phase), sin(phase)) * radius;
}

float cloudBlob(vec2 p, vec2 center, float radius, vec2 alongDir, vec2 perpDir) {
  vec2 d = p - center;
  float u = dot(d, alongDir);
  float v = dot(d, perpDir);
  float dist = length(vec2(u * 0.55, v * 1.35));
  return 1.0 - smoothstep(radius * 0.2, radius, dist);
}

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

  // Phase 0→2π sur uLoopPeriod (boucle continue, pas de cut)
  float twopi = 6.28318530718;
  float phase = (uTime / max(uLoopPeriod, 1.0)) * twopi;
  float phase2 = phase * 0.61 + 1.3;
  float phase3 = phase * 1.37 - 0.55;
  float phase4 = phase * 0.29 + 2.1;

  // Teal = phase principale ; mauve = rythme décalé / plus lent
  float phaseTeal = phase;
  float phaseTeal2 = phase2;
  float phaseMauve = phase * 0.55 + 2.4; // ~2× plus lent + offset
  float phaseMauve2 = phase * 0.41 + 0.9;
  float phaseMauve3 = phase * 0.78 - 1.2;

  // Warps teal
  vec2 liveW =
    loopWarp(phaseTeal, 1.0) +
    loopWarp(phaseTeal2, 0.55) +
    loopWarp(phase4, 0.28);
  vec2 liveW2 = loopWarp(phase3, 0.7) + loopWarp(phaseTeal2 + 1.7, 0.35);

  // Warps mauve — autre direction / autre rythme
  vec2 liveMauve =
    loopWarp(phaseMauve, 1.25) +
    loopWarp(phaseMauve2, 0.7);
  vec2 liveMauve2 =
    loopWarp(phaseMauve3, 0.9) +
    loopWarp(phaseMauve + 1.5, 0.45);

  vec2 liveUv =
    loopWarp(phaseTeal, 0.24) +
    loopWarp(phaseTeal2, 0.14) +
    loopWarp(phase3, 0.08);
  vec2 liveUv2 = loopWarp(phase4, 0.16) + loopWarp(phaseTeal + 2.4, 0.1);
  vec2 liveUvMauve =
    loopWarp(phaseMauve, 0.3) +
    loopWarp(phaseMauve2, 0.18);

  // Respiration : teal et mauve désynchronisés
  float breath = 0.78 + 0.22 * sin(phaseTeal);
  float breathMauve = 0.8 + 0.2 * sin(phaseMauve2);
  float billow = 0.88 + 0.12 * sin(phase3);
  float billowMauve = 0.9 + 0.1 * sin(phaseMauve3);

  float n1 = fbm(world * 0.14 + liveW);
  float n2 = fbm(world * 0.32 - liveW * 1.25 + liveW2 + 4.1);
  float n3 = fbm(world * 0.1 + vec2(-liveW.y, liveW.x) * 0.75 + 2.0);
  float n1b = fbm(world * 0.14 + liveW2 + 9.0);
  n1 = mix(n1, n1b, 0.3 + 0.12 * sin(phaseTeal2));

  // Noise dédié mauve (autre domaine)
  float nM1 = fbm(world * 0.16 + liveMauve + 5.5);
  float nM2 = fbm(world * 0.3 - liveMauve2 * 1.1 + 11.0);
  float nM3 = fbm(world * 0.11 + vec2(liveMauve.y, -liveMauve.x) * 0.7 + 3.3);

  float n1uv = fbm(pUv * 2.2 + liveUv);
  float n2uv = fbm(pUv * 4.8 - liveUv * 1.3 + liveUv2 + 3.1);
  float n3uv = fbm(pUv * 1.15 + vec2(-liveUv.y, liveUv.x) * 0.65);
  float n2uvb = fbm(pUv * 4.8 + liveUv2 * 1.1 + 7.3);
  n2uv = mix(n2uv, n2uvb, 0.35 + 0.1 * sin(phase3));
  float nMuv = fbm(pUv * 2.6 + liveUvMauve + 4.8);

  // Teal voyage sur la bande
  vec2 cShiftTeal =
    alongDir * (sin(phaseTeal) * 1.1 + sin(phase3) * 0.4) +
    perpDir * (cos(phaseTeal2) * 0.75 + cos(phase4) * 0.3);

  // Mauve voyage autrement (souvent à contre-sens / plus latéral)
  vec2 cShiftMauve =
    alongDir * (cos(phaseMauve) * 0.7 + sin(phaseMauve3) * 0.35) -
    perpDir * (sin(phaseMauve2) * 1.15 + cos(phaseMauve) * 0.45);

  float b1 = cloudBlob(world, vec2(-7.65, -1.98) + cShiftTeal, 4.4 * billow, alongDir, perpDir);
  float b2 = cloudBlob(world, vec2(-2.55, -0.66) - cShiftTeal * 0.7, 3.5 * billow, alongDir, perpDir);
  float b3 = cloudBlob(world, vec2(2.55, 0.66) + cShiftTeal * 0.6, 3.9 * billow, alongDir, perpDir);
  float b4 = cloudBlob(world, vec2(7.65, 1.98) - cShiftTeal * 0.5, 4.2 * billow, alongDir, perpDir);
  float islands = max(max(b1, b2), max(b3, b4));

  float sculpt = smoothstep(0.22, 0.78, n1 * 0.5 + n2 * 0.5);
  float maskA = islands * sculpt;
  maskA *= 0.3 + 0.7 * smoothstep(0.15, 0.8, n3);
  maskA *= breath;

  float tealDensA = maskA * (0.3 + 0.7 * n1) * (0.45 + 0.55 * n2);
  vec3 tealColA = mix(uDeep, uTeal, 0.5 + 0.5 * n1);

  float mauveSculpt = smoothstep(0.22, 0.8, nM1 * 0.45 + nM2 * 0.55);
  float mauveIslands =
    cloudBlob(world, vec2(-5.1, -1.32) + cShiftMauve, 3.6 * billowMauve, alongDir, perpDir) * 0.95 +
    cloudBlob(world, vec2(0.2, 0.15) - cShiftMauve * 0.8, 3.4 * billowMauve, alongDir, perpDir) * 0.9 +
    cloudBlob(world, vec2(5.95, 1.54) + cShiftMauve * 0.55, 3.9 * billowMauve, alongDir, perpDir) * 0.85 +
    softBlob(pUv, vec2(0.35, -0.15) + vec2(sin(phaseMauve2), cos(phaseMauve)) * 0.12, 0.75, 1.4) * 0.7;
  mauveIslands = clamp(mauveIslands * (0.5 + 0.5 * nMuv), 0.0, 1.0);
  float mauveDensA = mauveIslands * mauveSculpt * (0.4 + 0.6 * nM3) * breathMauve;
  vec3 mauveColA = mix(uDeep, uMauve, 0.55 + 0.45 * nM2);

  // Legacy soft band — suit plutôt le teal, mauve en teinte via nMuv
  float bandWarp = n3uv * 0.4 + sin(phaseTeal) * 0.08 + cos(phaseTeal2) * 0.05;
  float band = exp(-pow(pUv.y * 1.1 - bandWarp, 2.0) * 2.5);
  band *= smoothstep(1.35, 0.15, abs(pUv.x) * 0.55);
  float densB = band * (0.3 + 0.7 * n1uv);
  densB *= 0.5 + 0.5 * n2uv;
  densB *= smoothstep(0.12, 0.78, n2uv + n1uv * 0.4);
  densB *= breath;
  float coolB = smoothstep(0.2, 0.88, n2uv);
  float mauveBleed = smoothstep(0.35, 0.85, nMuv) * (0.5 + 0.5 * sin(phaseMauve));
  vec3 colB = mix(uMauve, uTeal, coolB * 0.7 * (1.0 - mauveBleed * 0.35));
  colB = mix(uDeep, colB, 0.5 + 0.5 * n1uv);

  vec2 softShift = vec2(
    sin(phaseTeal2) * 0.12 + cos(phase4) * 0.05,
    cos(phaseTeal) * 0.1 + sin(phase3) * 0.04
  );
  float softIslands =
    softBlob(pUv, vec2(-0.55, -0.35) + softShift, 1.0 * billow, 1.35) +
    softBlob(pUv, vec2(0.15, 0.05) - softShift * 0.85, 0.75 * billow, 1.5) * 0.9 +
    softBlob(pUv, vec2(0.75, 0.45) + softShift * 0.6, 0.9 * billow, 1.25);
  softIslands = clamp(softIslands, 0.0, 1.0);
  float densSoft = softIslands * smoothstep(0.24, 0.76, n1uv * 0.5 + n2uv * 0.5);
  densSoft *= 0.35 + 0.65 * smoothstep(0.18, 0.78, n3uv);
  densSoft *= breath;
  densB = max(densB, densSoft * 0.85);

  float tealA = tealDensA * uOpacity;
  float mauveA = mauveDensA * uOpacity * 0.85;
  float legacyA = densB * uOpacity * 0.9;

  vec3 col =
    tealColA * tealA +
    mauveColA * mauveA +
    colB * legacyA;
  float alpha = clamp(tealA + mauveA * 0.9 + legacyA, 0.0, 0.55);
  if (alpha < 0.012) discard;

  col = col / max(alpha, 0.001);
  gl_FragColor = vec4(col, alpha);
}
`;

type NebulaGasProps = {
  tier: VisualTier;
};

/** Période de morph nuageux (secondes) — un cran plus vif. */
const GAS_LOOP_PERIOD = 38;

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
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: opacity },
          uLoopPeriod: { value: GAS_LOOP_PERIOD },
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
    <mesh
      position={[0, 0, -6]}
      scale={[28, 16, 1]}
      frustumCulled={false}
      renderOrder={0}
    >
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}
