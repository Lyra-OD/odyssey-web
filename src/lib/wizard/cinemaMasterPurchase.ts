/**
 * C11 — Master multi-acheteurs · 49 $ · #1 unlock+render · #2…n Fonds + download.
 * Canon : docs/product/SOUVENIR_STREAM_MASTER_49.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  hasCinemaMasterExportEntitlement,
  type ProjectPaidEntitlementsRow,
} from "@/src/lib/wizard/exportGate";
import {
  enqueueProjectExportJob,
  getProjectPaidEntitlements,
  upsertProjectPaidEntitlements,
} from "@/src/lib/wizard/paidEntitlements";
import { extensionCents } from "@/src/lib/wizard/pricingConfig";
import type { WizardExtensionsState } from "@/src/lib/wizard/wizardPricing";
import { normalizeExtensionsState } from "@/src/lib/wizard/wizardPricing";

export const CINEMA_MASTER_SKU = "cinemaMaster" as const;
export const CINEMA_MASTER_GIFT_SKU = "cinemaMasterGift" as const;

export type CinemaMasterProductKey =
  | typeof CINEMA_MASTER_SKU
  | typeof CINEMA_MASTER_GIFT_SKU;

export const CINEMA_MASTER_PURCHASE_CENTS = extensionCents("cinemaMaster");

export function isCinemaMasterProductKey(
  key: string | null | undefined,
): key is CinemaMasterProductKey {
  return key === CINEMA_MASTER_SKU || key === CINEMA_MASTER_GIFT_SKU;
}

export function cinemaMasterPurchaseLabel(
  sku: CinemaMasterProductKey,
  locale: "fr" | "en",
): string {
  if (sku === CINEMA_MASTER_GIFT_SKU) {
    return locale === "en"
      ? "Gift Cinema Master archive · $49"
      : "Offrir l'Archive Master · 49 $";
  }
  return locale === "en"
    ? "Cinema Master archive · $49"
    : "Archive Master cinéma · 49 $";
}

export type FulfillCinemaMasterResult = {
  firstUnlock: boolean;
  exportQueued: boolean;
};

/**
 * Après paiement Stripe (webhook) : unlock entitlements si besoin,
 * enqueue Creatomate **une seule fois** (#1), jamais de 2ᵉ render (#2…n).
 * Le crédit Fonds est déjà posé par `accrue_guest_micro_checkout`.
 */
export async function fulfillCinemaMasterPurchase(
  admin: SupabaseClient,
  params: {
    projectId: string;
    productKey: CinemaMasterProductKey;
    donorName?: string | null;
  },
): Promise<FulfillCinemaMasterResult> {
  const existing = await getProjectPaidEntitlements(admin, params.projectId);
  const wasUnlocked = existing
    ? hasCinemaMasterExportEntitlement(existing)
    : false;

  const prevExt = normalizeExtensionsState(
    (existing?.extensions as WizardExtensionsState | null) ?? {},
  );
  const nextExt: WizardExtensionsState = {
    ...prevExt,
    cinemaMaster: true,
  };

  const paidPackage = existing?.paid_package ?? "essential";
  const entitlements = await upsertProjectPaidEntitlements(admin, {
    projectId: params.projectId,
    paidPackage,
    musicLicense: existing?.music_license ?? false,
    extensions: nextExt,
  });
  if (!entitlements.ok) {
    throw new Error(`cinema_master_entitlements_failed: ${entitlements.message}`);
  }

  let exportQueued = false;
  if (!wasUnlocked) {
    const { data: readyJob } = await admin
      .from("project_export_jobs")
      .select("id")
      .eq("project_id", params.projectId)
      .eq("status", "completed")
      .not("output_url", "is", null)
      .limit(1)
      .maybeSingle();

    if (!readyJob?.id) {
      const { data: queued } = await admin
        .from("project_export_jobs")
        .select("id")
        .eq("project_id", params.projectId)
        .in("status", ["queued", "processing", "rendering"])
        .limit(1)
        .maybeSingle();

      if (!queued?.id) {
        const allow4k =
          (existing as ProjectPaidEntitlementsRow | null)?.export_resolution ===
          "4K";
        const enqueued = await enqueueProjectExportJob(admin, {
          projectId: params.projectId,
          status: "queued",
          allow4k,
          allowStingrayMaster: true,
        });
        exportQueued = enqueued.ok;
      }
    }

    // Merci premier mécène — hub/stream only (pas dans le MP4).
    if (params.donorName?.trim()) {
      await stampFirstMasterPatron(admin, params.projectId, params.donorName.trim());
    }
  }

  return { firstUnlock: !wasUnlocked, exportQueued };
}

async function stampFirstMasterPatron(
  admin: SupabaseClient,
  projectId: string,
  donorName: string,
): Promise<void> {
  const { data: project } = await admin
    .from("projects")
    .select("wizard_state")
    .eq("id", projectId)
    .maybeSingle();

  const prev =
    project?.wizard_state &&
    typeof project.wizard_state === "object" &&
    !Array.isArray(project.wizard_state)
      ? (project.wizard_state as Record<string, unknown>)
      : {};

  if (
    prev.cinemaMasterFirstPatron &&
    typeof prev.cinemaMasterFirstPatron === "object"
  ) {
    return;
  }

  await admin
    .from("projects")
    .update({
      wizard_state: {
        ...prev,
        cinemaMasterFirstPatron: {
          displayName: donorName,
          at: new Date().toISOString(),
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
}
