"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import {
  AdditiveBlending,
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
    breathSpeed: 0.42,
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
    /** Diffraction star — white core + teal glow (ref photo). */
    size: 168,
    color: new Color("#ffffff"),
    pulse: 0.22,
    breathSpeed: 0.32,
    spike: 1.15,
  },
  ghost: {
    size: 20,
    color: new Color("#5eead4"),
    pulse: 0.05,
    breathSpeed: 0.28,
    spike: 0.18,
  },
} as const;

const TEAL = new Color("#5eead4");

const starVertex = /* glsl */ `
uniform float uSize;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize;
}
`;

/** Satellites / ghost — single-color star. */
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
 * Hero défunt — mix blanc + teal (ref diffraction) :
 * cœur blanc dur · halo teal qui respire · spikes longs teal→blanc.
 */
const heroFragment = /* glsl */ `
uniform vec3 uTeal;
uniform float uSpike;
uniform float uGlow;
uniform float uBreath;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);

  // White-hot core
  float core = 1.0 - smoothstep(0.0, 0.07, d);
  float coreSoft = 1.0 - smoothstep(0.0, 0.14, d);

  // Teal halo (breathes via uBreath / uGlow)
  float halo = (1.0 - smoothstep(0.08, 0.48, d)) * uGlow;
  float haloOuter = (1.0 - smoothstep(0.2, 0.72, d)) * 0.45 * uBreath;

  // Long diffraction spikes (cross + diagonals)
  float arm = 0.018;
  float len = 0.62;
  float spikeX = (1.0 - smoothstep(0.0, arm, abs(uv.x))) * (1.0 - smoothstep(0.0, len, abs(uv.y)));
  float spikeY = (1.0 - smoothstep(0.0, arm, abs(uv.y))) * (1.0 - smoothstep(0.0, len, abs(uv.x)));
  float diag1 = (1.0 - smoothstep(0.0, arm * 0.85, abs(uv.x - uv.y))) * (1.0 - smoothstep(0.0, len * 0.78, length(uv)));
  float diag2 = (1.0 - smoothstep(0.0, arm * 0.85, abs(uv.x + uv.y))) * (1.0 - smoothstep(0.0, len * 0.78, length(uv)));
  float spikes = max(max(spikeX, spikeY), max(diag1, diag2)) * uSpike * uGlow;

  float a = core * 1.2 + coreSoft * 0.35 + halo * 0.85 + haloOuter + spikes * 0.95;
  if (a < 0.03) discard;

  vec3 white = vec3(1.0);
  // Mix: core = white · halo/spikes = teal with white tips
  vec3 col = white * (core + coreSoft * 0.5);
  col += uTeal * (halo * 0.95 + haloOuter * 1.1);
  col += mix(uTeal, white, 0.45) * spikes;
  col = clamp(col, 0.0, 1.35);

  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}
`;

/**
 * Étoile vivante — breath lumineux (intensité + taille) ~4s.
 * Hero = blanc + teal diffraction (ref photo).
 */
export function LueurNode({
  variant = "standard",
  floating = true,
  phase = 0,
  focusBoost = 0,
  appear = 1,
}: LueurNodeProps) {
  const matRef = useRef<ShaderMaterial>(null);
  const haloRef = useRef<ShaderMaterial>(null);
  const cfg = VARIANT[variant];
  const boost = Math.min(1, Math.max(0, focusBoost));
  const appearClamped = Math.min(1, Math.max(0, appear));
  const rareLueurPulse = useSkyTheme().scene.idle?.rareLueurPulse ?? 0;
  const isHero = variant === "hero";

  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([0, 0, 0]), 3),
    );
    return geo;
  }, []);

  const material = useMemo(() => {
    if (isHero) {
      return new ShaderMaterial({
        vertexShader: starVertex,
        fragmentShader: heroFragment,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: AdditiveBlending, // wow glow
        uniforms: {
          uSize: { value: cfg.size },
          uTeal: { value: TEAL.clone() },
          uSpike: { value: cfg.spike },
          uGlow: { value: 1 },
          uBreath: { value: 1 },
        },
      });
    }
    return new ShaderMaterial({
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
    });
  }, [cfg, isHero]);

  /** Outer teal breath halo behind hero core. */
  const haloMaterial = useMemo(() => {
    if (!isHero) return null;
    return new ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: heroFragment,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      blending: AdditiveBlending,
      uniforms: {
        uSize: { value: cfg.size * 2.4 },
        uTeal: { value: TEAL.clone() },
        uSpike: { value: 0.15 },
        uGlow: { value: 0.7 },
        uBreath: { value: 1 },
      },
    });
  }, [cfg, isHero]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * cfg.breathSpeed + phase;
    const breath =
      0.55 +
      0.3 * Math.sin(t) +
      0.15 * Math.sin(t * 0.37 + 1.2);
    const mat = matRef.current ?? material;
    const skyPulse =
      isHero && idleCameraRef.rareTarget === "band"
        ? idleCameraRef.rarePulse * rareLueurPulse
        : 0;
    const sizeMul = 1 + boost * 1.85 + skyPulse * 0.9;
    const glowMul = 1 + boost * 1.35 + skyPulse * 1.1;
    const ghostMul = variant === "ghost" ? 0.45 : 1;
    const appearMul = 0.08 + 0.92 * appearClamped;

    if (isHero) {
      // Glow wow that “animates” via breath — teal halo expands/contracts
      const breathSize = 0.88 + 0.28 * breath;
      mat.uniforms.uSize.value =
        cfg.size * breathSize * sizeMul * (0.55 + 0.45 * appearClamped);
      mat.uniforms.uGlow.value =
        (0.75 + 0.55 * breath) * glowMul * appearMul * skyIntroMul(1);
      mat.uniforms.uBreath.value = 0.55 + 0.65 * breath;
      mat.uniforms.uSpike.value =
        cfg.spike * (0.85 + 0.25 * breath) * (1 + boost * 0.35) * appearClamped;

      const halo = haloRef.current ?? haloMaterial;
      if (halo) {
        halo.uniforms.uSize.value =
          cfg.size * 2.55 * (0.75 + 0.45 * breath) * (0.5 + 0.5 * appearClamped);
        halo.uniforms.uGlow.value =
          (0.4 + 0.55 * breath) * appearMul * skyIntroMul(1);
        halo.uniforms.uBreath.value = 0.4 + 0.8 * breath;
        halo.uniforms.uSpike.value = 0.12 * breath * appearClamped;
      }
      return;
    }

    mat.uniforms.uSize.value =
      cfg.size *
      (0.88 + 0.22 * breath) *
      sizeMul *
      (0.55 + 0.45 * appearClamped);
    mat.uniforms.uGlow.value =
      (0.65 + 0.45 * breath * (1 + cfg.pulse)) *
      glowMul *
      ghostMul *
      appearMul *
      skyIntroMul(1);
    mat.uniforms.uSpike.value =
      cfg.spike * (1 + boost * 0.55 + skyPulse * 0.4) * appearClamped;
  });

  const star = (
    <group>
      {haloMaterial ? (
        <points geometry={geometry} frustumCulled={false}>
          <primitive object={haloMaterial} ref={haloRef} attach="material" />
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
      speed={isHero ? 0.22 : 0.35 + (phase % 1) * 0.25}
      rotationIntensity={0}
      floatIntensity={isHero ? 0.08 : 0.18}
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
