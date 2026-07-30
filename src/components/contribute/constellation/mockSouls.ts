export type SoulTier = "standard" | "premium" | "hero";

export type MockSoul = {
  id: string;
  name: string;
  tier: SoulTier;
  /** Position monde */
  position: [number, number, number];
};

/**
 * Constellation maquette — espace négatif volontaire.
 * Centre = hero ; autour = standards + premiums.
 */
export const MOCK_SOULS: MockSoul[] = [
  { id: "hero", name: "Margaret", tier: "hero", position: [0, 0.15, 0] },
  { id: "a", name: "Claire", tier: "premium", position: [-2.8, 1.3, -1.2] },
  { id: "b", name: "Thomas", tier: "standard", position: [2.6, 1.0, -1.6] },
  { id: "c", name: "Amélie", tier: "premium", position: [2.0, -1.5, -0.8] },
  { id: "d", name: "Julien", tier: "standard", position: [-2.2, -1.2, -2.0] },
  { id: "e", name: "Sophie", tier: "standard", position: [0.5, 2.2, -2.4] },
  { id: "f", name: "Marc", tier: "premium", position: [-0.8, -2.0, -1.0] },
];
