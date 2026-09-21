import { describe, expect, it } from "vitest";

import {
  computeWizardCart,
  computeWizardCartWithGrant,
  extensionCents,
  isExtensionBundledInBasePackage,
  packageCents,
} from "@/src/lib/wizard/wizardPricing";

/**
 * C1 — SKU cinemaMaster 49 $
 * Souvenir : add-on panier · Héritage+ : inclus (strip).
 */

const CINEMA_MASTER_CENTS = 4900;
const HERITAGE_CENTS = 17_900;

describe("cinemaMaster add-on 49 $", () => {
  it("tarif canon 49 $", () => {
    expect(extensionCents("cinemaMaster")).toBe(CINEMA_MASTER_CENTS);
  });

  it("inclus dès Héritage (signature+)", () => {
    expect(isExtensionBundledInBasePackage("essential", "cinemaMaster")).toBe(
      false,
    );
    expect(isExtensionBundledInBasePackage("signature", "cinemaMaster")).toBe(
      true,
    );
    expect(isExtensionBundledInBasePackage("heritage", "cinemaMaster")).toBe(
      true,
    );
  });

  it("panier Souvenir = 4900 cents avec ligne cinemaMaster", () => {
    const cart = computeWizardCartWithGrant(
      { cinemaMaster: true },
      "essential",
      "essential",
    );
    expect(cart.totalCents).toBe(CINEMA_MASTER_CENTS);
    expect(cart.baseCents).toBe(0);
    expect(cart.lineItems.find((l) => l.key === "cinemaMaster")?.cents).toBe(
      CINEMA_MASTER_CENTS,
    );
  });

  it("anti double-facturation : NON refacturé sur Héritage+", () => {
    const cart = computeWizardCart({ cinemaMaster: true }, "signature");
    expect(cart.totalCents).toBe(HERITAGE_CENTS);
    expect(cart.lineItems.some((l) => l.key === "cinemaMaster")).toBe(false);
    expect(cart.extensions.cinemaMaster).toBe(false);
  });

  it("cohérent avec upgrade Héritage (master inclus, pas de 49 $ en plus)", () => {
    const cart = computeWizardCartWithGrant(
      { cinemaMaster: true },
      "signature",
      "essential",
    );
    expect(cart.totalCents).toBe(packageCents("signature"));
    expect(cart.lineItems.some((l) => l.key === "cinemaMaster")).toBe(false);
  });
});
