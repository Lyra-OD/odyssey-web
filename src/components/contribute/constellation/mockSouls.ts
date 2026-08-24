/**
 * @deprecated Prefer graphs/resolveConstellation — kept for MemoryReveal lookup shape.
 */
import {
  getResolvedStar,
  resolveConstellation,
} from "@/src/components/contribute/constellation/graphs/resolveConstellation";
import type { MemoryMedia } from "@/src/components/contribute/constellation/graphs/types";

export type SoulTier = "standard" | "premium" | "hero";

export type MockMemoryMedia = MemoryMedia;

export type MockSoul = {
  id: string;
  name: string;
  tier: SoulTier;
  position: [number, number, number];
  memory?: MockMemoryMedia;
};

const RESOLVED = resolveConstellation();

/** Flat list derived from Leo graph (lit stars only + hero). */
export const MOCK_SOULS: MockSoul[] = RESOLVED.filter(
  (s) => s.lit && s.visual !== "ghost",
).map((s) => ({
  id: s.id,
  name: s.name,
  tier:
    s.visual === "hero"
      ? "hero"
      : s.visual === "premium"
        ? "premium"
        : "standard",
  position: s.position,
  memory: s.memory,
}));

export function getMockSoul(id: string): MockSoul | undefined {
  const s = getResolvedStar(RESOLVED, id);
  if (!s || !s.lit) return undefined;
  return {
    id: s.id,
    name: s.name,
    tier:
      s.visual === "hero"
        ? "hero"
        : s.visual === "premium"
          ? "premium"
          : "standard",
    position: s.position,
    memory: s.memory,
  };
}
