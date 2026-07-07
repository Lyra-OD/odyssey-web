/**
 * Calcul panier wizard — lit uniquement `pricingConfig.ts`.
 * Tous les totaux sont en cents (entiers). Aucune conversion $ en float pendant le calcul.
 */

import {
  calculatePartnerMargin,
  DEFAULT_B2C_BASE_PACKAGE,
  extensionCents,
  hasLegacyTokenPricing,
  heritagePackIndividualTotalCents,
  heritagePackSavingsCents,
  isExtensionBundledInBasePackage,
  packageCents,
  packagePartnerTokens,
  WIZARD_B2C_DIRECT_PACKAGES,
  PARTNER_TOKEN_COST_CENTS,
  WIZARD_ALL_PACKAGES,
  WIZARD_LEGACY_TOKEN_PACKAGES,
  WIZARD_PARTNER_GRANTED_PACKAGES,
  WIZARD_PRICING,
  WIZARD_BASE_PACKAGES,
  type WizardBasePackage,
  type WizardB2CDirectPackage,
  type WizardExtensionId,
  type WizardLegacyTokenPackage,
  type WizardPartnerGrantedPackage,
} from "@/src/lib/wizard/pricingConfig";

export type {
  WizardBasePackage,
  WizardB2CDirectPackage,
  WizardExtensionId,
  WizardPackageKey,
  WizardExtensionConfigKey,
  WizardLegacyTokenPackage,
  WizardPartnerGrantedPackage,
} from "@/src/lib/wizard/pricingConfig";

export {
  DEFAULT_B2C_BASE_PACKAGE,
  WIZARD_ALL_PACKAGES,
  WIZARD_B2C_DIRECT_PACKAGES,
  WIZARD_PARTNER_GRANTED_PACKAGES,
  WIZARD_LEGACY_TOKEN_PACKAGES,
  WIZARD_PRICING,
  WIZARD_BASE_PACKAGES,
  PARTNER_TOKEN_COST_CENTS,
  packageCents,
  packagePartnerTokens,
  extensionCents,
  calculatePartnerMargin,
  heritagePackIndividualTotalCents,
  heritagePackSavingsCents,
  heritageBundleAlaCarteCents,
  calculateBundleSavings,
  bundleSavingsDollarsLabel,
  isExtensionBundledInBasePackage,
  resolveMusicCatalogTier,
  hasPremiumMusicCatalogAccess,
  HERITAGE_PACKAGE_BUNDLED_EXTENSION_IDS,
} from "@/src/lib/wizard/pricingConfig";

export type { MusicCatalogTier } from "@/src/lib/wizard/pricingConfig";

/** @deprecated Utiliser `packageCents("signature")` */
export const WIZARD_BASE_PRICE_CENTS =
  WIZARD_PRICING.packages.SIGNATURE.priceCents;

/** @deprecated */
export const WIZARD_PACKAGE_ESSENTIAL_CENTS =
  WIZARD_PRICING.packages.ESSENTIEL.priceCents;
/** @deprecated */
export const WIZARD_PACKAGE_PRESTIGE_CENTS =
  WIZARD_PRICING.packages.SIGNATURE.priceCents;

/** @deprecated Utiliser `packageCents()` */
export function basePackageCents(
  basePackage: WizardBasePackage = "signature",
): number {
  return packageCents(basePackage);
}

export const EXTENSION_AI_RETOUCH_CENTS =
  WIZARD_PRICING.extensions.RETOUCHE_IA.priceCents;
export const EXTENSION_EXTENDED_LICENSE_CENTS =
  WIZARD_PRICING.extensions.LICENCE_PREMIUM.priceCents;
export const EXTENSION_COLLECTOR_USB_CENTS =
  WIZARD_PRICING.extensions.USB.priceCents;
export const EXTENSION_DIGITAL_VAULT_CENTS =
  WIZARD_PRICING.extensions.COFFRE_FORT.priceCents;
export const EXTENSION_HERITAGE_PACK_CENTS =
  WIZARD_PRICING.extensions.PACK_HERITAGE.priceCents;

export const HERITAGE_PACK_INDIVIDUAL_TOTAL_CENTS =
  heritagePackIndividualTotalCents();
export const HERITAGE_PACK_SAVINGS_CENTS = heritagePackSavingsCents();

export type WizardExtensionsState = {
  aiRetouch?: boolean;
  extendedLicense?: boolean;
  collectorUsb?: boolean;
  digitalVault?: boolean;
  heritagePack?: boolean;
};

export type ExtensionLineKey =
  | "base"
  | WizardExtensionId;

export type ExtensionLineItem = {
  key: ExtensionLineKey;
  cents: number;
};

export type WizardPricingSnapshot = {
  basePackage: WizardBasePackage;
  baseCents: number;
  optionsCents: number;
  totalCents: number;
  /** Coût B2B en jetons (forfait uniquement). */
  partnerTokenCost?: number;
};

export type WizardCartSnapshot = WizardPricingSnapshot & {
  lineItems: ExtensionLineItem[];
  extensions: WizardExtensionsState;
};

export function emptyExtensionsState(): WizardExtensionsState {
  return {};
}

export function hasExtensionSelection(
  extensions: WizardExtensionsState,
): boolean {
  return Boolean(
    extensions.aiRetouch ||
      extensions.extendedLicense ||
      extensions.collectorUsb ||
      extensions.digitalVault ||
      extensions.heritagePack,
  );
}

