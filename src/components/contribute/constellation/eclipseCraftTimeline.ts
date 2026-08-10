/**
 * Craft — pour l’instant : **approche + position soleil uniquement**.
 * Fin (diamond / wash / ciel) retirée — à reconstruire plan par plan.
 *
 * Look : scrub = position soleil (0 droite → 1 derrière).
 * Chrono : même courbe d’approche (~2.4 s), soleil se gare, stop.
 */

export const CRAFT_CHRONO_DURATION = 2.4;

export type CraftChronoState = {
  /** 0 = soleil à droite, 1 = totalité (soleil derrière). */
  alignment: number;
  coronaMul: number;
  diamondMul: number;
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
    // léger boost corona quand on approche la totalité
    coronaMul: 1 + 0.2 * smoothstep(0.75, 1, a),
    bloom: 0.06 * smoothstep(0.85, 1, a),
  };
}

/** Lecture chrono : uniquement l’approche jusqu’à soleil garé. */
export function sampleCraftChrono(t: number): CraftChronoState {
  const time = Math.max(0, Math.min(t, CRAFT_CHRONO_DURATION));
  const alignment = easeInOutCubic(smoothstep(0.08, 2.25, time));
  return poseFromSunPosition(alignment);
}
