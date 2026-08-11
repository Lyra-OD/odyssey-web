/**
 * Craft — Look = pose soleil. Play = lecture cinéma (autre page).
 *
 * Look : scrub = position soleil (0 droite → 1 derrière).
 * Play (phase 1) : noir → diamond → soleil + irrégularité → pose logo.
 */

export const CRAFT_CHRONO_DURATION = 2.4;
/**
 * Naissance du logo — fluide, organique.
 * Flash / wrap / ciel = phases suivantes (pas encore).
 */
export const CRAFT_PLAY_DURATION = 5.8;

export type CraftChronoState = {
  /** 0 = soleil à droite, 1 = totalité (soleil derrière). */
  alignment: number;
  coronaMul: number;
  diamondMul: number;
  /** 0 = pas d’irrég, 1 = recette logo. */
  irregularMul: number;
  /** Scale soleil (animé vers la recette). */
  sunScale: number;
  /** Vie shader — monte avec la matière (évite scintillement au noir). */
  lifeMul: number;
  bodyFade: number;
  skyMul: number;
  bloom: number;
  wash: number;
  progress: number;
  offsetX: number;
  offsetY: number;
};

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

function smoothstep(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Perlin smootherstep — dérivée nulle aux bornes. */
function smootherstep(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Apparition organique : soft au début, puis approche expo.
 * `tau` plus grand = plus feutré.
 */
function softRise(a: number, b: number, x: number, tau = 0.42) {
  const u = smootherstep(a, b, x);
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const exp = 1 - Math.exp(-u / tau);
  const denom = 1 - Math.exp(-1 / tau);
  const expN = denom > 0 ? exp / denom : u;
  return u * 0.35 + expN * 0.65;
}

/** Encore plus feutré — double S-curve sur [0,1] + expo. */
function softRiseVelvet(a: number, b: number, x: number, tau = 0.72) {
  const u0 = smootherstep(a, b, x);
  const u = smootherstep(0, 1, u0);
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const exp = 1 - Math.exp(-u / tau);
  const denom = 1 - Math.exp(-1 / tau);
  const expN = denom > 0 ? exp / denom : u;
  return u * 0.12 + expN * 0.88;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const BASE: CraftChronoState = {
  alignment: 0,
  coronaMul: 1,
  diamondMul: 0,
  irregularMul: 1,
  sunScale: 0.97,
  lifeMul: 1,
  bodyFade: 1,
  skyMul: 0,
  bloom: 0,
  wash: 0,
  progress: 0,
  offsetX: 0,
  offsetY: 0,
};

export const CRAFT_CHRONO_IDLE: CraftChronoState = { ...BASE };
export const CRAFT_CHRONO_SILENCE: CraftChronoState = { ...BASE };

/** Pose manuelle : scrub Look = position soleil. Aucune fin auto. */
export function poseFromSunPosition(alignment: number): CraftChronoState {
  const a = clamp01(alignment);
  return {
    ...BASE,
    alignment: a,
    coronaMul: 1 + 0.2 * smoothstep(0.75, 1, a),
    bloom: 0.06 * smoothstep(0.85, 1, a),
  };
}

/** Lab « Lecture approche » : soleil se gare, stop. */
export function sampleCraftChrono(t: number): CraftChronoState {
  const time = Math.max(0, Math.min(t, CRAFT_CHRONO_DURATION));
  const alignment = easeInOutCubic(smoothstep(0.08, 2.25, time));
  return poseFromSunPosition(alignment);
}

/** Recette logo — cibles fin de phase 1 (miroirs `eclipseLogoRecipe`). */
const LOGO_DIAMOND = 2.6;
const LOGO_SUN = 0.97;
const SUN_START = 0.78;

/**
 * Phase 1 — naissance du logo (~5.8 s).
 *
 * Géométrie fixe : alignment = 1.
 *
 * T0–0.55     noir
 * T0.4–2.85   diamond seul — révélation lente
 * T2.55–4.0   soleil (après la révélation)
 * T2.85–5.0   irrégularité (juste après le soleil)
 * T5.0–5.8    hold logo vivant
 */
export function sampleCraftPlayChrono(t: number): CraftChronoState {
  const time = Math.max(0, Math.min(t, CRAFT_PLAY_DURATION));

  const alignment = 1;

  // Début : révélation diamond plus longue / plus lente
  const diamondIn = softRiseVelvet(0.4, 2.85, time, 1.15);
  const bodyFade = softRiseVelvet(0.55, 3.1, time, 1.2);
  const lifeMul = softRiseVelvet(0.5, 2.95, time, 1.1);

  // Soleil + irrég décalés — on sent d’abord le diamond, ensuite la suite
  const sunIn = softRiseVelvet(2.55, 4.0, time, 0.78);
  const irregIn = softRiseVelvet(2.85, 5.0, time, 1.15);

  const diamondMul = LOGO_DIAMOND * diamondIn;
  const coronaMul = sunIn;
  const sunScale = SUN_START + (LOGO_SUN - SUN_START) * sunIn;
  const irregularMul = Math.pow(irregIn, 0.82);
  const bloom = 0.28 * diamondIn + 0.2 * sunIn;

  return {
    ...BASE,
    alignment,
    coronaMul,
    diamondMul,
    irregularMul,
    sunScale,
    lifeMul,
    bodyFade,
    skyMul: 0,
    bloom,
    wash: 0,
    progress: 0,
  };
}
