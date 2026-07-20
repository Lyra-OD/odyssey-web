import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import {
  normalizeBasePackageId,
  packageTierRank,
  type WizardExtensionsLike,
} from "@/src/lib/wizard/pricingConfig";
import type { WizardExtensionsState } from "@/src/lib/wizard/wizardPricing";
import { normalizeExtensionsState } from "@/src/lib/wizard/wizardPricing";
import {
  getPackageManifest,
  manifestPackageFromWizardBasePackage,
} from "@/src/lib/wizard/wizardDeliverables";
import type { ProjectPaidEntitlementsRow } from "@/src/lib/wizard/exportGate";

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

export async function getProjectPaidEntitlements(
  client: SupabaseClient,
  projectId: string,
): Promise<ProjectPaidEntitlementsRow | null> {
  const { data, error } = await client
    .from("project_paid_entitlements")
    .select(
      "project_id, paid_package, music_license, export_resolution, extensions, paid_at",
    )
    .eq("project_id", projectId)
    .maybeSingle();

  if (error || !data) return null;

  const resolution =
    data.export_resolution === "4K" || data.export_resolution === "1080p"
      ? data.export_resolution
      : "1080p";

  return {
    project_id: data.project_id as string,
    paid_package: normalizeBasePackageId(String(data.paid_package)),
    music_license: Boolean(data.music_license),
    export_resolution: resolution,
    extensions:
      data.extensions && typeof data.extensions === "object"
        ? (data.extensions as Record<string, unknown>)
        : null,
    paid_at: (data.paid_at as string | null) ?? null,
  };
}

export type ExportJobInsert = {
  projectId: string;
  status: "queued" | "blocked";
  allow4k: boolean;
  allowStingrayMaster: boolean;
  denialCode?: string | null;
  message?: string | null;
};

/** Enqueue stub Creatomate job (P9). No external render yet. */
export async function enqueueProjectExportJob(
  admin: SupabaseClient,
  job: ExportJobInsert,
): Promise<{ ok: true; jobId: string } | { ok: false; message: string }> {
  const { data, error } = await admin
    .from("project_export_jobs")
    .insert({
      project_id: job.projectId,
      status: job.status,
      allow_4k: job.allow4k,
      allow_stingray_master: job.allowStingrayMaster,
      denial_code: job.denialCode ?? null,
      message: job.message ?? null,
      provider: "creatomate_stub",
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return {
      ok: false,
      message: error?.message ?? "export_job_insert_failed",
    };
  }
  return { ok: true, jobId: data.id as string };
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
