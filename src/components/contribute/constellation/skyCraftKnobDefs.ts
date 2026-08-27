import type { RareSkyTarget } from "./skyTheme";
import type { DeepPartial } from "./skyTheme";
import type {
  GasLayerState,
  SkyCraftState,
  SkyCraftVisualLayerId,
  Vec3,
} from "./skyCraftState";
import type { PatchSkyCraft, SkyCraftUiTarget } from "./skyCraftStore";

export type SkyCraftKnobDef = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  /** Aide au survol — impact visuel / plage. */
  description?: string;
};

export type SkyCraftColorDef = {
  key: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
};

export type SkyCraftKnobTarget = SkyCraftUiTarget;

/** Descriptions knobs — seed auto-doc (étendre au fil du craft). */
export const KNOB_DESC = {
  baseLoopPeriod:
    "Durée en secondes pour une révolution complète de l'animation (ex: nuages de gaz). Valeur plus basse = animation plus rapide.",
  parallaxFactor:
    "Force du déplacement du calque selon le mouvement de la souris. 0 = fixe, 1 = maximum. Crée l'effet de profondeur (3D).",
  panoramaDim:
    "Assombrit la texture de fond. 0 = couleur originale, 1 = noir total.",
  panoramaVoidScale:
    "Échelle du vide stellaire. Contrôle la densité et la taille apparente de la texture projetée.",
  warpAmp: "Amplitude de la turbulence (domain warp) du nuage de gaz.",
  breathAmp: "Amplitude de la respiration sinusoïdale. 0 = figé.",
  densityCap: "Plafond d'opacité du gaz (évite le blanc saturé).",
  flowSpeed: "Vitesse de dérive du bruit / grain le long de la bande.",
  bandTight: "Serrage de la bande (plus haut = voie plus étroite).",
  lanesWarpAmp: "Amplitude du warp des filaments sombres (dust lanes).",
  spikeAmt: "Force des croix de diffraction sur les sprites d'étoiles.",
  coreRadius: "Rayon du cœur soft de chaque étoile (sprite).",
  coneTight: "Serrage du cône zodiacal (bande principale).",
  coreTight: "Serrage du cœur chaud zodiacal (plus étroit que le cône).",
  alphaCap: "Plafond d'alpha du voile (évite la saturation).",
  curtainSpeed: "Vitesse d'ondulation des rideaux d'aurore.",
  spawnGapSmall: "Intervalle minimum (s) entre deux petites filantes.",
  spawnGapLarge: "Intervalle minimum (s) entre deux grosses filantes.",
  speedMul: "Multiplicateur de vitesse des étoiles filantes.",
  lengthMul: "Multiplicateur de longueur des traînées.",
} as const;

/** Cibles idle rare — `eclipse` réservé labs / intro. */
export const SKY_CRAFT_RARE_TARGETS: readonly RareSkyTarget[] = [
  "rose",
  "mauve",
  "teal",
  "band",
  "aurora",
  "eclipse",
] as const;

function knob(
  key: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (v: number) => void,
  description?: string,
): SkyCraftKnobDef {
  return { key, label, min, max, step, value, onChange, description };
}

function colorKnob(
  key: string,
  label: string,
  value: string,
  onChange: (hex: string) => void,
): SkyCraftColorDef {
  return { key, label, value, onChange };
}

function patchLayer(
  patch: PatchSkyCraft,
  id: SkyCraftVisualLayerId,
  partial: DeepPartial<SkyCraftState["layers"][SkyCraftVisualLayerId]>,
) {
  patch({ layers: { [id]: partial } } as DeepPartial<SkyCraftState>);
}

function setVec3Axis(v: Vec3, axis: 0 | 1 | 2, value: number): Vec3 {
  const next: Vec3 = [...v];
  next[axis] = value;
  return next;
}

