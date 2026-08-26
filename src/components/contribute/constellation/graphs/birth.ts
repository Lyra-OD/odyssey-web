/**
 * Birth-only choreography (nom → point) on revealT ∈ [0, 1].
 * Quiet magic — organic channels (désync), not a UI tween pack.
 *
 * A void court → B masse floue → mot → C mote → grow → draw.
 */

export type BirthBeat = "A" | "B" | "C" | "draw";

export type BirthPhases = {
  beat: BirthBeat;
  /** Lisibilité globale (opacité / présence) */
  nameBirth: number;
  /** Clarity flou → net (plus rapide que lift) */
  nameClarity: number;
  /** Lift vertical 0→1 (légèrement en retard) */
  nameLift: number;
  /** Scale breath 0→1 (courbe propre, léger settle) */
  nameScale: number;
  /** Tracking 0→1 (s’ouvre tôt, se resserre tard) */
  nameTrack: number;
  /** Dérive organique horizontale (px-ish, −1…1) */
  nameDriftX: number;
  /** Dérive organique verticale fine (−1…1) */
  nameDriftY: number;
  /** Halo / souffle — pic à l’arrivée du mot */
  nameGlow: number;
  /** Étoile : 0 = absent · 1 = taille idle */
  heroBirth: number;
  /** Flash très soft (0–~0.14) */
  heroFlash: number;
  /** 0 avant fin C · 1 = traits terminés */
  drawU: number;
};

/**
 * ~14s: A ~0.3s · B brume→mot plus court · hold · C · draw.
 */
const SEG = {
  A_END: 0.02,
  B_END: 0.42,
  C_END: 0.68,
} as const;

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) ** 3;
}

function easeOutQuad(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) * (1 - x);
}

/** Soft overshoot then settle to 1. */
function easeOutBackSoft(t: number): number {
  const x = clamp01(t);
  const c = 1.15;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
}

function easeInOutQuint(t: number): number {
  const x = clamp01(t);
  return x < 0.5
    ? 16 * x * x * x * x * x
    : 1 - (-2 * x + 2) ** 5 / 2;
}

export function resolveBirth(revealT: number): BirthPhases {
  const t = clamp01(revealT);

  let beat: BirthBeat = "A";
  if (t >= SEG.C_END) beat = "draw";
  else if (t >= SEG.B_END) beat = "C";
  else if (t >= SEG.A_END) beat = "B";

  // Name land earlier in B — keep mist, arrive readable sooner
  const mistStart = SEG.A_END;
  const mistEnd = SEG.A_END + (SEG.B_END - SEG.A_END) * 0.52;

  // Channels désync on purpose (organic, not one tween)
  const nameClarity =
    t < mistStart
      ? 0
      : t < mistEnd
        ? easeOutQuad(smoothstep(mistStart, mistEnd, t))
        : 1;

  const nameLift =
    t < mistStart
      ? 0
      : t < mistEnd + 0.04
        ? easeOutCubic(smoothstep(mistStart + 0.02, mistEnd + 0.04, t))
        : 1;

  const nameScaleRaw =
    t < mistStart
      ? 0
      : t < mistEnd + 0.02
        ? easeOutBackSoft(smoothstep(mistStart, mistEnd + 0.02, t))
        : 1;
  const nameScale = Math.min(1.04, Math.max(0, nameScaleRaw));

  const nameTrack =
    t < mistStart
      ? 0
      : t < mistEnd + 0.06
        ? smoothstep(mistStart, mistEnd + 0.06, t)
        : 1;

  const nameBirth =
    t < mistStart
      ? 0
      : t < mistEnd
        ? smoothstep(mistStart, mistEnd, t)
        : 1;

  const nameGlow = (() => {
    if (t < mistStart) return 0;
    if (t < mistEnd) {
      return nameClarity * 0.5;
    }
    const land = smoothstep(mistEnd, mistEnd + 0.05, t);
    const settle = 1 - smoothstep(mistEnd + 0.05, SEG.C_END, t) * 0.35;
    return Math.min(1, (0.5 + 0.5 * land) * settle);
  })();

  // Drift only during mist — dead stop once the word has landed (no C wiggle)
  const driftAmp =
    t >= mistEnd ? 0 : (1 - nameClarity) * 0.55;
  const nameDriftX =
    driftAmp * (Math.sin(t * 7.1) * 0.5 + Math.sin(t * 3.4 + 1.2) * 0.35);
  const nameDriftY =
    driftAmp * (Math.cos(t * 5.8 + 0.4) * 0.4 + Math.sin(t * 2.7) * 0.25);

  // Hero after name is readable + short hold
  const heroStart = SEG.A_END + (SEG.B_END - SEG.A_END) * 0.82;
  const heroRaw =
    t < heroStart
      ? 0
      : t < SEG.C_END
        ? (t - heroStart) / (SEG.C_END - heroStart)
        : 1;
  const heroBirth = easeInOutQuint(heroRaw);

  const heroFlash = (() => {
    if (t < heroStart || t >= SEG.C_END + 0.04) return 0;
    const u = (t - heroStart) / (SEG.C_END - heroStart);
    const bell = Math.sin(Math.min(1, u / 0.72) * Math.PI);
    const tail =
      u > 0.72 ? Math.max(0, 1 - (u - 0.72) / 0.35) * 0.35 : 0;
    return Math.min(0.14, bell * 0.14 + tail * 0.08);
  })();

  const drawU =
    t <= SEG.C_END ? 0 : (t - SEG.C_END) / (1 - SEG.C_END);

  return {
    beat,
    nameBirth,
    nameClarity,
    nameLift,
    nameScale,
    nameTrack,
    nameDriftX,
    nameDriftY,
    nameGlow,
    heroBirth,
    heroFlash,
    drawU,
  };
}

export const BIRTH_SEGMENTS = SEG;
