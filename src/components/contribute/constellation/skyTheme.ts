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
export type RareSkyTarget =
  | "rose"
  | "mauve"
  | "teal"
  | "band"
  | "aurora"
  | "eclipse";

export type GasLayerTheme = {
  color: string;
  /** Accent chaud (rose seulement pour l’instant). */
  colorHot?: string;
  deep: string;
  opacity: TierOpacity;
  /** Multiplicateur sur `baseLoopPeriod`. */
  loopPeriodMul: number;
  warpAmp: number;
  breathAmp: number;
  densityCap: number;
  position: [number, number, number];
  /** Euler radians — craft Rot Z = `[2]`. */
  rotation: [number, number, number];
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
  /** Épaisseur bande (voie lactée) — plus bas = bande plus serrée. */
  bandThickness?: number;
  drift: number;
  breathSpeedA: number;
  breathSpeedB: number;
  breathAmp: number;
  sizeMul: number;
  alphaMul: number;
  repulsion: number;
  repelStrength: number;
  spikeAmt: number;
  coreRadius: number;
  /** Euler radians — craft Rot Z = `[2]` (groupe points). */
  rotation: [number, number, number];
  renderOrder: number;
  parallax: ParallaxKnobs;
};

export type DustLayerTheme = {
  dust: string;
  tint: string;
  opacity: TierOpacity;
  flowSpeed: number;
  bandTight: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  renderOrder: number;
  parallax: ParallaxKnobs;
};

/** Dark dust lanes — rivières sombres sur l’axe voie lactée (S1 profondeur). */
export type MilkyDustLanesTheme = {
  lane: string;
  deep: string;
  opacity: TierOpacity;
  /** 0 = lanes larges · 1 = filaments fins. */
  contrast: number;
  flowSpeed: number;
  bandTight: number;
  warpAmp: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  renderOrder: number;
  parallax: ParallaxKnobs;
};

export type ZodiacalTheme = {
  warm: string;
  core: string;
  opacity: TierOpacity;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  renderOrder: number;
  parallax: ParallaxKnobs;
  /** Boost opacité × breath idle. */
  idleBoost: number;
  coneTight: number;
  coreTight: number;
  alphaCap: number;
};

export type AuroraTheme = {
  cool: string;
  edge: string;
  /** Opacité dormante (quasi invisible hors rare). */
  opacity: TierOpacity;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  renderOrder: number;
  parallax: ParallaxKnobs;
  curtainSpeed: number;
  alphaCap: number;
};

/** Sky Eclipse — disque + corona (logo-ready). Intro réutilisera ce layer. */
export type EclipseTheme = {
  body: string;
  corona: string;
  rim: string;
  /** Opacité dormante (whisper) ; rare monte fort. */
  opacity: TierOpacity;
  coronaAmp: number;
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
  /** Echo fantôme après filante spéciale (retard s, opacité relative). */
  echoDelaySec: number;
  echoOpacity: number;
  /** Gap min petites (s) ; max = min + 6. */
  spawnGapSmall: number;
  /** Gap min grosses (s) ; max = min + 26. */
  spawnGapLarge: number;
  speedMul: number;
  lengthMul: number;
  parallax: ParallaxKnobs;
};

export type SceneTheme = {
  background: string;
  fogColor: string;
  /** Fog de repos (FocusCamera / zoom ajustent near/far en runtime). */
  fogNear: number;
  fogFar: number;
  ambientIntensity: number;
  /**
   * Rotation Z (rad) du **groupe milky** procédural uniquement :
   * poussière · zodiacal · dust lanes · bande étoiles.
   * Pas le panorama (orientation propre `skyPanorama.rotation` / flip).
   */
  milkyRotate: number;
  /** Décalage monde du groupe milky (pas le panorama). */
  milkyPosition: [number, number, number];
  /** Intro Éclipse immersif 1×/session. */
  intro: {
    enabled: boolean;
    /** Durée totale (s). */
    durationSec: number;
    /** Amplification corona pendant l’intro. */
    coronaAmp: number;
    /** Scale max du disc à l’ouverture (× scale theme). */
    openScale: number;
  };
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
    /** Amplitude pulse aurore quand rare = `aurora`. */
    rareAuroraPulse: number;
    /** Amplitude bloom éclipse quand rare = `eclipse`. */
    rareEclipsePulse: number;
    /** Fenêtre (s) entre moments rares pendant idle. */
    rareGapMinSec: number;
    rareGapMaxSec: number;
    /** Durée du pulse rare (s). */
    rareDurationSec: number;
    /** Déclenche une filante un cran plus belle avec le pulse. */
    rareSpecialStreak: boolean;
  };
};

