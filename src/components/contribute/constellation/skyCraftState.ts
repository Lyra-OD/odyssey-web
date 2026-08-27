import type { VisualTier } from "./useVisualTier";
import type { RareSkyTarget, SceneTheme } from "./skyTheme";

/**
 * Contrat d’état craft ciel (outil + presets JSON).
 * Prod lit encore `SkyTheme` via `toLegacySkyTheme` (étrangleur).
 *
 * Fond / Fog : données dans `scene` ; chips UI lab seulement.
 */

export const SKY_CRAFT_STATE_VERSION = 1 as const;

export type Vec3 = [number, number, number];

export type LayerParallax = {
  factor: number;
  lerp: number;
};

/** Socle commun — tout layer visuel (y compris `milkyGroup`). */
export type LayerStateBase = {
  isVisible: boolean;
  /** Vérité craft = desktop. Tiers dérivés au render. */
  opacity: number;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  /** Teinte principale si applicable. */
  color?: string;
  renderOrder: number;
  parallax: LayerParallax;
};

export type LayerState<TExtras extends object = object> = LayerStateBase & TExtras;

export const LAYER_IDENTITY = {
  position: [0, 0, 0] as Vec3,
  rotation: [0, 0, 0] as Vec3,
  scale: [1, 1, 1] as Vec3,
} as const;

/** Idle / intro : même shape que le thème legacy (étrangleur). */
export type SceneIdleState = SceneTheme["idle"];
export type SceneIntroState = SceneTheme["intro"];

export type SceneFogState = {
  enabled: boolean;
  color: string;
  near: number;
  far: number;
};

export type SceneState = {
  ambientIntensity: number;
  /** Multiplicateur lab global (hors layers). */
  parallaxIntensity: number;
  baseLoopPeriod: number;
  /** Clear WebGL — chip lab « Fond ». */
  clearEnabled: boolean;
  clearColor: string;
  fog: SceneFogState;
  intro: SceneIntroState;
  idle: SceneIdleState;
};

export type GasLayerExtras = {
  deep: string;
  colorHot?: string;
  loopPeriodMul: number;
};

export type DustLayerExtras = {
  /** Couleur poussière (secondaire ; `color` = tint). */
  dust: string;
};

export type DustLanesLayerExtras = {
  deep: string;
  contrast: number;
};

export type ZodiacalLayerExtras = {
  core: string;
  idleBoost: number;
};

export type AuroraLayerExtras = {
  edge: string;
};

export type PanoramaLayerExtras = {
  texturePath: string;
  dim: number;
  voidScale: number;
  voidColor: string;
  blackSoft: number;
  flipV: boolean;
  flipH: boolean;
};

export type GhostStarsLayerExtras = {
  count: number;
  sizeMul: number;
  zSpread: number;
  zBias: number;
};

export type StarFieldLayerExtras = {
  zSpread: number;
  zBias: number;
  scaleMin: number;
  scaleRange: number;
  brightMin: number;
  brightRange: number;
  bandThickness?: number;
  drift: number;
  breathSpeedA: number;
  breathSpeedB: number;
  breathAmp: number;
  sizeMul: number;
  repulsion: number;
  repelStrength: number;
};

export type ShootingStarsLayerExtras = {
  mid: string;
  tail: string;
  rareTints: Record<RareSkyTarget, { tip: string; mid: string; tail: string }>;
  echoDelaySec: number;
  echoOpacity: number;
};

export type EclipseLayerExtras = {
  corona: string;
  rim: string;
  coronaAmp: number;
};

export type GasLayerState = LayerState<GasLayerExtras>;
export type DustLayerState = LayerState<DustLayerExtras>;
export type DustLanesLayerState = LayerState<DustLanesLayerExtras>;
export type ZodiacalLayerState = LayerState<ZodiacalLayerExtras>;
export type AuroraLayerState = LayerState<AuroraLayerExtras>;
export type PanoramaLayerState = LayerState<PanoramaLayerExtras>;
export type GhostStarsLayerState = LayerState<GhostStarsLayerExtras>;
export type StarFieldLayerState = LayerState<StarFieldLayerExtras>;
export type ShootingStarsLayerState = LayerState<ShootingStarsLayerExtras>;
export type EclipseLayerState = LayerState<EclipseLayerExtras>;
/** Transform parent uniquement — pas d’extras visuels. */
export type MilkyGroupLayerState = LayerStateBase;
export type ConstellationLayerState = LayerStateBase;

/**
 * Layers visuels de premier niveau.
 * `milkyGroup` parent de cosmicDust · zodiacal · dustLanes · starsBand.
 * `panorama` = sibling (jamais enfant du groupe).
 */
export type SkyLayersState = {
  milkyGroup: MilkyGroupLayerState;
  panorama: PanoramaLayerState;
  gasFar: GasLayerState;
  gasRose: GasLayerState;
  gasMauve: GasLayerState;
  gasTeal: GasLayerState;
  ghostStars: GhostStarsLayerState;
  cosmicDust: DustLayerState;
  dustLanes: DustLanesLayerState;
  zodiacal: ZodiacalLayerState;
  aurora: AuroraLayerState;
  eclipse: EclipseLayerState;
  starsBand: StarFieldLayerState;
  starsField: StarFieldLayerState;
  shootingStars: ShootingStarsLayerState;
  constellation: ConstellationLayerState;
};

export type SkyCraftVisualLayerId = keyof SkyLayersState;

/** Chips lab qui éditent `scene` (pas des meshes). */
export type SkyCraftSceneChipId = "fond" | "fog";

export type SkyCraftState = {
  v: typeof SKY_CRAFT_STATE_VERSION;
  id: string;
  scene: SceneState;
  layers: SkyLayersState;
};

/** Enfants R3F du groupe milky (transform parent). */
export const MILKY_GROUP_CHILD_IDS = [
  "cosmicDust",
  "zodiacal",
  "dustLanes",
  "starsBand",
] as const satisfies readonly SkyCraftVisualLayerId[];

/** Layers desktop-only au render (mobile/reduced → 0). */
export const DESKTOP_ONLY_LAYER_IDS = [
  "panorama",
  "ghostStars",
] as const satisfies readonly SkyCraftVisualLayerId[];

const DESKTOP_ONLY = new Set<string>(DESKTOP_ONLY_LAYER_IDS);

/** Dérive opacity device au render — pas dans le preset. */
export function deriveOpacityForTier(
  opacity: number,
  tier: VisualTier,
  layerId?: SkyCraftVisualLayerId,
): number {
  if (layerId && DESKTOP_ONLY.has(layerId)) {
    return tier === "desktop" ? opacity : 0;
  }
  if (tier === "reduced") return 0;
  if (tier === "mobile") return opacity * 0.85;
  return opacity;
}
