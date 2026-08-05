"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";
import { useSkyTheme } from "./skyTheme";
import { idleCameraRef } from "./IdleCameraDrift";
import { skyIntroMul } from "./SkyIntroEclipse";

/**
 * Aurore lointaine — rideau vertical soft, visible surtout sur rare `aurora`.
 * Knobs : `skyTheme.aurora`
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
uniform vec3 uCool;
uniform vec3 uEdge;

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
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= 1.4;

  // Rideaux verticaux ondulés (biais gauche / centre)
  float t = uTime * 0.08;
  float curtains =
    exp(-pow((p.x + 0.55 + sin(p.y * 2.2 + t) * 0.08) * 2.8, 2.0)) * 0.85 +
    exp(-pow((p.x + 0.05 + cos(p.y * 1.7 - t * 0.7) * 0.06) * 3.2, 2.0)) * 0.55 +
    exp(-pow((p.x - 0.4 + sin(p.y * 2.8 + t * 1.1) * 0.05) * 3.6, 2.0)) * 0.35;

  float height = smoothstep(-1.1, -0.1, p.y) * smoothstep(1.05, 0.15, p.y);
  float grain = fbm(vec2(p.x * 2.5 + t * 0.3, p.y * 1.4 - t * 0.2));

  float veil = curtains * height * (0.45 + 0.55 * grain);
  veil = pow(clamp(veil, 0.0, 1.0), 1.25);

  vec3 col = mix(uCool, uEdge, grain * 0.4 + curtains * 0.25);
  float alpha = clamp(veil * uOpacity, 0.0, 0.22);
  if (alpha < 0.005) discard;

  gl_FragColor = vec4(col, alpha);
}
`;

type Props = { tier: VisualTier };

export function AuroraVeil({ tier }: Props) {
  const matRef = useRef<ShaderMaterial>(null);
  const theme = useSkyTheme();
  const cfg = theme.aurora;
  const idle = theme.scene.idle;

  // Base dormante très basse ; pulse fort seulement sur rare aurora
  const base =
    tier === "reduced" ? 0 : tier === "mobile" ? cfg.opacity.mobile : cfg.opacity.desktop;

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
          uOpacity: { value: base },
          uCool: { value: new Color(cfg.cool) },
          uEdge: { value: new Color(cfg.edge) },
        },
      }),
    [base, cfg.cool, cfg.edge],
  );

  useFrame(({ clock }) => {
    const mat = matRef.current ?? material;
    mat.uniforms.uTime.value = clock.elapsedTime;
    const pulse =
      idleCameraRef.rareTarget === "aurora" ? idleCameraRef.rarePulse : 0;
    const amp = idle?.rareAuroraPulse ?? 0.55;
    // Dormant ~base, rare monte clairement puis redescend
    mat.uniforms.uOpacity.value =
      (base + pulse * amp * (cfg.opacity.desktop || 0.12)) * skyIntroMul(1);
  });

  if (tier === "reduced" || base <= 0) return null;

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
