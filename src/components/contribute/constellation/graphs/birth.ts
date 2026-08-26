/**
 * Birth choreography on revealT ∈ [0, 1].
 * Name (A–B) + Hero C0–C2 from mid-name → KEEP seat. C3–C5 later.
 *
 * Recette canon (constantes, checklist) :
 * docs/ODYSSEY_LUEUR_CRAFT.md §4.1
 */

export type BirthBeat = "A" | "B" | "C0" | "C1" | "C2" | "draw";

export type BirthPhases = {
  beat: BirthBeat;
  nameBirth: number;
  nameClarity: number;
  nameLift: number;
  nameScale: number;
  nameTrack: number;
  nameDriftX: number;
  nameDriftY: number;
  nameGlow: number;

  /** Overall size 0–1 (mote flat, then expo-in → KEEP scale) */
  heroSize: number;
  /** 0 = mid-name · 1 = idle Hero seat (rises out of the word) */
  heroFromName: number;
  heroGrain: number;
  /** Grain size breath: mini → peak → mote (0–1 mapped in HeroStar) */
  heroGrainScale: number;
  heroVeil: number;
  /** Veil: mini → peak fumée → contracte vers le core */
  heroVeilScale: number;
  /** → 1 = full KEEP white layer */
  heroCore: number;
  /** → 1 = full KEEP teal layer */
  heroTeal: number;
  /** → 1 = full KEEP spikes (0 during C0–C2 proper) */
  heroSpikes: number;
  heroBirth: number;
  heroFlash: number;
  /** True when layers must match KEEP exactly (no birth muls) */
  heroKeep: boolean;
  drawU: number;
};

const SEG = {
  A_END: 0.02,
  B_END: 0.4,
  /** Slightly snappier C window */
  C_END: 0.58,
} as const;

/** Absolute revealT — grain gathers in the name. */
const HERO_START = 0.24;

