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
import { idleCameraRef } from "./IdleCameraDrift";
import { skyIntroMul } from "./SkyIntroEclipse";

/**
 * Layer gaz teal — domain warp + texture soft + grain.
 * Knobs : `skyTheme.gasTeal`
 */
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uLoopPeriod;
uniform float uWarpAmp;
uniform float uBreathAmp;
uniform float uDensityCap;
uniform vec3 uTeal;
uniform vec3 uDeep;
uniform sampler2D uTex;

varying vec2 vUv;

${nebulaNoiseGlsl}

void main() {
  vec2 world = (vUv - 0.5) * vec2(28.0, 16.0);
  vec2 pUv = vUv * 2.0 - 1.0;
  pUv.x *= 1.6;

  vec2 alongDir = normalize(vec2(0.85, 0.22));
  vec2 perpDir = vec2(-alongDir.y, alongDir.x);

  float twopi = 6.28318530718;
  float phase = (uTime / max(uLoopPeriod, 1.0)) * twopi;
  float phase2 = phase * 0.61 + 1.3;
  float phase3 = phase * 1.37 - 0.55;
  float phase4 = phase * 0.29 + 2.1;

  vec2 liveW =
    loopWarp(phase, 1.0) +
    loopWarp(phase2, 0.55) +
    loopWarp(phase4, 0.28);
  vec2 liveW2 = loopWarp(phase3, 0.7) + loopWarp(phase2 + 1.7, 0.35);

  vec2 liveUv =
    loopWarp(phase, 0.24) +
    loopWarp(phase2, 0.14) +
    loopWarp(phase3, 0.08);
  vec2 liveUv2 = loopWarp(phase4, 0.16) + loopWarp(phase + 2.4, 0.1);

  float breath = (1.0 - uBreathAmp) + uBreathAmp * sin(phase);
  float billow = 0.88 + 0.12 * sin(phase3);

  vec2 warpBase = world * 0.12 + liveW * 0.12;
  float w1 = fbm(warpBase + 2.1);
  float w2 = fbm(warpBase * 1.3 + liveW2 * 0.18 + 5.0);
  vec2 warped = world + vec2(w1, w2) * uWarpAmp;
  warped += vec2(
    fbm(warped * 0.2 + liveW),
    fbm(warped * 0.2 - liveW2 + 2.4)
  ) * 1.15;

  float n1 = fbm(warped * 0.14 + 4.1);
  float n2 = fbm(warped * 0.32 - liveW * 1.1 + liveW2 + 4.1);
  float n3 = fbm(warped * 0.1 + vec2(-liveW.y, liveW.x) * 0.7 + 2.0);
  float nFine = fbm(warped * 0.68 + liveUv * 1.8 + 8.2);
  float n1b = fbm(warped * 0.14 + liveW2 + 9.0);
  n1 = mix(n1, n1b, 0.3 + 0.12 * sin(phase2));

  vec2 uvWarp = pUv + vec2(w1, w2) * 0.1 + liveUv * 0.06;
  float n1uv = fbm(uvWarp * 2.2 + liveUv);
  float n2uv = fbm(uvWarp * 4.8 - liveUv * 1.3 + liveUv2 + 3.1);
  float n3uv = fbm(uvWarp * 1.15 + vec2(-liveUv.y, liveUv.x) * 0.65);
  float n2uvb = fbm(uvWarp * 4.8 + liveUv2 * 1.1 + 7.3);
  n2uv = mix(n2uv, n2uvb, 0.35 + 0.1 * sin(phase3));

  vec2 texUv =
    vUv * 3.2 +
    liveUv * 0.035 +
    vec2(w1, w2) * 0.07 +
    vec2(uTime * 0.0035, -uTime * 0.0028);
  float texDetail =
    texture2D(uTex, texUv).r * 0.65 +
    texture2D(uTex, texUv * 2.1 + 0.31).r * 0.35;

  vec2 cShift =
    alongDir * (sin(phase) * 1.1 + sin(phase3) * 0.4) +
    perpDir * (cos(phase2) * 0.75 + cos(phase4) * 0.3);

  float b1 = cloudBlob(world, vec2(-7.65, -1.98) + cShift, 4.4 * billow, alongDir, perpDir);
  float b2 = cloudBlob(world, vec2(-2.55, -0.66) - cShift * 0.7, 3.5 * billow, alongDir, perpDir);
  float b3 = cloudBlob(world, vec2(2.55, 0.66) + cShift * 0.6, 3.9 * billow, alongDir, perpDir);
  float b4 = cloudBlob(world, vec2(7.65, 1.98) - cShift * 0.5, 4.2 * billow, alongDir, perpDir);
  float islands = max(max(b1, b2), max(b3, b4));

  float sculpt = smoothstep(0.2, 0.78, n1 * 0.4 + n2 * 0.4 + nFine * 0.2);
  float maskA = islands * sculpt;
  maskA *= 0.3 + 0.7 * smoothstep(0.15, 0.8, n3);
  maskA *= breath;
  maskA *= 0.75 + 0.45 * texDetail;

  float densA = maskA * (0.3 + 0.7 * n1) * (0.45 + 0.55 * n2);
  vec3 colA = mix(uDeep, uTeal, 0.5 + 0.5 * n1);

  float bandWarp = n3uv * 0.4 + sin(phase) * 0.08 + cos(phase2) * 0.05;
  float band = exp(-pow(pUv.y * 1.1 - bandWarp, 2.0) * 2.5);
  band *= smoothstep(1.35, 0.15, abs(pUv.x) * 0.55);
  float densB = band * (0.3 + 0.7 * n1uv);
  densB *= 0.5 + 0.5 * n2uv;
  densB *= smoothstep(0.12, 0.78, n2uv + n1uv * 0.4);
  densB *= breath;
  densB *= 0.78 + 0.4 * texDetail;
  float coolB = smoothstep(0.2, 0.88, n2uv);
  vec3 colB = mix(uDeep, uTeal, 0.45 + 0.55 * coolB * (0.5 + 0.5 * n1uv));

  vec2 softShift = vec2(
    sin(phase2) * 0.12 + cos(phase4) * 0.05,
    cos(phase) * 0.1 + sin(phase3) * 0.04
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

  float aA = densA * uOpacity;
  float aB = densB * uOpacity * 0.9;
  vec3 col = colA * aA + colB * aB;
  float alpha = clamp(aA + aB, 0.0, uDensityCap);
  if (alpha < 0.012) discard;

  col = col / max(alpha, 0.001);
  col = mix(col, uTeal * 0.9 + uDeep * 0.1, (texDetail - 0.5) * 0.12);

  float grain = hash(gl_FragCoord.xy * 0.7 + vec2(uTime * 0.15, uTime * 0.11));
  col += (grain - 0.5) * 0.04;
  alpha *= 0.93 + 0.07 * grain;

  gl_FragColor = vec4(col, alpha);
}
`;

type Props = { tier: VisualTier };

export function NebulaGasTeal({ tier }: Props) {
  const matRef = useRef<ShaderMaterial>(null);
  const theme = useSkyTheme();
  const cfg = theme.gasTeal;
  const opacity = opacityForTier(cfg.opacity, tier);

  const noiseTex = useMemo(() => makeSoftNoiseTexture(128), []);
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
          uTeal: { value: new Color(cfg.color) },
          uDeep: { value: new Color(cfg.deep) },
          uTex: { value: noiseTex },
        },
      }),
    [opacity, noiseTex, theme.baseLoopPeriod, cfg],
  );

  useFrame(({ clock }) => {
    const mat = matRef.current ?? material;
    mat.uniforms.uTime.value = clock.elapsedTime;
    const pulse =
      idleCameraRef.rareTarget === "teal" ? idleCameraRef.rarePulse : 0;
    const amp = theme.scene.idle?.rareGasPulse ?? 0;
    mat.uniforms.uOpacity.value =
      opacity * (1 + pulse * amp) * skyIntroMul(1);
    mat.uniforms.uLoopPeriod.value = theme.baseLoopPeriod * cfg.loopPeriodMul;
    mat.uniforms.uWarpAmp.value = cfg.warpAmp;
    mat.uniforms.uBreathAmp.value = cfg.breathAmp;
    mat.uniforms.uDensityCap.value = cfg.densityCap;
  });

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
