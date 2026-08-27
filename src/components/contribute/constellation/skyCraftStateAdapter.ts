import {
  isSkyLayerOn,
  SKY_LAB_DEFAULT_LAYERS,
  type SkyCraftLayerId,
  type SkyCraftLayerMap,
} from "./skyCraftLayers";
import {
  DESKTOP_ONLY_LAYER_IDS,
  LAYER_IDENTITY,
  MILKY_GROUP_CHILD_IDS,
  SKY_CRAFT_STATE_VERSION,
  type GasLayerState,
  type LayerStateBase,
  type SkyCraftState,
  type SkyCraftVisualLayerId,
  type StarFieldLayerState,
  type Vec3,
} from "./skyCraftState";
import {
  defaultSkyTheme,
  type GasLayerTheme,
  type SkyTheme,
  type StarFieldTheme,
  type TierOpacity,
} from "./skyTheme";

const IDENTITY_PARALLAX = { factor: 0, lerp: 0.02 } as const;

const DESKTOP_ONLY = new Set<string>(DESKTOP_ONLY_LAYER_IDS);

function vis(layers: SkyCraftLayerMap | undefined, id: SkyCraftLayerId): boolean {
  return isSkyLayerOn(layers, id);
}

function vec3(v: readonly number[] | undefined, fallback: Vec3): Vec3 {
  if (!v || v.length < 3) return [...fallback];
  return [v[0], v[1], v[2]];
}

function baseLayer(partial: Partial<LayerStateBase> & { isVisible: boolean }): LayerStateBase {
  return {
    isVisible: partial.isVisible,
    opacity: partial.opacity ?? 1,
    position: vec3(partial.position, LAYER_IDENTITY.position),
    rotation: vec3(partial.rotation, LAYER_IDENTITY.rotation),
    scale: vec3(partial.scale, LAYER_IDENTITY.scale),
    color: partial.color,
    renderOrder: partial.renderOrder ?? 0,
    parallax: partial.parallax ?? { ...IDENTITY_PARALLAX },
  };
}

function toTierOpacity(desktop: number, layerId: SkyCraftVisualLayerId): TierOpacity {
  if (DESKTOP_ONLY.has(layerId)) {
    return { desktop, mobile: 0, reduced: 0 };
  }
  return {
    desktop,
    mobile: desktop * 0.85,
    reduced: 0,
  };
}

function gasFromLegacy(
  g: GasLayerTheme,
  isVisible: boolean,
): GasLayerState {
  return {
    ...baseLayer({
      isVisible,
      opacity: g.opacity.desktop,
      position: g.position,
      rotation: LAYER_IDENTITY.rotation,
      scale: g.scale,
      color: g.color,
      renderOrder: g.renderOrder,
      parallax: g.parallax,
    }),
    deep: g.deep,
    ...(g.colorHot ? { colorHot: g.colorHot } : {}),
    loopPeriodMul: g.loopPeriodMul,
  };
}

function gasToLegacy(l: GasLayerState, id: SkyCraftVisualLayerId): GasLayerTheme {
  return {
    color: l.color ?? "#000000",
    ...(l.colorHot ? { colorHot: l.colorHot } : {}),
    deep: l.deep,
    opacity: toTierOpacity(l.opacity, id),
    loopPeriodMul: l.loopPeriodMul,
    position: l.position,
    scale: l.scale,
    renderOrder: l.renderOrder,
    parallax: l.parallax,
  };
}

function starsFromLegacy(
  s: StarFieldTheme,
  isVisible: boolean,
): StarFieldLayerState {
  return {
    ...baseLayer({
      isVisible,
      opacity: s.alphaMul,
      position: LAYER_IDENTITY.position,
      rotation: LAYER_IDENTITY.rotation,
      scale: LAYER_IDENTITY.scale,
      color: s.tint,
      renderOrder: s.renderOrder,
      parallax: s.parallax,
    }),
    zSpread: s.zSpread,
    zBias: s.zBias,
    scaleMin: s.scaleMin,
    scaleRange: s.scaleRange,
    brightMin: s.brightMin,
    brightRange: s.brightRange,
    ...(s.bandThickness != null ? { bandThickness: s.bandThickness } : {}),
    drift: s.drift,
    breathSpeedA: s.breathSpeedA,
    breathSpeedB: s.breathSpeedB,
    breathAmp: s.breathAmp,
    sizeMul: s.sizeMul,
    repulsion: s.repulsion,
    repelStrength: s.repelStrength,
  };
}

