/**
 * Source de vérité — tarification Odyssey (catalogue v2 multi-canaux).
 *
 * RÈGLE : toutes les valeurs monétaires sont des entiers en CENTIMES uniquement.
 * Ex. 14900 = 149,00 $ · 4000 = 40,00 $.
 *
 * Important :
 * - Le catalogue runtime connaît tous les forfaits (`essential`, `signature`, `heritage`, `legendary`)
 * - La disponibilité dépend du canal de vente
 * - Le modèle commercial (freemium vs jetons legacy) sera résolu plus tard par le tenant
 */

/** Prix en cents (4000 = 40,00 $) — coût de gros par jeton partenaire legacy. */
export const PARTNER_TOKEN_COST_CENTS = 4_000;

/** Segmentation catalogue musique Stingray. */
export type MusicCatalogTier = "standard" | "premium";

/**
 * NOTE CANAUX
 *
 * - `essential`  : canal partenaire uniquement (Souvenir freemium ou legacy)
 * - `signature`  : B2C direct + upsell famille + legacy partenaire
 * - `heritage`   : B2C direct + upsell famille + legacy partenaire
 * - `legendary`  : B2C direct uniquement
 *
 * `tokens` représente le mapping legacy partenaire P5.5.
 * Pour `legendary`, il n'existe volontairement aucun prix jetons legacy.
 */
