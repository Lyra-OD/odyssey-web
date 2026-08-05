export type SoulTier = "standard" | "premium" | "hero";

export type MockMemoryMedia = {
  kind: "photo";
  /** URL mock — remplacé plus tard par dépôt réel */
  src: string;
  captionFr: string;
  captionEn: string;
};

export type MockSoul = {
  id: string;
  name: string;
  tier: SoulTier;
  /** Position monde */
  position: [number, number, number];
  /** Souvenir (satellites seulement — jamais le hero / Lueur pure) */
  memory?: MockMemoryMedia;
};

/**
 * Constellation maquette — espace négatif volontaire.
 * Centre = hero (Lueur pure) ; autour = souvenirs.
 */
export const MOCK_SOULS: MockSoul[] = [
  { id: "hero", name: "Margaret", tier: "hero", position: [0, 0.15, 0] },
  {
    id: "a",
    name: "Claire",
    tier: "premium",
    position: [-2.8, 1.3, -1.2],
    memory: {
      kind: "photo",
      src: "https://picsum.photos/seed/odyssey-claire/720/900",
      captionFr: "L’été à la maison",
      captionEn: "Summer at home",
    },
  },
  {
    id: "b",
    name: "Thomas",
    tier: "standard",
    position: [2.6, 1.0, -1.6],
    memory: {
      kind: "photo",
      src: "https://picsum.photos/seed/odyssey-thomas/720/900",
      captionFr: "Sur le quai",
      captionEn: "On the quay",
    },
  },
  {
    id: "c",
    name: "Amélie",
    tier: "premium",
    position: [2.0, -1.5, -0.8],
    memory: {
      kind: "photo",
      src: "https://picsum.photos/seed/odyssey-amelie/720/900",
      captionFr: "Dimanche matin",
      captionEn: "Sunday morning",
    },
  },
  {
    id: "d",
    name: "Julien",
    tier: "standard",
    position: [-2.2, -1.2, -2.0],
    memory: {
      kind: "photo",
      src: "https://picsum.photos/seed/odyssey-julien/720/900",
      captionFr: "Le jardin",
      captionEn: "The garden",
    },
  },
  { id: "e", name: "Sophie", tier: "standard", position: [0.5, 2.2, -2.4] },
  {
    id: "f",
    name: "Marc",
    tier: "premium",
    position: [-0.8, -2.0, -1.0],
    memory: {
      kind: "photo",
      src: "https://picsum.photos/seed/odyssey-marc/720/900",
      captionFr: "La table dressée",
      captionEn: "The set table",
    },
  },
];

export function getMockSoul(id: string): MockSoul | undefined {
  return MOCK_SOULS.find((s) => s.id === id);
}
