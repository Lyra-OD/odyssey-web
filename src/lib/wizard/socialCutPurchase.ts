/**
 * C13 — Social Cut 9:16 · 19 $ · après Master · render vertical stub.
 * Canon : docs/product/SOUVENIR_STREAM_MASTER_49.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasCinemaMasterExportEntitlement } from "@/src/lib/wizard/exportGate";
import { getProjectPaidEntitlements } from "@/src/lib/wizard/paidEntitlements";

export const SOCIAL_CUT_SKU = "socialCut" as const;

/** 19 $ USD — pastille Stories ~30–45 s. */
export const SOCIAL_CUT_CENTS = 1900;

export function isSocialCutProductKey(
  key: string | null | undefined,
): key is typeof SOCIAL_CUT_SKU {
  return key === SOCIAL_CUT_SKU;
}

export function socialCutPurchaseLabel(locale: "fr" | "en"): string {
  return locale === "en"
    ? "Social Cut 9:16 · $19"
    : "Social Cut 9:16 · 19 $";
}

export type FulfillSocialCutResult = {
  jobId: string | null;
  alreadyQueued: boolean;
};

/**
 * Après paiement : enqueue job vertical stub (pas le Master 16:9).
 * Prérequis : Master cinéma déjà unlocked.
 */
export async function fulfillSocialCutPurchase(
  admin: SupabaseClient,
  params: { projectId: string },
): Promise<FulfillSocialCutResult> {
  const entitlements = await getProjectPaidEntitlements(admin, params.projectId);
  if (!entitlements || !hasCinemaMasterExportEntitlement(entitlements)) {
    throw new Error("social_cut_requires_master");
  }

  const { data: existing } = await admin
    .from("project_export_jobs")
    .select("id")
    .eq("project_id", params.projectId)
    .eq("provider", "creatomate_social_stub")
    .in("status", ["queued", "processing", "rendering", "completed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await stampSocialCutState(admin, params.projectId, existing.id as string);
    return { jobId: existing.id as string, alreadyQueued: true };
  }

  const { data: job, error } = await admin
    .from("project_export_jobs")
    .insert({
      project_id: params.projectId,
      status: "queued",
      allow_4k: false,
      allow_stingray_master: true,
      provider: "creatomate_social_stub",
      message: "C13 Social Cut 9:16 stub · 30–45s Stories",
    })
    .select("id")
    .single();

  if (error || !job?.id) {
    throw new Error(error?.message ?? "social_cut_enqueue_failed");
  }

  await stampSocialCutState(admin, params.projectId, job.id as string);
  return { jobId: job.id as string, alreadyQueued: false };
}

async function stampSocialCutState(
  admin: SupabaseClient,
  projectId: string,
  jobId: string,
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

  await admin
    .from("projects")
    .update({
      wizard_state: {
        ...prev,
        socialCut: {
          entitled: true,
          jobId,
          purchasedAt: new Date().toISOString(),
          aspect: "9:16",
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
}
