import { describe, it, expect, beforeAll } from "vitest";

import { filterAutosavePatchForEditor } from "@/src/lib/wizard/collabAutosave";
import {
  buildWizardEditorCookiePayload,
  decodeWizardEditorCookie,
  encodeWizardEditorCookie,
} from "@/src/lib/wizard/collabSessionCrypto";

describe("collabSessionCookie — HMAC", () => {
  beforeAll(() => {
    if (!process.env.WIZARD_EDITOR_COOKIE_SECRET) {
      process.env.WIZARD_EDITOR_COOKIE_SECRET = "test-collab-cookie-secret";
    }
  });

  it("round-trip encode/decode", () => {
    const payload = buildWizardEditorCookiePayload({
      projectId: "11111111-1111-4111-8111-111111111111",
      tokenId: "22222222-2222-4222-8222-222222222222",
    });
    const raw = encodeWizardEditorCookie(payload);
    const decoded = decodeWizardEditorCookie(raw);
    expect(decoded).toEqual(payload);
  });

  it("rejette une signature altérée", () => {
    const payload = buildWizardEditorCookiePayload({
      projectId: "11111111-1111-4111-8111-111111111111",
      tokenId: "22222222-2222-4222-8222-222222222222",
    });
    const raw = encodeWizardEditorCookie(payload);
    const tampered = `${raw.slice(0, -4)}abcd`;
    expect(decodeWizardEditorCookie(tampered)).toBeNull();
  });
});

describe("filterAutosavePatchForEditor", () => {
  it("accepte storyboard + musicRightsAttestation + step 4", () => {
    const result = filterAutosavePatchForEditor({
      wizard_state: {
        storyboard: { chapters: [] },
        musicRightsAttestation: {
          acceptedAt: "2026-07-24T00:00:00.000Z",
          tosVersion: "v1",
        },
      },
      wizard_step: 4,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.wizard_step).toBe(4);
      expect(result.wizard_state).toHaveProperty("storyboard");
      expect(result.wizard_state).toHaveProperty("musicRightsAttestation");
    }
  });

  it("refuse pricing / extensions / essentials", () => {
    const result = filterAutosavePatchForEditor({
      wizard_state: {
        storyboard: { chapters: [] },
        pricing: { totalCents: 1 },
        extensions: { musicLicense: true },
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden_autosave_keys");
      expect(result.rejectedKeys).toEqual(
        expect.arrayContaining(["pricing", "extensions"]),
      );
    }
  });

  it("refuse wizard_step hors {3,4,5}", () => {
    const result = filterAutosavePatchForEditor({ wizard_step: 7 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden_wizard_step");
    }
  });
});
