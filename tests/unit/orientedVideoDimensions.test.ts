import { describe, expect, it } from "vitest";

import {
  VIDEO_MAX_LANDSCAPE,
  VIDEO_MAX_PORTRAIT,
  applyRotationToDimensions,
  assessOrientedDimensions,
  classifyFrameOrientation,
} from "@/src/lib/media/orientedVideoDimensions";

describe("classifyFrameOrientation / applyRotationToDimensions", () => {
  it("classe paysage, portrait et carré", () => {
    expect(classifyFrameOrientation(1920, 1080)).toBe("landscape");
    expect(classifyFrameOrientation(1080, 1920)).toBe("portrait");
    expect(classifyFrameOrientation(1080, 1080)).toBe("square");
  });

  it("applique une rotation 90° / 270° (swap)", () => {
    expect(applyRotationToDimensions(1920, 1080, 90)).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(applyRotationToDimensions(1920, 1080, 270)).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(applyRotationToDimensions(1920, 1080, 0)).toEqual({
      width: 1920,
      height: 1080,
    });
    expect(applyRotationToDimensions(1920, 1080, 180)).toEqual({
      width: 1920,
      height: 1080,
    });
  });
});

describe("assessOrientedDimensions", () => {
  it("accepte paysage et portrait aux plafonds V1", () => {
    expect(assessOrientedDimensions(1920, 1080)).toEqual({
      ok: true,
      width: 1920,
      height: 1080,
      orientation: "landscape",
    });
    expect(assessOrientedDimensions(1080, 1920)).toEqual({
      ok: true,
      width: 1080,
      height: 1920,
      orientation: "portrait",
    });
    expect(VIDEO_MAX_LANDSCAPE).toEqual({ width: 1920, height: 1080 });
    expect(VIDEO_MAX_PORTRAIT).toEqual({ width: 1080, height: 1920 });
  });

  it("refuse paysage / portrait au-delà des limites", () => {
    expect(assessOrientedDimensions(1921, 1080)).toEqual({
      ok: false,
      error: "video_dimensions_exceed_limit",
    });
    expect(assessOrientedDimensions(1920, 1081)).toEqual({
      ok: false,
      error: "video_dimensions_exceed_limit",
    });
    expect(assessOrientedDimensions(1081, 1920)).toEqual({
      ok: false,
      error: "video_dimensions_exceed_limit",
    });
    expect(assessOrientedDimensions(1080, 1921)).toEqual({
      ok: false,
      error: "video_dimensions_exceed_limit",
    });
  });

  it("carré : plafond 1080", () => {
    expect(assessOrientedDimensions(1080, 1080).ok).toBe(true);
    expect(assessOrientedDimensions(1081, 1081)).toEqual({
      ok: false,
      error: "video_dimensions_exceed_limit",
    });
  });

  it("refuse dimensions invalides / ambiguës", () => {
    expect(assessOrientedDimensions(0, 1080)).toEqual({
      ok: false,
      error: "video_dimensions_invalid",
    });
    expect(assessOrientedDimensions(Number.NaN, 1080)).toEqual({
      ok: false,
      error: "video_dimensions_invalid",
    });
    expect(assessOrientedDimensions(-1, 100)).toEqual({
      ok: false,
      error: "video_dimensions_invalid",
    });
  });

  it("rotation portrait iPhone : 1920×1080 + 90° → portrait OK", () => {
    const oriented = applyRotationToDimensions(1920, 1080, 90);
    expect(assessOrientedDimensions(oriented.width, oriented.height)).toEqual({
      ok: true,
      width: 1080,
      height: 1920,
      orientation: "portrait",
    });
  });
});
