import type { ConstellationTemplate } from "@/src/components/contribute/constellation/graphs/types";
import type { LeoStrokeStep } from "@/src/components/contribute/constellation/graphs/leo";
import { undirectedEdgeKey } from "@/src/components/contribute/constellation/graphs/leo";

const S = 0.82;

/**
 * Libra (Balance) — stylized beam + pans, 9 nodes (1 hero + 8 slots).
 * Hero = fulcrum. Scale S aligned with Leo craft mid-size.
 */
export const LIBRA_TEMPLATE: ConstellationTemplate = {
  id: "libra",
  name: "Libra",
  nodes: [
    {
      id: "hero",
      role: "hero",
      position: [0, -0.55 * S, 0],
      weight: "bright",
    },
    {
      id: "hinge",
      role: "slot",
      position: [0, 0.85 * S, -0.1],
      weight: "medium",
    },
    {
      id: "beamL",
      role: "slot",
      position: [-2.35 * S, 1.55 * S, -0.2],
      weight: "bright",
    },
    {
      id: "beamR",
      role: "slot",
      position: [2.35 * S, 1.55 * S, -0.2],
      weight: "bright",
    },
    {
      id: "peak",
      role: "slot",
      position: [0, 3.05 * S, -0.28],
      weight: "medium",
    },
    {
      id: "panL",
      role: "slot",
      position: [-2.55 * S, -0.35 * S, -0.35],
      weight: "medium",
    },
    {
      id: "panR",
      role: "slot",
      position: [2.55 * S, -0.35 * S, -0.35],
      weight: "medium",
    },
    {
      id: "tipL",
      role: "slot",
      position: [-3.35 * S, -1.65 * S, -0.45],
      weight: "dim",
    },
    {
      id: "tipR",
      role: "slot",
      position: [3.35 * S, -1.65 * S, -0.45],
      weight: "dim",
    },
  ],
  edges: [
    ["hero", "hinge"],
    ["hinge", "beamL"],
    ["hinge", "beamR"],
    ["beamL", "peak"],
    ["beamR", "peak"],
    ["beamL", "panL"],
    ["beamR", "panR"],
    ["panL", "tipL"],
    ["panR", "tipR"],
  ],
};

const LIBRA_MAJOR_EDGES = new Set([
  undirectedEdgeKey("hero", "hinge"),
  undirectedEdgeKey("hinge", "beamL"),
  undirectedEdgeKey("hinge", "beamR"),
  undirectedEdgeKey("beamL", "peak"),
  undirectedEdgeKey("beamR", "peak"),
  undirectedEdgeKey("beamL", "panL"),
  undirectedEdgeKey("beamR", "panR"),
]);

export function isLibraMajorEdge(a: string, b: string): boolean {
  return LIBRA_MAJOR_EDGES.has(undirectedEdgeKey(a, b));
}

/** Stroke order: fulcrum → beam → pans. */
export const LIBRA_STROKE_SEQUENCE: readonly LeoStrokeStep[] = [
  { kind: "hero" },
  { kind: "stroke", from: "hero", to: "hinge" },
  { kind: "stroke", from: "hinge", to: "beamL" },
  { kind: "stroke", from: "hinge", to: "beamR" },
  { kind: "stroke", from: "beamL", to: "peak" },
  { kind: "stroke", from: "beamR", to: "peak" },
  { kind: "stroke", from: "beamL", to: "panL" },
  { kind: "stroke", from: "beamR", to: "panR" },
  { kind: "stroke", from: "panL", to: "tipL" },
  { kind: "stroke", from: "panR", to: "tipR" },
] as const;
