import { describe, it, expect } from "vitest";

import {
  computeWizardCartWithGrant,
  resolveWizardDisplayCart,
  type WizardExtensionsState,
  type WizardBasePackage,
} from "@/src/lib/wizard/wizardPricing";
import {
  manifestPackageFromWizardBasePackage,
  packageMaxMediaItems,
} from "@/src/lib/wizard/wizardDeliverables";
import {
  isSoftCapEligible,
  shouldOfferMediaSoftCap,
  shouldOfferMagicSoftCap,
} from "@/src/lib/wizard/softCap";

/**
 * Scénario 1 — Soft Cap Médias.
 *
 * Un projet démarre sur le cadeau `essential` (Souvenir 0 $, 50 médias).
 * Quand la famille dépasse 50 médias, la "Frustration Positive" propose
 * de basculer `intendedPackage` sur `signature` (Héritage 179 $).
 *
 * Si la famille REFUSE l'upsell et tente un checkout à 0 $ tout en gardant
 * > 50 médias (ou une Licence Musique payante), le serveur doit AMPUTER
 * (422) plutôt que livrer un forfait payant gratuitement.
 *
 * Ce guard reproduit fidèlement `app/api/checkout/route.ts` (bloc
 * `totalCents <= 0 && hasPartnerInvitation && isFreemiumTenant`) en
 * s'appuyant sur les MÊMES fonctions de production (cart + quota manifeste).
 */

type FreeCheckoutOutcome =
  | { status: 200; mode: "freemium_free"; grantedPackage: WizardBasePackage }
  | { status: 422; error: "amputation_required"; maxMedia: number; currentMedia: number }
  | { status: 422; error: "music_license_requires_payment" }
  | { status: "paid"; totalCents: number };

/** Miroir du guard serveur — voir app/api/checkout/route.ts. */
function simulatePartnerFreemiumCheckout(params: {
  grantedPackage: WizardBasePackage;
  intendedPackage: WizardBasePackage;
  extensions: WizardExtensionsState;
  mediaCount: number;
}): FreeCheckoutOutcome {
  const cart = computeWizardCartWithGrant(
    params.extensions,
    params.intendedPackage,
    params.grantedPackage,
  );

  if (cart.totalCents > 0) {
    return { status: "paid", totalCents: cart.totalCents };
  }

  const maxMedia = packageMaxMediaItems(
    manifestPackageFromWizardBasePackage(params.grantedPackage),
  );
  if (params.mediaCount > maxMedia) {
    return {
      status: 422,
      error: "amputation_required",
      maxMedia,
      currentMedia: params.mediaCount,
    };
  }

  if (cart.extensions.musicLicense) {
    return { status: 422, error: "music_license_requires_payment" };
  }

  return { status: 200, mode: "freemium_free", grantedPackage: params.grantedPackage };
}

describe("Soft Cap Médias — quota & Frustration Positive", () => {
  it("le cadeau Souvenir plafonne à 50 médias", () => {
    expect(packageMaxMediaItems(manifestPackageFromWizardBasePackage("essential"))).toBe(50);
    expect(packageMaxMediaItems(manifestPackageFromWizardBasePackage("signature"))).toBe(125);
  });

  it("propose le Soft Cap dès 50 médias sur un projet resté Souvenir", () => {
    expect(isSoftCapEligible("essential", "essential")).toBe(true);
    expect(shouldOfferMediaSoftCap("essential", "essential", 50)).toBe(true);
    expect(shouldOfferMagicSoftCap("essential", "essential", 62)).toBe(true);
    // Sous le seuil : pas de nudge
    expect(shouldOfferMediaSoftCap("essential", "essential", 49)).toBe(false);
  });

  it("ne re-spamme PAS le Soft Cap si la famille a déjà accepté Héritage", () => {
    expect(isSoftCapEligible("essential", "signature")).toBe(false);
    expect(shouldOfferMediaSoftCap("essential", "signature", 120)).toBe(false);
  });

  it("REFUS de l'upsell + >50 médias → checkout bloqué (422 amputation_required)", () => {
    const outcome = simulatePartnerFreemiumCheckout({
      grantedPackage: "essential",
      intendedPackage: "essential", // refus : reste Souvenir
      extensions: {},
      mediaCount: 60,
    });

    expect(outcome).toEqual({
      status: 422,
      error: "amputation_required",
      maxMedia: 50,
      currentMedia: 60,
    });
  });

  it("garder la Licence Musique interdit le 0 $ : le checkout devient payant (39 $)", () => {
    // La musique premium ne peut JAMAIS passer gratuitement : soit paiement,
    // soit amputation. Ici la Licence force un panier > 0 → voie payante.
    const outcome = simulatePartnerFreemiumCheckout({
      grantedPackage: "essential",
      intendedPackage: "essential",
      extensions: { musicLicense: true },
      mediaCount: 40,
    });

    expect(outcome).toEqual({ status: "paid", totalCents: 3900 });
  });

  it("le garde défensif music_license_requires_payment protège la voie 0 $", () => {
    // Invariant : dès qu'une Licence est présente, on ne peut pas atteindre
    // la branche freemium_free — le total est toujours > 0.
    const cart = computeWizardCartWithGrant(
      { musicLicense: true },
      "essential",
      "essential",
    );
    expect(cart.totalCents).toBeGreaterThan(0);
    expect(cart.extensions.musicLicense).toBe(true);
  });

  it("REFUS de l'upsell dans les clous (≤50 médias, 0 add-on payant) → 0 $ accepté", () => {
    const outcome = simulatePartnerFreemiumCheckout({
      grantedPackage: "essential",
      intendedPackage: "essential",
      extensions: {},
      mediaCount: 50,
    });

    expect(outcome).toEqual({
      status: 200,
      mode: "freemium_free",
      grantedPackage: "essential",
    });
  });

  it("ACCEPTE l'upsell → intended bascule sur Héritage, checkout payant du delta 179 $", () => {
    const outcome = simulatePartnerFreemiumCheckout({
      grantedPackage: "essential",
      intendedPackage: "signature", // accepte le Soft Cap
      extensions: {},
      mediaCount: 120,
    });

    // delta granted(0) → intended(17900) = 17900 cents
    expect(outcome).toEqual({ status: "paid", totalCents: 17900 });
  });

  it("panier d'affichage Souvenir = 0 $ tant que rien de payant n'est ajouté", () => {
    const cart = resolveWizardDisplayCart({}, "essential", "essential");
    expect(cart.totalCents).toBe(0);
    expect(cart.baseCents).toBe(0);
  });
});
