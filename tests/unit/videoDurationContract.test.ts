import { describe, expect, it } from "vitest";

import {
  VIDEO_DURATION_CEILING_SEC,
  assessOutputDuration,
  assessSourceDuration,
  isFinitePositiveDuration,
  requestedEncodeDurationSec,
  sourceExceedsLimitWithoutEncode,
} from "@/src/lib/media/videoDurationContract";
import { VIDEO_TRIM_DURATION_SEC } from "@/src/lib/wizard/storyboardPacing";

describe("VIDEO_DURATION_CEILING_SEC", () => {
  it("est aligné sur VIDEO_TRIM_DURATION_SEC (10)", () => {
    expect(VIDEO_DURATION_CEILING_SEC).toBe(10);
    expect(VIDEO_DURATION_CEILING_SEC).toBe(VIDEO_TRIM_DURATION_SEC);
  });
});

describe("isFinitePositiveDuration", () => {
  it("accepte une durée finie strictement positive", () => {
    expect(isFinitePositiveDuration(9.98)).toBe(true);
    expect(isFinitePositiveDuration(10)).toBe(true);
  });

  it("refuse NaN, Infinity, 0 et négatif", () => {
    expect(isFinitePositiveDuration(Number.NaN)).toBe(false);
    expect(isFinitePositiveDuration(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isFinitePositiveDuration(Number.NEGATIVE_INFINITY)).toBe(false);
    expect(isFinitePositiveDuration(0)).toBe(false);
    expect(isFinitePositiveDuration(-1)).toBe(false);
  });
});

describe("assessSourceDuration", () => {
  it("9,98 s : admissible, sans découpe, demande = source", () => {
    expect(assessSourceDuration(9.98)).toEqual({
      ok: true,
      sourceSec: 9.98,
      requiresTrim: false,
      requestedEncodeSec: 9.98,
    });
  });

  it("10,00 s : admissible, sans découpe, demande = 10", () => {
    expect(assessSourceDuration(10)).toEqual({
      ok: true,
      sourceSec: 10,
      requiresTrim: false,
      requestedEncodeSec: 10,
    });
  });

  it("10,02 s : découpe obligatoire, demande plafonnée à 10", () => {
    expect(assessSourceDuration(10.02)).toEqual({
      ok: true,
      sourceSec: 10.02,
      requiresTrim: true,
      requestedEncodeSec: 10,
    });
  });

  it("durée inconnue : video_duration_unknown", () => {
    for (const bad of [Number.NaN, Infinity, -0.1, 0]) {
      expect(assessSourceDuration(bad)).toEqual({
        ok: false,
        error: "video_duration_unknown",
      });
    }
  });
});

describe("requestedEncodeDurationSec", () => {
  it("plafonne à 10,0 s sans être une preuve de durée effective", () => {
    expect(requestedEncodeDurationSec(9.98)).toBe(9.98);
    expect(requestedEncodeDurationSec(45)).toBe(VIDEO_DURATION_CEILING_SEC);
  });
});

describe("assessOutputDuration", () => {
  it("accepte une sortie ≤ 10,0 s", () => {
    expect(assessOutputDuration(9.98)).toEqual({
      ok: true,
      effectiveSec: 9.98,
    });
    expect(assessOutputDuration(10)).toEqual({
      ok: true,
      effectiveSec: 10,
    });
  });

  it("rejette une sortie 10,03 s même si l'encodeur a reçu 10 s", () => {
    expect(assessOutputDuration(10.03)).toEqual({
      ok: false,
      error: "video_output_duration_exceeds_limit",
    });
  });

  it("rejette une durée de sortie inconnue", () => {
    expect(assessOutputDuration(Number.NaN)).toEqual({
      ok: false,
      error: "video_duration_unknown",
    });
  });
});

describe("sourceExceedsLimitWithoutEncode", () => {
  it("expose le code stable de refus amont", () => {
    expect(sourceExceedsLimitWithoutEncode()).toBe(
      "video_duration_exceeds_limit",
    );
  });
});
