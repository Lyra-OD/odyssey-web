/**
 * Calcul panier wizard — lit uniquement `pricingConfig.ts`.
 * Freemium V1 : musicLicense, sanctuaryToken, storyVoice, memoryBook.
 * Alias legacy extendedLicense / collectorUsb encore acceptés.
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
  resolveMusicEntitlement,
  hasPremiumMusicCatalogAccess,
  canUploadPersonalAudio,
  packageTierRank,
  HERITAGE_PACKAGE_BUNDLED_EXTENSION_IDS,
  ETERNITE_BUNDLED_EXTENSION_IDS,
  normalizeExtensionId,
} from "@/src/lib/wizard/pricingConfig";

export type { MusicCatalogTier } from "@/src/lib/wizard/pricingConfig";

/** @deprecated */
export const WIZARD_BASE_PRICE_CENTS =
  WIZARD_PRICING.packages.SIGNATURE.priceCents;
/** @deprecated */
export const WIZARD_PACKAGE_ESSENTIAL_CENTS =
  WIZARD_PRICING.packages.ESSENTIEL.priceCents;
/** @deprecated */
export const WIZARD_PACKAGE_PRESTIGE_CENTS =
  WIZARD_PRICING.packages.SIGNATURE.priceCents;

/** @deprecated */
export function basePackageCents(
  basePackage: WizardBasePackage = "signature",
): number {
  return packageCents(basePackage);
}

export const EXTENSION_AI_RETOUCH_CENTS =
  WIZARD_PRICING.extensions.RETOUCHE_IA.priceCents;
export const EXTENSION_MUSIC_LICENSE_CENTS =
  WIZARD_PRICING.extensions.MUSIC_LICENSE.priceCents;
/** @deprecated Prefer EXTENSION_MUSIC_LICENSE_CENTS */
export const EXTENSION_EXTENDED_LICENSE_CENTS = EXTENSION_MUSIC_LICENSE_CENTS;
export const EXTENSION_STORY_VOICE_CENTS =
  WIZARD_PRICING.extensions.STORY_VOICE.priceCents;
export const EXTENSION_SANCTUARY_TOKEN_CENTS =
  WIZARD_PRICING.extensions.SANCTUARY_TOKEN.priceCents;
/** @deprecated Prefer EXTENSION_SANCTUARY_TOKEN_CENTS */
export const EXTENSION_COLLECTOR_USB_CENTS = EXTENSION_SANCTUARY_TOKEN_CENTS;
export const EXTENSION_DIGITAL_VAULT_CENTS =
  WIZARD_PRICING.extensions.COFFRE_FORT.priceCents;
export const EXTENSION_MEMORY_BOOK_CENTS =
  WIZARD_PRICING.extensions.MEMORY_BOOK.priceCents;
export const EXTENSION_HERITAGE_PACK_CENTS =
  WIZARD_PRICING.extensions.PACK_HERITAGE.priceCents;

export const HERITAGE_PACK_INDIVIDUAL_TOTAL_CENTS =
  heritagePackIndividualTotalCents();
export const HERITAGE_PACK_SAVINGS_CENTS = heritagePackSavingsCents();

export type WizardExtensionsState = {
  aiRetouch?: boolean;
  musicLicense?: boolean;
  /** @deprecated → musicLicense */
  extendedLicense?: boolean;
  sanctuaryToken?: boolean;
  /** @deprecated → sanctuaryToken */
  collectorUsb?: boolean;
  storyVoice?: boolean;
  memoryBook?: boolean;
  digitalVault?: boolean;
  heritagePack?: boolean;
};

export type ExtensionLineKey = "base" | WizardExtensionId;

export type ExtensionLineItem = {
  key: ExtensionLineKey;
  cents: number;
};

export type WizardPricingSnapshot = {
  basePackage: WizardBasePackage;
  baseCents: number;
  optionsCents: number;
  totalCents: number;
  /** @deprecated Freemium V1 */
  partnerTokenCost?: number;
};

