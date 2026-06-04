/**
 * Source de vérité — tarification Odyssey (tunnel hybride B2C / B2B).
 *
 * RÈGLE : toutes les valeurs monétaires sont des entiers en CENTIMES USD uniquement.
 * Ex. 7900 = 79,00 $ · 4000 = 40,00 $.
 */

/** Prix en cents (4000 = 40,00 $) — coût de gros par jeton partenaire. */
export const PARTNER_TOKEN_COST_CENTS = 4_000;

/** Segmentation catalogue musique Stingray. */
export type MusicCatalogTier = "standard" | "premium";

export const WIZARD_PRICING = {
  packages: {
    ESSENTIEL: {
      id: "essential",
      /** Prix en cents (7900 = 79,00 $) */
      priceCents: 7_900,
      /** Coût B2B en jetons */
      tokens: 1,
      /** Catalogue musical inclus sans extension Licence Premium. */
      musicCatalog: "standard" as MusicCatalogTier,
    },
    SIGNATURE: {
      id: "signature",
      /** Prix en cents (14900 = 149,00 $) */
      priceCents: 14_900,
      tokens: 2,
      musicCatalog: "standard" as MusicCatalogTier,
    },
    HERITAGE: {
      id: "heritage",
      /** Prix en cents (29900 = 299,00 $) */
      priceCents: 29_900,
      tokens: 4,
      musicCatalog: "premium" as MusicCatalogTier,
    },
  },
  extensions: {
    RETOUCHE_IA: {
      id: "aiRetouch",
      /** Prix en cents (4900 = 49,00 $) */
      priceCents: 49_00,
    },
    /** Option Licence Premium — débloque le catalogue PREMIUM (Essentiel / Signature). */
    LICENCE_PREMIUM: {
      id: "extendedLicense",
      /** Prix en cents (3900 = 39,00 $) */
      priceCents: 39_00,
    },
    USB: {
      id: "collectorUsb",
      /** Prix en cents (7900 = 79,00 $) */
      priceCents: 79_00,
    },
    COFFRE_FORT: {
      id: "digitalVault",
      /** Prix en cents (9900 = 99,00 $) */
      priceCents: 99_00,
    },
    PACK_HERITAGE: {
      id: "heritagePack",
      /** Prix en cents (14900 = 149,00 $) */
      priceCents: 149_00,
    },
  },
} as const;

export type WizardPackageKey = keyof typeof WIZARD_PRICING.packages;
export type WizardExtensionConfigKey = keyof typeof WIZARD_PRICING.extensions;

export type WizardBasePackage =
  (typeof WIZARD_PRICING.packages)[WizardPackageKey]["id"];

export type WizardExtensionId =
  (typeof WIZARD_PRICING.extensions)[WizardExtensionConfigKey]["id"];

export type WizardPackageConfig =
  (typeof WIZARD_PRICING.packages)[WizardPackageKey];

export const WIZARD_BASE_PACKAGES: WizardBasePackage[] = [
  WIZARD_PRICING.packages.ESSENTIEL.id,
  WIZARD_PRICING.packages.SIGNATURE.id,
  WIZARD_PRICING.packages.HERITAGE.id,
];

const PACKAGE_BY_ID = Object.fromEntries(
  Object.values(WIZARD_PRICING.packages).map((pkg) => [pkg.id, pkg]),
) as Record<WizardBasePackage, WizardPackageConfig>;

const EXTENSION_PRICE_BY_ID = Object.fromEntries(
  Object.values(WIZARD_PRICING.extensions).map((ext) => [
    ext.id,
    ext.priceCents,
  ]),
) as Record<WizardExtensionId, number>;

/** @deprecated Alias migration `prestige` → `signature` */
export const LEGACY_PACKAGE_ALIASES: Record<string, WizardBasePackage> = {
  prestige: WIZARD_PRICING.packages.SIGNATURE.id,
};

export function normalizeBasePackageId(
  raw: string | undefined,
): WizardBasePackage {
  if (!raw) return WIZARD_PRICING.packages.SIGNATURE.id;
  if ((WIZARD_BASE_PACKAGES as readonly string[]).includes(raw)) {
    return raw as WizardBasePackage;
  }
  return LEGACY_PACKAGE_ALIASES[raw] ?? WIZARD_PRICING.packages.SIGNATURE.id;
}

export function getPackageConfigById(
  packageId: WizardBasePackage,
): WizardPackageConfig {
  return PACKAGE_BY_ID[packageId] ?? WIZARD_PRICING.packages.SIGNATURE;
}

export function getPackageConfigByKey(
  key: WizardPackageKey,
): WizardPackageConfig {
  return WIZARD_PRICING.packages[key];
}