function planeKnobs(
  patch: PatchSkyCraft,
  id: SkyCraftVisualLayerId,
  layer: { position: Vec3; scale: Vec3; renderOrder: number; parallax: { factor: number; lerp: number } },
  prefix: string,
): SkyCraftKnobDef[] {
  return [
    knob(`${prefix}-posX`, "Pos X", layer.position[0], -8, 8, 0.05, (v) =>
      patchLayer(patch, id, { position: setVec3Axis(layer.position, 0, v) }),
    ),
    knob(`${prefix}-posY`, "Pos Y", layer.position[1], -6, 6, 0.05, (v) =>
      patchLayer(patch, id, { position: setVec3Axis(layer.position, 1, v) }),
    ),
    knob(`${prefix}-posZ`, "Pos Z", layer.position[2], -14, -2, 0.05, (v) =>
      patchLayer(patch, id, { position: setVec3Axis(layer.position, 2, v) }),
    ),
    knob(`${prefix}-scaleW`, "Scale W", layer.scale[0], 4, 48, 0.25, (v) =>
      patchLayer(patch, id, { scale: setVec3Axis(layer.scale, 0, v) }),
    ),
    knob(`${prefix}-scaleH`, "Scale H", layer.scale[1], 4, 28, 0.25, (v) =>
      patchLayer(patch, id, { scale: setVec3Axis(layer.scale, 1, v) }),
    ),
    knob(`${prefix}-renderOrder`, "Z-order", layer.renderOrder, -4, 6, 1, (v) =>
      patchLayer(patch, id, { renderOrder: v }),
    ),
    knob(
      `${prefix}-parallax`,
      "Parallax",
      layer.parallax.factor,
      -0.35,
      0.35,
      0.005,
      (v) => patchLayer(patch, id, { parallax: { factor: v } }),
      KNOB_DESC.parallaxFactor,
    ),
    knob(
      `${prefix}-parallaxLerp`,
      "Par. lerp",
      layer.parallax.lerp,
      0.005,
      0.08,
      0.001,
      (v) => patchLayer(patch, id, { parallax: { lerp: v } }),
    ),
  ];
}

function gasKnobs(
  patch: PatchSkyCraft,
  id: "gasFar" | "gasRose" | "gasMauve" | "gasTeal",
  layer: GasLayerState,
): SkyCraftKnobDef[] {
  return [
    knob(`${id}-opacity`, "Opacity", layer.opacity, 0, 1, 0.01, (v) =>
      patchLayer(patch, id, { opacity: v }),
    ),
    knob(`${id}-loop`, "Loop ×", layer.loopPeriodMul, 0.4, 2.5, 0.01, (v) =>
      patchLayer(patch, id, { loopPeriodMul: v }),
    ),
    knob(
      `${id}-warpAmp`,
      "Warp amp",
      layer.warpAmp,
      0,
      8,
      0.05,
      (v) => patchLayer(patch, id, { warpAmp: v }),
      KNOB_DESC.warpAmp,
    ),
    knob(
      `${id}-breathAmp`,
      "Breath amp",
      layer.breathAmp,
      0,
      0.5,
      0.01,
      (v) => patchLayer(patch, id, { breathAmp: v }),
      KNOB_DESC.breathAmp,
    ),
    knob(
      `${id}-densityCap`,
      "Density cap",
      layer.densityCap,
      0.05,
      1,
      0.01,
      (v) => patchLayer(patch, id, { densityCap: v }),
      KNOB_DESC.densityCap,
    ),
    ...planeKnobs(patch, id, layer, id),
  ];
}

function gasColorKnobs(
  patch: PatchSkyCraft,
  id: "gasFar" | "gasRose" | "gasMauve" | "gasTeal",
  layer: GasLayerState,
): SkyCraftColorDef[] {
  const colors: SkyCraftColorDef[] = [
    colorKnob(`${id}-color`, "Color", layer.color ?? "#000000", (v) =>
      patchLayer(patch, id, { color: v }),
    ),
    colorKnob(`${id}-deep`, "Deep", layer.deep, (v) =>
      patchLayer(patch, id, { deep: v }),
    ),
  ];
  if (id === "gasRose" && layer.colorHot) {
    colors.push(
      colorKnob(`${id}-hot`, "Hot", layer.colorHot, (v) =>
        patchLayer(patch, id, { colorHot: v }),
      ),
    );
  }
  return colors;
}

