import type { SupabaseClient } from "@supabase/supabase-js";

import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";

const REUSABLE_STATUSES = new Set([
  "pending",
  "awaiting_payment",
  "failed",
  "partner_debited",
]);

export type TributeCheckoutInsert = {
  projectId: string;
  tenantId: string;
  invitationId: string;
  grantedPackage: WizardBasePackage;
  selectedPackage: WizardBasePackage;
  familyTotalCents: number;
  platformFeeBps: number;
  commissionRateBps: number;
  idempotencyKey: string;
};

export type ResolveTributeCheckoutResult =
  | { ok: true; id: string; reused: boolean }
  | { ok: false; reason: "already_completed" | "insert_failed"; message: string };

export function isUniqueViolation(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return (error.message ?? "").includes("idx_tribute_checkouts_idempotency_key");
}

/**
 * Insert tribute_checkouts, or reuse the row if the same idempotency key
 * already exists (retry after Stripe failure / double-click).
 */
export async function resolveTributeCheckoutForRetry(
  admin: SupabaseClient,
  payload: TributeCheckoutInsert,
): Promise<ResolveTributeCheckoutResult> {
  const { data: inserted, error: insertError } = await admin
    .from("tribute_checkouts")
    .insert({
      project_id: payload.projectId,
      tenant_id: payload.tenantId,
      invitation_id: payload.invitationId,
      checkout_mode: "b2b2c_family",
      granted_package: payload.grantedPackage,
      selected_package: payload.selectedPackage,
      family_total_cents: payload.familyTotalCents,
      partner_tokens_debited: 0,
      status: "pending",
      platform_fee_bps: payload.platformFeeBps,
      commission_rate_bps: payload.commissionRateBps,
      idempotency_key: payload.idempotencyKey,
    })
    .select("id")
    .single();

  if (!insertError && inserted?.id) {
    return { ok: true, id: inserted.id as string, reused: false };
  }

  if (!isUniqueViolation(insertError)) {
    return {
      ok: false,
      reason: "insert_failed",
      message: insertError?.message ?? "insert_failed",
    };
  }

  const { data: existing, error: lookupError } = await admin
    .from("tribute_checkouts")
    .select("id, status")
    .eq("idempotency_key", payload.idempotencyKey)
    .maybeSingle();

  if (lookupError || !existing?.id) {
    return {
      ok: false,
      reason: "insert_failed",
      message: lookupError?.message ?? "idempotency_lookup_failed",
    };
  }

  if (existing.status === "completed") {
    return {
      ok: false,
      reason: "already_completed",
      message: "checkout_already_completed",
    };
  }

  if (!REUSABLE_STATUSES.has(String(existing.status))) {
    return {
      ok: false,
      reason: "insert_failed",
      message: `checkout_not_reusable:${existing.status}`,
    };
  }

  const { error: resetError } = await admin
    .from("tribute_checkouts")
    .update({
      status: "pending",
      failure_reason: null,
      family_total_cents: payload.familyTotalCents,
      selected_package: payload.selectedPackage,
      granted_package: payload.grantedPackage,
      platform_fee_bps: payload.platformFeeBps,
      commission_rate_bps: payload.commissionRateBps,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (resetError) {
    return {
      ok: false,
      reason: "insert_failed",
      message: resetError.message,
    };
  }

  return { ok: true, id: existing.id as string, reused: true };
}
