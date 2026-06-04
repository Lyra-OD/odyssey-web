/**
 * Source de vérité — tarification Odyssey (tunnel hybride B2C / B2B).
 *
 * RÈGLE : toutes les valeurs monétaires sont des entiers en CENTIMES USD uniquement.
 * Ex. 7900 = 79,00 $ · 4000 = 40,00 $.
 */

/** Prix en cents (4000 = 40,00 $) — coût de gros par jeton partenaire. */
export const PARTNER_TOKEN_COST_CENTS = 4_000;

export const WIZARD_PRICING = {
  packages: {
    ESSENTIEL: {
      id: "essential",
      /** Prix en cents (7900 = 79,00 $) */
      priceCents: 7_900,
      /** Coût B2B en jetons */
      tokens: 1,
    },
    SIGNATURE: {
      id: "signature",
      /** Prix en cents (14900 = 149,00 $) */
      priceCents: 14_900,
      tokens: 2,
    },
    HERITAGE: {
      id: "heritage",
      /** Prix en cents (29900 = 299,00 $) */
      priceCents: 29_900,
      tokens: 4,
    },
  },
  extensions: {
    RETOUCHE_IA: {
      id: "aiRetouch",
      /** Prix en cents (4900 = 49,00 $) */
      priceCents: 49_00,
    },
    LICENCE: {
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

export function heritagePackIndividualTotalCents(): number {
  return (
    WIZARD_PRICING.extensions.RETOUCHE_IA.priceCents +
    WIZARD_PRICING.extensions.LICENCE.priceCents +
    WIZARD_PRICING.extensions.COFFRE_FORT.priceCents
  );
}

export function heritagePackSavingsCents(): number {
  return (
    heritagePackIndividualTotalCents() -
    WIZARD_PRICING.extensions.PACK_HERITAGE.priceCents
  );
}
