"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
} from "three";

import type {
  BridgeFamilyCraft,
  BridgesCraft,
  BridgeLineStyle,
} from "@/src/components/contribute/constellation/craftDefaults";
import { DEFAULT_BRIDGES } from "@/src/components/contribute/constellation/craftDefaults";
import {
  edgeTier,
  strokeKey,
  undirectedEdgeKey,
} from "@/src/components/contribute/constellation/graphs/leo";
import {
  LINE_WHISPER_FLOOR,
  PROXIMITY_RELIGHT,
} from "@/src/components/contribute/constellation/graphs/drawPhase";
import type { ConstellationDrawState } from "@/src/components/contribute/constellation/graphs/reveal";
import type {
  ConstellationEdge,
  SoulPositionMap,
} from "@/src/components/contribute/constellation/graphs/types";

export type CurrentTipStyle = "trail" | "star" | "orb";

type LightBridgesProps = {
  positions: SoulPositionMap;
  edges: readonly ConstellationEdge[];
  ghostIds?: Set<string>;
  draw: ConstellationDrawState;
  emphasis?: number;
  /** F · idle — traits s’atténuent vers whisper (default 1). */
  lineDimMul?: number;
  /** Per-edge mouse field 0–1 (`undirectedEdgeKey`). */
  edgeProximity?: Record<string, number>;
  /** Min opacity at whisper idle. */
  lineWhisperFloor?: number;
  revealComplete?: boolean;
  /** @deprecated prefer bridges.width — kept as global mul */
  lineWidthMul?: number;
  /** @deprecated prefer bridges.opacity — kept as global mul */
  lineOpacityMul?: number;
  tipStrength?: number;
  ghostDim?: number;
  tipStyle?: CurrentTipStyle;
  tipColor?: string;
  tipSize?: number;
  bridges?: BridgesCraft;
};

function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function edgeProgress(
  draw: ConstellationDrawState,
  a: string,
  b: string,
): number {
  const forward = draw.edgeDraw[strokeKey(a, b)];
  const backward = draw.edgeDraw[strokeKey(b, a)];
  return Math.max(forward ?? 0, backward ?? 0);
}

function dashForStyle(style: BridgeLineStyle): {
  dashed: boolean;
  dashSize: number;
  gapSize: number;
} {
  if (style === "dotted") {
    return { dashed: true, dashSize: 0.04, gapSize: 0.11 };
  }
  if (style === "dashed") {
    return { dashed: true, dashSize: 0.14, gapSize: 0.1 };
  }
  return { dashed: false, dashSize: 1, gapSize: 0 };
}

const tipVertex = /* glsl */ `
uniform float uSize;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize;
}
`;

const starTipFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
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
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float core = exp(-pow(length(uv) / 0.04, 2.0));
  float v = spikePair(uv, 1.5707963, 0.42, 0.008);
  float h = spikePair(uv, 0.0, 0.36, 0.007);
  float a = max(core * 1.2, max(v, h) * uGlow);
  if (a < 0.02) discard;
  gl_FragColor = vec4(mix(uColor, vec3(1.0), core * 0.5), clamp(a, 0.0, 1.0));
}
`;

const orbTipFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float core = exp(-pow(d / 0.08, 2.0));
  float halo = exp(-pow(d / 0.28, 2.0)) * 0.55;
  float a = (core + halo) * uGlow;
  if (a < 0.02) discard;
  gl_FragColor = vec4(mix(uColor, vec3(1.0), core * 0.4), clamp(a, 0.0, 1.0));
}
`;

function CurrentTipSprite({
  position,
  style,
  color,
  size,
  strength,
}: {
  position: [number, number, number];
  style: "star" | "orb";
  color: string;
  size: number;
  strength: number;
}) {
  const matRef = useRef<ShaderMaterial>(null);
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([0, 0, 0]), 3),
    );
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: tipVertex,
        fragmentShader: style === "star" ? starTipFragment : orbTipFragment,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: AdditiveBlending,
        uniforms: {
          uSize: { value: 28 * size },
          uColor: { value: new Color(color) },
          uGlow: { value: strength },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [style],
  );

  useFrame(() => {
    const m = matRef.current ?? mat;
    m.uniforms.uSize.value =
      (style === "star" ? 36 : 28) * size * (0.85 + 0.25 * strength);
    m.uniforms.uGlow.value = Math.max(0.1, strength);
    m.uniforms.uColor.value.set(color);
  });

  return (
    <points position={position} geometry={geo} frustumCulled={false}>
      <primitive object={mat} ref={matRef} attach="material" />
    </points>
  );
}

