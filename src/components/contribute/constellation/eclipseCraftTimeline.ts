/**
 * Craft — Look = pose soleil. Play = lecture cinéma (autre page).
 *
 * Look : scrub = position soleil (0 droite → 1 derrière).
 * Play : naissance → ODYSSEY → **dolly continu accéléré** dans le diamond (go A bis).
 */

export const CRAFT_CHRONO_DURATION = 2.4;
/**
 * Phase 1 cinéma (~9,5 s) — actes :
 * diamond → soleil / ODYSSEY → dolly gravité vers le bead (pas de hold figé).
 * Blanc / wormhole / ciel / titre = go B–E (voir ODYSSEY_ECLIPSE_PLAY_FINALE.md).
 */
export const CRAFT_PLAY_DURATION = 9.5;

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
  /** 0→1 push caméra (Z / FOV) — courbe gravité continue. */
  cameraPush: number;
  /** 0→1 aim vers diamond — sync avec cameraPush (geste unique). */
  cameraAim: number;
  /** 0→1 wordmark ODYSSEY (acte 1b — solar etch). */
  wordmarkMul: number;
  /** 0→1 flash solaire du etch (pic puis settle). */
  wordmarkSolar: number;
  /** 0→1 menace limbe soleil (monte avec la fin de dolly). */
  limbThreat: number;
  /**
   * 0→1 chaleur diamond en fin d’approche (dérivé de cameraPush —
   * pas un 2ᵉ geste).
   */
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

/**
 * Aspiration unique — un cran plus tendue (porte diamond → bead).
 * Continuité : pas de breakpoint.
 */
function gravityDolly(a: number, b: number, x: number) {
  const u = clamp01((x - a) / (b - a));
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return u * 0.28 + Math.pow(u, 2.3) * 0.72;
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

/**
 * Dolly après naissance / ODYSSEY (pas de hold figé).
 * Fenêtre ~3,0 s — courbe unique un cran plus vive.
 */
const DOLLY_START = 6.55;
const DOLLY_END = 9.45;

/**
 * Un breath « classe » — une seule fois, avant / en bordure de dolly.
 */
const WM_BREATH_HZ = 0.52;
const WM_BREATH_A = 4.55;
const WM_BREATH_PERIOD = 1 / WM_BREATH_HZ;
const WM_BREATH_AMP = 0.2;

/** Extinction pendant la dolly (nom cède pendant l’approche). */
const WM_FADE_START = DOLLY_START + 0.25;
const WM_FADE_END = 8.2;

/** Menace limbe — monte dans la 2ᵉ moitié de dolly. */
const LIMB_START = 7.35;
const LIMB_END = 9.2;

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
 * Phase 1 — (~9,5 s). Géométrie fixe : alignment = 1.
 *
 * Acte 1 — diamond solo → soleil / corona
 * Acte 1b — ODYSSEY + breath (lockup = porte, **sans hold figé**)
 * Acte 2 / A bis — dolly gravité → bead
 */
export function sampleCraftPlayChrono(t: number): CraftChronoState {
  const time = Math.max(0, Math.min(t, CRAFT_PLAY_DURATION));

  const alignment = 1;

  // Acte 1 — diamond d’abord (signature), soleil en lag
  const diamondIn = softRiseVelvet(0.3, 2.55, time, 0.95);
  const bodyFade = softRiseVelvet(0.55, 3.05, time, 1.1);
  const lifeMul = softRiseVelvet(0.35, 2.7, time, 1.0);

  const sunIn = softRiseVelvet(2.55, 3.75, time, 0.52);
  const irregIn = softRiseVelvet(2.75, 4.25, time, 1.05);

  // ODYSSEY + breath
  const wordmarkIn = softRiseVelvet(2.85, 4.55, time, 1.28);
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

  const cameraPush = gravityDolly(DOLLY_START, DOLLY_END, time);
  const cameraAim = cameraPush;

  // Diamond affirmé tant que caméra pas encore partie (pas une pause)
  const doorHold =
    softRiseVelvet(2.4, 4.2, time, 1.1) * (1 - cameraPush);

  const limbRaw = wordmarkExtinguish(LIMB_START, LIMB_END, time, 0.42);
  const limbThreat = limbRaw * softRiseVelvet(7.55, 9.1, time, 1.0);

  const late = clamp01((cameraPush - 0.45) / 0.55);
  const flashMul = Math.pow(late, 1.5);

  const threat = cameraPush * cameraPush;
  const limbPunch = limbThreat * limbThreat;
  const diamondSolar =
    wordmarkOut * softRiseVelvet(WM_FADE_START + 0.8, WM_FADE_END, time, 1.15);
  const diamondMul =
    LOGO_DIAMOND *
    diamondIn *
    (1 +
      0.55 * doorHold +
      0.95 * threat +
      1.15 * wordmarkOut +
      0.5 * diamondSolar +
      0.35 * limbPunch +
      2.8 * flashMul +
      1.4 * flashMul * flashMul);
  const coronaMul =
    sunIn * (1 - 0.72 * cameraPush) * (1 + 0.08 * limbPunch);
  const sunScale = SUN_START + (LOGO_SUN - SUN_START) * sunIn;
  const irregularMul = Math.pow(irregIn, 0.82);
  const bloom =
    0.18 * diamondIn +
    0.1 * sunIn +
    0.85 * threat +
    0.7 * wordmarkOut +
    0.35 * diamondSolar +
    0.12 * limbThreat +
    0.35 * limbPunch +
    1.35 * flashMul +
    1.1 * flashMul * flashMul;

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
