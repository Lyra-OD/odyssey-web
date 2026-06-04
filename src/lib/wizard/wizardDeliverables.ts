/**
 * Contrat de livrables Odyssey — source de vérité produit (gant blanc B2C / B2B2C).
 *
 * Forfaits : SOUVENIR · HÉRITAGE · ÉTERNITÉ
 * Tarification double : jetons (partenaire) · dollars (famille / Stripe)
 *
 * Les IDs legacy (`essential` | `signature` | `heritage`) restent utilisés en DB P5
 * et dans `wizard_state` jusqu’à migration — voir `LEGACY_GRANTED_PACKAGE` /
 * `manifestPackageFromLegacy`.
 */

import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import {
  packageCents,
  packagePartnerTokens,
  WIZARD_PRICING,
} from "@/src/lib/wizard/pricingConfig";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PackageId = "SOUVENIR" | "HERITAGE" | "ETERNITE";

export type SalonAspect = "16:9";
export type SocialAspect = "9:16";
export type SalonAudioMode = "personal_mp3" | "stingray_acts";
export type SocialAudioMode = "safe_music";

/** Mode d’affichage / encaissement côté UI et checkout. */
export type TransactionMode = "tokens" | "dollars";

/**
 * Modes checkout cible (P5 `tribute_checkouts.checkout_mode`).
 * Détermine quel axe du manifeste s’applique au paiement principal.
 */
export type CheckoutMode =
  | "b2c"
  | "b2b_partner"
  | "b2b2c_family";

export interface DeliverablesConfig {
  pricing: {
    /** Jetons débités au partenaire (gros / invitation). */
    tokens: number;
    /** Prix public famille en dollars entiers (affichage B2C). */
    dollars: number;
  };
  salon: {
    enabled: boolean;
    aspect: SalonAspect;
    audio: SalonAudioMode;
  };
  social: {
    enabled: boolean;
    aspect: SocialAspect;
    /** Durée cible du clip Social (secondes). */
    duration: number;
    audio: SocialAudioMode;
  };
  features: {
    aiRestoration: boolean;
    cloudStorageYears: number;
  };
}

// ---------------------------------------------------------------------------
// Manifeste
// ---------------------------------------------------------------------------

export const PACKAGE_MANIFEST: Record<PackageId, DeliverablesConfig> = {
  SOUVENIR: {
    pricing: { tokens: 1, dollars: 79 },
    salon: { enabled: true, aspect: "16:9", audio: "stingray_acts" },
    social: {
      enabled: false,
      aspect: "9:16",
      duration: 45,
      audio: "safe_music",
    },
    features: { aiRestoration: false, cloudStorageYears: 5 },
  },
  HERITAGE: {
    pricing: { tokens: 2, dollars: 149 },
    salon: { enabled: true, aspect: "16:9", audio: "stingray_acts" },
    social: {
      enabled: true,
      aspect: "9:16",
      duration: 45,
      audio: "safe_music",
    },
    features: { aiRestoration: false, cloudStorageYears: 50 },
  },
  ETERNITE: {
    pricing: { tokens: 4, dollars: 299 },
    salon: { enabled: true, aspect: "16:9", audio: "personal_mp3" },
    social: {
      enabled: true,
      aspect: "9:16",
      duration: 45,
      audio: "safe_music",
    },
    features: { aiRestoration: true, cloudStorageYears: 50 },
  },
};

export const PACKAGE_IDS: PackageId[] = ["SOUVENIR", "HERITAGE", "ETERNITE"];

/** Valeur `partner_invitations.granted_package` / `wizard_state.basePackage` (P3–P5). */
export type LegacyGrantedPackage = "essential" | "signature" | "heritage";

/** Mapping manifeste → colonnes SQL actuelles. */
export const MANIFEST_TO_LEGACY_GRANTED: Record<
  PackageId,
  LegacyGrantedPackage
> = {
  SOUVENIR: "essential",
  HERITAGE: "signature",
  ETERNITE: "heritage",
};

/** Mapping inverse (rehydratation projet / invitation). */
export const LEGACY_GRANTED_TO_MANIFEST: Record<
  LegacyGrantedPackage,
  PackageId
> = {
  essential: "SOUVENIR",
  signature: "HERITAGE",
  heritage: "ETERNITE",
};

/** Alias `wizard_state` / `pricingConfig` → manifeste. */
export const LEGACY_WIZARD_PACKAGE_TO_MANIFEST: Record<
  WizardBasePackage,
  PackageId
> = {
  essential: "SOUVENIR",
  signature: "HERITAGE",
  heritage: "ETERNITE",
};

// ---------------------------------------------------------------------------
// Accesseurs
// ---------------------------------------------------------------------------

export function getPackageManifest(packageId: PackageId): DeliverablesConfig {
  return PACKAGE_MANIFEST[packageId];
}

export function manifestPackageFromLegacy(
  legacy: string | undefined,
): PackageId {
  if (!legacy) return "HERITAGE";
  const key = legacy as LegacyGrantedPackage;
  if (key in LEGACY_GRANTED_TO_MANIFEST) {
    return LEGACY_GRANTED_TO_MANIFEST[key];
  }
  if ((PACKAGE_IDS as readonly string[]).includes(legacy)) {
    return legacy as PackageId;
  }
  if (legacy === "prestige") return "HERITAGE";
  return "HERITAGE";
}