function starsToLegacy(l: StarFieldLayerState): StarFieldTheme {
  return {
    tint: l.color ?? "#c8d4f0",
    zSpread: l.zSpread,
    zBias: l.zBias,
    scaleMin: l.scaleMin,
    scaleRange: l.scaleRange,
    brightMin: l.brightMin,
    brightRange: l.brightRange,
    ...(l.bandThickness != null ? { bandThickness: l.bandThickness } : {}),
    drift: l.drift,
    breathSpeedA: l.breathSpeedA,
    breathSpeedB: l.breathSpeedB,
    breathAmp: l.breathAmp,
    sizeMul: l.sizeMul,
    alphaMul: l.opacity,
    repulsion: l.repulsion,
    repelStrength: l.repelStrength,
    renderOrder: l.renderOrder,
    parallax: l.parallax,
  };
}

/**
 * Legacy `SkyTheme` + map visibilité lab → contrat craft.
 * Point d’entrée pour hydrater le lab sans dupliquer `defaultSkyTheme`.
 */
export function fromLegacySkyTheme(
  theme: SkyTheme,
  layerMap: SkyCraftLayerMap | undefined = SKY_LAB_DEFAULT_LAYERS,
  parallaxIntensity = 1,
): SkyCraftState {
  const p = theme.skyPanorama;
  const d = theme.cosmicDust;
  const lanes = theme.milkyDustLanes;
  const z = theme.zodiacal;
  const a = theme.aurora;
  const e = theme.eclipse;
  const g = theme.ghostStars;
  const shoot = theme.shootingStars;

  return {
    v: SKY_CRAFT_STATE_VERSION,
    id: theme.id,
    scene: {
      ambientIntensity: theme.scene.ambientIntensity,
      parallaxIntensity,
      baseLoopPeriod: theme.baseLoopPeriod,
      clearEnabled: vis(layerMap, "fond"),
      clearColor: theme.fond.color || theme.scene.background,
      fog: {
        enabled: vis(layerMap, "fog"),
        color: theme.scene.fogColor,
        near: theme.scene.fogNear,
        far: theme.scene.fogFar,
      },
      intro: { ...theme.scene.intro },
      idle: { ...theme.scene.idle, rareTargets: [...theme.scene.idle.rareTargets] },
    },
    layers: {
      milkyGroup: baseLayer({
        isVisible: true,
        opacity: 1,
        position: vec3(theme.scene.milkyPosition, LAYER_IDENTITY.position),
        rotation: [0, 0, theme.scene.milkyRotate ?? 0],
        scale: LAYER_IDENTITY.scale,
        renderOrder: 0,
        parallax: { ...IDENTITY_PARALLAX },
      }),
      panorama: {
        ...baseLayer({
          isVisible: vis(layerMap, "panorama"),
          opacity: p.opacity.desktop,
          position: p.position,
          rotation: p.rotation,
          scale: p.scale,
          color: p.voidColor,
          renderOrder: p.renderOrder,
          parallax: p.parallax,
        }),
        texturePath: p.texturePath,
        dim: p.dim,
        voidScale: p.voidScale,
        voidColor: p.voidColor,
        blackSoft: p.blackSoft,
        flipV: p.flipV,
        flipH: p.flipH,
      },
      gasFar: gasFromLegacy(theme.gasFar, vis(layerMap, "gasFar")),
      gasRose: gasFromLegacy(theme.gasRose, vis(layerMap, "gasRose")),
      gasMauve: gasFromLegacy(theme.gasMauve, vis(layerMap, "gasMauve")),
      gasTeal: gasFromLegacy(theme.gasTeal, vis(layerMap, "gasTeal")),
      ghostStars: {
        ...baseLayer({
          isVisible: vis(layerMap, "ghostStars"),
          opacity: g.opacity.desktop,
          ...LAYER_IDENTITY,
          color: g.tint,
          renderOrder: g.renderOrder,
          parallax: g.parallax,
        }),
        count: g.count,
        sizeMul: g.sizeMul,
        zSpread: g.zSpread,
        zBias: g.zBias,
      },
      cosmicDust: {
        ...baseLayer({
          isVisible: vis(layerMap, "cosmicDust"),
          opacity: d.opacity.desktop,
          position: d.position,
          rotation: LAYER_IDENTITY.rotation,
          scale: d.scale,
          color: d.tint,
          renderOrder: d.renderOrder,
          parallax: d.parallax,
        }),
        dust: d.dust,
      },
      dustLanes: {
        ...baseLayer({
          isVisible: vis(layerMap, "dustLanes"),
          opacity: lanes.opacity.desktop,
          position: lanes.position,
          rotation: LAYER_IDENTITY.rotation,
          scale: lanes.scale,
          color: lanes.lane,
          renderOrder: lanes.renderOrder,
          parallax: lanes.parallax,
        }),
        deep: lanes.deep,
        contrast: lanes.contrast,
      },
      zodiacal: {
        ...baseLayer({
          isVisible: vis(layerMap, "zodiacal"),
          opacity: z.opacity.desktop,
          position: z.position,
          rotation: LAYER_IDENTITY.rotation,
          scale: z.scale,
          color: z.warm,
          renderOrder: z.renderOrder,
          parallax: z.parallax,
        }),
        core: z.core,
        idleBoost: z.idleBoost,
      },
      aurora: {
        ...baseLayer({
          isVisible: vis(layerMap, "aurora"),
          opacity: a.opacity.desktop,
          position: a.position,
          rotation: LAYER_IDENTITY.rotation,
          scale: a.scale,
          color: a.cool,
          renderOrder: a.renderOrder,
          parallax: a.parallax,
        }),
        edge: a.edge,
      },
      eclipse: {
        ...baseLayer({
          isVisible: false,
          opacity: e.opacity.desktop,
          position: e.position,
          rotation: LAYER_IDENTITY.rotation,
          scale: e.scale,
          color: e.body,
          renderOrder: e.renderOrder,
          parallax: e.parallax,
        }),
        corona: e.corona,
        rim: e.rim,
        coronaAmp: e.coronaAmp,
      },
      starsBand: starsFromLegacy(theme.starsBand, vis(layerMap, "starsBand")),
      starsField: starsFromLegacy(theme.starsField, vis(layerMap, "starsField")),
      shootingStars: {
        ...baseLayer({
          isVisible: vis(layerMap, "shootingStars"),
          opacity: 1,
          ...LAYER_IDENTITY,
          color: shoot.tip,
          renderOrder: 0,
          parallax: shoot.parallax,
        }),
        mid: shoot.mid,
        tail: shoot.tail,
        rareTints: shoot.rareTints,
        echoDelaySec: shoot.echoDelaySec,
        echoOpacity: shoot.echoOpacity,
      },
      constellation: baseLayer({
        isVisible: vis(layerMap, "constellation"),
        opacity: 1,
        ...LAYER_IDENTITY,
        renderOrder: 0,
        parallax: theme.constellation.parallax,
      }),
    },
  };
}

