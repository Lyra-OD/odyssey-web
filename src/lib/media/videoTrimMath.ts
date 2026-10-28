/**
 * Commit 8 — maths de la fenêtre de découpe fixe (10 s).
 * Pures : testables sous Node sans React.
 */

import { VIDEO_TRIM_DURATION_SEC } from "@/src/lib/wizard/storyboardPacing";

export function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Durée de fenêtre : min(10, durée source) si source valide. */
export function computeTrimWindowSec(sourceDurationSec: number): number {
  if (!Number.isFinite(sourceDurationSec) || sourceDurationSec <= 0) {
    return VIDEO_TRIM_DURATION_SEC;
  }
  return Math.min(VIDEO_TRIM_DURATION_SEC, sourceDurationSec);
}

/**
 * Bornes : 0 ≤ trimStart ≤ max(0, durée − fenêtre).
 */
export function computeMaxTrimStartSec(
  sourceDurationSec: number,
  windowSec: number = computeTrimWindowSec(sourceDurationSec),
): number {
  if (!Number.isFinite(sourceDurationSec) || sourceDurationSec <= 0) {
    return 0;
  }
  return Math.max(0, sourceDurationSec - windowSec);
}

export function clampTrimStartSec(
  trimStartSec: number,
  maxStartSec: number,
): number {
  return clampNumber(trimStartSec, 0, Math.max(0, maxStartSec));
}

/**
 * Largeur relative du cadre sur le filmstrip :
 * w = fenêtre / duréeTotale (bornée à 1).
 */
export function computeFrameWidthRatio(
  sourceDurationSec: number,
  windowSec: number = computeTrimWindowSec(sourceDurationSec),
): number {
  if (!Number.isFinite(sourceDurationSec) || sourceDurationSec <= 0) {
    return 1;
  }
  return clampNumber(windowSec / sourceDurationSec, 0, 1);
}

/**
 * Convertit la position du bord gauche du cadre (0..1 du track)
 * en trimStartSec, en tenant compte de la largeur du cadre.
 * `frameLeftRatio` = left / trackWidth.
 */
export function trimStartFromFrameLeftRatio(
  frameLeftRatio: number,
  sourceDurationSec: number,
  windowSec: number = computeTrimWindowSec(sourceDurationSec),
): number {
  const maxStart = computeMaxTrimStartSec(sourceDurationSec, windowSec);
  if (maxStart <= 0) return 0;
  const usable = 1 - computeFrameWidthRatio(sourceDurationSec, windowSec);
  if (usable <= 0) return 0;
  const t = clampNumber(frameLeftRatio, 0, 1) / usable;
  return clampTrimStartSec(t * maxStart, maxStart);
}

/**
 * Position gauche du cadre (0..1) pour un trimStart donné.
 */
export function frameLeftRatioFromTrimStart(
  trimStartSec: number,
  sourceDurationSec: number,
  windowSec: number = computeTrimWindowSec(sourceDurationSec),
): number {
  const maxStart = computeMaxTrimStartSec(sourceDurationSec, windowSec);
  const ratio = computeFrameWidthRatio(sourceDurationSec, windowSec);
  if (maxStart <= 0) return 0;
  const usable = 1 - ratio;
  if (usable <= 0) return 0;
  const start = clampTrimStartSec(trimStartSec, maxStart);
  return clampNumber((start / maxStart) * usable, 0, usable);
}

/**
 * Position relative du playhead dans la fenêtre [0, 1].
 * 0 = début d’extrait, 1 = fin d’extrait.
 */
export function playheadRatioInWindow(
  currentTimeSec: number,
  trimStartSec: number,
  windowSec: number,
): number {
  if (!(windowSec > 0)) return 0;
  return clampNumber((currentTimeSec - trimStartSec) / windowSec, 0, 1);
}

/** Pointer X relatif au track → trimStart (centre de drag sur le cadre). */
export function trimStartFromPointerX(
  clientX: number,
  trackLeft: number,
  trackWidth: number,
  sourceDurationSec: number,
  windowSec: number = computeTrimWindowSec(sourceDurationSec),
  /** Offset dans le cadre au moment du pointerdown (0 = bord gauche). */
  grabOffsetRatioInFrame: number = 0,
): number {
  if (!(trackWidth > 0)) return 0;
  const frameRatio = computeFrameWidthRatio(sourceDurationSec, windowSec);
  const xRatio = (clientX - trackLeft) / trackWidth - grabOffsetRatioInFrame;
  return trimStartFromFrameLeftRatio(xRatio, sourceDurationSec, windowSec);
}
