"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  ShaderMaterial,
} from "three";

/** Full independent knobs — never linked across layers. */
export type HeroLayerKnobs = {
  size: number;
  glow: number;
  breath: number;
  /** World Z offset — teal further, white closer → faux volume */
  depth: number;
  /** Spike / diffraction force on this layer (0 = off) */
  amount: number;
  /** Spike rotation for this layer only (degrees) */
  rotationDeg: number;
};

/** @deprecated use HeroLayerKnobs — kept for call sites */
export type HeroSpikesKnobs = HeroLayerKnobs;

export type HeroStarProps = {
  white: HeroLayerKnobs;
  teal: HeroLayerKnobs;
  spikes: HeroLayerKnobs;
  tealColor?: string;
  phase?: number;
  /** 0 = flat · 1 = strong mouse/touch tilt (read as 3D) */
  parallax?: number;
  /** Master size after layer craft is locked (default 1) */
  globalScale?: number;
  /** Soft birth flash 0–1 (keep low — mourning magic, not blast) */
  birthFlash?: number;
};

const vertexShader = /* glsl */ `
uniform float uSize;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize;
}
`;

const spikeFn = /* glsl */ `
float spikePair(vec2 uv, float angle, float len, float width) {
  float c = cos(angle);
  float s = sin(angle);
  float p = uv.x * c + uv.y * s;
  float q = -uv.x * s + uv.y * c;
  float along = 1.0 - smoothstep(0.0, len, abs(p));
  along *= along;
  float w = width * (0.35 + 1.0 * along);
  float across = exp(-pow(abs(q) / max(w, 1e-4), 2.0));
  return along * across;
}

float diffractionSpikes(vec2 uv, float amount, float breath) {
  float v = spikePair(uv, 1.5707963, 0.49, 0.0078);
  float h = spikePair(uv, 0.0, 0.42, 0.0072);
  float d1 = spikePair(uv, 0.7853982, 0.34, 0.0068);
  float d2 = spikePair(uv, -0.7853982, 0.34, 0.0068);
  return max(max(v, h), max(d1, d2)) * amount * (0.9 + 0.15 * breath);
}

vec2 rotateUv(vec2 uv, float rot) {
  float cr = cos(rot);
  float sr = sin(rot);
  return vec2(cr * uv.x - sr * uv.y, sr * uv.x + cr * uv.y);
}

/**
 * Soft glow dies in a CIRCLE, in SCREEN space (unrotated PointCoord).
 * Never mask on rotated UV — that draws a tilted square (teal rot = 12°).
 */
float softCircleMask(vec2 pc) {
  return 1.0 - smoothstep(0.32, 0.48, length(pc));
}

/** Spikes can reach farther; only kill absolute sprite corners. */
float spikeCornerMask(vec2 pc) {
  float m = max(abs(pc.x), abs(pc.y));
  return 1.0 - smoothstep(0.46, 0.499, m);
}
`;

const whiteFragment = /* glsl */ `
uniform float uGlow;
uniform float uBreath;
uniform float uAmount;
uniform float uRot;
${spikeFn}
void main() {
  vec2 pc = gl_PointCoord - 0.5;
  vec2 uv = rotateUv(pc, uRot);
  float d = length(uv);
  float core = exp(-pow(d / 0.03, 2.0));
  float hot = 1.0 - smoothstep(0.0, 0.045, d);
  float disk = (hot * 1.4 + core * 0.7) * uGlow * (0.85 + 0.25 * uBreath);
  float sp = diffractionSpikes(uv, uAmount, uBreath) * uGlow;
  float a = max(disk * softCircleMask(pc), sp * spikeCornerMask(pc));
  if (a < 0.012) discard;
  gl_FragColor = vec4(vec3(1.0), clamp(a, 0.0, 1.0));
}
`;