export function legacyGrantedFromManifest(packageId: PackageId): LegacyGrantedPackage {
  return MANIFEST_TO_LEGACY_GRANTED[packageId];
}

export function legacyWizardPackageFromManifest(
  packageId: PackageId,
): WizardBasePackage {
  return MANIFEST_TO_LEGACY_GRANTED[packageId];
}

/** Prix public en centimes USD (entier) — aligné manifeste × 100. */
export function packageDollarsCents(packageId: PackageId): number {
  return PACKAGE_MANIFEST[packageId].pricing.dollars * 100;
}

export function packageManifestTokens(packageId: PackageId): number {
  return PACKAGE_MANIFEST[packageId].pricing.tokens;
}

export function salonAllowsPersonalMp3(packageId: PackageId): boolean {
  return PACKAGE_MANIFEST[packageId].salon.audio === "personal_mp3";
}

export function socialDeliverableEnabled(packageId: PackageId): boolean {
  return PACKAGE_MANIFEST[packageId].social.enabled;
}

// ---------------------------------------------------------------------------
// Mode transaction (jetons vs dollars)
// ---------------------------------------------------------------------------

export type ResolveTransactionModeInput = {
  /** Compte funérarium / parcours partenaire pur. */
  isPartnerAccount?: boolean;
  checkoutMode?: CheckoutMode;
  /** Projet issu d’une invitation B2B2C. */
  invitationId?: string | null;
};

/**
 * Détermine l’axe tarifaire principal pour la barre sticky et le checkout.
 *
 * - `tokens` : débit wallet partenaire (`b2b_partner` ou débit granted en saga P5).
 * - `dollars` : Stripe famille (`b2c` ou delta `b2b2c_family`).
 */
export function resolveTransactionMode(
  input: ResolveTransactionModeInput,
): TransactionMode {
  const mode = input.checkoutMode;

  if (mode === "b2b_partner") return "tokens";
  if (mode === "b2c") return "dollars";
  if (mode === "b2b2c_family") return "dollars";

  if (input.invitationId) return "dollars";
  if (input.isPartnerAccount) return "tokens";

  return "dollars";
}

/** Libellé prix formaté pour l’UI (ex. « 2 jetons », « 149 $ », « $149 »). */
export function formatPackagePriceForMode(
  packageId: PackageId,
  mode: TransactionMode,
  locale: "fr" | "en" = "fr",
): string {
  const { tokens, dollars } = PACKAGE_MANIFEST[packageId].pricing;

  if (mode === "tokens") {
    return locale === "en"
      ? `${tokens} ${tokens === 1 ? "token" : "tokens"}`
      : `${tokens} ${tokens === 1 ? "jeton" : "jetons"}`;
  }

  return locale === "en" ? `$${dollars}` : `${dollars} $`;
}

/**
 * Delta famille B2B2C (dollars entiers) : forfait choisi − forfait offert (`granted`).
 * Extensions hors scope — à additionner côté `computeB2B2CFamilyPricing` (futur).
 */
export function familyPackageDeltaDollars(
  granted: PackageId,
  selected: PackageId,
): number {
  const grantedDollars = PACKAGE_MANIFEST[granted].pricing.dollars;
  const selectedDollars = PACKAGE_MANIFEST[selected].pricing.dollars;
  return Math.max(0, selectedDollars - grantedDollars);
}

export function familyPackageDeltaCents(
  granted: PackageId,
  selected: PackageId,
): number {
  return familyPackageDeltaDollars(granted, selected) * 100;
}

// ---------------------------------------------------------------------------
// Cohérence avec pricingConfig (garde-fou migration)
// ---------------------------------------------------------------------------

const LEGACY_BY_MANIFEST: Record<PackageId, WizardBasePackage> = {
  SOUVENIR: WIZARD_PRICING.packages.ESSENTIEL.id,
  HERITAGE: WIZARD_PRICING.packages.SIGNATURE.id,
  ETERNITE: WIZARD_PRICING.packages.HERITAGE.id,
};

/**
 * Vérifie que le manifeste et `pricingConfig.ts` restent alignés.
 * À appeler en dev / tests — pas en runtime hot path production si coût inutile.
 */
export function assertManifestPricingAlignedWithLegacyConfig(): void {
  for (const packageId of PACKAGE_IDS) {
    const legacy = LEGACY_BY_MANIFEST[packageId];
    const manifest = PACKAGE_MANIFEST[packageId];

    const cents = packageCents(legacy);
    const tokens = packagePartnerTokens(legacy);

    if (cents !== manifest.pricing.dollars * 100) {
      throw new Error(
        `Manifest/pricingConfig drift: ${packageId} dollars — manifest=${manifest.pricing.dollars} config=${cents / 100}`,
      );
    }
    if (tokens !== manifest.pricing.tokens) {
      throw new Error(
        `Manifest/pricingConfig drift: ${packageId} tokens — manifest=${manifest.pricing.tokens} config=${tokens}`,
      );
    }
  }
}
