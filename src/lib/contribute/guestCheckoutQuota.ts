/**
 * Plafond checkouts pending par token contribute (anti-spam Stripe).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { SANCTUARY_GUEST_PENDING_CHECKOUT_MAX } from "@/src/lib/contribute/sanctuaryLimits";

export const GUEST_CHECKOUT_PENDING_LIMIT_ERROR =
  "guest_checkout_pending_limit_reached" as const;

export function isGuestPendingCheckoutQuotaExceeded(
  currentPending: number,
  max = SANCTUARY_GUEST_PENDING_CHECKOUT_MAX,
): boolean {
  return currentPending >= max;
}

export async function countPendingGuestCheckoutsForToken(
  admin: SupabaseClient,
  params: { accessTokenId: string },
): Promise<number> {
  const { count, error } = await admin
    .from("guest_micro_checkouts")
    .select("id", { count: "exact", head: true })
    .eq("project_access_token_id", params.accessTokenId)
    .eq("status", "pending");

  if (error) {
    throw new Error(`guest_checkout_pending_count_failed: ${error.message}`);
  }

  return count ?? 0;
}

export async function canAcceptGuestPendingCheckout(
  admin: SupabaseClient,
  params: { accessTokenId: string },
): Promise<{ ok: true; count: number } | { ok: false; count: number }> {
  const count = await countPendingGuestCheckoutsForToken(admin, params);
  if (isGuestPendingCheckoutQuotaExceeded(count)) {
    return { ok: false, count };
  }
  return { ok: true, count };
}