/**
 * Contrat craft → `SkyTheme` prod (composants R3F non migrés).
 * `isVisible` ne vit pas dans `SkyTheme` — utiliser `toLegacyLayerMap`.
 */
export function toLegacySkyTheme(state: SkyCraftState): SkyTheme {
  const { scene, layers } = state;
  const milky = layers.milkyGroup;
  const p = layers.panorama;
  const g = layers.ghostStars;
  const d = layers.cosmicDust;
  const lanes = layers.dustLanes;
  const z = layers.zodiacal;
  const a = layers.aurora;
  const e = layers.eclipse;
  const shoot = layers.shootingStars;

  return {
    id: state.id,
    baseLoopPeriod: scene.baseLoopPeriod,
    scene: {
      background: scene.clearColor,
      fogColor: scene.fog.color,
      fogNear: scene.fog.near,
      fogFar: scene.fog.far,
      ambientIntensity: scene.ambientIntensity,
      milkyRotate: milky.rotation[2],
      milkyPosition: milky.position,
      intro: { ...scene.intro },
      idle: { ...scene.idle, rareTargets: [...scene.idle.rareTargets] },
    },
    fond: { color: scene.clearColor },
    skyPanorama: {
      texturePath: p.texturePath,
      opacity: toTierOpacity(p.opacity, "panorama"),
      position: p.position,
      scale: p.scale,
      rotation: p.rotation,
      dim: p.dim,
      voidScale: p.voidScale,
      voidColor: p.voidColor,
      blackSoft: p.blackSoft,
      flipV: p.flipV,
      flipH: p.flipH,
      renderOrder: p.renderOrder,
      parallax: p.parallax,
    },
    gasFar: gasToLegacy(layers.gasFar, "gasFar"),
    gasRose: gasToLegacy(layers.gasRose, "gasRose"),
    gasMauve: gasToLegacy(layers.gasMauve, "gasMauve"),
    gasTeal: gasToLegacy(layers.gasTeal, "gasTeal"),
    cosmicDust: {
      dust: d.dust,
      tint: d.color ?? "#3a4a5c",
      opacity: toTierOpacity(d.opacity, "cosmicDust"),
      position: d.position,
      scale: d.scale,
      renderOrder: d.renderOrder,
      parallax: d.parallax,
    },
    milkyDustLanes: {
      lane: lanes.color ?? "#120c0a",
      deep: lanes.deep,
      opacity: toTierOpacity(lanes.opacity, "dustLanes"),
      contrast: lanes.contrast,
      position: lanes.position,
      scale: lanes.scale,
      renderOrder: lanes.renderOrder,
      parallax: lanes.parallax,
    },
    zodiacal: {
      warm: z.color ?? "#1a1510",
      core: z.core,
      opacity: toTierOpacity(z.opacity, "zodiacal"),
      position: z.position,
      scale: z.scale,
      renderOrder: z.renderOrder,
      parallax: z.parallax,
      idleBoost: z.idleBoost,
    },
    aurora: {
      cool: a.color ?? "#0a2a28",
      edge: a.edge,
      opacity: toTierOpacity(a.opacity, "aurora"),
      position: a.position,
      scale: a.scale,
      renderOrder: a.renderOrder,
      parallax: a.parallax,
    },
    eclipse: {
      body: e.color ?? "#05060a",
      corona: e.corona,
      rim: e.rim,
      opacity: toTierOpacity(e.opacity, "eclipse"),
      coronaAmp: e.coronaAmp,
      position: e.position,
      scale: e.scale,
      renderOrder: e.renderOrder,
      parallax: e.parallax,
    },
    ghostStars: {
      tint: g.color ?? "#c8d4f0",
      count: g.count,
      opacity: toTierOpacity(g.opacity, "ghostStars"),
      sizeMul: g.sizeMul,
      zSpread: g.zSpread,
      zBias: g.zBias,
      renderOrder: g.renderOrder,
      parallax: g.parallax,
    },
    starsBand: starsToLegacy(layers.starsBand),
    starsField: starsToLegacy(layers.starsField),
    shootingStars: {
      tip: shoot.color ?? "#e8f0fa",
      mid: shoot.mid,
      tail: shoot.tail,
      rareTints: shoot.rareTints,
      echoDelaySec: shoot.echoDelaySec,
      echoOpacity: shoot.echoOpacity,
      parallax: shoot.parallax,
    },
    constellation: { parallax: layers.constellation.parallax },
  };
}

