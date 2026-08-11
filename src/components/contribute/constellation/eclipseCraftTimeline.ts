/**
 * Craft — Look = pose soleil. Play = lecture cinéma (autre page).
 *
 * Look : scrub = position soleil (0 droite → 1 derrière).
 * Play (phase 1) : naissance grandeur → dolly vers diamond → menace.
 */

export const CRAFT_CHRONO_DURATION = 2.4;
/**
 * Phase 1 cinéma (~16.9 s) — actes :
 * naissance → ODYSSEY (breath) → hold court → dolly + extinction longue → menace.
 * Flash / wrap / ciel = phases suivantes (pas encore).
 */
export const CRAFT_PLAY_DURATION = 16.9;

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
  /** 0→1 push caméra (Z / FOV) — courbe gravité. */
  cameraPush: number;
  /** 0→1 aim vers diamond — sync avec cameraPush (geste unique). */
  cameraAim: number;
  /** 0→1 wordmark ODYSSEY (acte 1b — solar etch). */
  wordmarkMul: number;
  /** 0→1 flash solaire du etch (pic puis settle). */
  wordmarkSolar: number;
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

/** Aspiration continue : toujours un micro-mouvement, légère gravité (pas de plateau). */
function gravityDolly(a: number, b: number, x: number) {
  const u = clamp01((x - a) / (b - a));
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  // 50 % linéaire (lisible dès le début) + 50 % ease-in doux (tiré en fin)
  return u * 0.5 + Math.pow(u, 1.5) * 0.5;
}

const BASE: CraftChronoState = {
  alignment: 0,
  coronaMul: 1,
  diamondMul: 0,
  irregularMul: 1,
  sunScale: 0.97,
  lifeMul: 1,
  cameraPush: 0,
  cameraAim: 0,
  wordmarkMul: 0,
  wordmarkSolar: 0,
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

/** Dolly / hold branding (hold un poil plus court qu’avant 7.8). */
const DOLLY_START = 6.9;
const DOLLY_END = 15.2;

/**
 * Un breath « classe » — même tempo (~0.52 Hz), un peu plus fort, une seule fois.
 * Puis nom plein jusqu’à l’extinction.
 */
const WM_BREATH_HZ = 0.52;
const WM_BREATH_A = 4.65;
const WM_BREATH_PERIOD = 1 / WM_BREATH_HZ;
const WM_BREATH_AMP = 0.2;

/** Extinction : un peu après dolly → 0 juste avant fin (plateau puis chute). */
const WM_FADE_START = DOLLY_START + 0.6;
const WM_FADE_END = CRAFT_PLAY_DURATION - 0.3;

/**
 * Extinction magique : reste affirmé longtemps, puis chute velvet (étoile qui cède).
 * `commit` = portion initiale quasi-plateau (0–1).
 */
function wordmarkExtinguish(a: number, b: number, x: number, commit = 0.32) {
  const u = clamp01((x - a) / Math.max(b - a, 1e-4));
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const late = clamp01((u - commit) / Math.max(1 - commit, 1e-4));
  return softRiseVelvet(0, 1, late, 1.42);
}

/**
 * Phase 1 — (~16.9 s). Géométrie fixe : alignment = 1.
 *
 * Acte 1 — naissance à GRANDEUR, caméra LOCK
 * Acte 1b — ODYSSEY + un breath classe (4.65, ~1.9 s)
 * Acte 2 — dolly ; extinction magique (seuil se referme + transfert diamond)
 * Acte 3 — menace (nom déjà éteint)
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

  // ODYSSEY : apparition → un breath classe → extinction magique
  const wordmarkIn = softRiseVelvet(2.62, 4.55, time, 1.28);
  let breathMul = 1;
  const breathEnd = WM_BREATH_A + WM_BREATH_PERIOD;
  if (time > WM_BREATH_A && time < breathEnd && wordmarkIn > 0.02) {
    const u = (time - WM_BREATH_A) / WM_BREATH_PERIOD;
    // Même famille que le breath continu « classe » ; revient à 1 sans saut
    breathMul =
      1 - WM_BREATH_AMP * 0.5 * (1 - Math.cos(u * Math.PI * 2));
  }
  const wordmarkOut = wordmarkExtinguish(WM_FADE_START, WM_FADE_END, time);
  const wordmarkMul = clamp01(wordmarkIn * breathMul * (1 - wordmarkOut));
  const wordmarkSolar = 0;

  // Acte 2 — dolly après hold branding
  const cameraPush = gravityDolly(DOLLY_START, DOLLY_END, time);
  const cameraAim = cameraPush;

  // Transfert de lumière : le nom cède → diamond / bloom
  const threat = cameraPush * cameraPush;
  const diamondMul =
    LOGO_DIAMOND * diamondIn * (1 + 1.2 * threat + 0.95 * wordmarkOut);
  const coronaMul = sunIn * (1 - 0.58 * cameraPush);
  const sunScale = SUN_START + (LOGO_SUN - SUN_START) * sunIn;
  const irregularMul = Math.pow(irregIn, 0.82);
  const bloom =
    0.18 * diamondIn + 0.1 * sunIn + 1.05 * threat + 0.62 * wordmarkOut;

  return {
    ...BASE,
    alignment,
    coronaMul,
    diamondMul,
    irregularMul,
    sunScale,
    lifeMul,
    cameraPush,
    cameraAim,
    wordmarkMul,
    wordmarkSolar,
    bodyFade,
    skyMul: 0,
    bloom,
    wash: 0,
    progress: 0,
  };
}
