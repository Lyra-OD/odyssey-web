"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";
import { opacityForTier, useSkyTheme } from "./skyTheme";

/**
 * Voile de poussière — soft, lent, aligné voie lactée.
 * Entre le gaz et les étoiles ; opacity basse pour ne pas noyer le champ.
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
uniform vec3 uDust;
uniform vec3 uTint;

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
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(2.2, 1.35);

  // Axe voie lactée (~même orientation que StarDust band)
  vec2 along = normalize(vec2(0.85, 0.22));
  vec2 perp = vec2(-along.y, along.x);
  float u = dot(p, along);
  float v = dot(p, perp);

  // Bande large, densite max au milieu
  float band = exp(-pow(v * 1.55, 2.0)) * smoothstep(1.35, 0.15, abs(u) * 0.55);

  // Poussiere lente (rythme plus lent que le gaz)
  float t = uTime * 0.018;
  float n = fbm(vec2(u * 1.8 + t, v * 3.2 - t * 0.7));
  float n2 = fbm(vec2(u * 3.1 - t * 0.5, v * 5.0 + t * 0.35) + 2.7);
  float grain = mix(n, n2, 0.45);

  float veil = band * (0.35 + 0.65 * grain);
  veil = pow(clamp(veil, 0.0, 1.0), 1.15);

  vec3 col = mix(uDust, uTint, grain * 0.55);
  float alpha = veil * uOpacity;
  if (alpha < 0.008) discard;

  gl_FragColor = vec4(col, alpha);
}
`;

type CosmicDustProps = {
  tier: VisualTier;
};

export function CosmicDust({ tier }: CosmicDustProps) {
  const matRef = useRef<ShaderMaterial>(null);
  const theme = useSkyTheme();
  const cfg = theme.cosmicDust;
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
          uDust: { value: new Color(cfg.dust) },
          uTint: { value: new Color(cfg.tint) },
        },
      }),
    [opacity, cfg.dust, cfg.tint],
  );

  useEffect(() => {
    material.vertexShader = vertexShader;
    material.fragmentShader = fragmentShader;
    material.needsUpdate = true;
  }, [material]);

  useFrame(({ clock }) => {
    const mat = matRef.current ?? material;
    mat.uniforms.uTime.value = clock.elapsedTime;
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
