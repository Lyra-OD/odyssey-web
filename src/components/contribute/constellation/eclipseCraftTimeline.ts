/**
 * Chorégraphie craft — occultation → totalité → diamond bas → wash → ciel.
 * Pas de croissant de sortie. ~5.8 s.
 *
 * T0–2.3  soleil arrive derrière le trou noir
 * T2.3–3.3 totalité hold (~1 s)
 * T3.3–3.75 diamond ring bas (glow blanc logo)
 * T3.75–4.55 wash blanc depuis le bas → noir
 * T4.55–5.8  ciel Sanctuaire
 */

export const CRAFT_CHRONO_DURATION = 5.8;

export type CraftChronoState = {
  /** 0 = soleil à droite, 1 = totalité (soleil garé derrière). */
  alignment: number;
  coronaMul: number;
  diamondMul: number;
  bodyFade: number;
  skyMul: number;
  bloom: number;
  /** Inondation blanche 0–1 (overlay DOM, pas bloom Three). */
  wash: number;
  /** Legacy / skyOut côté shader (suivre bodyFade/sky). */
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

export const CRAFT_CHRONO_IDLE: CraftChronoState = {
  alignment: 0,
  coronaMul: 1,
  diamondMul: 0,
  bodyFade: 1,
  skyMul: 0,
  bloom: 0,
  wash: 0,
  progress: 0,
  offsetX: 0,
  offsetY: 0,
};

export const CRAFT_CHRONO_SILENCE: CraftChronoState = {
  alignment: 0,
  coronaMul: 1,
  diamondMul: 0,
  bodyFade: 1,
  skyMul: 0,
  bloom: 0,
  wash: 0,
  progress: 0,
  offsetX: 0,
  offsetY: 0,
};

export function sampleCraftChrono(t: number): CraftChronoState {
  const time = Math.max(0, Math.min(t, CRAFT_CHRONO_DURATION));

  // Approche seule — une fois à 1, le soleil reste derrière (pas de sortie)
  const alignment = easeInOutCubic(smoothstep(0.12, 2.3, time));

  const inTotality =
    smoothstep(2.25, 2.45, time) * (1 - smoothstep(3.25, 3.4, time));
  const coronaMul = 1 + 0.25 * inTotality;

  // Diamond bas — après le hold, avant le wash
  const diamondMul =
    smoothstep(3.28, 3.48, time) * (1 - smoothstep(3.7, 3.95, time)) * 1.15;

  // Wash : monte depuis le bas, pic, redescend vers noir
  const washUp = smoothstep(3.65, 4.15, time);
  const washDown = 1 - smoothstep(4.2, 4.7, time);
  const wash = washUp * washDown;

  const bloom =
    diamondMul * 0.2 +
    wash * 0.15 +
    inTotality * 0.08;

  // Disque s’éteint pendant le retour au noir (après le pic blanc)
  const bodyFade = 1 - smoothstep(4.15, 4.75, time);
  const skyMul = smoothstep(4.55, 5.7, time);
  const progress = skyMul;

  return {
    alignment,
    coronaMul,
    diamondMul,
    bodyFade,
    skyMul,
    bloom,
    wash,
    progress,
    offsetX: 0,
    offsetY: 0,
  };
}
