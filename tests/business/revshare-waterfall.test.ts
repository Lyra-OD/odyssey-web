import { describe, it, expect } from "vitest";

import {
  packagePartnerTokens,
  resolvePartnerTokenCost,
  packageCents,
} from "@/src/lib/wizard/wizardPricing";

/**
 * Scénario 4 — RevShare Partenaire (webhook checkout.session.completed).
 *
 * Contrat métier verrouillé (miroir EXACT de la fonction SQL
 * `public.compute_revenue_waterfall` — docs/sql/odyssey_p6_1_bulletproof_waterfall.sql) :
 *
 *   Gross → Platform Fee (10 %) → Net Distribuable → Commission (30 %) → Marge Odyssey
 *
 * La commission créditée dans `partner_commission_balances` = 30 % du Net Distribuable.
 * ZÉRO jeton n'est jamais débité (wallets purgés P8).
 *
 * ⚠️ Ce test verrouille les CHIFFRES attendus. La validation de la fonction SQL
 * vivante se fait via docs/sql/odyssey_p6_qa_revshare_accrual.sql (psql/staging).
 */

const PLATFORM_FEE_BPS = 1000; // 10 %
const COMMISSION_RATE_BPS = 3000; // 30 %

type Waterfall = {
  grossCents: number;
  platformFeeCents: number;
  netDistributableCents: number;
  commissionCents: number;
  odysseyMarginCents: number;
};

/** Réplique fidèle du floor() SQL (arrondi vers le bas, comme Postgres). */
function computeRevenueWaterfall(
  grossCents: number,
  platformFeeBps = PLATFORM_FEE_BPS,
  commissionRateBps = COMMISSION_RATE_BPS,
): Waterfall {
  if (grossCents < 0) throw new Error("invalid_gross_payment_cents");
  const platformFeeCents = Math.floor((grossCents * platformFeeBps) / 10000);
  const netDistributableCents = grossCents - platformFeeCents;
  if (netDistributableCents < 0) throw new Error("negative_net_distributable");
  const commissionCents = Math.floor(
    (netDistributableCents * commissionRateBps) / 10000,
  );
  const odysseyMarginCents = netDistributableCents - commissionCents;
  return {
    grossCents,
    platformFeeCents,
    netDistributableCents,
    commissionCents,
    odysseyMarginCents,
  };
}

describe("RevShare — waterfall Bulletproof (30 % du Net Distribuable)", () => {
  it("Héritage 179 $ → commission 48,33 $ = 30 % du net 161,10 $", () => {
    const wf = computeRevenueWaterfall(packageCents("signature")); // 17900
    expect(wf).toEqual({
      grossCents: 17900,
      platformFeeCents: 1790,
      netDistributableCents: 16110,
      commissionCents: 4833,
      odysseyMarginCents: 11277,
    });
    expect(wf.commissionCents).toBe(
      Math.floor((wf.netDistributableCents * 3000) / 10000),
    );
  });

  it("Éternité 349 $ → commission 94,23 $ = 30 % du net 314,10 $", () => {
    const wf = computeRevenueWaterfall(packageCents("heritage")); // 34900
    expect(wf.platformFeeCents).toBe(3490);
    expect(wf.netDistributableCents).toBe(31410);
    expect(wf.commissionCents).toBe(9423);
    expect(wf.odysseyMarginCents).toBe(21987);
  });

  it("Héritage + Retouche IA (228 $) → commission 61,56 $", () => {
    const wf = computeRevenueWaterfall(22800);
    expect(wf.platformFeeCents).toBe(2280);
    expect(wf.netDistributableCents).toBe(20520);
    expect(wf.commissionCents).toBe(6156);
    expect(wf.odysseyMarginCents).toBe(14364);
  });

  it("l'assiette est le NET distribuable, jamais le gross (10 % de fee retirés d'abord)", () => {
    const wf = computeRevenueWaterfall(17900);
    expect(wf.commissionCents).not.toBe(Math.floor(17900 * 0.3));
    expect(wf.commissionCents).toBe(4833);
  });

  it("conservation : platform_fee + commission + marge Odyssey = gross", () => {
    for (const gross of [17900, 34900, 22800, 49900]) {
      const wf = computeRevenueWaterfall(gross);
      expect(
        wf.platformFeeCents + wf.commissionCents + wf.odysseyMarginCents,
      ).toBe(gross);
    }
  });

  it("session à 0 $ (Souvenir offert) → aucune commission", () => {
    const wf = computeRevenueWaterfall(0);
    expect(wf.commissionCents).toBe(0);
  });

  it("ZÉRO jeton : plus aucun débit wallet (purge P8)", () => {
    // Toutes les surfaces tarifaires renvoient 0 / undefined jeton.
    expect(packagePartnerTokens("essential")).toBe(0);
    expect(packagePartnerTokens("signature")).toBe(0);
    expect(packagePartnerTokens("heritage")).toBe(0);
    expect(resolvePartnerTokenCost("signature")).toBeUndefined();
  });
});
