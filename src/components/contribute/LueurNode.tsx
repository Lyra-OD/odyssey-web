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
export type LueurNodeVariant = "standard" | "premium" | "hero" | "ghost";

export type LueurNodeProps = {
  variant?: LueurNodeVariant;
  floating?: boolean;
  phase?: number;
  /** 0–1 — bloom focus (approche révélation). */
  focusBoost?: number;
  /** 0–1 — constellation draw-in / emphasis. */
  appear?: number;
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
    /** Lueur pure — soft orb, not a spiked “star” like satellites. */
    size: 128,
    color: new Color("#fffaf5"),
    pulse: 0.14,
    breathSpeed: 0.28,
    spike: 0.22,
  },
  /** Predefined slot not yet filled — faint teal silhouette. */
  ghost: {
    size: 20,
    color: new Color("#5eead4"),
    pulse: 0.05,
    breathSpeed: 0.28,
    spike: 0.18,
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
uniform float uSoft;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);

  float coreR = mix(0.1, 0.16, uSoft);
  float midR = mix(0.3, 0.62, uSoft);
  float core = 1.0 - smoothstep(0.0, coreR, d);
  float mid = (1.0 - smoothstep(0.0, midR, d)) * mix(0.4, 0.75, uSoft) * uGlow;

  float spikeX = (1.0 - smoothstep(0.0, 0.026, abs(uv.x))) * (1.0 - smoothstep(0.0, 0.5, abs(uv.y)));
  float spikeY = (1.0 - smoothstep(0.0, 0.026, abs(uv.y))) * (1.0 - smoothstep(0.0, 0.5, abs(uv.x)));
  float diag1 = (1.0 - smoothstep(0.0, 0.02, abs(uv.x - uv.y))) * (1.0 - smoothstep(0.0, 0.42, length(uv))) * 0.5;
  float diag2 = (1.0 - smoothstep(0.0, 0.02, abs(uv.x + uv.y))) * (1.0 - smoothstep(0.0, 0.42, length(uv))) * 0.5;

  float spikes = max(max(spikeX, spikeY), max(diag1, diag2)) * uSpike * uGlow * (1.0 - uSoft * 0.85);
  float a = (core + mid + spikes);
  if (a < 0.04) discard;

  vec3 warm = mix(uColor, vec3(1.0, 0.97, 0.92), uSoft * 0.35);
  vec3 col = mix(warm, vec3(1.0), core * mix(0.7, 0.85, uSoft));
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
  appear = 1,
}: LueurNodeProps) {
  const matRef = useRef<ShaderMaterial>(null);
  const cfg = VARIANT[variant];
  const boost = Math.min(1, Math.max(0, focusBoost));
  const appearClamped = Math.min(1, Math.max(0, appear));
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
          uSoft: { value: variant === "hero" ? 1 : 0 },
        },
      }),
    [cfg, variant],
  );

  const haloMaterial = useMemo(() => {
    if (variant !== "hero") return null;
    return new ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uSize: { value: cfg.size * 2.1 },
        uColor: { value: new Color("#5eead4") },
        uSpike: { value: 0 },
        uGlow: { value: 0.55 },
        uSoft: { value: 1 },
      },
    });
  }, [cfg, variant]);

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
    const ghostMul = variant === "ghost" ? 0.45 : 1;
    const appearMul = 0.08 + 0.92 * appearClamped;
    const softBreath =
      variant === "hero" ? 0.92 + 0.14 * breath : 0.88 + 0.22 * breath;
    mat.uniforms.uSize.value =
      cfg.size * softBreath * sizeMul * (0.55 + 0.45 * appearClamped);
    mat.uniforms.uGlow.value =
      (0.65 + 0.45 * breath * (1 + cfg.pulse)) *
      glowMul *
      ghostMul *
      appearMul *
      skyIntroMul(1);
    mat.uniforms.uSpike.value =
      cfg.spike * (1 + boost * 0.55 + skyPulse * 0.4) * appearClamped;
    mat.uniforms.uSoft.value = variant === "hero" ? 1 : 0;

    if (haloMaterial) {
      haloMaterial.uniforms.uSize.value =
        cfg.size * 2.15 * softBreath * (0.5 + 0.5 * appearClamped);
      haloMaterial.uniforms.uGlow.value =
        0.35 * breath * appearMul * skyIntroMul(1);
    }
  });

  const star = (
    <group>
      {haloMaterial ? (
        <points geometry={geometry} frustumCulled={false}>
          <primitive object={haloMaterial} attach="material" />
        </points>
      ) : null}
      <points geometry={geometry} frustumCulled={false}>
        <primitive object={material} ref={matRef} attach="material" />
      </points>
    </group>
  );

  if (!floating || variant === "ghost") return star;

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
