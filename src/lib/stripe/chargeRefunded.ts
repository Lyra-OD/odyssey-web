import type Stripe from "stripe";

/**
 * Montant de CE remboursement (pas le cumul `amount_refunded`).
 * Stripe liste `refunds.data` du plus récent au plus ancien.
 */
export function resolveIncrementalRefundedCents(
  charge: Stripe.Charge,
  event: Pick<Stripe.Event, "data">,
): number {
  const latestRefund = charge.refunds?.data?.[0];
  if (latestRefund && latestRefund.amount > 0) {
    return latestRefund.amount;
  }

  const previous = event.data.previous_attributes as
    | { amount_refunded?: number }
    | undefined;
  const previousRefunded = previous?.amount_refunded;
  if (typeof previousRefunded === "number" && Number.isFinite(previousRefunded)) {
    const delta = (charge.amount_refunded ?? 0) - previousRefunded;
    if (delta > 0) return delta;
  }

  return Math.max(0, charge.amount_refunded ?? 0);
}

export function isChargeFullyRefunded(charge: Stripe.Charge): boolean {
  if (charge.refunded === true) return true;
  const amount = charge.amount ?? 0;
  const refunded = charge.amount_refunded ?? 0;
  return amount > 0 && refunded >= amount;
}

export function paymentIntentIdFromCharge(charge: Stripe.Charge): string | null {
  if (typeof charge.payment_intent === "string") {
    const id = charge.payment_intent.trim();
    return id || null;
  }
  const nested = charge.payment_intent?.id?.trim() ?? "";
  return nested || null;
}

/** Film Wizard (B2C / B2B2C) — pas les micro-transactions invité. */
export function shouldRevokeFilmEntitlements(
  checkoutMode: string | null | undefined,
): boolean {
  return checkoutMode === "b2c" || checkoutMode === "b2b2c_family";
}

export function proportionalClawbackCents(
  commissionSnapshotCents: number,
  refundedCents: number,
  grossSnapshotCents: number,
): number {
  if (grossSnapshotCents <= 0 || refundedCents <= 0 || commissionSnapshotCents <= 0) {
    return 0;
  }
  return Math.floor(
    (commissionSnapshotCents * refundedCents) / grossSnapshotCents,
  );
}
