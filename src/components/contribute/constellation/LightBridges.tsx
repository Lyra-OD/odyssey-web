"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";

import { strokeKey } from "@/src/components/contribute/constellation/graphs/leo";
import type { ConstellationDrawState } from "@/src/components/contribute/constellation/graphs/reveal";
import type {
  ConstellationEdge,
  SoulPositionMap,
} from "@/src/components/contribute/constellation/graphs/types";

const TEAL = "#5eead4";
const TEAL_GHOST = "#4d7c74";
const TEAL_TIP = "#ccfbf1";

type LightBridgesProps = {
  positions: SoulPositionMap;
  edges: readonly ConstellationEdge[];
  ghostIds?: Set<string>;
  draw: ConstellationDrawState;
  emphasis?: number;
  /** When true, all template edges shown full (reveal done). */
  revealComplete?: boolean;
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
}: LightBridgesProps) {
  const emp = Math.min(1, Math.max(0, emphasis));

  const activeTip = useMemo(() => {
    const s = draw.activeStroke;
    if (!s) return null;
    const from = positions[s.from];
    const to = positions[s.to];
    if (!from || !to) return null;
    return lerp3(from, to, s.t);
  }, [draw.activeStroke, positions]);

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
        const baseOp = touchesGhost ? 0.32 : 0.55;
        const opacity = Math.min(0.9, (baseOp + emp * 0.2) * Math.max(progress, 0.15));

        return (
          <Line
            key={`${a}-${b}`}
            points={[from, tip]}
            color={touchesGhost ? TEAL_GHOST : TEAL}
            lineWidth={touchesGhost ? 1.6 : 2.4}
            transparent
            opacity={opacity}
            depthWrite={false}
            toneMapped={false}
          />
        );
      })}

      {/* Soft “current” tip while a stroke is drawing */}
      {activeTip && draw.activeStroke && draw.activeStroke.t < 0.98 ? (
        <Line
          points={[
            lerp3(
              positions[draw.activeStroke.from]!,
              positions[draw.activeStroke.to]!,
              Math.max(0, draw.activeStroke.t - 0.14),
            ),
            activeTip,
          ]}
          color={TEAL_TIP}
          lineWidth={3.4}
          transparent
          opacity={0.9}
          depthWrite={false}
          toneMapped={false}
        />
      ) : null}
    </group>
  );
}
