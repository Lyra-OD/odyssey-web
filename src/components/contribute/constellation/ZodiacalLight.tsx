"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";
import { opacityForTier, useSkyTheme } from "./skyTheme";
import { idleCameraRef } from "./IdleCameraDrift";
import { skyIntroMul } from "./SkyIntroEclipse";

/**
 * Lumière zodiacale — bande soft le long de la voie lactée (screensaver Phase 2).
 * Knobs : `skyTheme.zodiacal`
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
uniform float uConeTight;
uniform float uCoreTight;
uniform float uAlphaCap;
uniform vec3 uWarm;
uniform vec3 uCore;

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
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(2.2, 1.35);
  vec2 along = normalize(vec2(0.85, 0.22));
  vec2 perp = vec2(-along.y, along.x);
  float u = dot(p, along);
  float v = dot(p, perp);

  // Cône très étroit — suggestion de lumière, pas un nuage
  float band = exp(-pow(v * uConeTight, 2.0)) * smoothstep(1.15, 0.25, abs(u) * 0.55);
  float core = exp(-pow(v * uCoreTight, 2.0)) * smoothstep(0.85, 0.15, abs(u) * 0.7);

  float t = uTime * 0.012;
  float grain = fbm(vec2(u * 1.4 + t, v * 2.8 - t * 0.4));

  float veil = band * (0.55 + 0.45 * grain) + core * 0.28;
  veil = pow(clamp(veil, 0.0, 1.0), 1.35);

  vec3 col = mix(uWarm, uCore, core * 0.45 + grain * 0.1);
  float alpha = clamp(veil * uOpacity, 0.0, uAlphaCap);
  if (alpha < 0.004) discard;

  gl_FragColor = vec4(col, alpha);
}
`;

type Props = { tier: VisualTier };

export function ZodiacalLight({ tier }: Props) {
  const matRef = useRef<ShaderMaterial>(null);
  const theme = useSkyTheme();
  const cfg = theme.zodiacal;
  const baseOpacity = opacityForTier(cfg.opacity, tier);

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
          uOpacity: { value: baseOpacity },
          uConeTight: { value: cfg.coneTight },
          uCoreTight: { value: cfg.coreTight },
          uAlphaCap: { value: cfg.alphaCap },
          uWarm: { value: new Color(cfg.warm) },
          uCore: { value: new Color(cfg.core) },
        },
      }),
    [baseOpacity, cfg.warm, cfg.core, cfg.coneTight, cfg.coreTight, cfg.alphaCap],
  );

  useEffect(() => {
    material.vertexShader = vertexShader;
    material.fragmentShader = fragmentShader;
    material.needsUpdate = true;
  }, [material]);

  useFrame(({ clock }) => {
    const mat = matRef.current ?? material;
    mat.uniforms.uTime.value = clock.elapsedTime;
    // Respire un peu plus pendant idle caméra
    const breath = 1 + idleCameraRef.breath * (cfg.idleBoost ?? 0.25);
    mat.uniforms.uOpacity.value = baseOpacity * breath * skyIntroMul(1);
    mat.uniforms.uConeTight.value = cfg.coneTight;
    mat.uniforms.uCoreTight.value = cfg.coreTight;
    mat.uniforms.uAlphaCap.value = cfg.alphaCap;
  });

  if (baseOpacity < 0.001) return null;

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
