import { describe, expect, it } from "vitest";

import { MOCK_COMMISSION_DASHBOARD } from "@/src/lib/partner/mockCommissionDashboard";
import {
  formatUsdFromCents,
  payableCents,
} from "@/src/lib/partner/partnerCommissionTypes";

/** Miroir SQL `compute_revenue_waterfall` — floor à chaque étape. */
function computeRevenueWaterfall(grossCents: number) {
  const platformFeeCents = Math.floor((grossCents * 1000) / 10000);
  const netDistributableCents = grossCents - platformFeeCents;
  const commissionCents = Math.floor(
    (netDistributableCents * 3000) / 10000,
  );
  return { netDistributableCents, commissionCents };
}

describe("Mock dashboard commissions Salon", () => {
  it("chaque accrual suit le waterfall 10 % puis 30 % du Net — jamais 30 % du brut", () => {
    const accruals = MOCK_COMMISSION_DASHBOARD.ledger.filter(
      (row) => row.reason === "commission_accrual",
    );

    expect(accruals.length).toBeGreaterThan(0);

    for (const row of accruals) {
      expect(row.gross_payment_cents).not.toBeNull();
      const gross = row.gross_payment_cents as number;
      const wf = computeRevenueWaterfall(gross);
      expect(row.net_distributable_cents).toBe(wf.netDistributableCents);
      expect(row.commission_cents).toBe(wf.commissionCents);
      expect(row.commission_cents).not.toBe(Math.floor((gross * 3000) / 10000));
      expect(row.commission_rate_bps).toBe(3000);
    }
  });

  it("KPIs = somme ledger (accrued confirmed, pending, payout)", () => {
    const { balance, ledger } = MOCK_COMMISSION_DASHBOARD;

    const accrued = ledger
      .filter(
        (row) =>
          row.reason === "commission_accrual" && row.status === "confirmed",
      )
      .reduce((sum, row) => sum + row.commission_cents, 0);

    const pending = ledger
      .filter(
        (row) =>
          row.reason === "commission_accrual" && row.status === "pending",
      )
      .reduce((sum, row) => sum + row.commission_cents, 0);

    const paid = ledger
      .filter((row) => row.reason === "payout")
      .reduce((sum, row) => sum + row.commission_cents, 0);

    expect(balance.accrued_cents).toBe(accrued);
    expect(balance.accrued_cents).toBe(20_412);
    expect(balance.pending_cents).toBe(pending);
    expect(balance.pending_cents).toBe(1_053);
    expect(balance.paid_cents).toBe(paid);
    expect(balance.paid_cents).toBe(10_000);
    expect(payableCents(balance)).toBe(10_412);
    expect(
      ledger.find((row) => row.reason === "payout")?.delta_cents,
    ).toBe(-10_000);
  });

  it("formatUsdFromCents : centimes → dollars, locales CA", () => {
    expect(formatUsdFromCents(4833, "fr")).toMatch(/48[,.]33/);
    expect(formatUsdFromCents(4833, "en")).toMatch(/48[,.]33/);
    expect(formatUsdFromCents(0, "fr")).toMatch(/0[,.]00/);
  });
});
