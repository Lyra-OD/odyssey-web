import { describe, it, expect } from "vitest";

import { computeCascade } from "@/src/lib/wizard/memorialFund";
import { packageCents } from "@/src/lib/wizard/pricingConfig";

/**
 * Cascade V-Final — cascade du Fonds Commémoratif (computeCascade).
 * Grille Phase 0 (22/07/2026) : Héritage 179 $ · Éternité 349 $ · Légendaire 499 $.
 */

const HERITAGE = packageCents("signature"); // 17900
const ETERNITE = packageCents("heritage"); // 34900
const LEGENDARY = packageCents("legendary"); // 49900

const B2C = {
  basePackage: "signature" as const,
  allowedPackages: ["signature", "heritage", "legendary"] as const,
};

const B2B2C = {
  basePackage: "essential" as const,
  allowedPackages: ["essential", "signature", "heritage"] as const,
};

describe("computeCascade — B2C (plancher Héritage 179 $)", () => {
  it("crédit partiel 100 $ → paywall fond à 79 $ (le hook émotionnel)", () => {
    const r = computeCascade({
      fundCreditCents: 100_00,
      basePackage: B2C.basePackage,
      allowedPackages: [...B2C.allowedPackages],
    });
    expect(r.targetPackage).toBe("signature");
    expect(r.autoElevated).toBe(false);
    expect(r.coveredCents).toBe(HERITAGE);
    expect(r.appliedCreditCents).toBe(10_000);
    expect(r.remainingDueCents).toBe(HERITAGE - 10_000);
    expect(r.addonCreditCents).toBe(0);
  });

  it("crédit 179 $ → Héritage entièrement couvert (0 $)", () => {
    const r = computeCascade({
      fundCreditCents: HERITAGE,
      basePackage: B2C.basePackage,
      allowedPackages: [...B2C.allowedPackages],
    });
    expect(r.targetPackage).toBe("signature");
    expect(r.autoElevated).toBe(false);
    expect(r.remainingDueCents).toBe(0);
    expect(r.addonCreditCents).toBe(0);
  });

  it("crédit 360 $ → auto-élévation Éternité couvert + surplus add-ons", () => {
    const r = computeCascade({
      fundCreditCents: 360_00,
      basePackage: B2C.basePackage,
      allowedPackages: [...B2C.allowedPackages],
    });
    expect(r.targetPackage).toBe("heritage");
    expect(r.autoElevated).toBe(true);
    expect(r.coveredCents).toBe(ETERNITE);
    expect(r.remainingDueCents).toBe(0);
    expect(r.addonCreditCents).toBe(360_00 - ETERNITE);
  });

  it("crédit 500 $ → auto-élévation Légendaire couvert", () => {
    const r = computeCascade({
      fundCreditCents: 500_00,
      basePackage: B2C.basePackage,
      allowedPackages: [...B2C.allowedPackages],
    });
    expect(r.targetPackage).toBe("legendary");
    expect(r.autoElevated).toBe(true);
    expect(r.coveredCents).toBe(LEGENDARY);
    expect(r.addonCreditCents).toBe(500_00 - LEGENDARY);
  });

  it("5 invités × Voix (crédit net 310,50 $) → Héritage fondu à 0 $", () => {
    // Miroir waterfall : 5 × net(6900)=6210 = 31050.
    const credit = 5 * 6_210;
    const r = computeCascade({
      fundCreditCents: credit,
      basePackage: B2C.basePackage,
      allowedPackages: [...B2C.allowedPackages],
    });
    expect(r.targetPackage).toBe("signature");
    expect(r.remainingDueCents).toBe(0);
    expect(r.addonCreditCents).toBe(credit - HERITAGE);
  });

  it("owner_floor > 0 : la famille garde un reste-à-payer plancher", () => {
    const r = computeCascade({
      fundCreditCents: HERITAGE,
      basePackage: B2C.basePackage,
      allowedPackages: [...B2C.allowedPackages],
      ownerFloorCents: 20_00,
    });
    expect(r.targetPackage).toBe("signature");
    expect(r.appliedCreditCents).toBe(HERITAGE - 20_00);
    expect(r.remainingDueCents).toBe(2_000);
  });
});

describe("computeCascade — B2B2C (plancher Souvenir 0 $)", () => {
  it("crédit 0 $ → reste sur Souvenir gratuit", () => {
    const r = computeCascade({
      fundCreditCents: 0,
      basePackage: B2B2C.basePackage,
      allowedPackages: [...B2B2C.allowedPackages],
    });
    expect(r.targetPackage).toBe("essential");
    expect(r.autoElevated).toBe(false);
    expect(r.coveredCents).toBe(0);
    expect(r.remainingDueCents).toBe(0);
  });

  it("crédit 179 $ → auto-élévation vers Héritage (signature) couvert", () => {
    const r = computeCascade({
      fundCreditCents: HERITAGE,
      basePackage: B2B2C.basePackage,
      allowedPackages: [...B2B2C.allowedPackages],
    });
    expect(r.targetPackage).toBe("signature");
    expect(r.autoElevated).toBe(true);
    expect(r.remainingDueCents).toBe(0);
  });
});

describe("computeCascade — invariants de sécurité", () => {
  it("crédit négatif traité comme 0", () => {
    const r = computeCascade({
      fundCreditCents: -5000,
      basePackage: B2C.basePackage,
      allowedPackages: [...B2C.allowedPackages],
    });
    expect(r.appliedCreditCents).toBe(0);
    expect(r.remainingDueCents).toBe(HERITAGE);
    expect(r.addonCreditCents).toBe(0);
  });

  it("jamais de crédit appliqué supérieur au forfait couvert", () => {
    for (const credit of [0, 5_000, HERITAGE, 30_000, 60_000]) {
      const r = computeCascade({
        fundCreditCents: credit,
        basePackage: B2C.basePackage,
        allowedPackages: [...B2C.allowedPackages],
      });
      expect(r.appliedCreditCents).toBeLessThanOrEqual(r.coveredCents);
      expect(r.appliedCreditCents + r.remainingDueCents).toBe(r.coveredCents);
    }
  });
});
