/** Layer ids — ordre ≈ stack render (cf. `SANCTUARY_SKY_CRAFT.md` §2). */
export type SkyCraftLayerId =
  | "fond"
  | "fog"
  | "panorama"
  | "gasFar"
  | "ghostStars"
  | "gasRose"
  | "gasMauve"
  | "gasTeal"
  | "cosmicDust"
  | "dustLanes"
  | "zodiacal"
  | "aurora"
  | "starsBand"
  | "starsField"
  | "shootingStars"
  | "constellation";

export type SkyCraftLayerMap = Partial<Record<SkyCraftLayerId, boolean>>;

/** Chemin 1 hub idle — ciel vivant léger · Hero seul (pas de traits reveal). */
export const SKY_HUB_LITE_LAYERS: Record<SkyCraftLayerId, boolean> = {
  fond: true,
  fog: true,
  panorama: false,
  gasFar: true,
  ghostStars: false,
  gasRose: true,
  gasMauve: true,
  gasTeal: true,
  cosmicDust: true,
  dustLanes: true,
  zodiacal: false,
  aurora: false,
  starsBand: true,
  starsField: true,
  shootingStars: false,
  /** Hero KEEP @ revealT 0.56 — couche Constellation (Hero seul via hubHeroOnly). */
  constellation: true,
};

/**
 * Invité démo 10 sept — fluidité : bande VL + champ lointain + filantes + Hero.
 * Pas de gaz, poussière, panorama, Leo, aurore.
 */
export const SKY_GUEST_DEMO_LAYERS: Record<SkyCraftLayerId, boolean> = {
  fond: true,
  fog: false,
  panorama: false,
  gasFar: false,
  ghostStars: false,
  gasRose: false,
  gasMauve: false,
  gasTeal: false,
  cosmicDust: false,
  dustLanes: false,
  zodiacal: false,
  aurora: false,
  starsBand: true,
  starsField: true,
  shootingStars: true,
  constellation: true,
};

/**
 * Rituel Continuer — ciel léger (même recette que l’invité démo) :
 * fond + bande + champ lointain + filantes + constellation.
 * JPEG éteint pendant le play. Pas de gaz / poussière.
 */
export const SKY_RITUAL_LAYERS: Record<SkyCraftLayerId, boolean> = {
  ...SKY_GUEST_DEMO_LAYERS,
};

/** Lab `/test-sky` — constellation off par défaut (fond seul). */
export const SKY_LAB_DEFAULT_LAYERS: Record<SkyCraftLayerId, boolean> = {
  fond: true,
  fog: true,
  panorama: false,
  gasFar: true,
  ghostStars: true,
  gasRose: true,
  gasMauve: true,
  gasTeal: true,
  cosmicDust: true,
  dustLanes: true,
  zodiacal: true,
  aurora: true,
  starsBand: true,
  starsField: true,
  shootingStars: true,
  constellation: false,
};

/** Opacités gaz recommandées en mode hybride (panorama + layers). */
export const SKY_LAB_HYBRID_GAS_OPACITY = {
  gasFar: 0.12,
  gasRose: 0.06,
  gasMauve: 0.08,
  gasTeal: 0.1,
} as const;

export function isSkyLayerOn(
  layers: SkyCraftLayerMap | undefined,
  id: SkyCraftLayerId,
): boolean {
  if (!layers) {
    if (id === "panorama") return false;
    return true;
  }
  return layers[id] !== false;
}
