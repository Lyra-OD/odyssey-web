"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  type Mesh,
} from "three";

import { idleCameraRef } from "@/src/components/contribute/constellation/IdleCameraDrift";
import { skyIntroMul } from "@/src/components/contribute/constellation/SkyIntroEclipse";
import { useSkyTheme } from "@/src/components/contribute/constellation/skyTheme";
export type LueurNodeVariant = "standard" | "premium" | "hero";

export type LueurNodeProps = {
  variant?: LueurNodeVariant;
  floating?: boolean;
  phase?: number;
  /** 0–1 — bloom focus (approche révélation). */
  focusBoost?: number;
};

const VARIANT = {
  standard: {
    size: 26,
    color: new Color("#e8eef8"),
    pulse: 0.1,
    breathSpeed: 0.42, // ~4.2s Quiet Luxury
    spike: 0.4,
  },
  premium: {
    size: 50,
    color: new Color("#5eead4"),
    pulse: 0.16,
    breathSpeed: 0.38,
    spike: 0.72,
  },
  hero: {
    size: 84,
    color: new Color("#2dd4bf"),
    pulse: 0.2,
    breathSpeed: 0.35,
    spike: 0.9,
  },
} as const;

const starVertex = /* glsl */ `
uniform float uSize;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize;
}
`;

const starFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uSpike;
uniform float uGlow;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);

  float core = 1.0 - smoothstep(0.0, 0.1, d);
  float mid = (1.0 - smoothstep(0.0, 0.3, d)) * 0.4 * uGlow;

  float spikeX = (1.0 - smoothstep(0.0, 0.026, abs(uv.x))) * (1.0 - smoothstep(0.0, 0.5, abs(uv.y)));
  float spikeY = (1.0 - smoothstep(0.0, 0.026, abs(uv.y))) * (1.0 - smoothstep(0.0, 0.5, abs(uv.x)));
  float diag1 = (1.0 - smoothstep(0.0, 0.02, abs(uv.x - uv.y))) * (1.0 - smoothstep(0.0, 0.42, length(uv))) * 0.5;
  float diag2 = (1.0 - smoothstep(0.0, 0.02, abs(uv.x + uv.y))) * (1.0 - smoothstep(0.0, 0.42, length(uv))) * 0.5;

  float spikes = max(max(spikeX, spikeY), max(diag1, diag2)) * uSpike * uGlow;
  float a = (core + mid + spikes);
  if (a < 0.04) discard;

  vec3 col = mix(uColor, vec3(1.0), core * 0.7);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}
`;

/**
 * Étoile vivante — breath lumineux (intensité + taille) ~4s.
 */
export function LueurNode({
  variant = "standard",
  floating = true,
  phase = 0,
  focusBoost = 0,
}: LueurNodeProps) {
  const matRef = useRef<ShaderMaterial>(null);
  const cfg = VARIANT[variant];
  const boost = Math.min(1, Math.max(0, focusBoost));
  const rareLueurPulse = useSkyTheme().scene.idle?.rareLueurPulse ?? 0;

  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([0, 0, 0]), 3),
    );
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starVertex,
        fragmentShader: starFragment,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uSize: { value: cfg.size },
          uColor: { value: cfg.color.clone() },
          uSpike: { value: cfg.spike },
          uGlow: { value: 1 },
        },
      }),
    [cfg],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * cfg.breathSpeed + phase;
    const breath =
      0.55 +
      0.3 * Math.sin(t) +
      0.15 * Math.sin(t * 0.37 + 1.2);
    const mat = matRef.current ?? material;
    // Moment rare « band » → la Lueur hero répond une fois
    const skyPulse =
      variant === "hero" && idleCameraRef.rareTarget === "band"
        ? idleCameraRef.rarePulse * rareLueurPulse
        : 0;
    const sizeMul = 1 + boost * 1.85 + skyPulse * 0.9;
    const glowMul = 1 + boost * 1.35 + skyPulse * 1.1;
    mat.uniforms.uSize.value =
      cfg.size * (0.88 + 0.22 * breath) * sizeMul;
    mat.uniforms.uGlow.value =
      (0.65 + 0.45 * breath * (1 + cfg.pulse)) * glowMul * skyIntroMul(1);
    mat.uniforms.uSpike.value =
      cfg.spike * (1 + boost * 0.55 + skyPulse * 0.4);
  });

  const star = (
    <points geometry={geometry} frustumCulled={false}>
      <primitive object={material} ref={matRef} attach="material" />
    </points>
  );

  if (!floating) return star;

  return (
    <Float
      speed={0.35 + (phase % 1) * 0.25}
      rotationIntensity={0}
      floatIntensity={0.18}
    >
      {star}
    </Float>
  );
}

/** Zone de hit invisible pour drag (les Points seuls sont trop petits). */
export function LueurHitTarget({
  radius = 0.35,
  ...props
}: {
  radius?: number;
} & React.ComponentProps<"mesh">) {
  const ref = useRef<Mesh>(null);
  return (
    <mesh ref={ref} visible={false} {...props}>
      <sphereGeometry args={[radius, 8, 8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