export type WizardCartSnapshot = WizardPricingSnapshot & {
  lineItems: ExtensionLineItem[];
  extensions: WizardExtensionsState;
};

export function emptyExtensionsState(): WizardExtensionsState {
  return {};
}

/** Canonise musicLicense / sanctuaryToken (fusionne alias legacy). */
export function normalizeExtensionsState(
  extensions: WizardExtensionsState,
): WizardExtensionsState {
  const next: WizardExtensionsState = { ...extensions };

  if (next.extendedLicense) {
    next.musicLicense = true;
    delete next.extendedLicense;
  }
  if (next.collectorUsb) {
    next.sanctuaryToken = true;
    delete next.collectorUsb;
  }

  return next;
}

export function hasExtensionSelection(
  extensions: WizardExtensionsState,
): boolean {
  const n = normalizeExtensionsState(extensions);
  return Boolean(
    n.aiRetouch ||
      n.musicLicense ||
      n.sanctuaryToken ||
      n.storyVoice ||
      n.memoryBook ||
      n.digitalVault ||
      n.heritagePack,
  );
}

export function toggleWizardExtension(
  current: WizardExtensionsState,
  key: keyof WizardExtensionsState,
  enabled: boolean,
): WizardExtensionsState {
  const cur = normalizeExtensionsState(current);

  if (key === "heritagePack") {
    if (enabled) {
      return {
        ...cur,
        heritagePack: true,
        aiRetouch: true,
        musicLicense: true,
        digitalVault: true,
      };
    }
    return {
      ...cur,
      heritagePack: false,
      aiRetouch: false,
      musicLicense: false,
      digitalVault: false,
    };
  }

  const canonicalKey =
    key === "extendedLicense"
      ? "musicLicense"
      : key === "collectorUsb"
        ? "sanctuaryToken"
        : key;

  const next: WizardExtensionsState = {
    ...cur,
    [canonicalKey]: enabled,
  };

  if (
    !enabled &&
    (canonicalKey === "aiRetouch" ||
      canonicalKey === "musicLicense" ||
      canonicalKey === "digitalVault")
  ) {
    next.heritagePack = false;
  }

  if (
    next.aiRetouch &&
    next.musicLicense &&
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
  const normalized = normalizeExtensionsState(extensions);
  const baseCents = packageCents(basePackage);
  const lineItems: ExtensionLineItem[] = [{ key: "base", cents: baseCents }];
  let optionsCents = 0;

  const skipExtensionCharge = (id: WizardExtensionId) =>
    isExtensionBundledInBasePackage(basePackage, id);

  // Soft Cap : ne jamais facturer musicLicense si forfait ≥ Héritage
  if (skipExtensionCharge("musicLicense")) {
    normalized.musicLicense = false;
  }

  if (normalized.heritagePack && !skipExtensionCharge("heritagePack")) {
    const cents = extensionCents("heritagePack");
    lineItems.push({ key: "heritagePack", cents });
    optionsCents += cents;
  } else if (!normalized.heritagePack) {
    if (normalized.aiRetouch && !skipExtensionCharge("aiRetouch")) {
      const cents = extensionCents("aiRetouch");
      lineItems.push({ key: "aiRetouch", cents });
      optionsCents += cents;
    }
    if (normalized.musicLicense && !skipExtensionCharge("musicLicense")) {
      const cents = extensionCents("musicLicense");
      lineItems.push({ key: "musicLicense", cents });
      optionsCents += cents;
    }
    if (normalized.digitalVault && !skipExtensionCharge("digitalVault")) {
      const cents = extensionCents("digitalVault");
      lineItems.push({ key: "digitalVault", cents });
      optionsCents += cents;
    }
  }

  if (normalized.sanctuaryToken && !skipExtensionCharge("sanctuaryToken")) {
    const cents = extensionCents("sanctuaryToken");
    lineItems.push({ key: "sanctuaryToken", cents });
    optionsCents += cents;
  }

  if (normalized.storyVoice) {
    const cents = extensionCents("storyVoice");
    lineItems.push({ key: "storyVoice", cents });
    optionsCents += cents;
  }

  if (normalized.memoryBook) {
    const cents = extensionCents("memoryBook");
    lineItems.push({ key: "memoryBook", cents });
    optionsCents += cents;
  }

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
 * Cart Soft Cap : facture le delta forfait (intended vs granted) + add-ons.
 * Si intended === granted, base line = 0 $ (Souvenir offert).
 */
export function computeWizardCartWithGrant(
  extensions: WizardExtensionsState,
  intendedPackage: WizardBasePackage,
  grantedPackage: WizardBasePackage = "essential",
): WizardCartSnapshot {
  const full = computeWizardCart(extensions, intendedPackage);
  const grantedCents = packageCents(grantedPackage);
  const intendedCents = packageCents(intendedPackage);
  const deltaCents = Math.max(0, intendedCents - grantedCents);

  const lineItems: ExtensionLineItem[] = [
    { key: "base", cents: deltaCents },
    ...full.lineItems.filter((l) => l.key !== "base"),
  ];
  const optionsCents = lineItems
    .filter((l) => l.key !== "base")
    .reduce((s, l) => s + l.cents, 0);

  return {
    basePackage: intendedPackage,
    baseCents: deltaCents,
    optionsCents,
    totalCents: deltaCents + optionsCents,
    lineItems,
    extensions: full.extensions,
  };
}

export function resolvePartnerTokenCost(
  _basePackage: WizardBasePackage,
): number | undefined {
  return undefined;
}

export function buildPricingSnapshot(
  extensions: WizardExtensionsState,
  basePackage: WizardBasePackage,
  _isPartner = false,
): WizardPricingSnapshot {
  const cart = computeWizardCart(extensions, basePackage);
  return {
    basePackage: cart.basePackage,
    baseCents: cart.baseCents,
    optionsCents: cart.optionsCents,
    totalCents: cart.totalCents,
  };
}

export const CHECKOUT_LINE_LABELS: Record<ExtensionLineKey, string> = {
  base: "Odyssey — Cinematic Tribute (Base)",
  aiRetouch: "Premium AI Retouch",
  musicLicense: "Stingray Premium Music License",
  extendedLicense: "Stingray Premium Music License",
  storyVoice: "Voice of History (AI Narration)",
  sanctuaryToken: "Sanctuary Token (NFC)",
  collectorUsb: "Sanctuary Token (NFC)",
  digitalVault: "Digital Vault — 50-Year Secure Hosting",
  memoryBook: "Memory Book (Print)",
  heritagePack: "Heritage Pack (AI Retouch + License + Vault)",
};

export function sumCartLineItemsCents(lineItems: ExtensionLineItem[]): number {
  return lineItems.reduce((sum, line) => sum + Math.trunc(line.cents), 0);
}

export function formatCentsForDisplay(
  cents: number,
  locale: "fr" | "en" = "fr",
): string {
  const wholeCents = Math.trunc(cents);
  const dollars = wholeCents / 100;
  const label =
    dollars % 1 === 0 ? String(Math.trunc(dollars)) : dollars.toFixed(2);
  return locale === "en" ? `$${label}` : `${label}$`;
}

/** @deprecated */
export function formatWizardPrice(
  cents: number,
  locale: "fr" | "en" = "fr",
): string {
  return formatCentsForDisplay(cents, locale);
}

/** @deprecated */
export const UPSELL_AI_RETOUCH_CENTS = EXTENSION_AI_RETOUCH_CENTS;
/** @deprecated */
export const UPSELL_EXTENDED_LICENSE_CENTS = EXTENSION_MUSIC_LICENSE_CENTS;
