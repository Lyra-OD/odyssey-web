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

import { strokeKey } from "@/src/components/contribute/constellation/graphs/leo";
import type { ConstellationDrawState } from "@/src/components/contribute/constellation/graphs/reveal";
import type {
  ConstellationEdge,
  SoulPositionMap,
} from "@/src/components/contribute/constellation/graphs/types";

const TEAL = "#5eead4";
const TEAL_GHOST = "#4d7c74";

export type CurrentTipStyle = "trail" | "star" | "orb";

type LightBridgesProps = {
  positions: SoulPositionMap;
  edges: readonly ConstellationEdge[];
  ghostIds?: Set<string>;
  draw: ConstellationDrawState;
  emphasis?: number;
  /** When true, all template edges shown full (reveal done). */
  revealComplete?: boolean;
  lineWidthMul?: number;
  lineOpacityMul?: number;
  tipStrength?: number;
  ghostDim?: number;
  tipStyle?: CurrentTipStyle;
  tipColor?: string;
  tipSize?: number;
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
  float d = length(uv);
  float core = exp(-pow(d / 0.04, 2.0));
  float v = spikePair(uv, 1.5707963, 0.48, 0.008);
  float h = spikePair(uv, 0.0, 0.4, 0.007);
  float d1 = spikePair(uv, 0.7853982, 0.32, 0.0065);
  float d2 = spikePair(uv, -0.7853982, 0.32, 0.0065);
  float spikes = max(max(v, h), max(d1, d2));
  float a = (core * 1.2 + spikes * 1.1) * uGlow;
  if (a < 0.03) discard;
  vec3 col = mix(uColor, vec3(1.0), core * 0.65);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}
`;

const orbTipFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float core = exp(-pow(d / 0.08, 2.0));
  float mid = exp(-pow(d / 0.22, 2.0));
  float halo = exp(-pow(d / 0.42, 2.0));
  float a = (core * 1.35 + mid * 0.55 + halo * 0.28) * uGlow;
  if (a < 0.02) discard;
  vec3 col = mix(uColor, vec3(1.0), core * 0.55);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
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
    g.setAttribute("position", new BufferAttribute(new Float32Array([0, 0, 0]), 3));
    return g;
  }, []);
  const col = useMemo(() => new Color(color), [color]);
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
          uSize: { value: 48 * size },
          uColor: { value: col.clone() },
          uGlow: { value: strength },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- driven in useFrame
    [style],
  );

  useFrame(({ clock }) => {
    const m = matRef.current ?? mat;
    const breath = 0.88 + 0.12 * Math.sin(clock.elapsedTime * 3.2);
    m.uniforms.uSize.value = (style === "star" ? 56 : 72) * size * breath;
    m.uniforms.uGlow.value = strength * breath;
    m.uniforms.uColor.value.copy(col);
  });

  return (
    <points position={position} geometry={geo} frustumCulled={false} renderOrder={5}>
      <primitive object={mat} ref={matRef} attach="material" />
    </points>
  );
}

/**
 * Teal filaments — grow from node to node (current), not white CAD lines.
 */
export function LightBridges({
  positions,
  edges,
  ghostIds,
  draw,
  emphasis = 0,
  revealComplete = false,
  lineWidthMul = 1,
  lineOpacityMul = 1,
  tipStrength = 1,
  ghostDim = 1,
  tipStyle = "orb",
  tipColor = "#ccfbf1",
  tipSize = 1,
}: LightBridgesProps) {
  const emp = Math.min(1.5, Math.max(0, emphasis));
  const wMul = Math.max(0.15, lineWidthMul);
  const oMul = Math.max(0.05, lineOpacityMul);
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
    draw.activeStroke.t < 0.98;

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
        const baseOp = touchesGhost ? 0.28 * gDim : 0.5;
        const opacity = Math.min(
          1,
          (baseOp + emp * 0.55) * Math.max(progress, 0.15) * oMul,
        );
        const width = (touchesGhost ? 1.5 * gDim : 2.4) * wMul;

        return (
          <Line
            key={`${a}-${b}`}
            points={[from, tip]}
            color={touchesGhost ? TEAL_GHOST : TEAL}
            lineWidth={width}
            transparent
            opacity={opacity}
            depthWrite={false}
            toneMapped={false}
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
          lineWidth={3.4 * wMul * (0.6 + 0.8 * tipMul) * sizeMul}
          transparent
          opacity={Math.min(1, 0.7 * tipMul * oMul)}
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
