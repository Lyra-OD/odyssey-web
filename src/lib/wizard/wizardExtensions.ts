import type { WizardExtensionsState, WizardStateV1 } from "@/src/lib/wizard/wizardState";
import {
  normalizeExtensionsState,
  toggleWizardExtension,
} from "@/src/lib/wizard/wizardPricing";

export { toggleWizardExtension, normalizeExtensionsState };

export function coerceExtensionsState(raw: unknown): WizardExtensionsState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const obj = raw as Record<string, unknown>;
  const result: WizardExtensionsState = {};

  if (obj.aiRetouch === true) result.aiRetouch = true;
  if (obj.musicLicense === true || obj.extendedLicense === true) {
    result.musicLicense = true;
  }
  if (obj.sanctuaryToken === true || obj.collectorUsb === true) {
    result.sanctuaryToken = true;
  }
  if (obj.storyVoice === true) result.storyVoice = true;
  if (obj.memoryBook === true) result.memoryBook = true;
  if (obj.digitalVault === true) result.digitalVault = true;
  if (obj.heritagePack === true) {
    result.heritagePack = true;
    result.aiRetouch = true;
    result.musicLicense = true;
    result.digitalVault = true;
  }

  return normalizeExtensionsState(result);
}

/** Mappe les anciens champs upsell / copyrightOption vers extensions. */
export function migrateLegacyExtensions(
  raw: Record<string, unknown>,
  base: WizardExtensionsState,
): WizardExtensionsState {
  const merged = { ...base };

  const upsell = raw.upsell;
  if (upsell && typeof upsell === "object" && !Array.isArray(upsell)) {
    const ai = (upsell as Record<string, unknown>).aiRetouch;
    if (
      ai &&
      typeof ai === "object" &&
      (ai as Record<string, unknown>).enabled === true
    ) {
      merged.aiRetouch = true;
    }
  }

  const copyright = raw.copyrightOption;
  if (
    copyright &&
    typeof copyright === "object" &&
    !Array.isArray(copyright) &&
    (copyright as Record<string, unknown>).extendedBroadcast === true
  ) {
    merged.musicLicense = true;
  }

  return normalizeExtensionsState(merged);
}

/** État persisté sans les clés legacy. */
export function normalizeWizardStateForSave(
  state: WizardStateV1,
): WizardStateV1 {
  const { upsell: _u, copyrightOption: _c, ...rest } = state as WizardStateV1 & {
    upsell?: unknown;
    copyrightOption?: unknown;
  };
  return rest;
}
