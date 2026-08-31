/**
 * Birth choreography on revealT ∈ [0, 1].
 * Name (A–B) + Hero C0–C5 from mid-name → KEEP seat → draw.
 *
 * Recette canon (constantes, checklist) :
 * docs/ODYSSEY_LUEUR_CRAFT.md §4.1
 */

export type BirthBeat =
  | "A"
  | "B"
  | "C0"
  | "C1"
  | "C2"
  | "C3"
  | "C4"
  | "C5"
  | "draw";

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

  heroSize: number;
  heroFromName: number;
  heroGrain: number;
  heroGrainScale: number;
  heroVeil: number;
  heroVeilScale: number;
  heroCore: number;
  heroTeal: number;
  heroSpikes: number;
  heroBirth: number;
  /** Soft tear flash ≤ ~0.12 (C4) */
  heroFlash: number;
  /** Full KEEP atom — no birth muls (C5 + draw) */
  heroKeep: boolean;
  drawU: number;
};

const SEG = {
  A_END: 0.02,
  B_END: 0.4,
  /** Fin C5 micro-hold · début traits */
  C_END: 0.57,
} as const;

/** Grain gathers in the name. */
const HERO_START = 0.24;

/** u ∈ [0,1] on [HERO_START, C_END]. */
const C = {
  C0_END: 0.16,
  C1_END: 0.42,
  /** Core / size mostly done */
  C2_END: 0.7,
  /** Spikes — dernier ~30 % de C */
  C3_START: 0.7,
  /** Flash larme (size « clique » idle) */
  C4_CENTER: 0.86,
  /** Micro-hold étoile + nom avant traits */
  C5_START: 0.92,
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

function organicFromName(u: number): number {
  if (u <= 0.14) return 0;
  if (u >= 0.68) return 1;
  const x = (u - 0.14) / (0.68 - 0.14);
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

  const heroFromName = u <= 0 ? 0 : organicFromName(u);

  const grainMist =
    u <= 0
      ? 0
      : easeOutQuad(smoothstep(0, 0.2, u)) *
        (1 - smoothstep(0.48, 0.78, u) * 0.92);
  const heroGrain = Math.min(1, grainMist);

  const grainGrow = easeInOutCubic(smoothstep(0.02, 0.42, u));
  const grainShrink = easeInOutCubic(smoothstep(0.48, 0.82, u));
  const heroGrainScale =
    0.22 + 0.95 * grainGrow * (1 - grainShrink) + 0.32 * grainShrink;

  const veilMist =
    u <= 0
      ? 0
      : easeOutQuad(smoothstep(0.04, 0.28, u)) *
        (1 - smoothstep(0.52, 0.92, u) * 0.96);
  const heroVeil = Math.min(1, veilMist * 0.92);

  const veilGrow = easeInOutCubic(smoothstep(0.04, 0.48, u));
  const veilShrink = easeInOutCubic(smoothstep(0.52, 0.94, u));
  const VEIL_MIN = 0.28;
  const VEIL_PEAK = 2.15;
  const VEIL_END = 0.38;
  const heroVeilScale =
    VEIL_MIN +
    (VEIL_PEAK - VEIL_MIN) * veilGrow * (1 - veilShrink) +
    (VEIL_END - VEIL_MIN) * veilShrink;

  const heroCore =
    u <= 0
      ? 0
      : easeInQuint(smoothstep(C.C0_END * 0.55, C.C2_END * 0.95, u));

  const heroTeal =
    u <= 0
      ? 0
      : easeInQuint(smoothstep(C.C0_END * 0.85, C.C2_END * 0.98, u));

  // Size reaches idle before C3 — flash can land on the « click »
  const heroSize = (() => {
    if (u <= 0) return 0;
    const sizeU = Math.max(0, (u - 0.08) / 0.92);
    if (sizeU < C.SIZE_FLAT) {
      return 0.04 + 0.07 * (sizeU / C.SIZE_FLAT);
    }
    const rise = (sizeU - C.SIZE_FLAT) / (1 - C.SIZE_FLAT);
    const riseCap = Math.min(1, rise / 0.88);
    return (
      0.11 + 0.89 * Math.max(easeInQuint(riseCap), easeInExpo(riseCap) * 0.75)
    );
  })();

  // C3 — spikes derniers ~30 % (forme arrive, n’explose pas)
  const heroSpikes =
    u < C.C3_START
      ? 0
      : easeInOutCubic(smoothstep(C.C3_START, C.C5_START + 0.04, u));

  // C4 — larme ≤ 0.12 quand la taille « clique »
  const heroFlash = (() => {
    if (u < C.C3_START + 0.05 || u > C.C5_START) return 0;
    const flashSpan = 0.1;
    const du = Math.abs(u - C.C4_CENTER) / flashSpan;
    if (du >= 1) return 0;
    const bell = Math.cos(du * Math.PI * 0.5);
    const sizeGate = smoothstep(0.78, 0.9, heroSize);
    return Math.min(0.12, bell * bell * 0.12 * sizeGate);
  })();

  const heroKeep =
    t >= SEG.C_END ||
    (u >= C.C5_START &&
      heroVeil < 0.04 &&
      heroGrain < 0.04 &&
      heroCore >= 0.98 &&
      heroTeal >= 0.98);

  let beat: BirthBeat = "A";
  if (t >= SEG.C_END) beat = "draw";
  else if (t >= HERO_START) {
    if (u >= C.C5_START) beat = "C5";
    else if (u >= C.C4_CENTER - 0.06) beat = "C4";
    else if (u >= C.C3_START) beat = "C3";
    else if (u >= C.C1_END) beat = "C2";
    else if (u >= C.C0_END) beat = "C1";
    else beat = "C0";
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

/**
 * Chemin 1 hub — étoile d’abord (dolly caméra), invite ensuite (bounce nom craft).
 * `approach` = progression HubSkyCamera 0→1.
 */
export function resolveHubBirth(approach: number): BirthPhases {
  const u = clamp01(approach);
  const heroU = clamp01((u - 0.05) / 0.58);
  const heroPhase = resolveBirth(0.24 + heroU * (SEG.C_END - 0.24 - 0.01));
  const nameU = clamp01((u - 0.5) / 0.5);
  const namePhase = resolveBirth(0.02 + nameU * (SEG.B_END - 0.02));

  if (u < 0.5) {
    return {
      ...heroPhase,
      nameBirth: 0,
      nameClarity: 0,
      nameLift: 0,
      nameScale: 0,
      nameTrack: 0,
      nameDriftX: 0,
      nameDriftY: 0,
      nameGlow: 0,
    };
  }

  return {
    ...heroPhase,
    nameBirth: namePhase.nameBirth,
    nameClarity: namePhase.nameClarity,
    nameLift: namePhase.nameLift,
    nameScale: namePhase.nameScale,
    nameTrack: namePhase.nameTrack,
    nameDriftX: namePhase.nameDriftX,
    nameDriftY: namePhase.nameDriftY,
    nameGlow: namePhase.nameGlow,
  };
}

/** Invite hub visible (tap hint suit ~0.72). */
export function hubPromptVisible(approach: number): boolean {
  return clamp01(approach) >= 0.48;
}

export function hubTapHintVisible(approach: number): boolean {
  return clamp01(approach) >= 0.72;
}
