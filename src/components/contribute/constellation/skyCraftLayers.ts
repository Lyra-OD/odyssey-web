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
  /** Hero KEEP @ revealT 0.56 — visible sans traits ; caméra = HubSkyCamera. */
  constellation: true,
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
