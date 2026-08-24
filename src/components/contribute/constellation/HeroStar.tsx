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
`;

const whiteFragment = /* glsl */ `
uniform float uGlow;
uniform float uBreath;
uniform float uAmount;
uniform float uRot;
${spikeFn}
void main() {
  vec2 uv = rotateUv(gl_PointCoord - 0.5, uRot);
  float d = length(uv);
  float core = exp(-pow(d / 0.03, 2.0));
  float hot = 1.0 - smoothstep(0.0, 0.045, d);
  float disk = (hot * 1.4 + core * 0.7) * uGlow * (0.85 + 0.25 * uBreath);
  float sp = diffractionSpikes(uv, uAmount, uBreath) * uGlow;
  float a = max(disk, sp);
  if (a < 0.03) discard;
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
  vec2 uv = rotateUv(gl_PointCoord - 0.5, uRot);
  float d = length(uv);
  float inner = exp(-pow(d / 0.12, 2.0));
  float mid = exp(-pow(d / 0.28, 2.0));
  float outer = exp(-pow(d / 0.48, 2.0));
  float halo = (inner * 0.85 + mid * 0.5 + outer * 0.22) * uGlow * (0.65 + 0.5 * uBreath);
  float sp = diffractionSpikes(uv, uAmount, uBreath) * uGlow;
  float a = max(halo, sp);
  if (a < 0.02) discard;
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
  vec2 uv = rotateUv(gl_PointCoord - 0.5, uRot);
  float spikes = diffractionSpikes(uv, uAmount, uBreath);
  float a = spikes * uGlow;
  if (a < 0.02) discard;
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

    const drive = (
      mat: ShaderMaterial,
      layer: HeroLayerKnobs,
      breath: number,
      baseSize: number,
      glowMul: number,
      withTeal: boolean,
    ) => {
      mat.uniforms.uSize.value = baseSize * layer.size * persp(layer.depth);
      mat.uniforms.uGlow.value = layer.glow * glowMul;
      mat.uniforms.uBreath.value = breath;
      mat.uniforms.uAmount.value = layer.amount;
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

export const DEFAULT_HERO_WHITE: HeroLayerKnobs = {
  size: 1,
  glow: 1.1,
  breath: 0.28,
  depth: 0.12,
  amount: 0.45,
  rotationDeg: 0,
};

export const DEFAULT_HERO_TEAL: HeroLayerKnobs = {
  size: 1.15,
  glow: 1,
  breath: 0.3,
  depth: -0.18,
  amount: 0.65,
  rotationDeg: 12,
};

export const DEFAULT_HERO_SPIKES: HeroLayerKnobs = {
  size: 1.2,
  glow: 1.15,
  breath: 0.26,
  depth: 0,
  amount: 1.35,
  rotationDeg: 0,
};