function starFieldKnobs(
  patch: PatchSkyCraft,
  id: "starsBand" | "starsField",
  prefix: string,
  withBandThickness: boolean,
  state: SkyCraftState,
): SkyCraftKnobDef[] {
  const layer = state.layers[id];
  const knobs: SkyCraftKnobDef[] = [
    knob(`${prefix}-alpha`, "Opacity", layer.opacity, 0, 2.5, 0.01, (v) =>
      patchLayer(patch, id, { opacity: v }),
    ),
    knob(`${prefix}-size`, "Size", layer.sizeMul, 0.2, 2.5, 0.01, (v) =>
      patchLayer(patch, id, { sizeMul: v }),
    ),
  ];
  if (withBandThickness) {
    knobs.push(
      knob(
        `${prefix}-bandTight`,
        "Band tight",
        layer.bandThickness ?? 0.86,
        0.35,
        1.6,
        0.01,
        (v) => patchLayer(patch, id, { bandThickness: v }),
      ),
    );
  }
  knobs.push(
    knob(`${prefix}-scaleMin`, "Grain min", layer.scaleMin, 0.05, 1.2, 0.01, (v) =>
      patchLayer(patch, id, { scaleMin: v }),
    ),
    knob(`${prefix}-scaleRange`, "Grain range", layer.scaleRange, 0.1, 2.5, 0.01, (v) =>
      patchLayer(patch, id, { scaleRange: v }),
    ),
    knob(`${prefix}-brightMin`, "Bright min", layer.brightMin, 0, 1, 0.01, (v) =>
      patchLayer(patch, id, { brightMin: v }),
    ),
    knob(`${prefix}-brightRange`, "Bright range", layer.brightRange, 0, 1, 0.01, (v) =>
      patchLayer(patch, id, { brightRange: v }),
    ),
    knob(`${prefix}-zSpread`, "Depth spread", layer.zSpread, 1, 16, 0.1, (v) =>
      patchLayer(patch, id, { zSpread: v }),
    ),
    knob(`${prefix}-zBias`, "Depth bias", layer.zBias, -8, 6, 0.1, (v) =>
      patchLayer(patch, id, { zBias: v }),
    ),
    knob(`${prefix}-drift`, "Drift", layer.drift, 0, 0.15, 0.002, (v) =>
      patchLayer(patch, id, { drift: v }),
    ),
    knob(`${prefix}-breathA`, "Breath A", layer.breathSpeedA, 0, 2, 0.01, (v) =>
      patchLayer(patch, id, { breathSpeedA: v }),
    ),
    knob(`${prefix}-breathB`, "Breath B", layer.breathSpeedB, 0, 2, 0.01, (v) =>
      patchLayer(patch, id, { breathSpeedB: v }),
    ),
    knob(`${prefix}-breathAmp`, "Breath amp", layer.breathAmp, 0, 0.35, 0.005, (v) =>
      patchLayer(patch, id, { breathAmp: v }),
    ),
    knob(
      `${prefix}-spikeAmt`,
      "Spike",
      layer.spikeAmt,
      0,
      1.5,
      0.01,
      (v) => patchLayer(patch, id, { spikeAmt: v }),
      KNOB_DESC.spikeAmt,
    ),
    knob(
      `${prefix}-coreRadius`,
      "Core r",
      layer.coreRadius,
      0.02,
      0.35,
      0.005,
      (v) => patchLayer(patch, id, { coreRadius: v }),
      KNOB_DESC.coreRadius,
    ),
    knob(`${prefix}-repulsion`, "Repulsion", layer.repulsion, 0, 3, 0.05, (v) =>
      patchLayer(patch, id, { repulsion: v }),
    ),
    knob(`${prefix}-repelStr`, "Repel str", layer.repelStrength, 0, 0.5, 0.005, (v) =>
      patchLayer(patch, id, { repelStrength: v }),
    ),
    knob(`${prefix}-renderOrder`, "Z-order", layer.renderOrder, -2, 6, 1, (v) =>
      patchLayer(patch, id, { renderOrder: v }),
    ),
    knob(
      `${prefix}-parallax`,
      "Parallax",
      layer.parallax.factor,
      -0.2,
      1,
      0.005,
      (v) => patchLayer(patch, id, { parallax: { factor: v } }),
      KNOB_DESC.parallaxFactor,
    ),
    knob(`${prefix}-parallaxLerp`, "Par. lerp", layer.parallax.lerp, 0.005, 0.12, 0.001, (v) =>
      patchLayer(patch, id, { parallax: { lerp: v } }),
    ),
  );
  return knobs;
}

export type SkyCraftKnobOptions = {
  panoramaScaleLock?: boolean;
};