export type SkyPanoramaTheme = {
  /** Chemin public (ex. `/craft/sky/milky-way-v1.jpg`). */
  texturePath: string;
  opacity: TierOpacity;
  position: [number, number, number];
  /** Taille du plan **photo** (W × H). */
  scale: [number, number, number];
  /** Rotation Euler (rad) — aligne la bande galactique. */
  rotation: [number, number, number];
  /** Assombrissement multiply (0–1). */
  dim: number;
  /**
   * Taille du plan **noir** derrière la photo (indépendant).
   * Grand = couvre le bleu scène `#02040a` sans rétrécir la photo.
   */
  voidScale: number;
  /** Couleur du void (défaut noir pur). */
  voidColor: string;
  /** Soft mix bords photo → void (optionnel, ne change pas la taille). */
  blackSoft: number;
  /** Miroir vertical (corrige photo à l’envers). */
  flipV: boolean;
  /** Miroir horizontal. */
  flipH: boolean;
  renderOrder: number;
  parallax: ParallaxKnobs;
};

export type GhostStarsTheme = {
  tint: string;
  count: number;
  opacity: TierOpacity;
  sizeMul: number;
  /** zSpread / zBias — plus loin = plus soft. */
  zSpread: number;
  zBias: number;
  renderOrder: number;
  parallax: ParallaxKnobs;
};

export type FondTheme = {
  /** Couleur du vide / clear (layer Fond). */
  color: string;
};

/**
 * Thème ciel — knobs par layer.
 * Shape stable pour presets / API / designer plus tard.
 */
