import { LEO_TEMPLATE } from "@/src/components/contribute/constellation/graphs/leo";
import type {
  ConstellationTemplate,
  MemoryMedia,
  ResolvedConstellationStar,
  SoulPositionMap,
  StarWeight,
} from "@/src/components/contribute/constellation/graphs/types";

/** Craft layout id — Leo graph replaces orb-cloud-reset-v1. */
export const CONSTELLATION_LAYOUT_ID = "leo-graph-v1";

/** Default craft template until zodiac is resolved from birth date. */
export const ACTIVE_TEMPLATE: ConstellationTemplate = LEO_TEMPLATE;

export type SlotFill = {
  name: string;
  memory?: MemoryMedia;
  /** Family / heavy contributors → brighter star (model C). */
  prominence?: "family" | "guest";
};

/**
 * Mock fills for test-ciel — 5 lit memories, 3 ghost slots (8 slots total).
 * Hero is always lit separately.
 */
export const MOCK_SLOT_FILLS: Record<string, SlotFill | undefined> = {
  eta: {
    name: "Claire",
    prominence: "family",
    memory: {
      kind: "photo",
      src: "https://picsum.photos/seed/odyssey-claire/720/900",
      captionFr: "L’été à la maison",
      captionEn: "Summer at home",
    },
  },
  algieba: {
    name: "Thomas",
    prominence: "guest",
    memory: {
      kind: "photo",
      src: "https://picsum.photos/seed/odyssey-thomas/720/900",
      captionFr: "Sur le quai",
      captionEn: "On the quay",
    },
  },
  adhafera: {
    name: "Amélie",
    prominence: "family",
    memory: {
      kind: "photo",
      src: "https://picsum.photos/seed/odyssey-amelie/720/900",
      captionFr: "Dimanche matin",
      captionEn: "Sunday morning",
    },
  },
  rasalas: undefined, // ghost
  mu: undefined, // ghost
  chertan: {
    name: "Julien",
    prominence: "guest",
    memory: {
      kind: "photo",
      src: "https://picsum.photos/seed/odyssey-julien/720/900",
      captionFr: "Le jardin",
      captionEn: "The garden",
    },
  },
  zosma: undefined, // ghost
  denebola: {
    name: "Marc",
    prominence: "family",
    memory: {
      kind: "photo",
      src: "https://picsum.photos/seed/odyssey-marc/720/900",
      captionFr: "La table dressée",
      captionEn: "The set table",
    },
  },
};

function weightToVisual(
  weight: StarWeight,
  prominence: "family" | "guest" | undefined,
): "premium" | "standard" {
  if (prominence === "family" || weight === "bright") return "premium";
  return "standard";
}

export function resolveConstellation(
  template: ConstellationTemplate = ACTIVE_TEMPLATE,
  fills: Record<string, SlotFill | undefined> = MOCK_SLOT_FILLS,
  heroName = "Margaret",
): ResolvedConstellationStar[] {
  return template.nodes.map((node) => {
    if (node.role === "hero") {
      return {
        id: node.id,
        role: "hero",
        position: node.position,
        lit: true,
        visual: "hero",
        name: heroName,
      };
    }

    const fill = fills[node.id];
    if (!fill?.memory) {
      return {
        id: node.id,
        role: "slot",
        position: node.position,
        lit: false,
        visual: "ghost",
        name: "",
      };
    }

    return {
      id: node.id,
      role: "slot",
      position: node.position,
      lit: true,
      visual: weightToVisual(node.weight, fill.prominence),
      name: fill.name,
      memory: fill.memory,
    };
  });
}

export function constellationPositions(
  stars: ResolvedConstellationStar[],
): SoulPositionMap {
  return Object.fromEntries(stars.map((s) => [s.id, s.position]));
}

export function getResolvedStar(
  stars: ResolvedConstellationStar[],
  id: string,
): ResolvedConstellationStar | undefined {
  return stars.find((s) => s.id === id);
}
