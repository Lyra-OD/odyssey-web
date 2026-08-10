/**
 * Craft — Look = pose soleil. Play = lecture cinéma (autre page).
 *
 * Look : scrub = position soleil (0 droite → 1 derrière).
 * Play : hold plan d’ouverture (soleil à droite) → approche → flash → hold.
 */

export const CRAFT_CHRONO_DURATION = 2.4;
/** Lecture cinéma — ouverture tenue + approche + flash + hold. */
export const CRAFT_PLAY_DURATION = 5.4;

export type CraftChronoState = {
  /** 0 = soleil à droite, 1 = totalité (soleil derrière). */
  alignment: number;
  coronaMul: number;
  diamondMul: number;
  /** Boost irrégularité pendant le flash (1 = neutre). */
  irregularMul: number;
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

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const BASE: CraftChronoState = {
  alignment: 0,
  coronaMul: 1,
  diamondMul: 0,
  irregularMul: 1,
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

/**
 * Page play — commence comme tes plans 1–2 (gros soleil à droite), puis avance.
 *
 * T0–1.1   hold ouverture (alignment = 0)
 * T1.1–3.3 approche
 * T3.15–3.95 flash vivant
 * T3.95–5.4 hold totalité
 */
export function sampleCraftPlayChrono(t: number): CraftChronoState {
  const time = Math.max(0, Math.min(t, CRAFT_PLAY_DURATION));

  // Reste à droite jusqu’à ~1.1 s, puis glisse derrière
  const alignment = easeInOutCubic(smoothstep(1.1, 3.3, time));

  const flash =
    smoothstep(3.15, 3.45, time) * (1 - smoothstep(3.75, 4.1, time));
  const flashPeak = Math.pow(flash, 0.85);

  const inTotality = smoothstep(3.25, 3.55, time);
  const coronaMul = 1 + 0.22 * inTotality + 0.15 * flashPeak;
  const diamondMul = flashPeak * 1.25;
  const irregularMul = 1 + 0.55 * flashPeak;
  const bloom = 0.04 * inTotality + 0.28 * flashPeak;

  return {
    ...BASE,
    alignment,
    coronaMul,
    diamondMul,
    irregularMul,
    bloom,
  };
}