export type SkyTheme = {
  id: string;
  baseLoopPeriod: number;
  scene: SceneTheme;
  fond: FondTheme;
  skyPanorama: SkyPanoramaTheme;
  gasFar: GasLayerTheme;
  gasRose: GasLayerTheme;
  gasMauve: GasLayerTheme;
  gasTeal: GasLayerTheme;
  cosmicDust: DustLayerTheme;
  milkyDustLanes: MilkyDustLanesTheme;
  zodiacal: ZodiacalTheme;
  aurora: AuroraTheme;
  eclipse: EclipseTheme;
  ghostStars: GhostStarsTheme;
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
    background: "#000000",
    fogColor: "#000000",
    fogNear: 12,
    fogFar: 28,
    ambientIntensity: 0.05,
    milkyRotate: 0,
    milkyPosition: [0, 0, 0],
    intro: {
      enabled: false,
      durationSec: 3.2,
      coronaAmp: 1.25,
      openScale: 1.65,
    },
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
      rareTargets: ["rose", "mauve", "teal", "band", "aurora"],
      rareGasPulse: 0.14,
      rareBandPulse: 0.22,
      rareDustPulse: 0.1,
      rareLueurPulse: 0.38,
      rareAuroraPulse: 0.7,
      rareEclipsePulse: 0.92,
      rareGapMinSec: 140,
      rareGapMaxSec: 260,
      rareDurationSec: 9,
      rareSpecialStreak: true,
    },
  },
  fond: {
    color: "#000000",
  },
  skyPanorama: {
    texturePath: "/craft/sky/milky-way-v1.jpg",
    opacity: { desktop: 0.75, mobile: 0, reduced: 0 },
    position: [0, 0.15, -13.5],
    scale: [34, 17, 1],
    /** Orientation neutre — Rotate / Flip dans le lab. */
    rotation: [0, 0, 0],
    dim: 0.55,
    /** Assez grand pour couvrir le FOV desktop hors photo. */
    voidScale: 90,
    voidColor: "#000000",
    blackSoft: 0,
    flipV: false,
    flipH: false,
    renderOrder: -4,
    parallax: { factor: -0.04, lerp: 0.01 },
  },
  gasFar: {
    color: "#1a1520",
    deep: "#05060c",
    opacity: { desktop: 0.22, mobile: 0.16, reduced: 0 },
    loopPeriodMul: 1.8,
    warpAmp: 4.5,
    breathAmp: 0,
    densityCap: 0.32,
    position: [0.4, -0.2, -11.5],
    rotation: [0, 0, 0],
    scale: [38, 22, 1],
    renderOrder: -3,
    parallax: { factor: -0.16, lerp: 0.01 },
  },
  gasRose: {
    color: "#c2186e",
    colorHot: "#ff3d9a",
    deep: "#1a0514",
    opacity: { desktop: 0.4, mobile: 0.34, reduced: 0.26 },
    loopPeriodMul: 1.35,
    warpAmp: 3.2,
    breathAmp: 0.18,
    densityCap: 0.44,
    position: [1.2, 0.1, -8.4],
    rotation: [0, 0, 0],
    scale: [32, 18, 1],
    renderOrder: -1,
    parallax: { factor: -0.12, lerp: 0.014 },
  },
  gasMauve: {
    color: "#9a6fad",
    deep: "#1a1024",
    opacity: { desktop: 0.5, mobile: 0.4, reduced: 0.3 },
    loopPeriodMul: 1.15,
    warpAmp: 3.0,
    breathAmp: 0.2,
    densityCap: 0.52,
    position: [0, 0.15, -7.2],
    rotation: [0, 0, 0],
    scale: [30, 17, 1],
    renderOrder: 0,
    parallax: { factor: -0.09, lerp: 0.016 },
  },
  gasTeal: {
    color: "#3d9a94",
    deep: "#0f1a22",
    opacity: { desktop: 0.44, mobile: 0.36, reduced: 0.26 },
    loopPeriodMul: 1,
    warpAmp: 2.8,
    breathAmp: 0.22,
    densityCap: 0.5,
    position: [0, 0, -5.5],
    rotation: [0, 0, 0],
    scale: [28, 16, 1],
    renderOrder: 1,
    parallax: { factor: -0.04, lerp: 0.022 },
  },
  cosmicDust: {
    dust: "#1c1828",
    tint: "#3a4a5c",
    opacity: { desktop: 0.18, mobile: 0.14, reduced: 0.1 },
    flowSpeed: 0.018,
    bandTight: 1.55,
    position: [0, 0, -5.2],
    rotation: [0, 0, 0],
    scale: [30, 17, 1],
    renderOrder: 1,
    parallax: { factor: 0.16, lerp: 0.026 },
  },
  milkyDustLanes: {
    lane: "#120c0a",
    deep: "#030204",
    opacity: { desktop: 0.52, mobile: 0.38, reduced: 0 },
    contrast: 0.62,
    flowSpeed: 0.012,
    bandTight: 1.45,
    warpAmp: 0.55,
    position: [0, 0, -4.65],
    rotation: [0, 0, 0],
    scale: [32, 18, 1],
    renderOrder: 2,
    parallax: { factor: 0.14, lerp: 0.018 },
  },
  zodiacal: {
    warm: "#1a1510",
    core: "#6a5640",
    opacity: { desktop: 0.085, mobile: 0.06, reduced: 0 },
    position: [0, 0, -4.8],
    rotation: [0, 0, 0],
    scale: [30, 15, 1],
    renderOrder: 0,
    parallax: { factor: 0.1, lerp: 0.02 },
    idleBoost: 0.22,
    coneTight: 3.6,
    coreTight: 6.5,
    alphaCap: 0.18,
  },
  aurora: {
    cool: "#0a2a28",
    edge: "#3d8a7a",
    opacity: { desktop: 0.02, mobile: 0.012, reduced: 0 },
    position: [-1.2, 0.4, -6.5],
    rotation: [0, 0, 0],
    scale: [26, 18, 1],
    renderOrder: 0,
    parallax: { factor: -0.07, lerp: 0.018 },
    curtainSpeed: 0.08,
    alphaCap: 0.22,
  },
  eclipse: {
    body: "#05060a",
    corona: "#c8d0dc",
    rim: "#e8eef6",
    /** 0 = invisible hors rare (un rim même à 0.01 lit comme un « rond »). */
    opacity: { desktop: 0, mobile: 0, reduced: 0 },
    coronaAmp: 1,
    position: [0.55, 0.35, -5.2],
    scale: [7.5, 7.5, 1],
    renderOrder: 2,
    parallax: { factor: 0.12, lerp: 0.022 },
  },
  ghostStars: {
    tint: "#c8d4f0",
    count: 22,
    opacity: { desktop: 0.14, mobile: 0, reduced: 0 },
    sizeMul: 2.8,
    zSpread: 4,
    zBias: -8.5,
    renderOrder: -2,
    parallax: { factor: -0.2, lerp: 0.012 },
  },
  starsBand: {
    /** Aligné cool hardcodé shader `(0.82, 0.88, 1)` — uTint branché Vague 1. */
    tint: "#d1e0ff",
    zSpread: 9,
    zBias: -4.5,
    scaleMin: 0.22,
    scaleRange: 1.12,
    brightMin: 0.42,
    brightRange: 0.58,
    bandThickness: 0.86,
    drift: 0.028,
    breathSpeedA: 0.42,
    breathSpeedB: 0.26,
    breathAmp: 0.1,
    sizeMul: 1.12,
    alphaMul: 1.18,
    repulsion: 0.9,
    repelStrength: 0.05,
    spikeAmt: 0.55,
    coreRadius: 0.12,
    rotation: [0, 0, 0],
    renderOrder: 1,
    parallax: { factor: 0.22, lerp: 0.032 },
  },
  starsField: {
    tint: "#d1e0ff",
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
    spikeAmt: 0.55,
    coreRadius: 0.12,
    rotation: [0, 0, 0],
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
      aurora: { tip: "#d8fff4", mid: "#4a9a88", tail: "#0e2420" },
      eclipse: { tip: "#f0f4fa", mid: "#a8b4c4", tail: "#1a1e28" },
    },
    echoDelaySec: 0.4,
    echoOpacity: 0.35,
    spawnGapSmall: 4.5,
    spawnGapLarge: 36,
    speedMul: 1,
    lengthMul: 1,
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
