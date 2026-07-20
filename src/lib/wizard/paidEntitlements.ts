import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import {
  packageTierRank,
  type WizardExtensionsLike,
} from "@/src/lib/wizard/pricingConfig";
import type { WizardExtensionsState } from "@/src/lib/wizard/wizardPricing";
import { normalizeExtensionsState } from "@/src/lib/wizard/wizardPricing";
import {
  getPackageManifest,
  manifestPackageFromWizardBasePackage,
} from "@/src/lib/wizard/wizardDeliverables";

export type PaidEntitlementsPayload = {
  projectId: string;
  paidPackage: WizardBasePackage;
  musicLicense: boolean;
  extensions: WizardExtensionsState;
  tributeCheckoutId?: string | null;
};

export function resolveExportResolution(
  paidPackage: WizardBasePackage,
): "1080p" | "4K" {
  const manifest = getPackageManifest(
    manifestPackageFromWizardBasePackage(paidPackage),
  );
  return manifest.rendering.exportResolution;
}

/** Entitlement musique post-paiement (forfait Héritage+ ou SKU musicLicense). */
export function resolvePaidMusicLicense(
  paidPackage: WizardBasePackage,
  extensions: WizardExtensionsLike,
): boolean {
  if (packageTierRank(paidPackage) >= 1) return true;
  return Boolean(
    extensions.musicLicense ||
      extensions.extendedLicense ||
      extensions.heritagePack,
  );
}

/**
 * Écriture webhook / freemium_free — service_role only.
 * Ne jamais faire confiance au wizard_state client pour le rendu final.
 */
export async function upsertProjectPaidEntitlements(
  admin: SupabaseClient,
  payload: PaidEntitlementsPayload,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const extensions = normalizeExtensionsState(payload.extensions);
  const musicLicense = resolvePaidMusicLicense(
    payload.paidPackage,
    extensions,
  );
  const exportResolution = resolveExportResolution(payload.paidPackage);

  const { error } = await admin.from("project_paid_entitlements").upsert(
    {
      project_id: payload.projectId,
      paid_package: payload.paidPackage,
      music_license: musicLicense,
      export_resolution: exportResolution,
      extensions,
      tribute_checkout_id: payload.tributeCheckoutId ?? null,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" },
  );

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export function packageMaxMediaForEntitlement(
  packageId: WizardBasePackage,
): number {
  return getPackageManifest(
    manifestPackageFromWizardBasePackage(packageId),
  ).limits.maxMediaItems;
}

export function parseExtensionsFromMetadata(
  raw: string | undefined,
): WizardExtensionsState {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return normalizeExtensionsState(parsed as WizardExtensionsState);
  } catch {
    return {};
  }
}
