/**
 * Craft — Look = pose soleil. Play = lecture cinéma (autre page).
 *
 * Look : scrub = position soleil (0 droite → 1 derrière).
 * Play (phase 1) : naissance grandeur → dolly vers diamond → menace.
 */

export const CRAFT_CHRONO_DURATION = 2.4;
/**
 * Phase 1 cinéma (~10.2 s) — 3 actes :
 * naissance à grandeur (caméra fixe) → dolly vers diamond → menace.
 * Flash / wrap / ciel = phases suivantes (pas encore).
 */
export const CRAFT_PLAY_DURATION = 10.2;

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
  /** 0→1 push caméra cinéma (révélation). */
  cameraPush: number;
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

/** Dolly cinéma : long, pads doux — pas de rush mid. */
function cinemaDolly(a: number, b: number, x: number) {
  return smootherstep(a, b, x);
}

const BASE: CraftChronoState = {
  alignment: 0,
  coronaMul: 1,
  diamondMul: 0,
  irregularMul: 1,
  sunScale: 0.97,
  lifeMul: 1,
  cameraPush: 0,
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
 * Phase 1 — 3 actes (~10.2 s). Géométrie fixe : alignment = 1.
 *
 * Acte 1 — naissance à GRANDEUR, caméra LOCK
 *   T0–0.45    noir court
 *   T0.35–2.75 diamond (déjà monumental)
 *   T2.15–3.55 soleil
 *   T2.45–4.15 irrégularité
 *   T4.15–4.95 hold objet sacré
 *
 * Acte 2 — dolly vers le DIAMOND (déborde le cadre)
 *   T4.85–9.1  push caméra
 *
 * Acte 3 — menace (seuil avant flash)
 *   T8.4–10.2  diamond + bloom liés à la proximité
 */
export function sampleCraftPlayChrono(t: number): CraftChronoState {
  const time = Math.max(0, Math.min(t, CRAFT_PLAY_DURATION));

  const alignment = 1;

  // Acte 1 — matière à grandeur (caméra fixe)
  const diamondIn = softRiseVelvet(0.35, 2.75, time, 1.05);
  const bodyFade = softRiseVelvet(0.45, 2.95, time, 1.1);
  const lifeMul = softRiseVelvet(0.4, 2.85, time, 1.0);

  const sunIn = softRiseVelvet(2.15, 3.55, time, 0.78);
  const irregIn = softRiseVelvet(2.45, 4.15, time, 1.05);

  // Acte 2 — caméra après hold
  const cameraPush = cinemaDolly(4.85, 9.1, time);

  // Acte 3 — menace : on vise le diamond
  const threat = cameraPush * cameraPush;
  const diamondMul = LOGO_DIAMOND * diamondIn * (1 + 0.62 * threat);
  const coronaMul = sunIn;
  const sunScale = SUN_START + (LOGO_SUN - SUN_START) * sunIn;
  const irregularMul = Math.pow(irregIn, 0.82);
  const bloom = 0.2 * diamondIn + 0.16 * sunIn + 0.85 * threat;

  return {
    ...BASE,
    alignment,
    coronaMul,
    diamondMul,
    irregularMul,
    sunScale,
    lifeMul,
    cameraPush,
    bodyFade,
    skyMul: 0,
    bloom,
    wash: 0,
    progress: 0,
  };
}
