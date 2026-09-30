import { describe, expect, it } from "vitest";

import {
  clampUnit,
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
    // cx = 200 → 0.2 ; cy = 100 + 70 = 170 → 0.17
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

  it("detectImageFocalFromBlob — non-image → null", async () => {
    const blob = new Blob(["not-an-image"], { type: "application/pdf" });
    await expect(detectImageFocalFromBlob(blob)).resolves.toBeNull();
  });

  it("detectImageFocalFromBlob — heic → null", async () => {
    const blob = new Blob([new Uint8Array([0, 1, 2])], { type: "image/heic" });
    await expect(detectImageFocalFromBlob(blob)).resolves.toBeNull();
  });

  it("detectImageFocalFromBlob — sans FaceDetector → null", async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], {
      type: "image/jpeg",
    });
    // Node / vitest : pas de FaceDetector → null (pas de throw).
    await expect(detectImageFocalFromBlob(blob)).resolves.toBeNull();
  });
});
