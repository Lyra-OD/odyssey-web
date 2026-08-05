/**
 * Chorégraphie — transit complet derrière le trou noir.
 * Phase 0→1 : soleil droite → totalité → gauche → ciel.
 * ~5.2 s.
 */

export const CRAFT_CHRONO_DURATION = 5.2;

export type CraftChronoState = {
  /** Phase éclipse 0→1 (0.5 ≈ totalité). */
  alignment: number;
  coronaMul: number;
  diamondMul: number;
  bodyFade: number;
  skyMul: number;
  bloom: number;
  /** Révélation ciel en fin de transit. */
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
  progress: 0,
  offsetX: 0,
  offsetY: 0,
};

/**
 * T0–4.4 transit (totality ~2.1–2.5) · 4.4–5.2 ciel.
 */
export function sampleCraftChrono(t: number): CraftChronoState {
  const time = Math.max(0, Math.min(t, CRAFT_CHRONO_DURATION));

  // Phase quasi-linéaire (vitesse de transit lisible)
  const alignment = easeInOutCubic(smoothstep(0.2, 4.4, time));

  // Diamond doux aux contacts (~phase 0.42 et 0.58 ≈ temps 2.0 et 2.7)
  const c2 =
    smoothstep(1.85, 2.05, time) * (1 - smoothstep(2.12, 2.28, time));
  const c3 =
    smoothstep(2.55, 2.72, time) * (1 - smoothstep(2.8, 2.98, time));
  const diamondMul = (c2 + c3) * 0.55;

  const bloom =
    (c2 + c3) * 0.22 +
    smoothstep(2.15, 2.35, time) * (1 - smoothstep(2.45, 2.7, time)) * 0.12;

  const coronaMul = 1;

  // Ciel après que le soleil soit ressorti
  const progress = smoothstep(4.35, 5.15, time);
  const bodyFade = 1 - smoothstep(4.4, 5.15, time);
  const skyMul = smoothstep(4.35, 5.15, time);

  return {
    alignment,
    coronaMul,
    diamondMul,
    bodyFade,
    skyMul,
    bloom,
    progress,
    offsetX: 0,
    offsetY: 0,
  };
}
