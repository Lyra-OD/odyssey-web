import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import {
  isChargeFullyRefunded,
  paymentIntentIdFromCharge,
  resolveIncrementalRefundedCents,
  shouldRevokeFilmEntitlements,
} from "@/src/lib/stripe/chargeRefunded";
import { revokeProjectPaidEntitlements } from "@/src/lib/wizard/paidEntitlements";

type WebhookStatus = "processed" | "ignored";

type TributeCheckoutRefundRow = {
  id: string;
  checkout_mode: string | null;
  project_id: string | null;
};

type ClawbackRpcResult = {
  ok?: boolean;
  reason?: string;
  already_processed?: boolean;
  ledger_id?: string;
  clawback_cents?: number;
  is_total_clawback?: boolean;
};

const CLAWBACK_SKIP_REASONS = new Set([
  "no_accrual_to_clawback",
  "zero_refunded_cents",
  "zero_clawback",
  "missing_gross_snapshot",
  "missing_commission_snapshot",
]);

function logRefund(payload: Record<string, unknown>) {
  console.info("[stripe/charge.refunded]", JSON.stringify(payload));
}

async function resolveSessionMetadata(
  stripe: Stripe,
  paymentIntentId: string,
): Promise<{ projectId: string | null; checkoutMode: string | null }> {
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });
  const metadata = sessions.data[0]?.metadata ?? {};
  return {
    projectId: metadata.project_id?.trim() || null,
    checkoutMode: metadata.checkout_mode?.trim() || null,
  };
}

/**
 * P0-02 — clawback RevShare + révocation entitlements film (fail-closed).
 */
export async function handleChargeRefunded(
  charge: Stripe.Charge,
  event: Stripe.Event,
  supabase: SupabaseClient,
  stripe: Stripe,
): Promise<WebhookStatus> {
  const paymentIntentId = paymentIntentIdFromCharge(charge);
  if (!paymentIntentId) {
    logRefund({
      event_id: event.id,
      charge_id: charge.id,
      status_after: "ignored",
      reason: "missing_payment_intent",
    });
    return "ignored";
  }

  const refundedCents = resolveIncrementalRefundedCents(charge, event);
  const fullyRefunded = isChargeFullyRefunded(charge);

  const { data: checkout, error: checkoutError } = await supabase
    .from("tribute_checkouts")
    .select("id, checkout_mode, project_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (checkoutError) {
    throw new Error(`tribute_checkout_refund_lookup_failed: ${checkoutError.message}`);
  }

  const checkoutRow = (checkout ?? null) as TributeCheckoutRefundRow | null;
  let didWork = false;

  if (checkoutRow?.id && refundedCents > 0) {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "clawback_partner_commission",
      {
        p_checkout_id: checkoutRow.id,
        p_refunded_cents: refundedCents,
        p_stripe_event_id: event.id,
        p_reason: "refund",
      },
    );

    if (rpcError) {
      throw new Error(`clawback_partner_commission_failed: ${rpcError.message}`);
    }

    const result = (rpcData ?? {}) as ClawbackRpcResult;
    if (result.ok === true) {
      didWork = true;
      logRefund({
        event_id: event.id,
        checkout_id: checkoutRow.id,
        clawback_cents: result.clawback_cents ?? null,
        already_processed: Boolean(result.already_processed),
        is_total_clawback: Boolean(result.is_total_clawback),
      });
    } else if (!result.reason || CLAWBACK_SKIP_REASONS.has(result.reason)) {
      logRefund({
        event_id: event.id,
        checkout_id: checkoutRow.id,
        reason: result.reason ?? "unknown",
        context: "clawback_skipped",
      });
    } else {
      throw new Error(`clawback_partner_commission_rejected: ${result.reason}`);
    }
  }

  if (fullyRefunded) {
    let projectId = checkoutRow?.project_id ?? null;
    let checkoutMode = checkoutRow?.checkout_mode ?? null;

    if (!shouldRevokeFilmEntitlements(checkoutMode) || !projectId) {
      const fromSession = await resolveSessionMetadata(stripe, paymentIntentId);
      projectId = projectId || fromSession.projectId;
      checkoutMode = checkoutMode || fromSession.checkoutMode;
    }

    if (projectId && shouldRevokeFilmEntitlements(checkoutMode)) {
      const revoked = await revokeProjectPaidEntitlements(supabase, projectId);
      if (!revoked.ok) {
        throw new Error(`paid_entitlements_revoke_failed: ${revoked.message}`);
      }
      didWork = true;
      logRefund({
        event_id: event.id,
        project_id: projectId,
        checkout_mode: checkoutMode,
        context: "entitlements_revoked",
      });
    }
  }

  if (!didWork) {
    logRefund({
      event_id: event.id,
      payment_intent_id: paymentIntentId,
      fully_refunded: fullyRefunded,
      refunded_cents: refundedCents,
      status_after: "ignored",
      reason: "no_odyssey_checkout_or_entitlements",
    });
    return "ignored";
  }

  return "processed";
}
