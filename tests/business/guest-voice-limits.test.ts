import { describe, expect, it } from "vitest";

import {
  SANCTUARY_GUEST_VOICE_MAX_PER_TOKEN,
  SANCTUARY_GUEST_VOICE_MAX_SECONDS,
  SANCTUARY_GUEST_VOICE_MIME_TYPES,
} from "@/src/lib/contribute/sanctuaryLimits";

describe("Sanctuaire — Voix Phase 3b (limites)", () => {
  it("plafonne durée et re-takes", () => {
    expect(SANCTUARY_GUEST_VOICE_MAX_SECONDS).toBe(90);
    expect(SANCTUARY_GUEST_VOICE_MAX_PER_TOKEN).toBe(5);
  });

  it("accepte les MIME MediaRecorder courants", () => {
    expect(SANCTUARY_GUEST_VOICE_MIME_TYPES).toContain("audio/webm");
    expect(SANCTUARY_GUEST_VOICE_MIME_TYPES).toContain("audio/mp4");
  });
});
