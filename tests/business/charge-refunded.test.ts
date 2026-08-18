import { describe, expect, it } from "vitest";
import type Stripe from "stripe";

import {
  isChargeFullyRefunded,
  paymentIntentIdFromCharge,
  proportionalClawbackCents,
  resolveIncrementalRefundedCents,
  shouldRevokeFilmEntitlements,
} from "@/src/lib/stripe/chargeRefunded";

function chargeFixture(overrides: Record<string, unknown> = {}): Stripe.Charge {
  return {
    id: "ch_test",
    object: "charge",
    amount: 17900,
    amount_refunded: 0,
    refunded: false,
    payment_intent: "pi_test",
    ...overrides,
  } as unknown as Stripe.Charge;
}

describe("charge.refunded — helpers P0-02", () => {
  it("prend le remboursement le plus récent, pas le cumul", () => {
    const charge = chargeFixture({
      amount_refunded: 17900,
      refunds: {
        data: [{ amount: 8950 }, { amount: 8950 }],
      },
    });
    expect(
      resolveIncrementalRefundedCents(charge, { data: { object: charge } }),
    ).toBe(8950);
  });

  it("retombe sur previous_attributes si refunds.data est vide", () => {
    const charge = chargeFixture({ amount_refunded: 17900 });
    expect(
      resolveIncrementalRefundedCents(charge, {
        data: {
          object: charge,
          previous_attributes: { amount_refunded: 8950 },
        },
      }),
    ).toBe(8950);
  });

  it("détecte un remboursement total", () => {
    expect(
      isChargeFullyRefunded(
        chargeFixture({ amount: 17900, amount_refunded: 17900, refunded: true }),
      ),
    ).toBe(true);
    expect(
      isChargeFullyRefunded(
        chargeFixture({ amount: 17900, amount_refunded: 8950, refunded: false }),
      ),
    ).toBe(false);
  });

  it("extrait le payment_intent string ou objet", () => {
    expect(paymentIntentIdFromCharge(chargeFixture({}))).toBe("pi_test");
    expect(
      paymentIntentIdFromCharge(
        chargeFixture({ payment_intent: { id: "pi_nested" } }),
      ),
    ).toBe("pi_nested");
  });

  it("révoque le film B2C / B2B2C, pas guest_support", () => {
    expect(shouldRevokeFilmEntitlements("b2c")).toBe(true);
    expect(shouldRevokeFilmEntitlements("b2b2c_family")).toBe(true);
    expect(shouldRevokeFilmEntitlements("guest_support")).toBe(false);
  });

  it("S5 — clawback 50 % Héritage = 24,16 $", () => {
    expect(proportionalClawbackCents(4833, 8950, 17900)).toBe(2416);
  });
});