const tealFragment = /* glsl */ `
uniform vec3 uTeal;
uniform float uGlow;
uniform float uBreath;
uniform float uAmount;
uniform float uRot;
${spikeFn}
void main() {
  vec2 pc = gl_PointCoord - 0.5;
  vec2 uv = rotateUv(pc, uRot);
  float d = length(uv);
  // Outer sigma inside the circle mask — additive tint must hit ~0 at edge
  float inner = exp(-pow(d / 0.10, 2.0));
  float mid = exp(-pow(d / 0.20, 2.0));
  float outer = exp(-pow(d / 0.30, 2.0));
  float halo =
    (inner * 0.9 + mid * 0.45 + outer * 0.12)
    * uGlow
    * (0.65 + 0.5 * uBreath)
    * softCircleMask(pc);
  float sp = diffractionSpikes(uv, uAmount, uBreath) * uGlow * spikeCornerMask(pc);
  float a = max(halo, sp);
  if (a < 0.012) discard;
  vec3 col = mix(uTeal, vec3(1.0), clamp(sp * 0.35, 0.0, 0.45));
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}
`;

const spikesFragment = /* glsl */ `
uniform vec3 uTeal;
uniform float uGlow;
uniform float uBreath;
uniform float uAmount;
uniform float uRot;
${spikeFn}
void main() {
  vec2 pc = gl_PointCoord - 0.5;
  vec2 uv = rotateUv(pc, uRot);
  float spikes = diffractionSpikes(uv, uAmount, uBreath);
  float a = spikes * uGlow * spikeCornerMask(pc);
  if (a < 0.012) discard;
  vec3 col = mix(uTeal, vec3(1.0), 0.3) * spikes * 1.2;
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}
`;

function usePointGeometry() {
  return useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([0, 0, 0]), 3),
    );
    return geo;
  }, []);
}

function makeLayerMat(
  fragmentShader: string,
  size: number,
  glow: number,
  extra?: { teal?: Color },
) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: AdditiveBlending,
    uniforms: {
      uSize: { value: size },
      uGlow: { value: glow },
      uBreath: { value: 1 },
      uAmount: { value: 0 },
      uRot: { value: 0 },
      ...(extra?.teal
        ? { uTeal: { value: extra.teal.clone() } }
        : {}),
    },
  });
}

/**
 * Three independent layers: white · teal · spikes.
 * Each has size / glow / breath / depth / amount / rotationDeg — never coupled.
 */