/**
 * Visibilité craft → `skyLayers` SanctuaryUniverse.
 * `milkyGroup.isVisible === false` éteint les 4 enfants (groupe parent).
 */
export function toLegacyLayerMap(state: SkyCraftState): Record<SkyCraftLayerId, boolean> {
  const L = state.layers;
  const milkyOn = L.milkyGroup.isVisible;
  const milkyChildOn = (id: (typeof MILKY_GROUP_CHILD_IDS)[number]): boolean =>
    milkyOn && L[id].isVisible;

  return {
    fond: state.scene.clearEnabled,
    fog: state.scene.fog.enabled,
    panorama: L.panorama.isVisible,
    gasFar: L.gasFar.isVisible,
    ghostStars: L.ghostStars.isVisible,
    gasRose: L.gasRose.isVisible,
    gasMauve: L.gasMauve.isVisible,
    gasTeal: L.gasTeal.isVisible,
    cosmicDust: milkyChildOn("cosmicDust"),
    dustLanes: milkyChildOn("dustLanes"),
    zodiacal: milkyChildOn("zodiacal"),
    aurora: L.aurora.isVisible,
    starsBand: milkyChildOn("starsBand"),
    starsField: L.starsField.isVisible,
    shootingStars: L.shootingStars.isVisible,
    constellation: L.constellation.isVisible,
  };
}

/** Hydratation lab : défauts craft actuels dans le nouveau contrat. */
export const defaultSkyCraftState: SkyCraftState = fromLegacySkyTheme(
  defaultSkyTheme,
  SKY_LAB_DEFAULT_LAYERS,
  1,
);