/** Forfait en cents (entier). */
export function packageCents(
  basePackage: WizardBasePackage = WIZARD_PRICING.packages.SIGNATURE.id,
): number {
  return getPackageConfigById(basePackage).priceCents;
}

/** Jetons B2B pour le forfait. */
export function packagePartnerTokens(
  basePackage: WizardBasePackage,
): number {
  return getPackageConfigById(basePackage).tokens;
}

export function partnerWholesaleCents(tokenCount: number): number {
  return PARTNER_TOKEN_COST_CENTS * Math.trunc(tokenCount);
}

/**
 * Marge partenaire en cents : prix public (priceCents) − (PARTNER_TOKEN_COST_CENTS × tokens).
 */
export function calculatePartnerMargin(
  packageId: WizardBasePackage,
  tokens?: number,
): number {
  const pkg = getPackageConfigById(packageId);
  const tokenCount = tokens ?? pkg.tokens;
  return pkg.priceCents - partnerWholesaleCents(tokenCount);
}

export function calculatePartnerMarginByKey(
  key: WizardPackageKey,
  tokens?: number,
): number {
  return calculatePartnerMargin(WIZARD_PRICING.packages[key].id, tokens);
}

export function extensionCents(extensionId: WizardExtensionId): number {
  return EXTENSION_PRICE_BY_ID[extensionId];
}

/** Extensions physiques / droits incluses dans le forfait HÉRITAGE (non refacturées). */
export const HERITAGE_PACKAGE_BUNDLED_EXTENSION_IDS: WizardExtensionId[] = [
  "extendedLicense",
  "collectorUsb",
  "digitalVault",
];

export function heritagePackIndividualTotalCents(): number {
  return (
    WIZARD_PRICING.extensions.RETOUCHE_IA.priceCents +
    WIZARD_PRICING.extensions.LICENCE_PREMIUM.priceCents +
    WIZARD_PRICING.extensions.COFFRE_FORT.priceCents
  );
}

export function heritagePackSavingsCents(): number {
  return (
    heritagePackIndividualTotalCents() -
    WIZARD_PRICING.extensions.PACK_HERITAGE.priceCents
  );
}

/**
 * Panier à la carte comparé au forfait HÉRITAGE (bundle économique marketing).
 * SIGNATURE + Licence Premium + USB + Coffre-fort.
 */
export function heritageBundleAlaCarteCents(): number {
  return (
    WIZARD_PRICING.packages.SIGNATURE.priceCents +
    WIZARD_PRICING.extensions.LICENCE_PREMIUM.priceCents +
    WIZARD_PRICING.extensions.USB.priceCents +
    WIZARD_PRICING.extensions.COFFRE_FORT.priceCents
  );
}

/**
 * Économie affichée pour le forfait HÉRITAGE (cents entiers).
 * Ex. 6700 → « Économisez 67 $ ».
 */
export function calculateBundleSavings(
  packageId: WizardBasePackage,
): number {
  if (packageId !== WIZARD_PRICING.packages.HERITAGE.id) return 0;
  const alaCarte = heritageBundleAlaCarteCents();
  const heritagePrice = WIZARD_PRICING.packages.HERITAGE.priceCents;
  return Math.max(0, alaCarte - heritagePrice);
}

/** Montant entier en dollars pour badges UI (pas de float). */
export function bundleSavingsDollarsLabel(savingsCents: number): string {
  return String(Math.trunc(savingsCents / 100));
}

export function isExtensionBundledInBasePackage(
  basePackage: WizardBasePackage,
  extensionId: WizardExtensionId,
): boolean {
  if (basePackage !== WIZARD_PRICING.packages.HERITAGE.id) return false;
  return HERITAGE_PACKAGE_BUNDLED_EXTENSION_IDS.includes(extensionId);
}

export type WizardExtensionsLike = {
  extendedLicense?: boolean;
  heritagePack?: boolean;
};

/**
 * Tier catalogue effectif : forfait + Option Licence Premium (ou Pack Héritage).
 */
export function resolveMusicCatalogTier(
  basePackage: WizardBasePackage,
  extensions: WizardExtensionsLike = {},
): MusicCatalogTier {
  if (getPackageConfigById(basePackage).musicCatalog === "premium") {
    return "premium";
  }
  if (extensions.extendedLicense || extensions.heritagePack) {
    return "premium";
  }
  return "standard";
}

export function hasPremiumMusicCatalogAccess(
  basePackage: WizardBasePackage,
  extensions: WizardExtensionsLike = {},
): boolean {
  return resolveMusicCatalogTier(basePackage, extensions) === "premium";
}
