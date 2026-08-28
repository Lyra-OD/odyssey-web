"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";
import {
  makeSoftNoiseTexture,
  nebulaNoiseGlsl,
  nebulaVertexShader,
} from "./nebulaCommon";
import { opacityForTier, useSkyTheme } from "./skyTheme";
import { skyIntroMul } from "./SkyIntroEclipse";

/**
 * Nébuleuse lointaine — quasi noire, très lente (profondeur screensaver).
 * Knobs : `skyTheme.gasFar`
 */
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uLoopPeriod;
uniform float uWarpAmp;
uniform float uBreathAmp;
uniform float uDensityCap;
uniform vec3 uFar;
uniform vec3 uDeep;
uniform sampler2D uTex;

varying vec2 vUv;

${nebulaNoiseGlsl}

void main() {
  vec2 world = (vUv - 0.5) * vec2(36.0, 20.0);
  vec2 pUv = vUv * 2.0 - 1.0;
  pUv.x *= 1.55;

  float twopi = 6.28318530718;
  float phase = (uTime / max(uLoopPeriod, 1.0)) * twopi;
  float phase2 = phase * 0.41 + 1.1;

  vec2 live = loopWarp(phase, 0.9) + loopWarp(phase2, 0.45);
  vec2 warpBase = world * 0.08 + live * 0.1;
  float w1 = fbm(warpBase + 0.7);
  float w2 = fbm(warpBase * 1.2 + 3.4);
  vec2 warped = world + vec2(w1, w2) * uWarpAmp;

  float n1 = fbm(warped * 0.09 + 2.0);
  float n2 = fbm(warped * 0.2 - live * 0.5 + 6.0);
  float n3 = fbm(warped * 0.055 + 11.0);

  vec2 softShift = vec2(sin(phase) * 0.2, cos(phase2) * 0.15);
  float islands =
    softBlob(pUv, vec2(-0.35, 0.2) + softShift, 1.35, 1.4) * 0.9 +
    softBlob(pUv, vec2(0.45, -0.25) - softShift * 0.7, 1.15, 1.55) * 0.75 +
    softBlob(pUv, vec2(0.1, 0.55) + softShift * 0.4, 0.95, 1.3) * 0.55;
  islands = clamp(islands, 0.0, 1.0);

  float sculpt = smoothstep(0.28, 0.82, n1 * 0.5 + n2 * 0.5);
  float dens = islands * sculpt * (0.35 + 0.65 * n3);
  dens *= 0.55 + 0.45 * softBlob(pUv, vec2(0.0), 1.6, 1.2);

  float breath = (1.0 - uBreathAmp) + uBreathAmp * sin(phase);
  dens *= breath;

  vec2 texUv = vUv * 2.4 + live * 0.02 + vec2(uTime * 0.0015, -uTime * 0.001);
  float tex = texture2D(uTex, texUv).r;
  dens *= 0.8 + 0.35 * tex;

  vec3 col = mix(uDeep, uFar, 0.35 + 0.65 * n1);
  float alpha = clamp(dens * uOpacity, 0.0, uDensityCap);
  if (alpha < 0.008) discard;

  gl_FragColor = vec4(col, alpha);
}
`;

type Props = { tier: VisualTier };

export function NebulaGasFar({ tier }: Props) {
  const matRef = useRef<ShaderMaterial>(null);
  const theme = useSkyTheme();
  const cfg = theme.gasFar;
  const opacity = opacityForTier(cfg.opacity, tier);

  const noiseTex = useMemo(() => makeSoftNoiseTexture(96), []);
  useEffect(() => () => noiseTex.dispose(), [noiseTex]);

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
          uLoopPeriod: {
            value: theme.baseLoopPeriod * cfg.loopPeriodMul,
          },
          uWarpAmp: { value: cfg.warpAmp },
          uBreathAmp: { value: cfg.breathAmp },
          uDensityCap: { value: cfg.densityCap },
          uFar: { value: new Color(cfg.color) },
          uDeep: { value: new Color(cfg.deep) },
          uTex: { value: noiseTex },
        },
      }),
    [opacity, noiseTex, theme.baseLoopPeriod, cfg],
  );

  useFrame(({ clock }) => {
    const mat = matRef.current ?? material;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uOpacity.value = opacity * skyIntroMul(1);
    mat.uniforms.uLoopPeriod.value = theme.baseLoopPeriod * cfg.loopPeriodMul;
    mat.uniforms.uWarpAmp.value = cfg.warpAmp;
    mat.uniforms.uBreathAmp.value = cfg.breathAmp;
    mat.uniforms.uDensityCap.value = cfg.densityCap;
  });

  if (opacity < 0.001) return null;

  return (
    <mesh
      position={cfg.position}
      rotation={cfg.rotation}
      scale={cfg.scale}
      frustumCulled={false}
      renderOrder={cfg.renderOrder}
    >
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}
