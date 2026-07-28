import { describe, expect, it } from "vitest";

import {
  SANCTUARY_GUEST_VIDEO_MAX_BYTES,
  SANCTUARY_GUEST_VIDEO_MAX_PER_TOKEN,
  SANCTUARY_GUEST_VIDEO_MAX_SECONDS,
  SANCTUARY_GUEST_VIDEO_MIME_TYPES,
  SANCTUARY_VIDEO_TESTIMONY_IS_LIVE_CAPTURE,
} from "@/src/lib/contribute/sanctuaryLimits";

describe("Sanctuaire · Témoignage Phase 3b (limites)", () => {
  it("reste une capture live (pas upload galerie)", () => {
    expect(SANCTUARY_VIDEO_TESTIMONY_IS_LIVE_CAPTURE).toBe(true);
  });

  it("plafonne durée, poids et re-takes", () => {
    expect(SANCTUARY_GUEST_VIDEO_MAX_SECONDS).toBe(90);
    expect(SANCTUARY_GUEST_VIDEO_MAX_PER_TOKEN).toBe(5);
    expect(SANCTUARY_GUEST_VIDEO_MAX_BYTES).toBe(48 * 1024 * 1024);
  });

  it("accepte les MIME MediaRecorder vidéo courants", () => {
    expect(SANCTUARY_GUEST_VIDEO_MIME_TYPES).toContain("video/webm");
    expect(SANCTUARY_GUEST_VIDEO_MIME_TYPES).toContain("video/mp4");
  });
});
