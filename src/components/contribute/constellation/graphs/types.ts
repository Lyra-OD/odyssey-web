/**
 * Constellation as a graph (silhouette), not an orb-cloud.
 * Decision 24 Aug 2026: zodiac template · model C · 9 nodes (1 hero + 8 slots).
 */

export type StarWeight = "bright" | "medium" | "dim";

export type ConstellationNodeDef = {
  id: string;
  /** Hero = Lueur / défunt — always lit, never a memory portrait. */
  role: "hero" | "slot";
  position: [number, number, number];
  /** Relative size when lit (ghosts ignore). */
  weight: StarWeight;
};

export type ConstellationEdge = readonly [fromId: string, toId: string];

export type ConstellationTemplate = {
  id: string;
  /** Internal label — not shown as UI jargon. */
  name: string;
  nodes: ConstellationNodeDef[];
  edges: ConstellationEdge[];
};

export type MemoryMedia = {
  kind: "photo";
  src: string;
  captionFr: string;
  captionEn: string;
};

export type ResolvedConstellationStar = {
  id: string;
  role: "hero" | "slot";
  position: [number, number, number];
  /** Ghost = predefined slot not yet filled. */
  lit: boolean;
  /** Template weight — craft size knobs (bright / medium / dim). */
  weight: StarWeight;
  /** Maps to LueurNode variant (+ ghost). */
  visual: "hero" | "premium" | "standard" | "ghost";
  name: string;
  memory?: MemoryMedia;
};

export type SoulPositionMap = Record<string, [number, number, number]>;
