import { describe, expect, it } from "vitest";

import {
  clampTrimStartSec,
  computeFrameWidthRatio,
  computeMaxTrimStartSec,
  computeTrimWindowSec,
  frameLeftRatioFromTrimStart,
  playheadRatioInWindow,
  trimStartFromFrameLeftRatio,
  trimStartFromPointerX,
} from "@/src/lib/media/videoTrimMath";
import { VIDEO_TRIM_DURATION_SEC } from "@/src/lib/wizard/storyboardPacing";

describe("videoTrimMath", () => {
  it("position initiale : trimStart=0, cadre = 10/durée", () => {
    const duration = 18.4;
    const windowSec = computeTrimWindowSec(duration);
    expect(windowSec).toBe(VIDEO_TRIM_DURATION_SEC);
    expect(computeMaxTrimStartSec(duration, windowSec)).toBeCloseTo(8.4, 5);
    expect(computeFrameWidthRatio(duration, windowSec)).toBeCloseTo(
      10 / 18.4,
      5,
    );
    expect(frameLeftRatioFromTrimStart(0, duration, windowSec)).toBe(0);
  });

  it("glissement : left ratio → trimStart, puis retour stable", () => {
    const duration = 20;
    const windowSec = 10;
    const midLeft = (1 - 0.5) / 2; // cadre 50% large, centré → left 0.25
    const start = trimStartFromFrameLeftRatio(midLeft, duration, windowSec);
    expect(start).toBeCloseTo(5, 5);
    expect(frameLeftRatioFromTrimStart(start, duration, windowSec)).toBeCloseTo(
      midLeft,
      5,
    );
  });

  it("bornes : trimStart clampé au début et à la fin", () => {
    const duration = 25;
    const maxStart = computeMaxTrimStartSec(duration);
    expect(maxStart).toBe(15);
    expect(clampTrimStartSec(-3, maxStart)).toBe(0);
    expect(clampTrimStartSec(99, maxStart)).toBe(15);
    expect(trimStartFromFrameLeftRatio(-0.2, duration)).toBe(0);
    expect(trimStartFromFrameLeftRatio(1.5, duration)).toBe(15);
  });

  it("pointeur : début / fin de piste", () => {
    const duration = 30;
    const windowSec = 10;
    // Bord gauche → 0
    expect(
      trimStartFromPointerX(0, 0, 100, duration, windowSec, 0),
    ).toBeCloseTo(0, 5);
    // Bord droit du cadre aligné fin de piste
    expect(
      trimStartFromPointerX(100, 0, 100, duration, windowSec, 10 / 30),
    ).toBeCloseTo(20, 5);
  });

  it("vidéo ≤ 10 s : fenêtre = durée, maxStart = 0 (pas de découpe utile)", () => {
    expect(computeTrimWindowSec(7)).toBe(7);
    expect(computeMaxTrimStartSec(7)).toBe(0);
    expect(computeFrameWidthRatio(7)).toBe(1);
    expect(clampTrimStartSec(3, 0)).toBe(0);
  });

  it("confirm contract : trimStart + durationSec fenêtre fixe 10", () => {
    const duration = 40;
    const windowSec = computeTrimWindowSec(duration);
    const maxStart = computeMaxTrimStartSec(duration, windowSec);
    const trimStartSec = clampTrimStartSec(12.3, maxStart);
    expect(windowSec).toBe(10);
    expect(trimStartSec).toBeCloseTo(12.3, 5);
    expect(trimStartSec + windowSec).toBeLessThanOrEqual(duration + 1e-9);
  });

  it("playhead : 0 au début d’extrait, 1 à la fin, clamp hors fenêtre", () => {
    expect(playheadRatioInWindow(4, 4, 10)).toBe(0);
    expect(playheadRatioInWindow(9, 4, 10)).toBeCloseTo(0.5, 5);
    expect(playheadRatioInWindow(14, 4, 10)).toBe(1);
    expect(playheadRatioInWindow(0, 4, 10)).toBe(0);
  });
});