export function buildSkyCraftKnobs(
  target: SkyCraftKnobTarget,
  state: SkyCraftState,
  patch: PatchSkyCraft,
  options: SkyCraftKnobOptions = {},
): SkyCraftKnobDef[] {
  const panoramaScaleLock = options.panoramaScaleLock ?? true;
  const { scene, layers } = state;

  switch (target) {
    case "milkyGroup": {
      const m = layers.milkyGroup;
      return [
        knob("milky-rotate", "Rotate", m.rotation[2], -3.14, 3.14, 0.01, (v) =>
          patchLayer(patch, "milkyGroup", {
            rotation: setVec3Axis(m.rotation, 2, v),
          }),
        ),
        knob("milky-posX", "Pos X", m.position[0], -12, 12, 0.05, (v) =>
          patchLayer(patch, "milkyGroup", {
            position: setVec3Axis(m.position, 0, v),
          }),
        ),
        knob("milky-posY", "Pos Y", m.position[1], -10, 10, 0.05, (v) =>
          patchLayer(patch, "milkyGroup", {
            position: setVec3Axis(m.position, 1, v),
          }),
        ),
        knob("milky-posZ", "Pos Z", m.position[2], -8, 8, 0.05, (v) =>
          patchLayer(patch, "milkyGroup", {
            position: setVec3Axis(m.position, 2, v),
          }),
        ),
      ];
    }

    case "scene":
      return [
        knob(
          "scene-parallax",
          "Parallax ×",
          scene.parallaxIntensity,
          0,
          2,
          0.01,
          (v) => patch({ scene: { parallaxIntensity: v } }),
        ),
        knob(
          "scene-ambient",
          "Ambient",
          scene.ambientIntensity,
          0,
          0.25,
          0.005,
          (v) => patch({ scene: { ambientIntensity: v } }),
        ),
        knob(
          "scene-loopBase",
          "Loop base",
          scene.baseLoopPeriod,
          18,
          120,
          1,
          (v) => patch({ scene: { baseLoopPeriod: v } }),
          KNOB_DESC.baseLoopPeriod,
        ),
        knob(
          "scene-idlePeriod",
          "Idle period",
          scene.idle.periodSec,
          24,
          120,
          1,
          (v) => patch({ scene: { idle: { periodSec: v } } }),
        ),
        knob(
          "scene-idleZoom",
          "Idle zoom",
          scene.idle.zoomAmp,
          0,
          1.2,
          0.01,
          (v) => patch({ scene: { idle: { zoomAmp: v } } }),
        ),
        knob(
          "scene-idleMove",
          "Idle move",
          scene.idle.moveAmp,
          0,
          0.35,
          0.005,
          (v) => patch({ scene: { idle: { moveAmp: v } } }),
        ),
        knob(
          "scene-idleDelay",
          "Idle delay",
          scene.idle.delaySec,
          0,
          12,
          0.25,
          (v) => patch({ scene: { idle: { delaySec: v } } }),
        ),
        knob(
          "scene-rareGapMin",
          "Rare gap min",
          scene.idle.rareGapMinSec,
          20,
          400,
          5,
          (v) => patch({ scene: { idle: { rareGapMinSec: v } } }),
        ),
        knob(
          "scene-rareGapMax",
          "Rare gap max",
          scene.idle.rareGapMaxSec,
          40,
          600,
          5,
          (v) => patch({ scene: { idle: { rareGapMaxSec: v } } }),
        ),
        knob(
          "scene-rareDur",
          "Rare dur",
          scene.idle.rareDurationSec,
          2,
          20,
          0.5,
          (v) => patch({ scene: { idle: { rareDurationSec: v } } }),
        ),
        knob(
          "scene-rareGas",
          "Pulse gas",
          scene.idle.rareGasPulse,
          0,
          0.4,
          0.01,
          (v) => patch({ scene: { idle: { rareGasPulse: v } } }),
        ),
        knob(
          "scene-rareBand",
          "Pulse band",
          scene.idle.rareBandPulse,
          0,
          0.5,
          0.01,
          (v) => patch({ scene: { idle: { rareBandPulse: v } } }),
        ),
        knob(
          "scene-rareDust",
          "Pulse dust",
          scene.idle.rareDustPulse,
          0,
          0.3,
          0.01,
          (v) => patch({ scene: { idle: { rareDustPulse: v } } }),
        ),
        knob(
          "scene-rareAurora",
          "Pulse aurora",
          scene.idle.rareAuroraPulse,
          0,
          1.2,
          0.01,
          (v) => patch({ scene: { idle: { rareAuroraPulse: v } } }),
        ),
        knob(
          "scene-rareLueur",
          "Pulse lueur",
          scene.idle.rareLueurPulse,
          0,
          0.8,
          0.01,
          (v) => patch({ scene: { idle: { rareLueurPulse: v } } }),
        ),
        knob(
          "scene-breathBoost",
          "Breath boost",
          scene.idle.breathBoost,
          0,
          1,
          0.01,
          (v) => patch({ scene: { idle: { breathBoost: v } } }),
        ),
        knob(
          "scene-fogBreath",
          "Fog breath",
          scene.idle.fogBreathAmp,
          0,
          2,
          0.05,
          (v) => patch({ scene: { idle: { fogBreathAmp: v } } }),
        ),
      ];

    case "fond":
      return [];

    case "fog":
      return [
        knob("fog-near", "Fog near", scene.fog.near, 4, 24, 0.25, (v) =>
          patch({ scene: { fog: { near: v } } }),
        ),
        knob("fog-far", "Fog far", scene.fog.far, 12, 48, 0.25, (v) =>
          patch({ scene: { fog: { far: v } } }),
        ),
      ];

    case "panorama": {
      const p = layers.panorama;
      return [
        knob("pano-opacity", "Opacity", p.opacity, 0, 1, 0.01, (v) =>
          patchLayer(patch, "panorama", { opacity: v }),
        ),
        knob(
          "pano-dim",
          "Dim",
          p.dim,
          0.35,
          1,
          0.01,
          (v) => patchLayer(patch, "panorama", { dim: v }),
          KNOB_DESC.panoramaDim,
        ),
        knob(
          "pano-voidScale",
          "Noir void",
          p.voidScale,
          0,
          160,
          1,
          (v) => patchLayer(patch, "panorama", { voidScale: v }),
          KNOB_DESC.panoramaVoidScale,
        ),
        knob("pano-blackSoft", "Bord soft", p.blackSoft, 0, 0.35, 0.01, (v) =>
          patchLayer(patch, "panorama", { blackSoft: v }),
        ),
        knob("pano-posX", "Pos X", p.position[0], -8, 8, 0.05, (v) =>
          patchLayer(patch, "panorama", {
            position: setVec3Axis(p.position, 0, v),
          }),
        ),
        knob("pano-posY", "Pos Y", p.position[1], -6, 6, 0.05, (v) =>
          patchLayer(patch, "panorama", {
            position: setVec3Axis(p.position, 1, v),
          }),
        ),
        knob("pano-posZ", "Pos Z", p.position[2], -18, -6, 0.1, (v) =>
          patchLayer(patch, "panorama", {
            position: setVec3Axis(p.position, 2, v),
          }),
        ),
        knob("pano-scaleW", "Scale W", p.scale[0], 20, 90, 0.5, (v) => {
          if (panoramaScaleLock) {
            const aspect = p.scale[0] / Math.max(p.scale[1], 0.001);
            const h = Math.min(45, Math.max(10, v / aspect));
            patchLayer(patch, "panorama", { scale: [v, h, 1] });
          } else {
            patchLayer(patch, "panorama", {
              scale: setVec3Axis(p.scale, 0, v),
            });
          }
        }),
        knob("pano-scaleH", "Scale H", p.scale[1], 10, 45, 0.5, (v) => {
          if (panoramaScaleLock) {
            const aspect = p.scale[0] / Math.max(p.scale[1], 0.001);
            const w = Math.min(90, Math.max(20, v * aspect));
            patchLayer(patch, "panorama", { scale: [w, v, 1] });
          } else {
            patchLayer(patch, "panorama", {
              scale: setVec3Axis(p.scale, 1, v),
            });
          }
        }),
        knob("pano-rotZ", "Rotate", p.rotation[2], -3.14, 3.14, 0.01, (v) =>
          patchLayer(patch, "panorama", {
            rotation: setVec3Axis(p.rotation, 2, v),
          }),
        ),
        knob("pano-flipV", "Flip V", p.flipV ? 1 : 0, 0, 1, 1, (v) =>
          patchLayer(patch, "panorama", { flipV: v >= 0.5 }),
        ),
        knob("pano-flipH", "Flip H", p.flipH ? 1 : 0, 0, 1, 1, (v) =>
          patchLayer(patch, "panorama", { flipH: v >= 0.5 }),
        ),
        knob(
          "pano-parallax",
          "Parallax",
          p.parallax.factor,
          -0.2,
          0.1,
          0.005,
          (v) => patchLayer(patch, "panorama", { parallax: { factor: v } }),
          KNOB_DESC.parallaxFactor,
        ),
        knob("pano-parallaxLerp", "Par. lerp", p.parallax.lerp, 0.005, 0.05, 0.001, (v) =>
          patchLayer(patch, "panorama", { parallax: { lerp: v } }),
        ),
        knob("pano-renderOrder", "Z-order", p.renderOrder, -6, 0, 1, (v) =>
          patchLayer(patch, "panorama", { renderOrder: v }),
        ),
      ];
    }

    case "gasFar":
      return gasKnobs(patch, "gasFar", layers.gasFar);
    case "gasRose":
      return gasKnobs(patch, "gasRose", layers.gasRose);
    case "gasMauve":
      return gasKnobs(patch, "gasMauve", layers.gasMauve);
    case "gasTeal":
      return gasKnobs(patch, "gasTeal", layers.gasTeal);

    case "ghostStars": {
      const g = layers.ghostStars;
      return [
        knob("ghost-opacity", "Opacity", g.opacity, 0, 1, 0.01, (v) =>
          patchLayer(patch, "ghostStars", { opacity: v }),
        ),
        knob("ghost-count", "Count", g.count, 0, 48, 1, (v) =>
          patchLayer(patch, "ghostStars", { count: Math.round(v) }),
        ),
        knob("ghost-size", "Size", g.sizeMul, 0.5, 6, 0.05, (v) =>
          patchLayer(patch, "ghostStars", { sizeMul: v }),
        ),
        knob("ghost-zSpread", "Depth spread", g.zSpread, 1, 12, 0.1, (v) =>
          patchLayer(patch, "ghostStars", { zSpread: v }),
        ),
        knob("ghost-zBias", "Depth bias", g.zBias, -14, -2, 0.1, (v) =>
          patchLayer(patch, "ghostStars", { zBias: v }),
        ),
        knob("ghost-renderOrder", "Z-order", g.renderOrder, -4, 4, 1, (v) =>
          patchLayer(patch, "ghostStars", { renderOrder: v }),
        ),
        knob(
          "ghost-parallax",
          "Parallax",
          g.parallax.factor,
          -0.35,
          0.1,
          0.005,
          (v) => patchLayer(patch, "ghostStars", { parallax: { factor: v } }),
          KNOB_DESC.parallaxFactor,
        ),
        knob("ghost-parallaxLerp", "Par. lerp", g.parallax.lerp, 0.005, 0.05, 0.001, (v) =>
          patchLayer(patch, "ghostStars", { parallax: { lerp: v } }),
        ),
      ];
    }

    case "cosmicDust": {
      const d = layers.cosmicDust;
      return [
        knob("dust-opacity", "Opacity", d.opacity, 0, 1, 0.01, (v) =>
          patchLayer(patch, "cosmicDust", { opacity: v }),
        ),
        knob(
          "dust-flowSpeed",
          "Flow speed",
          d.flowSpeed,
          0,
          0.08,
          0.001,
          (v) => patchLayer(patch, "cosmicDust", { flowSpeed: v }),
          KNOB_DESC.flowSpeed,
        ),
        knob(
          "dust-bandTight",
          "Band tight",
          d.bandTight,
          0.4,
          3.5,
          0.01,
          (v) => patchLayer(patch, "cosmicDust", { bandTight: v }),
          KNOB_DESC.bandTight,
        ),
        ...planeKnobs(patch, "cosmicDust", d, "dust"),
      ];
    }

    case "dustLanes": {
      const l = layers.dustLanes;
      return [
        knob("lanes-opacity", "Opacity", l.opacity, 0, 1, 0.01, (v) =>
          patchLayer(patch, "dustLanes", { opacity: v }),
        ),
        knob("lanes-contrast", "Contrast", l.contrast, 0, 1, 0.01, (v) =>
          patchLayer(patch, "dustLanes", { contrast: v }),
        ),
        knob(
          "lanes-flowSpeed",
          "Flow speed",
          l.flowSpeed,
          0,
          0.06,
          0.001,
          (v) => patchLayer(patch, "dustLanes", { flowSpeed: v }),
          KNOB_DESC.flowSpeed,
        ),
        knob(
          "lanes-bandTight",
          "Band tight",
          l.bandTight,
          0.4,
          3.5,
          0.01,
          (v) => patchLayer(patch, "dustLanes", { bandTight: v }),
          KNOB_DESC.bandTight,
        ),
        knob(
          "lanes-warpAmp",
          "Warp amp",
          l.warpAmp,
          0,
          1.5,
          0.01,
          (v) => patchLayer(patch, "dustLanes", { warpAmp: v }),
          KNOB_DESC.lanesWarpAmp,
        ),
        ...planeKnobs(patch, "dustLanes", l, "lanes"),
      ];
    }

    case "zodiacal": {
      const z = layers.zodiacal;
      return [
        knob("zodiac-opacity", "Opacity", z.opacity, 0, 1, 0.01, (v) =>
          patchLayer(patch, "zodiacal", { opacity: v }),
        ),
        knob("zodiac-idleBoost", "Idle boost", z.idleBoost, 0, 0.6, 0.01, (v) =>
          patchLayer(patch, "zodiacal", { idleBoost: v }),
        ),
        knob(
          "zodiac-coneTight",
          "Cone tight",
          z.coneTight,
          1,
          8,
          0.05,
          (v) => patchLayer(patch, "zodiacal", { coneTight: v }),
          KNOB_DESC.coneTight,
        ),
        knob(
          "zodiac-coreTight",
          "Core tight",
          z.coreTight,
          2,
          14,
          0.05,
          (v) => patchLayer(patch, "zodiacal", { coreTight: v }),
          KNOB_DESC.coreTight,
        ),
        knob(
          "zodiac-alphaCap",
          "Alpha cap",
          z.alphaCap,
          0.02,
          0.5,
          0.005,
          (v) => patchLayer(patch, "zodiacal", { alphaCap: v }),
          KNOB_DESC.alphaCap,
        ),
        ...planeKnobs(patch, "zodiacal", z, "zodiac"),
      ];
    }

    case "aurora": {
      const a = layers.aurora;
      return [
        knob("aurora-opacity", "Opacity", a.opacity, 0, 1, 0.01, (v) =>
          patchLayer(patch, "aurora", { opacity: v }),
        ),
        knob(
          "aurora-curtainSpeed",
          "Curtain speed",
          a.curtainSpeed,
          0,
          0.35,
          0.005,
          (v) => patchLayer(patch, "aurora", { curtainSpeed: v }),
          KNOB_DESC.curtainSpeed,
        ),
        knob(
          "aurora-alphaCap",
          "Alpha cap",
          a.alphaCap,
          0.02,
          0.6,
          0.005,
          (v) => patchLayer(patch, "aurora", { alphaCap: v }),
          KNOB_DESC.alphaCap,
        ),
        ...planeKnobs(patch, "aurora", a, "aurora"),
      ];
    }

    case "starsBand":
      return starFieldKnobs(patch, "starsBand", "band", true, state);
    case "starsField":
      return starFieldKnobs(patch, "starsField", "field", false, state);

    case "shootingStars": {
      const s = layers.shootingStars;
      return [
        knob(
          "shoot-parallax",
          "Parallax",
          s.parallax.factor,
          0,
          1.2,
          0.01,
          (v) => patchLayer(patch, "shootingStars", { parallax: { factor: v } }),
          KNOB_DESC.parallaxFactor,
        ),
        knob("shoot-parallaxLerp", "Par. lerp", s.parallax.lerp, 0.01, 0.15, 0.001, (v) =>
          patchLayer(patch, "shootingStars", { parallax: { lerp: v } }),
        ),
        knob("shoot-echoDelay", "Echo delay", s.echoDelaySec, 0, 1.2, 0.01, (v) =>
          patchLayer(patch, "shootingStars", { echoDelaySec: v }),
        ),
        knob("shoot-echoOpacity", "Echo α", s.echoOpacity, 0, 1, 0.01, (v) =>
          patchLayer(patch, "shootingStars", { echoOpacity: v }),
        ),
        knob(
          "shoot-spawnGapSmall",
          "Gap petites",
          s.spawnGapSmall,
          1,
          20,
          0.1,
          (v) => patchLayer(patch, "shootingStars", { spawnGapSmall: v }),
          KNOB_DESC.spawnGapSmall,
        ),
        knob(
          "shoot-spawnGapLarge",
          "Gap grosses",
          s.spawnGapLarge,
          8,
          120,
          1,
          (v) => patchLayer(patch, "shootingStars", { spawnGapLarge: v }),
          KNOB_DESC.spawnGapLarge,
        ),
        knob(
          "shoot-speedMul",
          "Speed ×",
          s.speedMul,
          0.25,
          2.5,
          0.05,
          (v) => patchLayer(patch, "shootingStars", { speedMul: v }),
          KNOB_DESC.speedMul,
        ),
        knob(
          "shoot-lengthMul",
          "Length ×",
          s.lengthMul,
          0.25,
          2.5,
          0.05,
          (v) => patchLayer(patch, "shootingStars", { lengthMul: v }),
          KNOB_DESC.lengthMul,
        ),
      ];
    }

    case "constellation": {
      const c = layers.constellation;
      return [
        knob(
          "const-parallax",
          "Parallax",
          c.parallax.factor,
          0,
          0.8,
          0.005,
          (v) => patchLayer(patch, "constellation", { parallax: { factor: v } }),
          KNOB_DESC.parallaxFactor,
        ),
        knob("const-parallaxLerp", "Par. lerp", c.parallax.lerp, 0.01, 0.1, 0.001, (v) =>
          patchLayer(patch, "constellation", { parallax: { lerp: v } }),
        ),
      ];
    }

    case "eclipse":
      return [];

    default:
      return [];
  }
}

