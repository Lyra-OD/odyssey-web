"use client";

import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import type { VisualTier } from "./useVisualTier";

/** Opacité par tier device (desktop = défaut craft). */
export type TierOpacity = {
  desktop: number;
  mobile: number;
  reduced: number;
};

export type ParallaxKnobs = {
  factor: number;
  lerp: number;
};

/** Cible d’un moment rare idle (pulse sur ce layer). */
export type RareSkyTarget = "rose" | "mauve" | "teal" | "band";

export type GasLayerTheme = {
  color: string;
  /** Accent chaud (rose seulement pour l’instant). */
  colorHot?: string;
  deep: string;
  opacity: TierOpacity;
  /** Multiplicateur sur `baseLoopPeriod`. */
  loopPeriodMul: number;
  position: [number, number, number];
  scale: [number, number, number];
  renderOrder: number;
  parallax: ParallaxKnobs;
};

export type StarFieldTheme = {
  tint: string;
  zSpread: number;
  zBias: number;
  scaleMin: number;
  scaleRange: number;
  brightMin: number;
  brightRange: number;
  drift: number;
  breathSpeedA: number;
  breathSpeedB: number;
  breathAmp: number;
  sizeMul: number;
  alphaMul: number;
  repulsion: number;
  repelStrength: number;
  renderOrder: number;
  parallax: ParallaxKnobs;
};

export type DustLayerTheme = {
  dust: string;
  tint: string;
  opacity: TierOpacity;
  position: [number, number, number];
  scale: [number, number, number];
  renderOrder: number;
  parallax: ParallaxKnobs;
};

export type ShootingStarsTheme = {
  tip: string;
  mid: string;
  tail: string;
  /** Teintes filante spéciale selon cible rare. */
  rareTints: Record<RareSkyTarget, { tip: string; mid: string; tail: string }>;
  parallax: ParallaxKnobs;
};

export type SceneTheme = {
  background: string;
  fogColor: string;
  /** Fog de repos (FocusCamera / zoom ajustent near/far en runtime). */
  fogNear: number;
  fogFar: number;
  ambientIntensity: number;
  /** Dérive caméra quand on ne touche à rien. */
  idle: {
    enabled: boolean;
    /** Secondes sans interaction avant dérive. */
    delaySec: number;
    /** Période principale (s) — plus long = plus contemplatif. */
    periodSec: number;
    /** Amplitude zoom (unités monde, autour du zoom user). */
    zoomAmp: number;
    /** Amplitude déplacement XY caméra. */
    moveAmp: number;
    /** Amplitude look-at (légère dérive du regard). */
    lookAmp: number;
    /** Boost dérive parallaxe des layers pendant idle (0 = off). */
    breathBoost: number;
    /**
     * Micro-dérive fog pendant idle (unités near/far).
     * Le vide s’ouvre / se resserre avec la respiration caméra.
     */
    fogBreathAmp: number;
    /** Moments rares (pulse layer + filante). */
    rareEnabled: boolean;
    /** Pool de cibles — une choisie au hasard (sans répéter d’affilée). */
    rareTargets: RareSkyTarget[];
    /** Amplitude pulse opacité gaz (rose/mauve/teal). */
    rareGasPulse: number;
    /** Amplitude pulse alpha voie lactée (cible `band`). */
    rareBandPulse: number;
    /** Pulse voile poussière quand rare = gaz (plus faible que le gaz). */
    rareDustPulse: number;
    /** Pulse Lueur hero quand rare = `band`. */
    rareLueurPulse: number;
    /** Fenêtre (s) entre moments rares pendant idle. */
    rareGapMinSec: number;
    rareGapMaxSec: number;
    /** Durée du pulse rare (s). */
    rareDurationSec: number;
    /** Déclenche une filante un cran plus belle avec le pulse. */
    rareSpecialStreak: boolean;
  };
};

/**
 * Thème ciel — knobs par layer.
 * Shape stable pour presets / API / designer plus tard.
 */
