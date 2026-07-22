import { describe, it, expect } from "vitest";

/**
 * Cascade V-Final — waterfall d'une contribution invité (Boucle Virale).
 * Grille Phase 0 (22/07/2026) : Voix 69 $ · Vidéo 119 $ · Coproduction 129 $ · Bougie 15 $.
 */

const PLATFORM_FEE_BPS = 1000;
const COMMISSION_RATE_BPS = 3000;
const FUND_CONVERSION_BPS = 10000;
const GUEST_TXN_MAX_CENTS = 100_000;

type GuestAccrual = {
  grossCents: number;
  platformFeeCents: number;
  netDistributableCents: number;
  commissionCents: number;
  fundCreditCents: number;
  odysseyMarginCents: number;
};

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
  it("Voix 69 $ → net 62,10 $, commission 18,63 $, crédit fonds 62,10 $", () => {
    const a = accrueGuestMicroCheckout(69_00, { isFreemium: true });
    expect(a.platformFeeCents).toBe(690);
    expect(a.netDistributableCents).toBe(6_210);
    expect(a.commissionCents).toBe(1_863);
    expect(a.fundCreditCents).toBe(6_210);
    expect(a.odysseyMarginCents).toBe(4_347);
  });

  it("Vidéo 119 $ → net 107,10 $, commission 32,13 $, crédit fonds 107,10 $", () => {
    const a = accrueGuestMicroCheckout(119_00, { isFreemium: true });
    expect(a.platformFeeCents).toBe(1_190);
    expect(a.netDistributableCents).toBe(10_710);
    expect(a.commissionCents).toBe(3_213);
    expect(a.fundCreditCents).toBe(10_710);
  });

  it("Coproduction 129 $ → net 116,10 $, commission 34,83 $, crédit fonds 116,10 $", () => {
    const a = accrueGuestMicroCheckout(129_00, { isFreemium: true });
    expect(a.platformFeeCents).toBe(1_290);
    expect(a.netDistributableCents).toBe(11_610);
    expect(a.commissionCents).toBe(3_483);
    expect(a.fundCreditCents).toBe(11_610);
  });

  it("Bougie 15 $ → net 13,50 $, commission 4,05 $, crédit fonds 13,50 $", () => {
    const a = accrueGuestMicroCheckout(15_00, { isFreemium: true });
    expect(a.platformFeeCents).toBe(150);
    expect(a.netDistributableCents).toBe(1_350);
    expect(a.commissionCents).toBe(405);
    expect(a.fundCreditCents).toBe(1_350);
  });

  it("Mécène 250 $ → net 225 $, commission 67,50 $, crédit fonds 225 $", () => {
    const a = accrueGuestMicroCheckout(250_00, { isFreemium: true });
    expect(a.platformFeeCents).toBe(2_500);
    expect(a.netDistributableCents).toBe(22_500);
    expect(a.commissionCents).toBe(6_750);
    expect(a.fundCreditCents).toBe(22_500);
  });
});

describe("Waterfall invité — tenant B2C direct (non freemium)", () => {
  it("Voix 69 $ → commission Athos 0, MAIS crédit fonds 62,10 $ conservé", () => {
    const a = accrueGuestMicroCheckout(69_00, { isFreemium: false });
    expect(a.commissionCents).toBe(0);
    expect(a.netDistributableCents).toBe(6_210);
    expect(a.fundCreditCents).toBe(6_210);
    expect(a.odysseyMarginCents).toBe(6_210);
  });
});

describe("Waterfall invité — invariants & garde-fous", () => {
  it("conservation : platform_fee + net == gross", () => {
    for (const gross of [15_00, 69_00, 119_00, 129_00, 999_99]) {
      const a = accrueGuestMicroCheckout(gross, { isFreemium: true });
      expect(a.platformFeeCents + a.netDistributableCents).toBe(gross);
    }
  });

  it("commission ≤ net et crédit fonds ≤ net (bornes)", () => {
    for (const gross of [15_00, 69_00, 119_00]) {
      const a = accrueGuestMicroCheckout(gross, { isFreemium: true });
      expect(a.commissionCents).toBeLessThanOrEqual(a.netDistributableCents);
      expect(a.fundCreditCents).toBeLessThanOrEqual(a.netDistributableCents);
    }
  });

  it("le crédit fonds ne réduit jamais la commission cash d'Athos", () => {
    const a = accrueGuestMicroCheckout(129_00, { isFreemium: true });
    expect(a.commissionCents).toBe(3_483);
    expect(a.fundCreditCents).toBe(a.netDistributableCents);
  });

  it("plafond dur : transaction > 1000 $ rejetée", () => {
    expect(() =>
      accrueGuestMicroCheckout(GUEST_TXN_MAX_CENTS + 1, { isFreemium: true }),
    ).toThrow(/gross_cap_exceeded/);
  });

  it("conversion configurable (Option B) : 50 % → crédit fonds = moitié du net", () => {
    const a = accrueGuestMicroCheckout(69_00, {
      isFreemium: true,
      fundConversionBps: 5000,
    });
    expect(a.netDistributableCents).toBe(6_210);
    expect(a.fundCreditCents).toBe(3_105);
  });
});
