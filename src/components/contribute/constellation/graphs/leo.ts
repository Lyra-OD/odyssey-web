import type { ConstellationTemplate } from "@/src/components/contribute/constellation/graphs/types";

const S = 0.78; // between compact v1 and oversized v2

/**
 * Leo (Lion) — stylized sickle + body, 9 nodes.
 * Regulus = hero. Scale S = mid between v1/v2 (Aug 2026).
 */
export const LEO_TEMPLATE: ConstellationTemplate = {
  id: "leo",
  name: "Leo",
  nodes: [
    {
      id: "hero",
      role: "hero",
      position: [-0.4 * S, -0.35 * S, 0],
      weight: "bright",
    },
    {
      id: "eta",
      role: "slot",
      position: [-1.45 * S, 0.85 * S, -0.15],
      weight: "medium",
    },
    {
      id: "algieba",
      role: "slot",
      position: [-2.15 * S, 2.05 * S, -0.25],
      weight: "bright",
    },
    {
      id: "adhafera",
      role: "slot",
      position: [-1.55 * S, 3.25 * S, -0.3],
      weight: "medium",
    },
    {
      id: "rasalas",
      role: "slot",
      position: [-0.35 * S, 4.15 * S, -0.35],
      weight: "dim",
    },
    {
      id: "mu",
      role: "slot",
      position: [1.15 * S, 3.45 * S, -0.25],
      weight: "dim",
    },
    {
      id: "chertan",
      role: "slot",
      position: [1.85 * S, -0.75 * S, -0.4],
      weight: "medium",
    },
    {
      id: "zosma",
      role: "slot",
      position: [3.55 * S, 0.55 * S, -0.55],
      weight: "medium",
    },
    {
      id: "denebola",
      role: "slot",
      position: [5.15 * S, -0.15 * S, -0.7],
      weight: "bright",
    },
  ],
  edges: [
    ["rasalas", "adhafera"],
    ["adhafera", "algieba"],
    ["algieba", "eta"],
    ["eta", "hero"],
    ["rasalas", "mu"],
    ["mu", "algieba"],
    ["hero", "chertan"],
    ["chertan", "zosma"],
    ["zosma", "denebola"],
    ["algieba", "chertan"],
  ],
};

/** Stroke order: hero first, then current flows node → node. */
export type LeoStrokeStep =
  | { kind: "hero" }
  | { kind: "stroke"; from: string; to: string };

export const LEO_STROKE_SEQUENCE: readonly LeoStrokeStep[] = [
  { kind: "hero" },
  { kind: "stroke", from: "hero", to: "eta" },
  { kind: "stroke", from: "eta", to: "algieba" },
  { kind: "stroke", from: "algieba", to: "adhafera" },
  { kind: "stroke", from: "adhafera", to: "rasalas" },
  { kind: "stroke", from: "rasalas", to: "mu" },
  { kind: "stroke", from: "mu", to: "algieba" },
  { kind: "stroke", from: "hero", to: "chertan" },
  { kind: "stroke", from: "algieba", to: "chertan" },
  { kind: "stroke", from: "chertan", to: "zosma" },
  { kind: "stroke", from: "zosma", to: "denebola" },
] as const;

export function strokeKey(from: string, to: string): string {
  return `${from}->${to}`;
}
