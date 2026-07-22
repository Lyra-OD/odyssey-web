import { describe, it, expect } from "vitest";

import {
  canUploadPersonalAudio,
  computeWizardCart,
  computeWizardCartWithGrant,
  extensionCents,
  packageCents,
  resolveMusicEntitlement,
} from "@/src/lib/wizard/wizardPricing";
import { shouldOfferMusicSoftCap } from "@/src/lib/wizard/softCap";

/**
 * Scénario 2 — Soft Cap Musique.
 *
 * Sur `essential`, choisir une piste du catalogue Stingray officiel déclenche
 * la modale duale (jamais bloquante) :
 *   Choix A → add-on `musicLicense` 39 $
 *   Choix B → upgrade total Héritage (`signature`) 179 $
 *
 * Règle anti double-facturation : dès Héritage la licence est incluse (0 $ en plus).
 */

const MUSIC_LICENSE_CENTS = 3900;
const HERITAGE_CENTS = 17900;

describe("Soft Cap Musique — dual choice & entitlement", () => {
  it("catalogue standard sur Souvenir, premium dès Héritage ou via add-on", () => {
    expect(resolveMusicEntitlement("essential", {})).toBe("standard");
    expect(resolveMusicEntitlement("essential", { musicLicense: true })).toBe("premium");
    expect(resolveMusicEntitlement("signature", {})).toBe("premium");
  });

  it("propose la modale duale quand une piste officielle est choisie sur Souvenir", () => {
    expect(shouldOfferMusicSoftCap("essential", "essential", false)).toBe(true);
    // Déjà licencié → plus de nudge
    expect(shouldOfferMusicSoftCap("essential", "essential", true)).toBe(false);
    // Déjà Héritage+ → inclus, pas de nudge
    expect(shouldOfferMusicSoftCap("essential", "signature", false)).toBe(false);
  });

  it("les deux tarifs proposés sont exactement 39 $ (add-on) et 179 $ (upgrade)", () => {
    expect(extensionCents("musicLicense")).toBe(MUSIC_LICENSE_CENTS);
    expect(packageCents("signature")).toBe(HERITAGE_CENTS);
  });

  it("Choix A — add-on Licence 39 $ : panier Souvenir = 3900 cents avec ligne musicLicense", () => {
    const cart = computeWizardCartWithGrant(
      { musicLicense: true },
      "essential",
      "essential",
    );
    expect(cart.totalCents).toBe(MUSIC_LICENSE_CENTS);
    expect(cart.baseCents).toBe(0);
    expect(cart.lineItems.find((l) => l.key === "musicLicense")?.cents).toBe(
      MUSIC_LICENSE_CENTS,
    );
  });

  it("Choix B — upgrade Héritage 179 $ : delta granted→intended = 17900 cents", () => {
    const cart = computeWizardCartWithGrant({}, "signature", "essential");
    expect(cart.totalCents).toBe(HERITAGE_CENTS);
  });

  it("anti double-facturation : Licence NON refacturée si le forfait est déjà Héritage", () => {
    const cart = computeWizardCart({ musicLicense: true }, "signature");
    expect(cart.totalCents).toBe(HERITAGE_CENTS);
    expect(cart.lineItems.some((l) => l.key === "musicLicense")).toBe(false);
  });

  it("cohérence panier : total = base + options (jamais de dérive de lignes)", () => {
    const cart = computeWizardCartWithGrant(
      { musicLicense: true },
      "essential",
      "essential",
    );
    const sum = cart.lineItems.reduce((s, l) => s + l.cents, 0);
    expect(sum).toBe(cart.totalCents);
  });
});

/**
 * Décision juillet 2026 — Stingray licencié = 100 % payant.
 *
 * Le forfait gratuit (Souvenir) n'inclut/exporte AUCUNE piste licenciée :
 *   - tier `standard` = preview only (hook Soft Cap), pas d'export licencié ;
 *   - la seule source musicale réellement livrable au gratuit = MP3 perso (ToS).
 * La protection légale du MP3 reste l'attestation (testée dans
 * `music-rights-gate.test.ts`), indépendante du forfait.
 */
describe("Musique gratuit — Stingray payant, MP3 perso ouvert au Souvenir", () => {
  it("le gratuit n'a jamais d'entitlement Stingray licencié sans payer", () => {
    expect(resolveMusicEntitlement("essential", {})).toBe("standard");
    // Débloqué uniquement par l'add-on Licence…
    expect(resolveMusicEntitlement("essential", { musicLicense: true })).toBe(
      "premium",
    );
    // …ou par un upgrade forfait payant.
    expect(resolveMusicEntitlement("signature", {})).toBe("premium");
  });

  it("l'upload MP3 perso est disponible sur TOUS les forfaits, Souvenir inclus", () => {
    expect(canUploadPersonalAudio("essential")).toBe(true);
    expect(canUploadPersonalAudio("signature")).toBe(true);
    expect(canUploadPersonalAudio("heritage")).toBe(true);
    expect(canUploadPersonalAudio("legendary")).toBe(true);
  });
});