/** Bascule une extension en gérant le Pack Héritage (retouche + licence + coffre). */
export function toggleWizardExtension(
  current: WizardExtensionsState,
  key: keyof WizardExtensionsState,
  enabled: boolean,
): WizardExtensionsState {
  if (key === "heritagePack") {
    if (enabled) {
      return {
        ...current,
        heritagePack: true,
        aiRetouch: true,
        extendedLicense: true,
        digitalVault: true,
      };
    }
    return {
      ...current,
      heritagePack: false,
      aiRetouch: false,
      extendedLicense: false,
      digitalVault: false,
    };
  }

  const next: WizardExtensionsState = {
    ...current,
    [key]: enabled,
  };

  if (
    !enabled &&
    (key === "aiRetouch" ||
      key === "extendedLicense" ||
      key === "digitalVault")
  ) {
    next.heritagePack = false;
  }

  if (
    next.aiRetouch &&
    next.extendedLicense &&
    next.digitalVault &&
    !next.heritagePack
  ) {
    const individualTotal = heritagePackIndividualTotalCents();
    if (individualTotal > WIZARD_PRICING.extensions.PACK_HERITAGE.priceCents) {
      return toggleWizardExtension(next, "heritagePack", true);
    }
  }

  return next;
}

export function computeWizardCart(
  extensions: WizardExtensionsState,
  basePackage: WizardBasePackage = "signature",
): WizardCartSnapshot {
  const normalized = { ...extensions };
  const baseCents = packageCents(basePackage);
  const lineItems: ExtensionLineItem[] = [{ key: "base", cents: baseCents }];
  let optionsCents = 0;

  const skipExtensionCharge = (id: WizardExtensionId) =>
    isExtensionBundledInBasePackage(basePackage, id);

  if (normalized.heritagePack) {
    const cents = extensionCents("heritagePack");
    lineItems.push({ key: "heritagePack", cents });
    optionsCents += cents;
  } else {
    if (normalized.aiRetouch) {
      const cents = extensionCents("aiRetouch");
      lineItems.push({ key: "aiRetouch", cents });
      optionsCents += cents;
    }
    if (normalized.extendedLicense && !skipExtensionCharge("extendedLicense")) {
      const cents = extensionCents("extendedLicense");
      lineItems.push({ key: "extendedLicense", cents });
      optionsCents += cents;
    }
    if (normalized.digitalVault && !skipExtensionCharge("digitalVault")) {
      const cents = extensionCents("digitalVault");
      lineItems.push({ key: "digitalVault", cents });
      optionsCents += cents;
    }
  }

  if (normalized.collectorUsb && !skipExtensionCharge("collectorUsb")) {
    const cents = extensionCents("collectorUsb");
    lineItems.push({ key: "collectorUsb", cents });
    optionsCents += cents;
  }

  /** Somme entière : forfait (cents) + extensions (cents). */
  const totalCents = baseCents + optionsCents;

  return {
    basePackage,
    baseCents,
    optionsCents,
    totalCents,
    lineItems,
    extensions: normalized,
  };
}

/**
 * Safe partner-token resolver for mixed runtime package ids.
 *
 * `legendary` is intentionally excluded from legacy token pricing and returns
 * `undefined` here instead of leaking a fake token value into B2B paths.
 */
export function resolvePartnerTokenCost(
  basePackage: WizardBasePackage,
): number | undefined {
  return hasLegacyTokenPricing(basePackage)
    ? packagePartnerTokens(basePackage)
    : undefined;
}

export function buildPricingSnapshot(
  extensions: WizardExtensionsState,
  basePackage: WizardBasePackage,
  isPartner = false,
): WizardPricingSnapshot {
  const cart = computeWizardCart(extensions, basePackage);
  return {
    basePackage: cart.basePackage,
    baseCents: cart.baseCents,
    optionsCents: cart.optionsCents,
    totalCents: cart.totalCents,
    ...(isPartner
      ? (() => {
          const partnerTokenCost = resolvePartnerTokenCost(basePackage);
          return partnerTokenCost !== undefined ? { partnerTokenCost } : {};
        })()
      : {}),
  };
}

/** Labels Stripe (anglais) — l'UI utilise i18n. */
export const CHECKOUT_LINE_LABELS: Record<ExtensionLineKey, string> = {
  base: "Odyssey — Cinematic Tribute (Base)",
  aiRetouch: "Premium AI Retouch",
  extendedLicense: "Premium Music License (Stingray Premium Catalog)",
  collectorUsb: "Collector USB Key — Laser Engraving",
  digitalVault: "Digital Vault — 50-Year Secure Hosting",
  heritagePack: "Heritage Pack (AI Retouch + License + Vault)",
};

/** Somme des lignes du panier en cents (vérification checkout / Stripe). */
export function sumCartLineItemsCents(
  lineItems: ExtensionLineItem[],
): number {
  return lineItems.reduce(
    (sum, line) => sum + Math.trunc(line.cents),
    0,
  );
}

/**
 * Conversion affichage UI uniquement : cents → dollars (÷ 100).
 * À appeler au dernier moment côté interface, jamais pour calculer un total.
 */
export function formatCentsForDisplay(
  cents: number,
  locale: "fr" | "en" = "fr",
): string {
  const wholeCents = Math.trunc(cents);
  const dollars = wholeCents / 100;
  const label =
    dollars % 1 === 0
      ? String(Math.trunc(dollars))
      : dollars.toFixed(2);
  return locale === "en" ? `$${label}` : `${label}$`;
}

/** @deprecated Préférer `formatCentsForDisplay` (même comportement). */
export function formatWizardPrice(
  cents: number,
  locale: "fr" | "en" = "fr",
): string {
  return formatCentsForDisplay(cents, locale);
}

/** @deprecated */
export const UPSELL_AI_RETOUCH_CENTS = EXTENSION_AI_RETOUCH_CENTS;
/** @deprecated */
export const UPSELL_EXTENDED_LICENSE_CENTS = EXTENSION_EXTENDED_LICENSE_CENTS;
