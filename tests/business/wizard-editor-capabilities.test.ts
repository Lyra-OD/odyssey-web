import { describe, it, expect } from "vitest";

import {
  WIZARD_EDITOR_ALLOWED_STEPS,
  WIZARD_EDITOR_AUTOSAVE_ALLOWLIST,
  WIZARD_EDITOR_TOKEN_PURPOSE,
  WIZARD_EDITOR_TOKEN_TTL_DAYS,
  assertWizardCapability,
  getWizardCapabilities,
  isWizardEditorAutosaveKey,
  isWizardStepAllowedForRole,
  wizardHasCapability,
} from "@/src/lib/wizard/collabCapabilities";

describe("Wizard Co-Créateur — capabilities (Phase A)", () => {
  it("fige purpose + TTL lien", () => {
    expect(WIZARD_EDITOR_TOKEN_PURPOSE).toBe("wizard_editor");
    expect(WIZARD_EDITOR_TOKEN_TTL_DAYS).toBe(14);
    expect(WIZARD_EDITOR_ALLOWED_STEPS).toEqual([3, 4, 5]);
  });

  it("owner peut checkout et voir le fonds ; editor non", () => {
    expect(wizardHasCapability("owner", "canCheckout")).toBe(true);
    expect(wizardHasCapability("owner", "canViewFundBalance")).toBe(true);
    expect(wizardHasCapability("editor", "canCheckout")).toBe(false);
    expect(wizardHasCapability("editor", "canViewFundBalance")).toBe(false);
    expect(assertWizardCapability("editor", "canCheckout").ok).toBe(false);
  });

  it("editor a Coffre + Musique + Montage, pas essentials / invite / preview", () => {
    const caps = getWizardCapabilities("editor");
    expect(caps.canAccessVault).toBe(true);
    expect(caps.canAccessMusic).toBe(true);
    expect(caps.canAccessMontage).toBe(true);
    expect(caps.canEditMusicSelection).toBe(true);
    expect(caps.canUploadMedia).toBe(true);
    expect(caps.canAccessEssentials).toBe(false);
    expect(caps.canAccessInvite).toBe(false);
    expect(caps.canAccessPreview).toBe(false);
    expect(caps.canAccessCheckout).toBe(false);
    expect(caps.canManageCollabLink).toBe(false);
  });

  it("borne les étapes editor à {3,4,5}", () => {
    expect(isWizardStepAllowedForRole("editor", 3)).toBe(true);
    expect(isWizardStepAllowedForRole("editor", 4)).toBe(true);
    expect(isWizardStepAllowedForRole("editor", 5)).toBe(true);
    expect(isWizardStepAllowedForRole("editor", 1)).toBe(false);
    expect(isWizardStepAllowedForRole("editor", 7)).toBe(false);
    expect(isWizardStepAllowedForRole("owner", 7)).toBe(true);
  });

  it("whitelist autosave editor = storyboard + musicRightsAttestation", () => {
    expect(WIZARD_EDITOR_AUTOSAVE_ALLOWLIST).toEqual([
      "storyboard",
      "musicRightsAttestation",
    ]);
    expect(isWizardEditorAutosaveKey("storyboard")).toBe(true);
    expect(isWizardEditorAutosaveKey("pricing")).toBe(false);
    expect(isWizardEditorAutosaveKey("extensions")).toBe(false);
  });
});