/** Within hero local u ∈ [0,1] (HERO_START→C_END). */
const C = {
  C0_END: 0.16,
  C1_END: 0.42,
  C2_END: 1,
  SIZE_FLAT: 0.4,
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

function easeOutBackSoft(t: number): number {
  const x = clamp01(t);
  const c = 1.15;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
}

function easeInQuint(t: number): number {
  const x = clamp01(t);
  return x ** 5;
}

function easeInExpo(t: number): number {
  const x = clamp01(t);
  return x <= 0 ? 0 : 2 ** (10 * (x - 1));
}

function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * Rise from mid-name → seat: hesitate in the word, then detach, soft land.
 * Not a UI easeOut rail.
 */
function organicFromName(u: number): number {
  if (u <= 0.14) return 0;
  if (u >= 0.68) return 1;
  const x = (u - 0.14) / (0.68 - 0.14);
  // Bias: slow leave, then commit, settle — blend of in-out + mild push
  const body = easeInOutCubic(x);
  const commit = Math.pow(x, 1.25);
  return clamp01(0.4 * body + 0.6 * commit);
}

export function resolveBirth(revealT: number): BirthPhases {
  const t = clamp01(revealT);

  const mistStart = SEG.A_END;
  const mistEnd = SEG.A_END + (SEG.B_END - SEG.A_END) * 0.52;

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
    if (t < mistEnd) return nameClarity * 0.5;
    const land = smoothstep(mistEnd, mistEnd + 0.05, t);
    const settle = 1 - smoothstep(mistEnd + 0.05, SEG.C_END, t) * 0.35;
    return Math.min(1, (0.5 + 0.5 * land) * settle);
  })();

  const driftAmp = t >= mistEnd ? 0 : (1 - nameClarity) * 0.55;
  const nameDriftX =
    driftAmp * (Math.sin(t * 7.1) * 0.5 + Math.sin(t * 3.4 + 1.2) * 0.35);
  const nameDriftY =
    driftAmp * (Math.cos(t * 5.8 + 0.4) * 0.4 + Math.sin(t * 2.7) * 0.25);

  const heroSpan = Math.max(1e-6, SEG.C_END - HERO_START);
  const u =
    t < HERO_START ? 0 : t < SEG.C_END ? (t - HERO_START) / heroSpan : 1;

  // Presence gathers in the name first; rise lags (magic phrasing)
  const heroFromName = u <= 0 ? 0 : organicFromName(u);

  // --- Grain + veil: same language as name mist ---
  // Opacity: fumée → présence (soft), then yields to core
  const grainMist =
    u <= 0
      ? 0
      : easeOutQuad(smoothstep(0, 0.2, u)) *
        (1 - smoothstep(0.48, 0.78, u) * 0.92);
  const heroGrain = Math.min(1, grainMist);

  // Grain size: mini → peak (lent) → mote — grow takes most of early C
  const grainGrow = easeInOutCubic(smoothstep(0.02, 0.42, u));
  const grainShrink = easeInOutCubic(smoothstep(0.48, 0.82, u));
  const heroGrainScale =
    0.22 + 0.95 * grainGrow * (1 - grainShrink) + 0.32 * grainShrink;

  // Veil opacity: fumée douce comme le nom
  const veilMist =
    u <= 0
      ? 0
      : easeOutQuad(smoothstep(0.04, 0.28, u)) *
        (1 - smoothstep(0.52, 0.92, u) * 0.96);
  const heroVeil = Math.min(1, veilMist * 0.92);

  // Veil scale: mini → peak (lent / fluide) → contracte into core
  const veilGrow = easeInOutCubic(smoothstep(0.04, 0.48, u));
  const veilShrink = easeInOutCubic(smoothstep(0.52, 0.94, u));
  const VEIL_MIN = 0.28;
  const VEIL_PEAK = 2.15;
  const VEIL_END = 0.38;
  const heroVeilScale =
    VEIL_MIN +
    (VEIL_PEAK - VEIL_MIN) * veilGrow * (1 - veilShrink) +
    (VEIL_END - VEIL_MIN) * veilShrink;

  // Core/teal lag the rise — size after presence, not same slider
  const heroCore =
    u <= 0
      ? 0
      : easeInQuint(smoothstep(C.C0_END * 0.55, 0.86, u));

  const heroTeal =
    u <= 0
      ? 0
      : easeInQuint(smoothstep(C.C0_END * 0.85, 0.94, u));

  // Size lags fromName — grow after it has started to leave the word
  const heroSize = (() => {
    if (u <= 0) return 0;
    const sizeU = Math.max(0, (u - 0.08) / 0.92);
    if (sizeU < C.SIZE_FLAT) {
      return 0.04 + 0.07 * (sizeU / C.SIZE_FLAT);
    }
    const rise = (sizeU - C.SIZE_FLAT) / (1 - C.SIZE_FLAT);
    return 0.11 + 0.89 * Math.max(easeInQuint(rise), easeInExpo(rise) * 0.75);
  })();

  // Spikes still reserved for C3 — soft KEEP bridge only after C_END
  const heroSpikes =
    t < SEG.C_END ? 0 : smoothstep(SEG.C_END, SEG.C_END + 0.08, t);

  const heroFlash = 0;

  const heroKeep =
    t >= SEG.C_END + 0.08 &&
    heroVeil < 0.03 &&
    heroGrain < 0.03;

  let beat: BirthBeat = "A";
  if (t >= SEG.C_END) beat = "draw";
  else if (t >= HERO_START) {
    if (u < C.C0_END) beat = "C0";
    else if (u < C.C1_END) beat = "C1";
    else beat = "C2";
  } else if (t >= SEG.A_END) beat = "B";

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
    heroSize,
    heroFromName,
    heroGrain,
    heroGrainScale,
    heroVeil,
    heroVeilScale,
    heroCore,
    heroTeal,
    heroSpikes,
    heroBirth: heroSize,
    heroFlash,
    heroKeep,
    drawU,
  };
}

export const BIRTH_SEGMENTS = SEG;
export const HERO_C_SEGMENTS = C;
export const BIRTH_HERO_START = HERO_START;
