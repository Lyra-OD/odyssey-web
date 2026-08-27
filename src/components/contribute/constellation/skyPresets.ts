import { SKY_LAB_HYBRID_GAS_OPACITY } from "./skyCraftLayers";
import { SKY_CRAFT_STATE_VERSION, type SkyCraftState } from "./skyCraftState";
import { defaultSkyCraftState } from "./skyCraftStateAdapter";
import { mergeSkyCraftState } from "./skyCraftStore";
import type { DeepPartial } from "./skyTheme";

/** Slots nommés lab — snapshots `SkyCraftState` (pas de rendu 3D). */
export type SkyNamedPresetId = "default" | "demo-vp" | "nuit-douce";

export type SkyNamedPreset = {
  id: SkyNamedPresetId;
  labelFr: string;
  labelEn: string;
  state: SkyCraftState;
};

function clonePreset(
  id: string,
  patch?: DeepPartial<SkyCraftState>,
): SkyCraftState {
  return mergeSkyCraftState(structuredClone(defaultSkyCraftState), {
    ...patch,
    id,
    v: SKY_CRAFT_STATE_VERSION,
  });
}

/**
 * Trois univers de base (dupliqués depuis `defaultSkyCraftState` + tweaks légers).
 * KEEP futur → remplacer les patches par de vrais looks craft.
 */
export const SKY_NAMED_PRESETS: readonly SkyNamedPreset[] = [
  {
    id: "default",
    labelFr: "Défaut",
    labelEn: "Default",
    state: clonePreset("default"),
  },
  {
    id: "demo-vp",
    labelFr: "Démo VP",
    labelEn: "VP demo",
    state: clonePreset("demo-vp", {
      scene: {
        clearColor: "#000000",
        fog: { color: "#000000" },
        parallaxIntensity: 0.85,
      },
      layers: {
        panorama: {
          isVisible: true,
          voidColor: "#000000",
          voidScale: 90,
          blackSoft: 0,
          opacity: 0.72,
          dim: 0.5,
        },
        gasFar: { opacity: SKY_LAB_HYBRID_GAS_OPACITY.gasFar },
        gasRose: { opacity: SKY_LAB_HYBRID_GAS_OPACITY.gasRose },
        gasMauve: { opacity: SKY_LAB_HYBRID_GAS_OPACITY.gasMauve },
        gasTeal: { opacity: SKY_LAB_HYBRID_GAS_OPACITY.gasTeal },
      },
    }),
  },
  {
    id: "nuit-douce",
    labelFr: "Nuit douce",
    labelEn: "Soft night",
    state: clonePreset("nuit-douce", {
      scene: {
        clearColor: "#02040a",
        fog: { color: "#03050c", near: 14, far: 32 },
        ambientIntensity: 0.035,
        parallaxIntensity: 0.7,
        idle: {
          zoomAmp: 0.35,
          moveAmp: 0.1,
          breathBoost: 0.28,
        },
      },
      layers: {
        panorama: { isVisible: false },
        gasFar: { opacity: 0.14 },
        gasRose: { opacity: 0.22 },
        gasMauve: { opacity: 0.28 },
        gasTeal: { opacity: 0.24 },
        cosmicDust: { opacity: 0.12 },
        dustLanes: { opacity: 0.38 },
        zodiacal: { opacity: 0.05 },
        aurora: { opacity: 0.01 },
        starsBand: { opacity: 0.9 },
        starsField: { opacity: 0.85 },
      },
    }),
  },
] as const;

export function getSkyNamedPreset(id: SkyNamedPresetId): SkyNamedPreset {
  const found = SKY_NAMED_PRESETS.find((p) => p.id === id);
  if (!found) return SKY_NAMED_PRESETS[0];
  return found;
}

export function cloneSkyCraftState(state: SkyCraftState): SkyCraftState {
  return structuredClone(state);
}
