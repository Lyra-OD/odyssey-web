import { describe, it, expect } from "vitest";

import { computeCascade } from "@/src/lib/wizard/memorialFund";

/**
 * Cascade V-Final — cascade du Fonds Commémoratif (computeCascade).
 *
 * Contrat métier verrouillé (docs/IMPLEMENTATION_CASCADE_VFINAL.md) :
 *   P1 — couvrir le forfait de base (plancher payant du canal)
 *   P2 — auto-élévation : le surplus pousse vers le tier supérieur autorisé
 *   P3 — le crédit restant se déverse sur les add-ons
 *
 * Le crédit est PORTÉ PAR ODYSSEY (coût marginal ~ 0 $) et peut faire fondre
 * le paywall famille jusqu'à 0 $. Fonction PURE → chiffres figés ici.
 */

const B2C = {
  basePackage: "signature" as const, // Héritage 149 $ = plancher payant B2C
  allowedPackages: ["signature", "heritage", "legendary"] as const,
};

const B2B2C = {
  basePackage: "essential" as const, // Souvenir 0 $ = plancher B2B2C
  allowedPackages: ["essential", "signature", "heritage"] as const,
};

describe("computeCascade — B2C (plancher Héritage 149 $)", () => {
  it("crédit partiel 100 $ → paywall fond à 49 $ (le hook émotionnel)", () => {
    const r = computeCascade({
      fundCreditCents: 100_00,
      basePackage: B2C.basePackage,
      allowedPackages: [...B2C.allowedPackages],
    });
    expect(r.targetPackage).toBe("signature");
    expect(r.autoElevated).toBe(false);
    expect(r.coveredCents).toBe(14_900);
    expect(r.appliedCreditCents).toBe(10_000);
    expect(r.remainingDueCents).toBe(4_900);
    expect(r.addonCreditCents).toBe(0);
  });

  it("crédit 149 $ → Héritage entièrement couvert (0 $)", () => {
    const r = computeCascade({
      fundCreditCents: 149_00,
      basePackage: B2C.basePackage,
      allowedPackages: [...B2C.allowedPackages],
    });
    expect(r.targetPackage).toBe("signature");
    expect(r.autoElevated).toBe(false);
    expect(r.remainingDueCents).toBe(0);
    expect(r.addonCreditCents).toBe(0);
  });

  it("crédit 320 $ → auto-élévation Éternité couvert + surplus add-ons", () => {
    const r = computeCascade({
      fundCreditCents: 320_00,
      basePackage: B2C.basePackage,
      allowedPackages: [...B2C.allowedPackages],
    });
    expect(r.targetPackage).toBe("heritage"); // Éternité 299 $
    expect(r.autoElevated).toBe(true);
    expect(r.coveredCents).toBe(29_900);
    expect(r.remainingDueCents).toBe(0);
    expect(r.addonCreditCents).toBe(2_100); // 320 − 299 = 21 $ pour add-ons
  });

  it("crédit 500 $ → auto-élévation Légendaire couvert", () => {
    const r = computeCascade({
      fundCreditCents: 500_00,
      basePackage: B2C.basePackage,
      allowedPackages: [...B2C.allowedPackages],
    });
    expect(r.targetPackage).toBe("legendary");
    expect(r.autoElevated).toBe(true);
    expect(r.coveredCents).toBe(49_900);
    expect(r.addonCreditCents).toBe(100); // 500 − 499
  });

  it("5 invités × Pack HD (crédit 220,50 $) → paywall fond à 0 $ (abandon impossible)", () => {
    // Miroir du waterfall invité : 5 × net(4900)=4410 = 22050.
    const r = computeCascade({
      fundCreditCents: 5 * 4_410,
      basePackage: B2C.basePackage,
      allowedPackages: [...B2C.allowedPackages],
    });
    expect(r.targetPackage).toBe("signature");
    expect(r.remainingDueCents).toBe(0);
    expect(r.addonCreditCents).toBe(22_050 - 14_900);
  });

  it("owner_floor > 0 : la famille garde un reste-à-payer plancher", () => {
    const r = computeCascade({
      fundCreditCents: 149_00,
      basePackage: B2C.basePackage,
      allowedPackages: [...B2C.allowedPackages],
      ownerFloorCents: 20_00,
    });
    expect(r.targetPackage).toBe("signature");
    expect(r.appliedCreditCents).toBe(12_900);
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

  it("crédit 149 $ → auto-élévation vers Héritage (signature) couvert", () => {
    const r = computeCascade({
      fundCreditCents: 149_00,
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
    expect(r.remainingDueCents).toBe(14_900);
    expect(r.addonCreditCents).toBe(0);
  });

  it("jamais de crédit appliqué supérieur au forfait couvert", () => {
    for (const credit of [0, 5_000, 14_900, 30_000, 60_000]) {
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
