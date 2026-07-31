"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  Vector2,
} from "three";

import { tierDustCount, type VisualTier } from "./useVisualTier";

const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
uniform float uRepulsion;
uniform float uRepelStrength;
uniform float uDrift;
uniform float uBreathSpeedA;
uniform float uBreathSpeedB;
uniform float uBreathAmp;
uniform float uSizeMul;
uniform float uAlphaMul;
attribute float aScale;
attribute float aBrightness;
varying float vAlpha;
varying float vBright;

void main() {
  vec3 pos = position;

  pos.x += sin(uTime * uDrift + position.z * 0.8) * 0.012;
  pos.y += cos(uTime * uDrift * 0.88 + position.x * 0.6) * 0.01;

  vec2 toMouse = pos.xy - uMouse;
  float dist = length(toMouse);
  float force = smoothstep(uRepulsion, 0.0, dist);
  pos.xy += normalize(toMouse + 0.0001) * force * uRepelStrength;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float depth = max(-mv.z, 0.6);
  gl_Position = projectionMatrix * mv;

  // Respiration centree sur 1.0 — rythmes par layer via uniforms
  float s1 = sin(uTime * uBreathSpeedA + position.x * 2.4 + position.z * 1.1);
  float s2 = sin(uTime * uBreathSpeedB + position.y * 3.1 + 2.0);
  float beat = s1 * s2;
  float breath = 1.0 + uBreathAmp * (0.55 * s1 + 0.30 * s2 + 0.35 * beat);

  gl_PointSize = aScale * uSizeMul * breath * (58.0 / depth);
  vAlpha = aBrightness * uAlphaMul * breath * smoothstep(20.0, 3.0, depth);
  vBright = aBrightness;
}
`;

const fragmentShader = /* glsl */ `
varying float vAlpha;
varying float vBright;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);

  float core = 1.0 - smoothstep(0.0, 0.12, d);
  float spikeX = (1.0 - smoothstep(0.0, 0.035, abs(uv.x))) * (1.0 - smoothstep(0.0, 0.42, abs(uv.y)));
  float spikeY = (1.0 - smoothstep(0.0, 0.035, abs(uv.y))) * (1.0 - smoothstep(0.0, 0.42, abs(uv.x)));
  float spikes = max(spikeX, spikeY) * 0.55;
  float soft = (1.0 - smoothstep(0.0, 0.4, d)) * 0.15;

  float a = (core + spikes + soft) * vAlpha;
  if (a < 0.02) discard;

  vec3 col = mix(vec3(0.82, 0.88, 1.0), vec3(1.0, 0.99, 0.96), vBright);
  gl_FragColor = vec4(col, min(a * 1.15, 1.0));
}
`;

type FieldKind = "band" | "field";

type FieldConfig = {
  /** z plus négatif = plus loin */
  zSpread: number;
  zBias: number;
  scaleMin: number;
  scaleRange: number;
  brightMin: number;
  brightRange: number;
  drift: number;
  breathSpeedA: number;
  breathSpeedB: number;
  breathAmp: number;
  sizeMul: number;
  alphaMul: number;
  repulsion: number;
  repelStrength: number;
  renderOrder: number;
};

const FIELD: Record<FieldKind, FieldConfig> = {
  // Voie lactée — dense, marquée, large
  band: {
    zSpread: 9,
    zBias: -4.5,
    scaleMin: 0.28,
    scaleRange: 1.0,
    brightMin: 0.5,
    brightRange: 0.5,
    drift: 0.028,
    breathSpeedA: 0.42,
    breathSpeedB: 0.26,
    breathAmp: 0.1,
    sizeMul: 1.12,
    alphaMul: 1.18,
    repulsion: 0.9,
    repelStrength: 0.05,
    renderOrder: 1,
  },
  // Avant-plan — rare
  field: {
    zSpread: 3.2,
    zBias: 1.2,
    scaleMin: 0.55,
    scaleRange: 1.45,
    brightMin: 0.62,
    brightRange: 0.38,
    drift: 0.06,
    breathSpeedA: 1.05,
    breathSpeedB: 0.62,
    breathAmp: 0.14,
    sizeMul: 1.2,
    alphaMul: 1.08,
    repulsion: 1.5,
    repelStrength: 0.22,
    renderOrder: 3,
  },
};

/** PRNG déterministe — chaque layer a sa seed → toucher la bande ne re-shuffle pas le field. */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LAYER_SEED: Record<FieldKind, number> = {
  band: 0xba12d001,
  field: 0xf1e1d002,
};

function buildGeometry(count: number, kind: FieldKind): BufferGeometry {
  const cfg = FIELD[kind];
  const rand = mulberry32(LAYER_SEED[kind]);
  const geo = new BufferGeometry();
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const brightness = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    let x: number;
    let y: number;
    let z: number;

    if (kind === "band") {
      const t = (rand() - 0.5) * 24;
      // Falloff centre→bords, bande plus étroite
      const u = rand() + rand() + rand() - 1.5;
      const thickness = u * 1.05;
      x = t * 0.85 + thickness * 0.4;
      y = t * 0.22 + thickness * 0.95;
      z = (rand() - 0.5) * cfg.zSpread + cfg.zBias;
    } else {
      // Étoiles partout — plus rares / discrètes
      x = (rand() - 0.5) * 24;
      y = (rand() - 0.5) * 15;
      z = (rand() - 0.5) * cfg.zSpread + cfg.zBias;
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    const bright = Math.pow(rand(), kind === "field" ? 1.35 : 1.7);
    brightness[i] = cfg.brightMin + bright * cfg.brightRange;
    scales[i] = cfg.scaleMin + bright * cfg.scaleRange;
  }

  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.setAttribute("aScale", new BufferAttribute(scales, 1));
  geo.setAttribute("aBrightness", new BufferAttribute(brightness, 1));
  return geo;
}

function createMaterial(cfg: FieldConfig): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new Vector2(0, 0) },
      uRepulsion: { value: cfg.repulsion },
      uRepelStrength: { value: cfg.repelStrength },
      uDrift: { value: cfg.drift },
      uBreathSpeedA: { value: cfg.breathSpeedA },
      uBreathSpeedB: { value: cfg.breathSpeedB },
      uBreathAmp: { value: cfg.breathAmp },
      uSizeMul: { value: cfg.sizeMul },
      uAlphaMul: { value: cfg.alphaMul },
      uTint: { value: new Color("#c8d4f0") },
    },
  });
}

type StarFieldProps = {
  kind: FieldKind;
  count: number;
};

function StarField({ kind, count }: StarFieldProps) {
  const materialRef = useRef<ShaderMaterial>(null);
  const { viewport, pointer } = useThree();
  const cfg = FIELD[kind];

  const geometry = useMemo(() => buildGeometry(count, kind), [count, kind]);
  const material = useMemo(() => createMaterial(cfg), [cfg]);

  useEffect(() => {
    material.vertexShader = vertexShader;
    material.fragmentShader = fragmentShader;
    material.needsUpdate = true;
  }, [material]);

  useFrame(({ clock }) => {
    const mat = materialRef.current ?? material;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uMouse.value.set(
      pointer.x * viewport.width * 0.45,
      pointer.y * viewport.height * 0.45,
    );
  });

  return (
    <points
      geometry={geometry}
      frustumCulled={false}
      renderOrder={cfg.renderOrder}
    >
      <primitive object={material} ref={materialRef} attach="material" />
    </points>
  );
}

type StarDustProps = {
  tier: VisualTier;
};

/**
 * 2 layers clairs : bande (voie lactée) + champ (étoiles partout).
 */
export function StarDust({ tier }: StarDustProps) {
  const total = tierDustCount(tier);
  // Field ~4 % ; bande ~96 %
  const bandCount = tier === "reduced" ? total : Math.floor(total * 0.96);
  const fieldCount = total - bandCount;

  return (
    <group>
      <StarField kind="band" count={bandCount} />
      {fieldCount > 0 ? <StarField kind="field" count={fieldCount} /> : null}
    </group>
  );
}
