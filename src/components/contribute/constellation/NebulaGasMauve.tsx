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
 * Layer gaz mauve — domain warp + texture soft + grain.
 * Knobs : `skyTheme.gasMauve`
 */
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uLoopPeriod;
uniform float uWarpAmp;
uniform float uBreathAmp;
uniform float uDensityCap;
uniform vec3 uMauve;
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
  float phaseM = phase * 0.55 + 2.4;
  float phaseM2 = phase * 0.41 + 0.9;
  float phaseM3 = phase * 0.78 - 1.2;

  vec2 liveMauve =
    loopWarp(phaseM, 1.25) +
    loopWarp(phaseM2, 0.7);
  vec2 liveMauve2 =
    loopWarp(phaseM3, 0.9) +
    loopWarp(phaseM + 1.5, 0.45);
  vec2 liveUvMauve =
    loopWarp(phaseM, 0.3) +
    loopWarp(phaseM2, 0.18);

  float breathMauve = (1.0 - uBreathAmp) + uBreathAmp * sin(phaseM2);
  float billowMauve = 0.9 + 0.1 * sin(phaseM3);

  vec2 warpBase = world * 0.115 + liveMauve * 0.14;
  float w1 = fbm(warpBase + 3.3);
  float w2 = fbm(warpBase * 1.28 + liveMauve2 * 0.2 + 6.1);
  vec2 warped = world + vec2(w1, w2) * uWarpAmp;
  warped += vec2(
    fbm(warped * 0.21 + liveMauve),
    fbm(warped * 0.21 - liveMauve2 + 2.8)
  ) * 1.25;

  float nM1 = fbm(warped * 0.16 + 5.5);
  float nM2 = fbm(warped * 0.3 - liveMauve2 * 1.0 + 11.0);
  float nM3 = fbm(warped * 0.11 + vec2(liveMauve.y, -liveMauve.x) * 0.65 + 3.3);
  float nFine = fbm(warped * 0.7 + liveUvMauve * 2.0 + 10.2);

  vec2 uvWarp = pUv + vec2(w1, w2) * 0.11 + liveUvMauve * 0.07;
  float nMuv = fbm(uvWarp * 2.6 + 4.8);

  vec2 texUv =
    vUv * 3.5 +
    liveUvMauve * 0.04 +
    vec2(w1, w2) * 0.08 +
    vec2(-uTime * 0.003, uTime * 0.004);
  float texDetail =
    texture2D(uTex, texUv).r * 0.65 +
    texture2D(uTex, texUv * 2.2 + 0.42).r * 0.35;

  vec2 cShiftMauve =
    alongDir * (cos(phaseM) * 0.7 + sin(phaseM3) * 0.35) -
    perpDir * (sin(phaseM2) * 1.15 + cos(phaseM) * 0.45);

  float mauveSculpt = smoothstep(0.18, 0.78, nM1 * 0.4 + nM2 * 0.4 + nFine * 0.2);
  float mauveIslands =
    cloudBlob(world, vec2(-5.1, -1.32) + cShiftMauve, 3.8 * billowMauve, alongDir, perpDir) * 1.0 +
    cloudBlob(world, vec2(0.2, 0.15) - cShiftMauve * 0.8, 3.6 * billowMauve, alongDir, perpDir) * 0.95 +
    cloudBlob(world, vec2(5.95, 1.54) + cShiftMauve * 0.55, 4.1 * billowMauve, alongDir, perpDir) * 0.9 +
    softBlob(pUv, vec2(0.35, -0.15) + vec2(sin(phaseM2), cos(phaseM)) * 0.12, 0.8, 1.4) * 0.75;
  mauveIslands = clamp(mauveIslands * (0.4 + 0.6 * nMuv), 0.0, 1.0);

  float dens = mauveIslands * mauveSculpt * (0.4 + 0.6 * nM3) * breathMauve;
  dens *= 0.72 + 0.5 * texDetail;
  vec3 col = mix(uDeep, uMauve, 0.5 + 0.5 * nM2);
  col = mix(col, uMauve * 1.05, (texDetail - 0.5) * 0.14);

  float alpha = clamp(dens * uOpacity, 0.0, uDensityCap);
  if (alpha < 0.012) discard;

  float grain = hash(gl_FragCoord.xy * 0.7 + vec2(uTime * 0.15, uTime * 0.11));
  col += (grain - 0.5) * 0.04;
  alpha *= 0.93 + 0.07 * grain;

  gl_FragColor = vec4(col, alpha);
}
`;

type Props = { tier: VisualTier };

export function NebulaGasMauve({ tier }: Props) {
  const matRef = useRef<ShaderMaterial>(null);
  const theme = useSkyTheme();
  const cfg = theme.gasMauve;
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
          uMauve: { value: new Color(cfg.color) },
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
      idleCameraRef.rareTarget === "mauve" ? idleCameraRef.rarePulse : 0;
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
      scale={cfg.scale}
      frustumCulled={false}
      renderOrder={cfg.renderOrder}
    >
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}
