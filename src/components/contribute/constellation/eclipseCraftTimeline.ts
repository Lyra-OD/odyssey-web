/**
 * Craft — Look = pose soleil. Play = lecture cinéma (autre page).
 *
 * Look : scrub = position soleil (0 droite → 1 derrière).
 * Play (phase 1) : naissance → ODYSSEY → dolly → menace → flash diamond.
 */

export const CRAFT_CHRONO_DURATION = 2.4;
/**
 * Phase 1 cinéma (~14.7 s) — actes :
 * naissance → ODYSSEY → hold → dolly → menace → **flash diamond** (étape 1).
 * Wash couleur / wormhole / ciel = étapes suivantes (pas encore).
 */
export const CRAFT_PLAY_DURATION = 14.7;

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
  /** 0→1 menace limbe soleil (fin — tension, pas flood). */
  limbThreat: number;
  /** 0→1 flash diamond blanc (acte 4 — hit court). */
  flashMul: number;
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

/** Encore plus feutré — double S-curve + expo.
 * Naissance play : quasi 0 puis commit fort = « pop » intentionnel
 * (soleil KEEP ; diamond = même famille — voir docs/ECLIPSE_CRAFT_LAB_NOTES.md §0c).
 */
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

/** Aspiration : lisible dès le début, tirée en fin (fenêtre plus courte = plus d’urgence). */
function gravityDolly(a: number, b: number, x: number) {
  const u = clamp01((x - a) / (b - a));
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return u * 0.42 + Math.pow(u, 1.45) * 0.58;
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
  limbThreat: 0,
  flashMul: 0,
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

/** Dolly : ~5,1 s d’aspiration (resserré encore — majestueux sans traîner). */
const DOLLY_START = 6.9;
const DOLLY_END = 12.0;

/**
 * Un breath « classe » — même tempo (~0.52 Hz), un peu plus fort, une seule fois.
 * Puis nom plein jusqu’à l’extinction.
 */
const WM_BREATH_HZ = 0.52;
const WM_BREATH_A = 4.65;
const WM_BREATH_PERIOD = 1 / WM_BREATH_HZ;
const WM_BREATH_AMP = 0.2;

/** Extinction : un peu après dolly → 0 juste avant fin d’acte 3 (figé). */
const WM_FADE_START = DOLLY_START + 0.5;
const WM_FADE_END = 13.45;

/** Menace limbe — commit en fin de dolly / avant flash. */
const LIMB_START = 10.55;
const LIMB_END = 13.62;

/** Acte 4 — flash diamond blanc (étape 1 validable seule). */
const FLASH_START = 13.78;
const FLASH_PEAK = 14.05;
const FLASH_END = 14.58;

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
 * Phase 1 — (~14.7 s). Géométrie fixe : alignment = 1.
 *
 * Acte 1 — naissance à GRANDEUR, caméra LOCK
 * Acte 1b — ODYSSEY + un breath classe
 * Acte 2 — dolly ~5,1 s ; extinction + transfert diamond
 * Acte 3 — menace limbe (nom éteint)
 * Acte 4 — flash diamond blanc (étape 1 — pas de wash / wormhole encore)
 */
export function sampleCraftPlayChrono(t: number): CraftChronoState {
  const time = Math.max(0, Math.min(t, CRAFT_PLAY_DURATION));

  const alignment = 1;

  // Acte 1 — matière à grandeur (caméra fixe)
  const diamondIn = softRiseVelvet(0.35, 2.75, time, 1.05);
  const bodyFade = softRiseVelvet(0.45, 2.95, time, 1.1);
  const lifeMul = softRiseVelvet(0.4, 2.85, time, 1.0);

  const sunIn = softRiseVelvet(2.15, 3.45, time, 0.52); // pop naissance plus marqué (KEEP §0c)
  const irregIn = softRiseVelvet(2.45, 4.15, time, 1.05);

  // ODYSSEY : apparition → un breath classe → extinction magique
  const wordmarkIn = softRiseVelvet(2.62, 4.55, time, 1.28);
  let breathMul = 1;
  const breathEnd = WM_BREATH_A + WM_BREATH_PERIOD;
  if (time > WM_BREATH_A && time < breathEnd && wordmarkIn > 0.02) {
    const u = (time - WM_BREATH_A) / WM_BREATH_PERIOD;
    breathMul =
      1 - WM_BREATH_AMP * 0.5 * (1 - Math.cos(u * Math.PI * 2));
  }
  const wordmarkOut = wordmarkExtinguish(WM_FADE_START, WM_FADE_END, time);
  const wordmarkMul = clamp01(wordmarkIn * breathMul * (1 - wordmarkOut));
  const wordmarkSolar = 0;

  // Acte 2 — dolly après hold branding
  const cameraPush = gravityDolly(DOLLY_START, DOLLY_END, time);
  const cameraAim = cameraPush;

  // Acte 3 — menace limbe : fil serré, intensité en toute fin
  const limbRaw = wordmarkExtinguish(LIMB_START, LIMB_END, time, 0.48);
  const limbThreat = limbRaw * softRiseVelvet(
    WM_FADE_START + 1.6,
    WM_FADE_END + 0.15,
    time,
    1.05,
  );

  // Acte 4 — flash blanc depuis le diamond (attaque nette, release feutrée)
  const flashAttack = softRiseVelvet(FLASH_START, FLASH_PEAK, time, 0.36);
  const flashRelease = softRiseVelvet(FLASH_PEAK, FLASH_END, time, 0.82);
  const flashMul = clamp01(flashAttack * (1 - flashRelease));

  // Transfert → diamond ; limbe ; puis hit flash (bead pincé, amp ↑)
  const threat = cameraPush * cameraPush;
  const limbPunch = limbThreat * limbThreat;
  const diamondSolar =
    wordmarkOut * softRiseVelvet(WM_FADE_START + 1.0, WM_FADE_END, time, 1.15);
  const diamondMul =
    LOGO_DIAMOND *
    diamondIn *
    (1 +
      0.85 * threat +
      1.35 * wordmarkOut +
      0.55 * diamondSolar +
      0.2 * limbPunch +
      3.2 * flashMul);
  const coronaMul =
    sunIn * (1 - 0.58 * cameraPush) * (1 + 0.06 * limbPunch);
  const sunScale = SUN_START + (LOGO_SUN - SUN_START) * sunIn;
  const irregularMul = Math.pow(irregIn, 0.82);
  const bloom =
    0.18 * diamondIn +
    0.1 * sunIn +
    0.72 * threat +
    0.85 * wordmarkOut +
    0.4 * diamondSolar +
    0.08 * limbThreat +
    0.28 * limbPunch +
    1.55 * flashMul +
    0.9 * flashMul * flashMul;

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
    limbThreat,
    flashMul,
    bodyFade,
    skyMul: 0,
    bloom,
    wash: 0,
    progress: 0,
  };
}
