"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
} from "three";

import type { VisualTier } from "./useVisualTier";
import { opacityForTier, useSkyTheme } from "./skyTheme";
import { skyIntroMul } from "./SkyIntroEclipse";

/**
 * Ghost stars — gros bokeh soft, parallaxe inverse (optique / profondeur).
 * Knobs : `skyTheme.ghostStars`
 */
const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uSizeMul;
attribute float aScale;
attribute float aBright;
varying float vAlpha;

void main() {
  vec3 pos = position;
  pos.x += sin(uTime * 0.04 + position.z) * 0.04;
  pos.y += cos(uTime * 0.035 + position.x) * 0.03;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float depth = max(-mv.z, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aScale * uSizeMul * (48.0 / depth);
  vAlpha = aBright;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uTint;
uniform float uOpacity;
varying float vAlpha;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float soft = 1.0 - smoothstep(0.0, 0.5, d);
  soft = soft * soft;
  float a = soft * vAlpha * uOpacity;
  if (a < 0.02) discard;
  gl_FragColor = vec4(uTint, a);
}
`;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Props = { tier: VisualTier };

export function GhostStars({ tier }: Props) {
  const matRef = useRef<ShaderMaterial>(null);
  const theme = useSkyTheme();
  const cfg = theme.ghostStars;
  const opacity = opacityForTier(cfg.opacity, tier);

  const geometry = useMemo(() => {
    const rand = mulberry32(0x60a501);
    const n = cfg.count;
    const positions = new Float32Array(n * 3);
    const scales = new Float32Array(n);
    const bright = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      positions[i3] = (rand() - 0.5) * 22;
      positions[i3 + 1] = (rand() - 0.5) * 14;
      positions[i3 + 2] = (rand() - 0.5) * cfg.zSpread + cfg.zBias;
      const b = Math.pow(rand(), 1.4);
      bright[i] = 0.35 + b * 0.65;
      scales[i] = 0.8 + b * 1.6;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aScale", new BufferAttribute(scales, 1));
    geo.setAttribute("aBright", new BufferAttribute(bright, 1));
    return geo;
  }, [cfg.count, cfg.zSpread, cfg.zBias]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uSizeMul: { value: cfg.sizeMul },
          uOpacity: { value: opacity },
          uTint: { value: new Color(cfg.tint) },
        },
      }),
    [cfg.sizeMul, cfg.tint, opacity],
  );

  useFrame(({ clock }) => {
    const mat = matRef.current ?? material;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uOpacity.value = opacity * skyIntroMul(1);
  });

  if (opacity < 0.001 || cfg.count <= 0) return null;

  return (
    <points
      geometry={geometry}
      frustumCulled={false}
      renderOrder={cfg.renderOrder}
    >
      <primitive object={material} ref={matRef} attach="material" />
    </points>
  );
}
