import { describe, expect, it } from "vitest";

import {
  assertIntendedNotBelowGrant,
  resolveB2b2cIntendedPackage,
} from "@/src/lib/wizard/b2b2cPackageAuthority";
import { stripOwnerMonetizationFields } from "@/src/lib/wizard/monetizationAutosaveGuard";
import {
  computeWizardCartWithGrant,
  type WizardExtensionsState,
} from "@/src/lib/wizard/wizardPricing";
import {
  manifestPackageFromWizardBasePackage,
  packageMaxMediaItems,
} from "@/src/lib/wizard/wizardDeliverables";
import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";

describe("stripOwnerMonetizationFields", () => {
  it("retire silencieusement granted/intended/base/pricing", () => {
    const stripped = stripOwnerMonetizationFields({
      grantedPackage: "heritage",
      intendedPackage: "heritage",
      basePackage: "heritage",
      pricing: { basePackage: "heritage", baseCents: 0, optionsCents: 0, totalCents: 0 },
      essentials: { firstName: "Marie" },
    });

    expect(stripped).toEqual({ essentials: { firstName: "Marie" } });
  });

  it("retourne undefined si le patch ne contenait que de la monétisation", () => {
    expect(
      stripOwnerMonetizationFields({
        grantedPackage: "legendary",
        intendedPackage: "legendary",
      }),
    ).toBeUndefined();
  });
});

describe("resolveB2b2cIntendedPackage", () => {
  it("freemium_free force intended = granted même si persisté plus haut", () => {
    expect(
      resolveB2b2cIntendedPackage({
        grantedPackage: "essential",
        persistedIntended: "heritage",
        forFreemiumFree: true,
      }),
    ).toBe("essential");
  });

  it("refuse un intended sous le grant", () => {
    expect(
      resolveB2b2cIntendedPackage({
        grantedPackage: "signature",
        persistedIntended: "essential",
      }),
    ).toBe("signature");
  });

  it("accepte un intended au-dessus du grant (voie payante)", () => {
    expect(
      resolveB2b2cIntendedPackage({
        grantedPackage: "essential",
        persistedIntended: "signature",
      }),
    ).toBe("signature");
  });
});

describe("assertIntendedNotBelowGrant", () => {
  it("valide signature ≥ essential", () => {
    expect(assertIntendedNotBelowGrant("essential", "signature")).toBe(true);
    expect(assertIntendedNotBelowGrant("essential", "essential")).toBe(true);
    expect(assertIntendedNotBelowGrant("signature", "essential")).toBe(false);
  });
});

/**
 * Attaque P0-01 : wizard_state forgé heritage/heritage ne doit pas produire
 * un freemium_free premium — granted authentique = essential (invitation).
 */
type FreeCheckoutOutcome =
  | { status: 200; mode: "freemium_free"; paidPackage: WizardBasePackage }
  | { status: 422; error: "amputation_required" }
  | { status: "paid"; totalCents: number };

function simulateSecuredPartnerFreemiumCheckout(params: {
  invitationGranted: WizardBasePackage;
  forgedWizardGranted: WizardBasePackage;
  forgedWizardIntended: WizardBasePackage;
  extensions: WizardExtensionsState;
  mediaCount: number;
}): FreeCheckoutOutcome {
  const grantedPackage = params.invitationGranted;
  const intendedPackage = resolveB2b2cIntendedPackage({
    grantedPackage,
    persistedIntended: params.forgedWizardIntended,
    forFreemiumFree:
      computeWizardCartWithGrant(
        params.extensions,
        resolveB2b2cIntendedPackage({
          grantedPackage,
          persistedIntended: params.forgedWizardIntended,
        }),
        grantedPackage,
      ).totalCents <= 0,
  });

  const cart = computeWizardCartWithGrant(
    params.extensions,
    intendedPackage,
    grantedPackage,
  );

  if (cart.totalCents > 0) {
    return { status: "paid", totalCents: cart.totalCents };
  }

  const maxMedia = packageMaxMediaItems(
    manifestPackageFromWizardBasePackage(grantedPackage),
  );
  if (params.mediaCount > maxMedia) {
    return { status: 422, error: "amputation_required" };
  }

  if (cart.extensions.musicLicense) {
    return { status: "paid", totalCents: cart.totalCents };
  }

  return {
    status: 200,
    mode: "freemium_free",
    paidPackage: grantedPackage,
  };
}

describe("P0-01 — granted invitation vs wizard_state forgé", () => {
  it("heritage forgé + invitation essential → freemium_free reste Souvenir (paidPackage essential)", () => {
    const grantedPackage = "essential" as WizardBasePackage;
    const intendedForFree = resolveB2b2cIntendedPackage({
      grantedPackage,
      persistedIntended: "heritage",
      forFreemiumFree: true,
    });

    expect(intendedForFree).toBe("essential");

    const cart = computeWizardCartWithGrant({}, intendedForFree, grantedPackage);
    expect(cart.totalCents).toBe(0);
  });

  it("intended signature persisté (package-intent) + grant essential → voie payante 179 $", () => {
    const outcome = simulateSecuredPartnerFreemiumCheckout({
      invitationGranted: "essential",
      forgedWizardGranted: "essential",
      forgedWizardIntended: "signature",
      extensions: {},
      mediaCount: 120,
    });

    expect(outcome).toEqual({ status: "paid", totalCents: 17900 });
  });
});
