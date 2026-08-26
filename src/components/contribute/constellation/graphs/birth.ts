/**
 * Birth-only choreography (nom → point) on revealT ∈ [0, 1].
 * Quiet magic for mourning — slow, held breaths. Not a VFX blast.
 *
 * A void → B name (long linger) → C mote → grow → then strokes (drawU).
 */

export type BirthBeat = "A" | "B" | "C" | "draw";

export type BirthPhases = {
  beat: BirthBeat;
  /** Nom : brume → mot (0–1) */
  nameBirth: number;
  /** Lift / scale breath — 0 = plus bas & petit · 1 = assis */
  nameLift: number;
  /** Halo / souffle autour du nom (0–1) — pic à l’arrivée du mot */
  nameGlow: number;
  /** Nom cède un peu de place quand l’étoile naît (0–1) */
  nameYield: number;
  /** Étoile : 0 = absent · 1 = taille idle */
  heroBirth: number;
  /** Flash très soft (0–~0.14) — larme de lumière */
  heroFlash: number;
  /** 0 avant fin C · 1 = traits terminés */
  drawU: number;
};

/**
 * Birth eats most of the timeline so each beat can breathe.
 * With DEFAULT ~14s: A ~0.6s · B ~5.5s (brume) · C ~3.5s · draw ~4s.
 */
const SEG = {
  /** Brief void only — mist arrives quickly */
  A_END: 0.04,
  /** Nom pleinement là + tenue */
  B_END: 0.46,
  /** Point grossi, prêt pour les traits */
  C_END: 0.7,
} as const;

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Extra-slow arrive — stays near 0 longer. */
function easeInOutQuint(t: number): number {
  const x = clamp01(t);
  return x < 0.5
    ? 16 * x * x * x * x * x
    : 1 - (-2 * x + 2) ** 5 / 2;
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) ** 3;
}

export function resolveBirth(revealT: number): BirthPhases {
  const t = clamp01(revealT);

  let beat: BirthBeat = "A";
  if (t >= SEG.C_END) beat = "draw";
  else if (t >= SEG.B_END) beat = "C";
  else if (t >= SEG.A_END) beat = "B";

  // B: name blooms slowly over most of B, then holds crystal-clear
  const nameArriveEnd = SEG.A_END + (SEG.B_END - SEG.A_END) * 0.72;
  const nameBirth =
    t < SEG.A_END
      ? 0
      : t < nameArriveEnd
        ? smoothstep(SEG.A_END, nameArriveEnd, t)
        : 1;

  // Soft glow crest when the word “lands”, then settles to a whisper
  const nameGlow = (() => {
    if (t < SEG.A_END) return 0;
    if (t < nameArriveEnd) {
      return smoothstep(SEG.A_END, nameArriveEnd, t) * 0.55;
    }
    // land pulse then quiet hold through C
    const land = smoothstep(nameArriveEnd, nameArriveEnd + 0.06, t);
    const settle = 1 - smoothstep(nameArriveEnd + 0.06, SEG.C_END, t) * 0.35;
    return Math.min(1, (0.55 + 0.45 * land) * settle);
  })();

  // Same breath as bloom, but easeOut so it “sits” (scale + lift)
  const nameLift =
    t < SEG.A_END
      ? 0
      : t < nameArriveEnd
        ? easeOutCubic(smoothstep(SEG.A_END, nameArriveEnd, t))
        : 1;

  // Hero only after name is fully readable (late B hold)
  const heroStart = SEG.A_END + (SEG.B_END - SEG.A_END) * 0.88;
  const heroRaw =
    t < heroStart
      ? 0
      : t < SEG.C_END
        ? (t - heroStart) / (SEG.C_END - heroStart)
        : 1;
  // Stays a mote for a long time, then arrives
  const heroBirth = easeInOutQuint(heroRaw);

  // Name yields space as the star appears (one gesture)
  const nameYield = smoothstep(0, 0.45, heroBirth);

  // Soft flash: late in growth, low amplitude, long fade
  const heroFlash = (() => {
    if (t < heroStart || t >= SEG.C_END + 0.04) return 0;
    const u = (t - heroStart) / (SEG.C_END - heroStart);
    // peak ~0.72 of growth, max ~0.14
    const bell = Math.sin(Math.min(1, u / 0.72) * Math.PI);
    const tail =
      u > 0.72
        ? Math.max(0, 1 - (u - 0.72) / 0.35) * 0.35
        : 0;
    return Math.min(0.14, bell * 0.14 + tail * 0.08);
  })();

  const drawU =
    t <= SEG.C_END ? 0 : (t - SEG.C_END) / (1 - SEG.C_END);

  return {
    beat,
    nameBirth,
    nameLift,
    nameGlow,
    nameYield,
    heroBirth,
    heroFlash,
    drawU,
  };
}

export const BIRTH_SEGMENTS = SEG;