export function HeroStar({
  white,
  teal,
  spikes,
  tealColor = "#5eead4",
  phase = 0,
  parallax = 0.35,
  globalScale = 1,
  birthFlash = 0,
}: HeroStarProps) {
  const geo = usePointGeometry();
  const rootRef = useRef<Group>(null);
  const whiteRef = useRef<ShaderMaterial>(null);
  const tealRef = useRef<ShaderMaterial>(null);
  const spikesRef = useRef<ShaderMaterial>(null);
  const tealCol = useMemo(() => new Color(tealColor), [tealColor]);
  const { pointer } = useThree();

  const whiteMat = useMemo(
    () => makeLayerMat(whiteFragment, 120 * white.size, white.glow),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- driven in useFrame
    [],
  );
  const tealMat = useMemo(
    () =>
      makeLayerMat(tealFragment, 200 * teal.size, teal.glow, {
        teal: tealCol,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const spikesMat = useMemo(
    () =>
      makeLayerMat(spikesFragment, 260 * spikes.size, spikes.glow, {
        teal: tealCol,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ clock, camera }) => {
    const tw =
      clock.elapsedTime * Math.max(0.05, white.breath) + phase;
    const tt =
      clock.elapsedTime * Math.max(0.05, teal.breath) + phase + 0.4;
    const ts =
      clock.elapsedTime * Math.max(0.05, spikes.breath) + phase + 0.8;

    const bw = 0.62 + 0.22 * Math.sin(tw) + 0.1 * Math.sin(tw * 0.37);
    const bt = 0.62 + 0.22 * Math.sin(tt) + 0.1 * Math.sin(tt * 0.41);
    const bs = 0.62 + 0.22 * Math.sin(ts) + 0.1 * Math.sin(ts * 0.33);

    const persp = (z: number) => {
      const d = Math.max(0.35, camera.position.z - z);
      return camera.position.z / d;
    };

    const flash = Math.max(0, Math.min(1, birthFlash));
    const flashSize = 1 + flash * 0.55;
    const flashGlow = 1 + flash * 0.7;

    const drive = (
      mat: ShaderMaterial,
      layer: HeroLayerKnobs,
      breath: number,
      baseSize: number,
      glowMul: number,
      withTeal: boolean,
    ) => {
      mat.uniforms.uSize.value =
        baseSize *
        layer.size *
        Math.max(0.05, globalScale) *
        persp(layer.depth) *
        flashSize;
      mat.uniforms.uGlow.value = layer.glow * glowMul * flashGlow;
      mat.uniforms.uBreath.value = breath;
      mat.uniforms.uAmount.value = layer.amount * (1 + flash * 0.25);
      mat.uniforms.uRot.value = (layer.rotationDeg * Math.PI) / 180;
      if (withTeal && mat.uniforms.uTeal) {
        mat.uniforms.uTeal.value.copy(tealCol);
      }
    };

    drive(
      whiteRef.current ?? whiteMat,
      white,
      bw,
      140,
      0.85 + 0.25 * bw,
      false,
    );
    drive(
      tealRef.current ?? tealMat,
      teal,
      bt,
      220,
      0.75 + 0.4 * bt,
      true,
    );
    drive(
      spikesRef.current ?? spikesMat,
      spikes,
      bs,
      280,
      0.85 + 0.25 * bs,
      true,
    );

    const root = rootRef.current;
    if (root && parallax > 0.001) {
      const maxTilt = 0.22 * parallax;
      root.rotation.y += (pointer.x * maxTilt - root.rotation.y) * 0.08;
      root.rotation.x += (-pointer.y * maxTilt - root.rotation.x) * 0.08;
    } else if (root) {
      root.rotation.x *= 0.9;
      root.rotation.y *= 0.9;
    }
  });

  return (
    <group ref={rootRef}>
      <points
        geometry={geo}
        position={[0, 0, teal.depth]}
        frustumCulled={false}
        renderOrder={0}
      >
        <primitive object={tealMat} ref={tealRef} attach="material" />
      </points>
      <points
        geometry={geo}
        position={[0, 0, spikes.depth]}
        frustumCulled={false}
        renderOrder={1}
      >
        <primitive object={spikesMat} ref={spikesRef} attach="material" />
      </points>
      <points
        geometry={geo}
        position={[0, 0, white.depth]}
        frustumCulled={false}
        renderOrder={2}
      >
        <primitive object={whiteMat} ref={whiteRef} attach="material" />
      </points>
    </group>
  );
}

/** KEEP 26 août 2026 — craft lab lock (CEO). */
export const DEFAULT_HERO_WHITE: HeroLayerKnobs = {
  size: 2.19,
  glow: 1.1,
  breath: 0.7,
  depth: -0.6,
  amount: 0.45,
  rotationDeg: 0,
};

/** KEEP 26 août 2026 — craft lab lock (CEO). */
export const DEFAULT_HERO_TEAL: HeroLayerKnobs = {
  size: 1.38,
  glow: 1,
  breath: 0.7,
  depth: -0.6,
  amount: 0.65,
  rotationDeg: 12,
};

/** KEEP 26 août 2026 — craft lab lock (CEO). */
export const DEFAULT_HERO_SPIKES: HeroLayerKnobs = {
  size: 1.56,
  glow: 1.15,
  breath: 0.7,
  depth: -0.6,
  amount: 1.04,
  rotationDeg: 108,
};

/** KEEP — parallax souris (lab onglet Hero). */
export const DEFAULT_HERO_PARALLAX = 1.2;

/** KEEP — master size après ratios figés. */
export const DEFAULT_HERO_GLOBAL_SCALE = 0.83;
