import { describe, expect, it } from "vitest";

import {
  clampUnit,
  detectImageFocalDetailed,
  detectImageFocalFromBlob,
  focalFromFaceBox,
} from "@/src/lib/media/detectImageFocal";

describe("detectImageFocal (C5)", () => {
  it("clampUnit borne 0..1", () => {
    expect(clampUnit(-0.2)).toBe(0);
    expect(clampUnit(0.5)).toBe(0.5);
    expect(clampUnit(1.4)).toBe(1);
    expect(clampUnit(Number.NaN)).toBe(0.5);
  });

  it("focalFromFaceBox — centre horizontal, biais yeux", () => {
    const pt = focalFromFaceBox(
      { x: 100, y: 100, width: 200, height: 200 },
      1000,
      1000,
    );
    expect(pt.x).toBeCloseTo(0.2, 5);
    expect(pt.y).toBeCloseTo(0.17, 5);
  });

  it("focalFromFaceBox — clamp aux bords", () => {
    const pt = focalFromFaceBox(
      { x: -50, y: -50, width: 20, height: 20 },
      100,
      100,
    );
    expect(pt.x).toBeGreaterThanOrEqual(0);
    expect(pt.y).toBeGreaterThanOrEqual(0);
    expect(pt.x).toBeLessThanOrEqual(1);
    expect(pt.y).toBeLessThanOrEqual(1);
  });

  it("detectImageFocalDetailed — non-image → skipped", async () => {
    const blob = new Blob(["not-an-image"], { type: "application/pdf" });
    await expect(detectImageFocalDetailed(blob)).resolves.toEqual({
      point: null,
      engine: "skipped",
    });
  });

  it("detectImageFocalDetailed — heic → skipped", async () => {
    const blob = new Blob([new Uint8Array([0, 1, 2])], { type: "image/heic" });
    await expect(detectImageFocalDetailed(blob)).resolves.toEqual({
      point: null,
      engine: "skipped",
    });
  });

  it("detectImageFocalFromBlob — non-image → null", async () => {
    const blob = new Blob(["x"], { type: "text/plain" });
    await expect(detectImageFocalFromBlob(blob)).resolves.toBeNull();
  });
});