export const WIZARD_PRICING = {
  packages: {
    ESSENTIEL: {
      id: "essential",
      /** Souvenir offert — 0¢ dans le catalogue v2. */
      priceCents: 0,
      /** Mapping legacy partenaire (P5.5). */
      tokens: 1,
      /** Catalogue musical inclus sans extension Licence Premium. */
      musicCatalog: "standard" as MusicCatalogTier,
    },
    SIGNATURE: {
      id: "signature",
      /** Héritage — 149,00 $. */
      priceCents: 14_900,
      /** Mapping legacy partenaire (P5.5). */
      tokens: 2,
      musicCatalog: "standard" as MusicCatalogTier,
    },
    HERITAGE: {
      id: "heritage",
      /** Éternité — 299,00 $. */
      priceCents: 29_900,
      /** Mapping legacy partenaire (P5.5). */
      tokens: 4,
      musicCatalog: "premium" as MusicCatalogTier,
    },
    LEGENDARY: {
      id: "legendary",
      /** Légende / Gants Blancs — 499,00 $. */
      priceCents: 49_900,
      /** B2C direct only — pas de mapping jetons legacy. */
      tokens: 0,
      musicCatalog: "premium" as MusicCatalogTier,
    },
  },
  extensions: {
    RETOUCHE_IA: {
      id: "aiRetouch",
      /** Prix en cents (4900 = 49,00 $) */
      priceCents: 49_00,
    },
    /** Option Licence Premium — débloque le catalogue PREMIUM. */
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

/** Union complète du catalogue runtime v2. */
export type WizardBasePackage =
  (typeof WIZARD_PRICING.packages)[WizardPackageKey]["id"];

/** Packages autorisés en B2C direct (pas de Souvenir). */
export type WizardB2CDirectPackage = Extract<
  WizardBasePackage,
  "signature" | "heritage" | "legendary"
>;

/** Packages autorisés côté partenaire / invitation / granted_package. */
export type WizardPartnerGrantedPackage = Extract<
  WizardBasePackage,
  "essential" | "signature" | "heritage"
>;

/** Packages legacy avec équivalent jetons partenaire. */
export type WizardLegacyTokenPackage = WizardPartnerGrantedPackage;

export type WizardLegacyTokenPackageKey = Extract<
  WizardPackageKey,
  "ESSENTIEL" | "SIGNATURE" | "HERITAGE"
>;

export type WizardExtensionId =
  (typeof WIZARD_PRICING.extensions)[WizardExtensionConfigKey]["id"];

export type WizardPackageConfig =
  (typeof WIZARD_PRICING.packages)[WizardPackageKey];

/** Catalogue complet v2. */
export const WIZARD_ALL_PACKAGES: WizardBasePackage[] = [
  WIZARD_PRICING.packages.ESSENTIEL.id,
  WIZARD_PRICING.packages.SIGNATURE.id,
  WIZARD_PRICING.packages.HERITAGE.id,
  WIZARD_PRICING.packages.LEGENDARY.id,
];

/** B2C direct Quiet Luxury : pas de `essential`. */
export const WIZARD_B2C_DIRECT_PACKAGES: WizardB2CDirectPackage[] = [
  WIZARD_PRICING.packages.SIGNATURE.id,
  WIZARD_PRICING.packages.HERITAGE.id,
  WIZARD_PRICING.packages.LEGENDARY.id,
];

/** Canal partenaire : forfaits offerts / legacy tokens. */
export const WIZARD_PARTNER_GRANTED_PACKAGES: WizardPartnerGrantedPackage[] = [
  WIZARD_PRICING.packages.ESSENTIEL.id,
  WIZARD_PRICING.packages.SIGNATURE.id,
  WIZARD_PRICING.packages.HERITAGE.id,
];

/** Alias explicite pour le mapping jetons legacy. */
export const WIZARD_LEGACY_TOKEN_PACKAGES: WizardLegacyTokenPackage[] =
  WIZARD_PARTNER_GRANTED_PACKAGES;

/**
 * @deprecated Ambigu pour le modèle v2.
 * Historique UI — ancien triplet affichable avant séparation par canal.
 * Utiliser `WIZARD_B2C_DIRECT_PACKAGES` ou `WIZARD_PARTNER_GRANTED_PACKAGES`
 * selon le contexte métier.
 */
export const WIZARD_BASE_PACKAGES: WizardPartnerGrantedPackage[] =
  WIZARD_PARTNER_GRANTED_PACKAGES;

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
  if ((WIZARD_ALL_PACKAGES as readonly string[]).includes(raw)) {
    return raw as WizardBasePackage;
  }
  return LEGACY_PACKAGE_ALIASES[raw] ?? WIZARD_PRICING.packages.SIGNATURE.id;
}

export function isB2CDirectPackage(
  packageId: WizardBasePackage,
): packageId is WizardB2CDirectPackage {
  return (WIZARD_B2C_DIRECT_PACKAGES as readonly string[]).includes(packageId);
}

export function isPartnerGrantedPackage(
  packageId: WizardBasePackage,
): packageId is WizardPartnerGrantedPackage {
  return (WIZARD_PARTNER_GRANTED_PACKAGES as readonly string[]).includes(
    packageId,
  );
}

export function hasLegacyTokenPricing(
  packageId: WizardBasePackage,
): packageId is WizardLegacyTokenPackage {
  return (WIZARD_LEGACY_TOKEN_PACKAGES as readonly string[]).includes(packageId);
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

/**
 * Jetons B2B legacy pour le forfait.
 * `legendary` est exclu du type : les jetons ne s'y appliquent jamais.
 */
export function packagePartnerTokens(
  basePackage: WizardLegacyTokenPackage,
): number {
  return getPackageConfigById(basePackage).tokens;
}

export function partnerWholesaleCents(tokenCount: number): number {
  return PARTNER_TOKEN_COST_CENTS * Math.trunc(tokenCount);
}

/**
 * Marge partenaire théorique en cents :
 * prix public (priceCents) − (PARTNER_TOKEN_COST_CENTS × tokens).
 */
export function calculatePartnerMargin(
  packageId: WizardLegacyTokenPackage,
  tokens?: number,
): number {
  const pkg = getPackageConfigById(packageId);
  const tokenCount = tokens ?? pkg.tokens;
  return pkg.priceCents - partnerWholesaleCents(tokenCount);
}

export function calculatePartnerMarginByKey(
  key: WizardLegacyTokenPackageKey,
  tokens?: number,
): number {
  return calculatePartnerMargin(WIZARD_PRICING.packages[key].id, tokens);
}

export function extensionCents(extensionId: WizardExtensionId): number {
  return EXTENSION_PRICE_BY_ID[extensionId];
}

/** Extensions physiques / droits incluses dans le forfait ÉTERNITÉ (legacy id `heritage`). */
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
 * Panier à la carte comparé au forfait ÉTERNITÉ (`heritage`) :
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
 * Économie affichée pour le forfait ÉTERNITÉ (`heritage`) en cents entiers.
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
