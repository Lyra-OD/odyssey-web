/**
 * Defaults Hero — fichier léger (pas de Three / R3F).
 * Les valeurs restent alignées sur `HeroStar.tsx` KEEP craft.
 */

export type HeroLayerKnobsLite = {
  size: number;
  glow: number;
  breath: number;
  depth: number;
  amount: number;
  rotationDeg: number;
};

/** Aligné `HUB_HERO_BREATH_SPEED_INVITE` (hubIdle). */
export const GUEST_HERO_BREATH = 2.6;

export const DEFAULT_HERO_WHITE: HeroLayerKnobsLite = {
  size: 2.19,
  glow: 1.1,
  breath: 0.7,
  depth: -0.6,
  amount: 0.45,
  rotationDeg: 0,
};

export const DEFAULT_HERO_TEAL: HeroLayerKnobsLite = {
  size: 1.38,
  glow: 1,
  breath: 0.7,
  depth: -0.6,
  amount: 0.65,
  rotationDeg: 12,
};

export const DEFAULT_HERO_SPIKES: HeroLayerKnobsLite = {
  size: 1.56,
  glow: 1.15,
  breath: 0.7,
  depth: -0.6,
  amount: 1.04,
  rotationDeg: 108,
};

export const DEFAULT_HERO_GLOBAL_SCALE = 0.83;
