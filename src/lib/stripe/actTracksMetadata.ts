import type { WizardActTracks } from "@/src/lib/wizard/stingrayCatalog";
import { WIZARD_ACT_TRACK_KEYS } from "@/src/lib/wizard/stingrayCatalog";

/** Stripe Checkout — max 500 caractères par valeur metadata. */
export const STRIPE_METADATA_VALUE_MAX = 500;

/**
 * Référence licensing Stingray dans metadata Stripe — trackId seul.
 * Source de vérité export : `projects.wizard_state` (storyboard / musicalAmbiance).
 */
export function serializeActTracksForStripeMetadata(
  tracks: WizardActTracks,
): string {
  const compact: Record<string, string> = {};
  for (const key of WIZARD_ACT_TRACK_KEYS) {
    const trackId = tracks[key]?.trackId?.trim();
    if (trackId) {
      compact[key] = trackId;
    }
  }
  return JSON.stringify(compact);
}

export function assertStripeMetadataWithinLimit(
  metadata: Record<string, string>,
): void {
  for (const [key, value] of Object.entries(metadata)) {
    if (value.length > STRIPE_METADATA_VALUE_MAX) {
      throw new Error(
        `stripe_metadata_too_long:${key}:${value.length}`,
      );
    }
  }
}