function BridgeSegment({
  from,
  tip,
  family,
  opacity,
  width,
}: {
  from: [number, number, number];
  tip: [number, number, number];
  family: BridgeFamilyCraft;
  opacity: number;
  width: number;
}) {
  const dash = dashForStyle(family.style);
  const points = [from, tip] as [
    [number, number, number],
    [number, number, number],
  ];

  if (family.style === "glow") {
    return (
      <group>
        <Line
          points={points}
          color={family.haloColor}
          lineWidth={width * 2.4}
          transparent
          opacity={Math.min(1, opacity * 0.35)}
          depthWrite={false}
          toneMapped={false}
        />
        <Line
          points={points}
          color={family.coreColor}
          lineWidth={width * 0.85}
          transparent
          opacity={Math.min(1, opacity * 0.95)}
          depthWrite={false}
          toneMapped={false}
        />
      </group>
    );
  }

  return (
    <Line
      points={points}
      color={family.color}
      lineWidth={width}
      transparent
      opacity={opacity}
      depthWrite={false}
      toneMapped={false}
      dashed={dash.dashed}
      dashSize={dash.dashSize}
      gapSize={dash.gapSize}
    />
  );
}

/**
 * Filaments — grow node → node.
 * Craft: major / minor · solid · dotted · dashed · glow (core+halo).
 */
export function LightBridges({
  positions,
  edges,
  ghostIds,
  draw,
  emphasis = 0,
  lineDimMul = 1,
  edgeProximity,
  lineWhisperFloor = LINE_WHISPER_FLOOR,
  revealComplete = false,
  lineWidthMul = 1,
  lineOpacityMul = 1,
  tipStrength = 1,
  ghostDim = 1,
  tipStyle = "orb",
  tipColor = "#ccfbf1",
  tipSize = 1,
  bridges = DEFAULT_BRIDGES,
}: LightBridgesProps) {
  const emp = Math.min(1.5, Math.max(0, emphasis));
  const lineDim = Math.min(1, Math.max(0.04, lineDimMul));
  const legacyW = Math.max(0.15, lineWidthMul);
  const legacyO = Math.max(0.05, lineOpacityMul);
  const tipMul = Math.max(0, tipStrength);
  const gDim = Math.min(1.5, Math.max(0.05, ghostDim));
  const sizeMul = Math.max(0.15, tipSize);

  const activeTip = useMemo(() => {
    const s = draw.activeStroke;
    if (!s) return null;
    const from = positions[s.from];
    const to = positions[s.to];
    if (!from || !to) return null;
    return lerp3(from, to, s.t);
  }, [draw.activeStroke, positions]);

  const showTip =
    !!activeTip &&
    tipMul > 0.02 &&
    !!draw.activeStroke &&
    draw.activeStroke.t < 0.98 &&
    lineDim > 0.55;

  return (
    <group>
      {edges.map(([a, b]) => {
        const from = positions[a];
        const to = positions[b];
        if (!from || !to) return null;

        const progress = revealComplete ? 1 : edgeProgress(draw, a, b);
        if (progress < 0.02) return null;

        const tip = lerp3(from, to, progress);
        const touchesGhost =
          ghostIds?.has(a) === true || ghostIds?.has(b) === true;
        const tier = edgeTier(a, b);
        const family = bridges[tier];
        const edgeKey = undirectedEdgeKey(a, b);
        const prox = Math.min(1, edgeProximity?.[edgeKey] ?? 0);
        const proxRelight = 1 + prox * PROXIMITY_RELIGHT;
        const baseOp = touchesGhost ? 0.28 * gDim : 0.5;
        let opacity = Math.min(
          1,
          (baseOp + emp * 0.55) *
            Math.max(progress, 0.15) *
            Math.max(0.05, family.opacity) *
            legacyO *
            lineDim,
        );
        if (revealComplete || lineDim < 0.98) {
          opacity = Math.max(lineWhisperFloor, opacity);
        }
        opacity = Math.min(1, opacity * proxRelight);
        const width =
          (touchesGhost ? 1.5 * gDim : 2.4) *
          Math.max(0.1, family.width) *
          legacyW *
          (0.72 + 0.28 * lineDim) *
          (1 + prox * 0.85);

        return (
          <BridgeSegment
            key={`${a}-${b}`}
            from={from}
            tip={tip}
            family={family}
            opacity={opacity}
            width={width}
          />
        );
      })}

      {showTip && tipStyle === "trail" && activeTip && draw.activeStroke ? (
        <Line
          points={[
            lerp3(
              positions[draw.activeStroke.from]!,
              positions[draw.activeStroke.to]!,
              Math.max(0, draw.activeStroke.t - 0.14),
            ),
            activeTip,
          ]}
          color={tipColor}
          lineWidth={3.4 * legacyW * (0.6 + 0.8 * tipMul) * sizeMul}
          transparent
          opacity={Math.min(1, 0.7 * tipMul * legacyO)}
          depthWrite={false}
          toneMapped={false}
        />
      ) : null}

      {showTip &&
      (tipStyle === "star" || tipStyle === "orb") &&
      activeTip ? (
        <CurrentTipSprite
          position={activeTip}
          style={tipStyle}
          color={tipColor}
          size={sizeMul}
          strength={tipMul}
        />
      ) : null}
    </group>
  );
}
