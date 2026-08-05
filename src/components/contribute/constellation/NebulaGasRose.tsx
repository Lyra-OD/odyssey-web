"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";
import {
  GAS_LOOP_PERIOD,
  makeSoftNoiseTexture,
  nebulaNoiseGlsl,
  nebulaVertexShader,
} from "./nebulaCommon";

/**
 * Rose / magenta 2001 — domain warp + texture soft + grain léger.
 */
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uLoopPeriod;
uniform vec3 uRose;
uniform vec3 uRoseHot;
uniform vec3 uDeep;
uniform sampler2D uTex;

varying vec2 vUv;

${nebulaNoiseGlsl}

void main() {
  vec2 world = (vUv - 0.5) * vec2(28.0, 16.0);
  vec2 pUv = vUv * 2.0 - 1.0;
  pUv.x *= 1.6;

  vec2 alongDir = normalize(vec2(0.72, -0.35));
  vec2 perpDir = vec2(-alongDir.y, alongDir.x);

  float twopi = 6.28318530718;
  float phase = (uTime / max(uLoopPeriod, 1.0)) * twopi;
  float phaseR = phase * 0.38 + 0.7;
  float phaseR2 = phase * 0.52 + 2.8;
  float phaseR3 = phase * 0.91 - 0.4;

  vec2 live =
    loopWarp(phaseR, 1.4) +
    loopWarp(phaseR2, 0.65);
  vec2 live2 =
    loopWarp(phaseR3, 0.85) +
    loopWarp(phaseR + 2.1, 0.4);
  vec2 liveUv =
    loopWarp(phaseR, 0.28) +
    loopWarp(phaseR2, 0.16);

  float breath = 0.82 + 0.18 * sin(phaseR2);
  float billow = 0.9 + 0.1 * sin(phaseR3);

  // —— Domain warp : le bruit déforme le bruit (matière plus réelle) ——
  vec2 warpBase = world * 0.11 + live * 0.15;
  float w1 = fbm(warpBase + 1.7);
  float w2 = fbm(warpBase * 1.35 + live2 * 0.2 + 4.2);
  vec2 warped = world + vec2(w1, w2) * 3.2;
  warped += vec2(
    fbm(warped * 0.22 + live),
    fbm(warped * 0.22 - live2 + 3.0)
  ) * 1.4;

  float n1 = fbm(warped * 0.14 + 7.2);
  float n2 = fbm(warped * 0.31 - live2 * 0.9 + 13.0);
  float n3 = fbm(warped * 0.09 + vec2(live.y, -live.x) * 0.55 + 2.7);
  // Filaments fins
  float nFine = fbm(warped * 0.72 + liveUv * 2.0 + 9.5);

  vec2 uvWarp = pUv + vec2(w1, w2) * 0.12 + liveUv * 0.08;
  float nUv = fbm(uvWarp * 2.5 + 6.1);

  // Texture soft (noise map) — détail « photo »
  vec2 texUv =
    vUv * 3.4 +
    liveUv * 0.04 +
    vec2(w1, w2) * 0.08 +
    vec2(uTime * 0.004, -uTime * 0.003);
  float tex = texture2D(uTex, texUv).r;
  float tex2 = texture2D(uTex, texUv * 2.15 + 0.37).r;
  float texDetail = tex * 0.65 + tex2 * 0.35;

  vec2 cShift =
    alongDir * (sin(phaseR) * 0.85 + cos(phaseR3) * 0.4) +
    perpDir * (cos(phaseR2) * 1.05 + sin(phaseR) * 0.35);

  float rightBias = smoothstep(-0.35, 0.55, pUv.x);
  float cornerBias =
    smoothstep(0.15, 0.85, abs(pUv.y)) * 0.55 +
    smoothstep(0.0, 0.7, pUv.x) * 0.45;

  float islands =
    cloudBlob(world, vec2(6.2, 3.4) + cShift, 4.6 * billow, alongDir, perpDir) * 1.05 +
    cloudBlob(world, vec2(8.5, -2.8) - cShift * 0.7, 4.1 * billow, alongDir, perpDir) * 0.95 +
    cloudBlob(world, vec2(3.4, -4.2) + cShift * 0.45, 3.5 * billow, alongDir, perpDir) * 0.8 +
    softBlob(pUv, vec2(0.55, 0.55) + vec2(sin(phaseR2), cos(phaseR)) * 0.1, 0.95, 1.25) * 0.7 +
    softBlob(pUv, vec2(0.72, -0.48) - vec2(cos(phaseR3), sin(phaseR2)) * 0.08, 0.85, 1.35) * 0.65;
  islands = clamp(islands * (0.35 + 0.65 * nUv), 0.0, 1.0);

  float sculpt = smoothstep(0.16, 0.78, n1 * 0.35 + n2 * 0.45 + nFine * 0.35);
  float dens = islands * sculpt * (0.3 + 0.7 * n3) * breath;
  dens *= mix(0.15, 1.0, rightBias);
  dens *= mix(0.55, 1.05, cornerBias);
  // Texture module la densité (voile / poussière)
  dens *= 0.72 + 0.55 * texDetail;

  float hot = smoothstep(0.32, 0.88, n2 * 0.7 + nFine * 0.3);
  vec3 col = mix(uDeep, uRose, 0.4 + 0.6 * n1);
  col = mix(col, uRoseHot, hot * 0.5);
  // Micro-variation teinte via texture
  col = mix(col, uRoseHot * 0.85 + uDeep * 0.15, (texDetail - 0.5) * 0.18);

  float alpha = clamp(dens * uOpacity, 0.0, 0.44);
  if (alpha < 0.01) discard;

  // Grain film léger (stable dans le temps + dérive lente)
  float grain = hash(gl_FragCoord.xy * 0.7 + vec2(uTime * 0.15, uTime * 0.11));
  col += (grain - 0.5) * 0.045;
  alpha *= 0.92 + 0.08 * grain;

  gl_FragColor = vec4(col, alpha);
}
`;

type Props = { tier: VisualTier };

export function NebulaGasRose({ tier }: Props) {
  const matRef = useRef<ShaderMaterial>(null);
  const opacity =
    tier === "reduced" ? 0.26 : tier === "mobile" ? 0.34 : 0.4;

  const noiseTex = useMemo(() => makeSoftNoiseTexture(128), []);

  useEffect(() => {
    return () => {
      noiseTex.dispose();
    };
  }, [noiseTex]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: nebulaVertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: opacity },
          uLoopPeriod: { value: GAS_LOOP_PERIOD * 1.35 },
          uRose: { value: new Color("#c2186e") },
          uRoseHot: { value: new Color("#ff3d9a") },
          uDeep: { value: new Color("#1a0514") },
          uTex: { value: noiseTex },
        },
      }),
    [opacity, noiseTex],
  );

  useFrame(({ clock }) => {
    (matRef.current ?? material).uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh
      position={[1.2, 0.1, -8.4]}
      scale={[32, 18, 1]}
      frustumCulled={false}
      renderOrder={-1}
    >
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}