export function buildSkyCraftColors(
  target: SkyCraftKnobTarget,
  state: SkyCraftState,
  patch: PatchSkyCraft,
): SkyCraftColorDef[] {
  const { scene, layers } = state;
  switch (target) {
    case "scene":
    case "milkyGroup":
    case "eclipse":
      return [];
    case "fond":
      return [
        colorKnob("fond-color", "Fond", scene.clearColor, (v) =>
          patch({ scene: { clearColor: v } }),
        ),
      ];
    case "fog":
      return [
        colorKnob("fog-color", "Fog", scene.fog.color, (v) =>
          patch({ scene: { fog: { color: v } } }),
        ),
      ];
    case "panorama":
      return [
        colorKnob("pano-void", "Void", layers.panorama.voidColor, (v) =>
          patchLayer(patch, "panorama", { voidColor: v, color: v }),
        ),
      ];
    case "gasFar":
      return gasColorKnobs(patch, "gasFar", layers.gasFar);
    case "gasRose":
      return gasColorKnobs(patch, "gasRose", layers.gasRose);
    case "gasMauve":
      return gasColorKnobs(patch, "gasMauve", layers.gasMauve);
    case "gasTeal":
      return gasColorKnobs(patch, "gasTeal", layers.gasTeal);
    case "ghostStars":
      return [
        colorKnob("ghost-tint", "Tint", layers.ghostStars.color ?? "#c8d4f0", (v) =>
          patchLayer(patch, "ghostStars", { color: v }),
        ),
      ];
    case "cosmicDust":
      return [
        colorKnob("dust-dust", "Dust", layers.cosmicDust.dust, (v) =>
          patchLayer(patch, "cosmicDust", { dust: v }),
        ),
        colorKnob("dust-tint", "Tint", layers.cosmicDust.color ?? "#3a4a5c", (v) =>
          patchLayer(patch, "cosmicDust", { color: v }),
        ),
      ];
    case "dustLanes":
      return [
        colorKnob("lanes-lane", "Lane", layers.dustLanes.color ?? "#120c0a", (v) =>
          patchLayer(patch, "dustLanes", { color: v }),
        ),
        colorKnob("lanes-deep", "Deep", layers.dustLanes.deep, (v) =>
          patchLayer(patch, "dustLanes", { deep: v }),
        ),
      ];
    case "zodiacal":
      return [
        colorKnob("zodiac-warm", "Warm", layers.zodiacal.color ?? "#1a1510", (v) =>
          patchLayer(patch, "zodiacal", { color: v }),
        ),
        colorKnob("zodiac-core", "Core", layers.zodiacal.core, (v) =>
          patchLayer(patch, "zodiacal", { core: v }),
        ),
      ];
    case "aurora":
      return [
        colorKnob("aurora-cool", "Cool", layers.aurora.color ?? "#0a2a28", (v) =>
          patchLayer(patch, "aurora", { color: v }),
        ),
        colorKnob("aurora-edge", "Edge", layers.aurora.edge, (v) =>
          patchLayer(patch, "aurora", { edge: v }),
        ),
      ];
    case "starsBand":
      return [
        colorKnob("band-tint", "Tint", layers.starsBand.color ?? "#c8d4f0", (v) =>
          patchLayer(patch, "starsBand", { color: v }),
        ),
      ];
    case "starsField":
      return [
        colorKnob("field-tint", "Tint", layers.starsField.color ?? "#c8d4f0", (v) =>
          patchLayer(patch, "starsField", { color: v }),
        ),
      ];
    case "shootingStars": {
      const s = layers.shootingStars;
      return [
        colorKnob("shoot-tip", "Tip", s.color ?? "#e8f0fa", (v) =>
          patchLayer(patch, "shootingStars", { color: v }),
        ),
        colorKnob("shoot-mid", "Mid", s.mid, (v) =>
          patchLayer(patch, "shootingStars", { mid: v }),
        ),
        colorKnob("shoot-tail", "Tail", s.tail, (v) =>
          patchLayer(patch, "shootingStars", { tail: v }),
        ),
      ];
    }
    default:
      return [];
  }
}

export function toggleSkyCraftRareTarget(
  state: SkyCraftState,
  patch: PatchSkyCraft,
  target: RareSkyTarget,
): void {
  const current = state.scene.idle.rareTargets;
  const has = current.includes(target);
  const next = has
    ? current.filter((t) => t !== target)
    : [...current, target];
  if (next.length === 0) return;
  patch({ scene: { idle: { rareTargets: next } } });
}

export function setSkyCraftRareEnabled(
  patch: PatchSkyCraft,
  enabled: boolean,
): void {
  patch({ scene: { idle: { rareEnabled: enabled } } });
}

export function setSkyCraftRareSpecialStreak(
  patch: PatchSkyCraft,
  enabled: boolean,
): void {
  patch({ scene: { idle: { rareSpecialStreak: enabled } } });
}
