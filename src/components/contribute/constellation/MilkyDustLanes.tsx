"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";
import { opacityForTier, useSkyTheme } from "./skyTheme";
import { idleCameraRef } from "./IdleCameraDrift";
import { skyIntroMul } from "./SkyIntroEclipse";

/**
 * Dark dust lanes — masque sombre filiforme sur l’axe voie lactée.
 * Entre gaz / poussière et StarDust ; assombrit sans noyer les étoiles.
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
uniform float uContrast;
uniform vec3 uLane;
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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

float ridge(float n) {
  return 1.0 - abs(n * 2.0 - 1.0);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(2.4, 1.42);

  vec2 along = normalize(vec2(0.85, 0.22));
  vec2 perp = vec2(-along.y, along.x);
  float u = dot(p, along);
  float v = dot(p, perp);

  float band = exp(-pow(v * 1.45, 2.0)) * smoothstep(1.4, 0.1, abs(u) * 0.52);

  float t = uTime * 0.012;
  vec2 warp = vec2(
    fbm(vec2(u * 0.9 + t, v * 2.1 - t * 0.6)),
    fbm(vec2(u * 1.1 - t * 0.45, v * 1.8 + t * 0.35) + 4.2)
  ) * 0.55;

  vec2 q = vec2(u, v) + warp;
  float r1 = ridge(fbm(q * vec2(2.8, 6.2) + 1.3));
  float r2 = ridge(fbm(q * vec2(4.2, 9.5) - vec2(t * 0.2, t * 0.15) + 3.7));
  float r3 = ridge(fbm(q * vec2(6.5, 14.0) + vec2(-t * 0.12, t * 0.08) + 8.1));

  float filaments = max(r1, max(r2 * 0.82, r3 * 0.68));
  filaments = pow(clamp(filaments, 0.0, 1.0), mix(1.8, 3.4, uContrast));

  float edge = smoothstep(0.42, 0.78, filaments);
  float lanes = band * edge;
  lanes *= 0.55 + 0.45 * fbm(q * vec2(1.6, 4.0) + 2.0);

  vec3 col = mix(uDeep, uLane, filaments * 0.35);
  float alpha = lanes * uOpacity;
  if (alpha < 0.006) discard;

  gl_FragColor = vec4(col, alpha);
}
`;

type MilkyDustLanesProps = {
  tier: VisualTier;
};

export function MilkyDustLanes({ tier }: MilkyDustLanesProps) {
  const matRef = useRef<ShaderMaterial>(null);
  const theme = useSkyTheme();
  const cfg = theme.milkyDustLanes;
  const opacity = opacityForTier(cfg.opacity, tier);

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
          uOpacity: { value: opacity },
          uContrast: { value: cfg.contrast },
          uLane: { value: new Color(cfg.lane) },
          uDeep: { value: new Color(cfg.deep) },
        },
      }),
    [opacity, cfg.contrast, cfg.lane, cfg.deep],
  );

  useEffect(() => {
    material.vertexShader = vertexShader;
    material.fragmentShader = fragmentShader;
    material.needsUpdate = true;
  }, [material]);

  useFrame(({ clock }) => {
    const mat = matRef.current ?? material;
    mat.uniforms.uTime.value = clock.elapsedTime;
    const bandPulse =
      idleCameraRef.rareTarget === "band" ? idleCameraRef.rarePulse * 0.08 : 0;
    mat.uniforms.uOpacity.value =
      opacity * (1 + bandPulse) * skyIntroMul(1);
    mat.uniforms.uContrast.value = cfg.contrast;
  });

  if (tier === "reduced") return null;

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
