/**
 * Chorégraphie craft éclipse — ~3.6 s (spec Webby).
 * T0 silence → T1 slide → T2 diamond → T3 révélation ciel.
 */

export const CRAFT_CHRONO_DURATION = 3.6;

export type CraftChronoState = {
  /** 0 = décalé / faible, 1 = aligné. */
  alignment: number;
  coronaMul: number;
  diamondMul: number;
  /** 1 = disque présent, 0 = évaporé. */
  bodyFade: number;
  /** 0 = ciel éteint, 1 = FarNebula + GhostStars. */
  skyMul: number;
  /** Flash bloom 0–1. */
  bloom: number;
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

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - clamp01(t), 3);
}

/** État figé « totalité » (étape 2 look). */
export const CRAFT_CHRONO_IDLE: CraftChronoState = {
  alignment: 1,
  coronaMul: 1,
  diamondMul: 0,
  bodyFade: 1,
  skyMul: 0,
  bloom: 0,
  offsetX: 0,
  offsetY: 0,
};

/** Silence initial (T=0) — liseré asymétrique décalé. */
export const CRAFT_CHRONO_SILENCE: CraftChronoState = {
  alignment: 0,
  coronaMul: 0.2,
  diamondMul: 0,
  bodyFade: 1,
  skyMul: 0,
  bloom: 0,
  offsetX: -0.55,
  offsetY: 0.08,
};

/**
 * Échantillonne la timeline à `t` secondes.
 */
export function sampleCraftChrono(t: number): CraftChronoState {
  const time = Math.max(0, Math.min(t, CRAFT_CHRONO_DURATION));

  // T0→T1 : glisse lourde vers le centre (Kubrick)
  const slide = easeInOutCubic(smoothstep(0.55, 2.0, time));
  const offsetX = (1 - slide) * -0.55;
  const offsetY = (1 - slide) * 0.08;

  const alignment = easeOutCubic(smoothstep(0.35, 2.05, time));
  const coronaMul = 0.18 + 0.82 * alignment;

  // T2 : diamond flash (côté droit) + bloom court
  const diamondPeak =
    smoothstep(1.88, 2.06, time) * (1 - smoothstep(2.18, 2.5, time));
  const diamondSoft =
    smoothstep(1.95, 2.12, time) * (1 - smoothstep(2.45, 3.05, time)) * 0.22;
  const diamondMul = diamondPeak * 1.55 + diamondSoft;

  const bloom =
    smoothstep(1.98, 2.08, time) * (1 - smoothstep(2.12, 2.42, time));

  // T3 : disque s’évapore, ciel se révèle
  const bodyFade = 1 - smoothstep(2.55, 3.45, time);
  const skyMul = smoothstep(2.6, 3.55, time);

  return {
    alignment,
    coronaMul,
    diamondMul,
    bodyFade,
    skyMul,
    bloom,
    offsetX,
    offsetY,
  };
}
