import { describe, it, expect } from "vitest";

/**
 * Cascade V-Final — waterfall d'une contribution invité (Boucle Virale).
 *
 * Miroir EXACT du RPC `public.accrue_guest_micro_checkout`
 * (docs/sql/odyssey_p10_1_memorial_fund_rpc.sql), lui-même bâti sur
 * `public.compute_revenue_waterfall` :
 *
 *   Gross → Platform Fee (10 %) → Net Distribuable → Commission Athos (30 %)
 *         → Crédit Fonds = Net × fund_conversion_bps (défaut 100 %)
 *
 * Règles verrouillées :
 *   - La commission Athos n'est accréditée QUE si le tenant est freemium
 *     (partenaire). En B2C direct : commission 0, MAIS crédit fonds quand même.
 *   - Le crédit fonds est PORTÉ PAR ODYSSEY, il ne réduit jamais la commission
 *     cash d'Athos (le "gâteau grandit").
 *   - Plafond dur par transaction : 1000 $ (100000 centimes).
 */

const PLATFORM_FEE_BPS = 1000; // 10 %
const COMMISSION_RATE_BPS = 3000; // 30 %
const FUND_CONVERSION_BPS = 10000; // 100 %
const GUEST_TXN_MAX_CENTS = 100_000;

type GuestAccrual = {
  grossCents: number;
  platformFeeCents: number;
  netDistributableCents: number;
  commissionCents: number; // effectivement accrédité (0 si non freemium)
  fundCreditCents: number;
  odysseyMarginCents: number;
};

/** Réplique fidèle du RPC (floor() = arrondi bas Postgres). */
function accrueGuestMicroCheckout(
  grossCents: number,
  opts: {
    isFreemium: boolean;
    platformFeeBps?: number;
    commissionRateBps?: number;
    fundConversionBps?: number;
  },
): GuestAccrual {
  if (grossCents <= 0) throw new Error("zero_gross");
  if (grossCents > GUEST_TXN_MAX_CENTS) throw new Error("gross_cap_exceeded");

  const platformFeeBps = opts.platformFeeBps ?? PLATFORM_FEE_BPS;
  const commissionRateBps = opts.commissionRateBps ?? COMMISSION_RATE_BPS;
  const fundConversionBps = opts.fundConversionBps ?? FUND_CONVERSION_BPS;

  const platformFeeCents = Math.floor((grossCents * platformFeeBps) / 10000);
  const netDistributableCents = grossCents - platformFeeCents;
  const grossCommissionCents = Math.floor(
    (netDistributableCents * commissionRateBps) / 10000,
  );
  const commissionCents = opts.isFreemium ? grossCommissionCents : 0;
  const fundCreditCents = Math.floor(
    (netDistributableCents * fundConversionBps) / 10000,
  );
  const odysseyMarginCents = netDistributableCents - commissionCents;

  return {
    grossCents,
    platformFeeCents,
    netDistributableCents,
    commissionCents,
    fundCreditCents,
    odysseyMarginCents,
  };
}

describe("Waterfall invité — tenant freemium (partenaire)", () => {
  it("Pack HD 49 $ → net 44,10 $, commission 13,23 $, crédit fonds 44,10 $", () => {
    const a = accrueGuestMicroCheckout(49_00, { isFreemium: true });
    expect(a.platformFeeCents).toBe(490);
    expect(a.netDistributableCents).toBe(4_410);
    expect(a.commissionCents).toBe(1_323);
    expect(a.fundCreditCents).toBe(4_410);
    expect(a.odysseyMarginCents).toBe(3_087);
  });

  it("Pack Héritage 89 $ → net 80,10 $, commission 24,03 $, crédit fonds 80,10 $", () => {
    const a = accrueGuestMicroCheckout(89_00, { isFreemium: true });
    expect(a.platformFeeCents).toBe(890);
    expect(a.netDistributableCents).toBe(8_010);
    expect(a.commissionCents).toBe(2_403);
    expect(a.fundCreditCents).toBe(8_010);
  });

  it("Bougie 15 $ → net 13,50 $, commission 4,05 $, crédit fonds 13,50 $", () => {
    const a = accrueGuestMicroCheckout(15_00, { isFreemium: true });
    expect(a.platformFeeCents).toBe(150);
    expect(a.netDistributableCents).toBe(1_350);
    expect(a.commissionCents).toBe(405);
    expect(a.fundCreditCents).toBe(1_350);
  });
});

describe("Waterfall invité — tenant B2C direct (non freemium)", () => {
  it("Pack HD 49 $ → commission Athos 0, MAIS crédit fonds 44,10 $ conservé", () => {
    const a = accrueGuestMicroCheckout(49_00, { isFreemium: false });
    expect(a.commissionCents).toBe(0);
    expect(a.netDistributableCents).toBe(4_410);
    expect(a.fundCreditCents).toBe(4_410);
    // Odyssey garde toute la marge nette (pas de partenaire à rémunérer).
    expect(a.odysseyMarginCents).toBe(4_410);
  });
});

describe("Waterfall invité — invariants & garde-fous", () => {
  it("conservation : platform_fee + net == gross", () => {
    for (const gross of [15_00, 49_00, 89_00, 999_99]) {
      const a = accrueGuestMicroCheckout(gross, { isFreemium: true });
      expect(a.platformFeeCents + a.netDistributableCents).toBe(gross);
    }
  });

  it("commission ≤ net et crédit fonds ≤ net (bornes)", () => {
    for (const gross of [15_00, 49_00, 89_00]) {
      const a = accrueGuestMicroCheckout(gross, { isFreemium: true });
      expect(a.commissionCents).toBeLessThanOrEqual(a.netDistributableCents);
      expect(a.fundCreditCents).toBeLessThanOrEqual(a.netDistributableCents);
    }
  });

  it("le crédit fonds ne réduit jamais la commission cash d'Athos", () => {
    // Conversion 100 % : le fonds = net entier, la commission reste intacte.
    const a = accrueGuestMicroCheckout(89_00, { isFreemium: true });
    expect(a.commissionCents).toBe(2_403);
    expect(a.fundCreditCents).toBe(a.netDistributableCents);
  });

  it("plafond dur : transaction > 1000 $ rejetée", () => {
    expect(() =>
      accrueGuestMicroCheckout(GUEST_TXN_MAX_CENTS + 1, { isFreemium: true }),
    ).toThrow(/gross_cap_exceeded/);
  });

  it("conversion configurable (Option B) : 50 % → crédit fonds = moitié du net", () => {
    const a = accrueGuestMicroCheckout(49_00, {
      isFreemium: true,
      fundConversionBps: 5000,
    });
    expect(a.netDistributableCents).toBe(4_410);
    expect(a.fundCreditCents).toBe(2_205);
  });
});
