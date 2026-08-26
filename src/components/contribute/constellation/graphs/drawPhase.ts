/**
 * Draw beats D–F on revealT ∈ [C_END, 1].
 * D — traits partent du Hero · pull-back cam (sync revealCamera)
 * E — slots s'éveillent à l'arrivée du trait
 * F — whisper traits + champ souris (proximité, pas hitbox)
 */

import { BIRTH_SEGMENTS } from "@/src/components/contribute/constellation/graphs/birth";
import { easeInOutCubic } from "@/src/components/contribute/constellation/graphs/reveal";

export type DrawBeat = "D" | "E" | "F";

export type DrawPhase = {
  beat: DrawBeat | null;
  /** Filament / node emphasis during draw (ramps then settles). */
  emphasis: number;
  /** Idle whisper — canon ~8–12 %. */
  whisper: number;
  /** Mouse proximity field active (not UI hitbox). */
  proximity: boolean;
  /** Local progress within draw window [0, 1]. */
  localU: number;
  /** Bridge opacity mul — 1 while drawing · → whisper (~0.12) en F. */
  lineDim: number;
  /** Constellation star breath 0→1 (F · idle). */
  constellationBreath: number;
};

export const DRAW_START = BIRTH_SEGMENTS.C_END;

/** D ≈ first 45 % of draw · E until ~82 % · F last ~18 % + idle */
const D_END = 0.45;
const E_END = 0.82;

export const DEFAULT_WHISPER_EMPHASIS = 0.1;
/** Bridge dim at idle whisper — visible but soft (not invisible). */
export const DEFAULT_LINE_WHISPER = 0.52;
/** Min opacity mul once reveal settles (before mouse relight). */
export const LINE_WHISPER_FLOOR = 0.26;
/** NDC radius for mouse proximity field (not UI hitbox). */
export const PROXIMITY_FIELD_RADIUS = 0.44;
/** Mouse relight strength on lines / stars. */
export const PROXIMITY_RELIGHT = 2.65;

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

export function resolveDrawPhase(revealT: number): DrawPhase {
  const t = clamp01(revealT);
  if (t < DRAW_START) {
    return {
      beat: null,
      emphasis: 0,
      whisper: 0,
      proximity: false,
      localU: 0,
      lineDim: 1,
      constellationBreath: 0,
    };
  }

  const localU = (t - DRAW_START) / Math.max(1e-6, 1 - DRAW_START);

  let beat: DrawBeat = "D";
  if (localU >= E_END) beat = "F";
  else if (localU >= D_END) beat = "E";

  const emphasisRamp = easeInOutCubic(Math.min(1, localU * 1.12)) * 0.52;
  const fU =
    localU <= E_END
      ? 0
      : (localU - E_END) / Math.max(1e-6, 1 - E_END);
  const whisperBlend = easeInOutCubic(fU);
  const whisper =
    t >= 1 ? DEFAULT_WHISPER_EMPHASIS : DEFAULT_WHISPER_EMPHASIS * whisperBlend;

  const emphasis =
    t >= 1
      ? DEFAULT_WHISPER_EMPHASIS
      : beat === "F"
        ? emphasisRamp * (1 - whisperBlend * 0.85) + whisper
        : emphasisRamp;

  const proximity = localU >= 0.68 || t >= 1;

  const lineDim =
    beat === "F" || t >= 1
      ? 1 - whisperBlend * (1 - DEFAULT_LINE_WHISPER)
      : 1;

  const constellationBreath = (() => {
    if (t >= 1) return 1;
    if (beat === "D") return 0.06;
    if (beat === "E") {
      const eU = (localU - D_END) / Math.max(1e-6, E_END - D_END);
      return 0.06 + easeInOutCubic(eU) * 0.38;
    }
    return 0.44 + whisperBlend * 0.56;
  })();

  return {
    beat,
    emphasis,
    whisper,
    proximity,
    localU,
    lineDim,
    constellationBreath,
  };
}

/** Sharper slot wake while stroke tip lands (E). */
export function slotWakeAppear(
  appear: number,
  beat: DrawBeat | null,
): number {
  if (appear < 0.04 || !beat || beat === "D") return appear;
  const wake = easeInOutCubic(Math.min(1, (appear - 0.04) / 0.32));
  const boost = beat === "E" ? 0.1 : 0.05;
  return Math.min(1, appear + wake * boost);
}

export function ndcFieldStrength(
  dx: number,
  dy: number,
  radius = PROXIMITY_FIELD_RADIUS,
): number {
  const d = Math.sqrt(dx * dx + dy * dy);
  const t = 1 - d / radius;
  if (t <= 0) return 0;
  return t * t * (3 - 2 * t);
}

export function ndcSegmentField(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number,
  radius = PROXIMITY_FIELD_RADIUS,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  const t =
    ab2 < 1e-8
      ? 0
      : Math.min(1, Math.max(0, (apx * abx + apy * aby) / ab2));
  return ndcFieldStrength(px - (ax + abx * t), py - (ay + aby * t), radius);
}