export type SkyTheme = {
  id: string;
  baseLoopPeriod: number;
  scene: SceneTheme;
  gasRose: GasLayerTheme;
  gasMauve: GasLayerTheme;
  gasTeal: GasLayerTheme;
  cosmicDust: DustLayerTheme;
  starsBand: StarFieldTheme;
  starsField: StarFieldTheme;
  shootingStars: ShootingStarsTheme;
  constellation: { parallax: ParallaxKnobs };
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

/** Look craft actuel (août 2026) — source de vérité des knobs. */
export const defaultSkyTheme: SkyTheme = {
  id: "default",
  baseLoopPeriod: 38,
  scene: {
    background: "#02040a",
    fogColor: "#03050c",
    fogNear: 12,
    fogFar: 28,
    ambientIntensity: 0.05,
    idle: {
      enabled: true,
      delaySec: 3.5,
      periodSec: 72,
      zoomAmp: 0.55,
      moveAmp: 0.16,
      lookAmp: 0.1,
      breathBoost: 0.45,
      fogBreathAmp: 1.1,
      rareEnabled: true,
      rareTargets: ["rose", "mauve", "teal", "band"],
      rareGasPulse: 0.14,
      rareBandPulse: 0.22,
      rareDustPulse: 0.1,
      rareLueurPulse: 0.38,
      rareGapMinSec: 140,
      rareGapMaxSec: 260,
      rareDurationSec: 9,
      rareSpecialStreak: true,
    },
  },
  gasRose: {
    color: "#c2186e",
    colorHot: "#ff3d9a",
    deep: "#1a0514",
    opacity: { desktop: 0.4, mobile: 0.34, reduced: 0.26 },
    loopPeriodMul: 1.35,
    position: [1.2, 0.1, -8.4],
    scale: [32, 18, 1],
    renderOrder: -1,
    parallax: { factor: -0.12, lerp: 0.014 },
  },
  gasMauve: {
    color: "#9a6fad",
    deep: "#1a1024",
    opacity: { desktop: 0.5, mobile: 0.4, reduced: 0.3 },
    loopPeriodMul: 1.15,
    position: [0, 0.15, -7.2],
    scale: [30, 17, 1],
    renderOrder: 0,
    parallax: { factor: -0.09, lerp: 0.016 },
  },
  gasTeal: {
    color: "#3d9a94",
    deep: "#0f1a22",
    opacity: { desktop: 0.44, mobile: 0.36, reduced: 0.26 },
    loopPeriodMul: 1,
    position: [0, 0, -5.5],
    scale: [28, 16, 1],
    renderOrder: 1,
    parallax: { factor: -0.04, lerp: 0.022 },
  },
  cosmicDust: {
    dust: "#1c1828",
    tint: "#3a4a5c",
    opacity: { desktop: 0.18, mobile: 0.14, reduced: 0.1 },
    position: [0, 0, -5.2],
    scale: [30, 17, 1],
    renderOrder: 1,
    parallax: { factor: 0.16, lerp: 0.026 },
  },
  starsBand: {
    tint: "#c8d4f0",
    zSpread: 9,
    zBias: -4.5,
    scaleMin: 0.28,
    scaleRange: 1.0,
    brightMin: 0.5,
    brightRange: 0.5,
    drift: 0.028,
    breathSpeedA: 0.42,
    breathSpeedB: 0.26,
    breathAmp: 0.1,
    sizeMul: 1.12,
    alphaMul: 1.18,
    repulsion: 0.9,
    repelStrength: 0.05,
    renderOrder: 1,
    parallax: { factor: 0.22, lerp: 0.032 },
  },
  starsField: {
    tint: "#c8d4f0",
    zSpread: 3.2,
    zBias: 1.2,
    scaleMin: 0.55,
    scaleRange: 1.45,
    brightMin: 0.62,
    brightRange: 0.38,
    drift: 0.06,
    breathSpeedA: 1.05,
    breathSpeedB: 0.62,
    breathAmp: 0.14,
    sizeMul: 1.2,
    alphaMul: 1.08,
    repulsion: 1.5,
    repelStrength: 0.22,
    renderOrder: 3,
    parallax: { factor: 0.65, lerp: 0.055 },
  },
  shootingStars: {
    tip: "#e8f0fa",
    mid: "#9aacc0",
    tail: "#2e3848",
    rareTints: {
      rose: { tip: "#ffd4e6", mid: "#c4789a", tail: "#3a1828" },
      mauve: { tip: "#edd8fa", mid: "#9a78b8", tail: "#241830" },
      teal: { tip: "#d4f5f0", mid: "#5a9a94", tail: "#142428" },
      band: { tip: "#e8f0fa", mid: "#9aacc0", tail: "#2e3848" },
    },
    parallax: { factor: 0.85, lerp: 0.07 },
  },
  constellation: {
    parallax: { factor: 0.4, lerp: 0.04 },
  },
};

export function opacityForTier(op: TierOpacity, tier: VisualTier): number {
  if (tier === "reduced") return op.reduced;
  if (tier === "mobile") return op.mobile;
  return op.desktop;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Merge profond — partial API / preset par-dessus un base. */
export function mergeSkyTheme(
  base: SkyTheme,
  partial?: DeepPartial<SkyTheme>,
): SkyTheme {
  if (!partial) return base;
  return deepMerge(base, partial) as SkyTheme;
}

function deepMerge(
  base: Record<string, unknown>,
  partial: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(partial)) {
    const pv = partial[key];
    const bv = base[key];
    if (pv === undefined) continue;
    if (isPlainObject(pv) && isPlainObject(bv)) {
      out[key] = deepMerge(bv, pv);
    } else {
      out[key] = pv;
    }
  }
  return out;
}

const SkyThemeContext = createContext<SkyTheme>(defaultSkyTheme);

type SkyThemeProviderProps = {
  /** Thème résolu (déjà merge si besoin). Défaut = craft actuel. */
  theme?: SkyTheme;
  children: ReactNode;
};

export function SkyThemeProvider({
  theme = defaultSkyTheme,
  children,
}: SkyThemeProviderProps) {
  const value = useMemo(() => theme, [theme]);
  return createElement(SkyThemeContext.Provider, { value }, children);
}

export function useSkyTheme(): SkyTheme {
  return useContext(SkyThemeContext);
}
