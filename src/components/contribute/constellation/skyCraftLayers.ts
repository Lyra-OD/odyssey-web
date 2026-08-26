/** Layer ids — ordre ≈ stack render (cf. `SANCTUARY_SKY_CRAFT.md` §2). */
export type SkyCraftLayerId =
  | "gasFar"
  | "ghostStars"
  | "gasRose"
  | "gasMauve"
  | "gasTeal"
  | "cosmicDust"
  | "zodiacal"
  | "aurora"
  | "starsBand"
  | "starsField"
  | "shootingStars"
  | "constellation";

export type SkyCraftLayerMap = Partial<Record<SkyCraftLayerId, boolean>>;

/** Lab `/test-sky` — constellation off par défaut (fond seul). */
export const SKY_LAB_DEFAULT_LAYERS: Record<SkyCraftLayerId, boolean> = {
  gasFar: true,
  ghostStars: true,
  gasRose: true,
  gasMauve: true,
  gasTeal: true,
  cosmicDust: true,
  zodiacal: true,
  aurora: true,
  starsBand: true,
  starsField: true,
  shootingStars: true,
  constellation: false,
};

export function isSkyLayerOn(
  layers: SkyCraftLayerMap | undefined,
  id: SkyCraftLayerId,
): boolean {
  if (!layers) return true;
  return layers[id] !== false;
}
