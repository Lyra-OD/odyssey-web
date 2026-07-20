/**
 * Source de vérité — tarification Odyssey (Freemium V1).
 *
 * RÈGLE : toutes les valeurs monétaires sont des entiers en CENTIMES uniquement.
 * Canon produit : docs/FREEMIUM_V1_PIVOT.md
 *
 * - `essential`  : Souvenir 0 $ (partenaire)
 * - `signature`  : Héritage 149 $ — 4K + catalogue Stingray officiel inclus
 * - `heritage`   : Éternité 299 $ — + IA + coffre inclus
 * - `legendary`  : Légendaire 499 $ (B2C only)
 */

/** @deprecated Freemium V1 — plus de wholesale jetons. Conservé à 0 pour imports legacy. */
export const PARTNER_TOKEN_COST_CENTS = 0;

/** Segmentation catalogue musique Stingray (API `tier` reste standard|premium). */
export type MusicCatalogTier = "standard" | "premium";

/**
 * Catalogue runtime — `musicCatalog: premium` = catalogue **officiel** inclus
 * (Héritage / Éternité / Légendaire). Souvenir = standard.
 * `tokens` = 0 (purge jetons V1).
 */
export const WIZARD_PRICING = {
  packages: {
    ESSENTIEL: {
      id: "essential",
      priceCents: 0,
      tokens: 0,
      musicCatalog: "standard" as MusicCatalogTier,
    },
    SIGNATURE: {
      id: "signature",
      priceCents: 14_900,
      tokens: 0,
      /** Catalogue Stingray officiel inclus (Freemium V1). */
      musicCatalog: "premium" as MusicCatalogTier,
    },
    HERITAGE: {
      id: "heritage",
      priceCents: 29_900,
      tokens: 0,
      musicCatalog: "premium" as MusicCatalogTier,
    },
    LEGENDARY: {
      id: "legendary",
      priceCents: 49_900,
      tokens: 0,
      musicCatalog: "premium" as MusicCatalogTier,
    },
  },
  extensions: {
    RETOUCHE_IA: {
      id: "aiRetouch",
      priceCents: 49_00,
    },
    /** Licence Musique Premium Stingray — Soft Cap Souvenir. */
    MUSIC_LICENSE: {
      id: "musicLicense",
      priceCents: 39_00,
    },
    /** Voix de l’Histoire — narration IA (≠ licence musique). */
    STORY_VOICE: {
      id: "storyVoice",
      priceCents: 39_00,
    },
    /** Jeton du Sanctuaire NFC (remplace collectorUsb). */
    SANCTUARY_TOKEN: {
      id: "sanctuaryToken",
      priceCents: 79_00,
    },
    COFFRE_FORT: {
      id: "digitalVault",
      priceCents: 99_00,
    },
    MEMORY_BOOK: {
      id: "memoryBook",
      priceCents: 149_00,
    },
    /** @deprecated Bundle marketing — conservé pour paniers legacy. */
    PACK_HERITAGE: {
      id: "heritagePack",
      priceCents: 149_00,
    },
  },
} as const;

export type WizardPackageKey = keyof typeof WIZARD_PRICING.packages;
export type WizardExtensionConfigKey = keyof typeof WIZARD_PRICING.extensions;

export type WizardBasePackage =
  (typeof WIZARD_PRICING.packages)[WizardPackageKey]["id"];

export type WizardB2CDirectPackage = Extract<
  WizardBasePackage,
  "signature" | "heritage" | "legendary"
>;

export type WizardPartnerGrantedPackage = Extract<
  WizardBasePackage,
  "essential" | "signature" | "heritage"
>;

/** @deprecated Freemium V1 — plus de jetons. Alias type partenaire. */
export type WizardLegacyTokenPackage = WizardPartnerGrantedPackage;

export type WizardLegacyTokenPackageKey = Extract<
  WizardPackageKey,
  "ESSENTIEL" | "SIGNATURE" | "HERITAGE"
>;

/** IDs canoniques + alias legacy (`extendedLicense`, `collectorUsb`). */
export type WizardExtensionId =
  | (typeof WIZARD_PRICING.extensions)[WizardExtensionConfigKey]["id"]
  | "extendedLicense"
  | "collectorUsb";

export type WizardPackageConfig =
  (typeof WIZARD_PRICING.packages)[WizardPackageKey];

export const WIZARD_ALL_PACKAGES: WizardBasePackage[] = [
  WIZARD_PRICING.packages.ESSENTIEL.id,
  WIZARD_PRICING.packages.SIGNATURE.id,
  WIZARD_PRICING.packages.HERITAGE.id,
  WIZARD_PRICING.packages.LEGENDARY.id,
];

export const WIZARD_B2C_DIRECT_PACKAGES: WizardB2CDirectPackage[] = [
  WIZARD_PRICING.packages.SIGNATURE.id,
  WIZARD_PRICING.packages.HERITAGE.id,
  WIZARD_PRICING.packages.LEGENDARY.id,
];

export const WIZARD_PARTNER_GRANTED_PACKAGES: WizardPartnerGrantedPackage[] = [
  WIZARD_PRICING.packages.ESSENTIEL.id,
  WIZARD_PRICING.packages.SIGNATURE.id,
  WIZARD_PRICING.packages.HERITAGE.id,
];

export const WIZARD_LEGACY_TOKEN_PACKAGES: WizardLegacyTokenPackage[] =
  WIZARD_PARTNER_GRANTED_PACKAGES;

export const DEFAULT_B2C_BASE_PACKAGE: WizardBasePackage =
  WIZARD_PRICING.packages.HERITAGE.id;

/** @deprecated */
export const WIZARD_BASE_PACKAGES: WizardPartnerGrantedPackage[] =
  WIZARD_PARTNER_GRANTED_PACKAGES;

const PACKAGE_BY_ID = Object.fromEntries(
  Object.values(WIZARD_PRICING.packages).map((pkg) => [pkg.id, pkg]),
) as Record<WizardBasePackage, WizardPackageConfig>;

const EXTENSION_PRICE_BY_ID: Record<string, number> = {
  ...Object.fromEntries(
    Object.values(WIZARD_PRICING.extensions).map((ext) => [
      ext.id,
      ext.priceCents,
    ]),
  ),
  /** Alias migration Freemium V1 */
  extendedLicense: WIZARD_PRICING.extensions.MUSIC_LICENSE.priceCents,
  collectorUsb: WIZARD_PRICING.extensions.SANCTUARY_TOKEN.priceCents,
};

export const LEGACY_PACKAGE_ALIASES: Record<string, WizardBasePackage> = {
  prestige: WIZARD_PRICING.packages.SIGNATURE.id,
};

export function normalizeBasePackageId(
  raw: string | undefined,
): WizardBasePackage {
  if (!raw) return DEFAULT_B2C_BASE_PACKAGE;
  if ((WIZARD_ALL_PACKAGES as readonly string[]).includes(raw)) {
    return raw as WizardBasePackage;
  }
  return LEGACY_PACKAGE_ALIASES[raw] ?? DEFAULT_B2C_BASE_PACKAGE;
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

/** @deprecated Freemium V1 — toujours false (plus de jetons). */
export function hasLegacyTokenPricing(
  _packageId: WizardBasePackage,
): _packageId is WizardLegacyTokenPackage {
  return false;
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

export function packageCents(
  basePackage: WizardBasePackage = WIZARD_PRICING.packages.SIGNATURE.id,
): number {
  return getPackageConfigById(basePackage).priceCents;
}

/** @deprecated Freemium V1 — retourne toujours 0. */
export function packagePartnerTokens(
  _basePackage: WizardLegacyTokenPackage,
): number {
  return 0;
}

export function partnerWholesaleCents(_tokenCount: number): number {
  return 0;
}

export function calculatePartnerMargin(
  packageId: WizardLegacyTokenPackage,
  _tokens?: number,
): number {
  return getPackageConfigById(packageId).priceCents;
}

export function calculatePartnerMarginByKey(
  key: WizardLegacyTokenPackageKey,
  tokens?: number,
): number {
  return calculatePartnerMargin(WIZARD_PRICING.packages[key].id, tokens);
}

export function extensionCents(extensionId: WizardExtensionId): number {
  return EXTENSION_PRICE_BY_ID[extensionId] ?? 0;
}

/** Rang forfait pour entitlements (Soft Cap / bundles). */
export function packageTierRank(packageId: WizardBasePackage): number {
  switch (packageId) {
    case "essential":
      return 0;
    case "signature":
      return 1;
    case "heritage":
      return 2;
    case "legendary":
      return 3;
    default:
      return 0;
  }
}

/**
 * Extensions incluses dans Éternité / Légendaire (pas facturées à part).
 * `musicLicense` est inclus dès Héritage (`signature`).
 */
export const ETERNITE_BUNDLED_EXTENSION_IDS: WizardExtensionId[] = [
  "musicLicense",
  "extendedLicense",
  "aiRetouch",
  "digitalVault",
];

/** @deprecated Alias — utilise ETERNITE + musicLicense dès signature. */
export const HERITAGE_PACKAGE_BUNDLED_EXTENSION_IDS =
  ETERNITE_BUNDLED_EXTENSION_IDS;

export function heritagePackIndividualTotalCents(): number {
  return (
    WIZARD_PRICING.extensions.RETOUCHE_IA.priceCents +
    WIZARD_PRICING.extensions.MUSIC_LICENSE.priceCents +
    WIZARD_PRICING.extensions.COFFRE_FORT.priceCents
  );
}

export function heritagePackSavingsCents(): number {
  return (
    heritagePackIndividualTotalCents() -
    WIZARD_PRICING.extensions.PACK_HERITAGE.priceCents
  );
}

export function heritageBundleAlaCarteCents(): number {
  return (
    WIZARD_PRICING.packages.SIGNATURE.priceCents +
    WIZARD_PRICING.extensions.MUSIC_LICENSE.priceCents +
    WIZARD_PRICING.extensions.SANCTUARY_TOKEN.priceCents +
    WIZARD_PRICING.extensions.COFFRE_FORT.priceCents
  );
}

export function calculateBundleSavings(packageId: WizardBasePackage): number {
  if (packageId !== WIZARD_PRICING.packages.HERITAGE.id) return 0;
  const alaCarte = heritageBundleAlaCarteCents();
  const heritagePrice = WIZARD_PRICING.packages.HERITAGE.priceCents;
  return Math.max(0, alaCarte - heritagePrice);
}

export function bundleSavingsDollarsLabel(savingsCents: number): string {
  return String(Math.trunc(savingsCents / 100));
}

export function isExtensionBundledInBasePackage(
  basePackage: WizardBasePackage,
  extensionId: WizardExtensionId,
): boolean {
  const rank = packageTierRank(basePackage);

  if (extensionId === "musicLicense" || extensionId === "extendedLicense") {
    return rank >= 1; // Héritage+
  }

  if (
    extensionId === "aiRetouch" ||
    extensionId === "digitalVault" ||
    extensionId === "heritagePack"
  ) {
    return rank >= 2; // Éternité+
  }

  return false;
}

export type WizardExtensionsLike = {
  musicLicense?: boolean;
  /** @deprecated → musicLicense */
  extendedLicense?: boolean;
  heritagePack?: boolean;
};

/**
 * Accès catalogue Stingray officiel (API tier `premium`).
 * `intended >= signature` OU add-on musicLicense (ou alias extendedLicense).
 */
export function resolveMusicEntitlement(
  intendedPackage: WizardBasePackage,
  extensions: WizardExtensionsLike = {},
): MusicCatalogTier {
  if (packageTierRank(intendedPackage) >= 1) {
    return "premium";
  }
  if (
    extensions.musicLicense ||
    extensions.extendedLicense ||
    extensions.heritagePack
  ) {
    return "premium";
  }
  return "standard";
}

/** @deprecated Prefer `resolveMusicEntitlement`. */
export function resolveMusicCatalogTier(
  basePackage: WizardBasePackage,
  extensions: WizardExtensionsLike = {},
): MusicCatalogTier {
  return resolveMusicEntitlement(basePackage, extensions);
}

export function hasPremiumMusicCatalogAccess(
  basePackage: WizardBasePackage,
  extensions: WizardExtensionsLike = {},
): boolean {
  return resolveMusicEntitlement(basePackage, extensions) === "premium";
}

/** Soupape MP3/WAV — masquée sur Souvenir. */
export function canUploadPersonalAudio(
  intendedPackage: WizardBasePackage,
): boolean {
  return packageTierRank(intendedPackage) >= 1;
}

/** Normalise les clés extension legacy → canon V1. */
export function normalizeExtensionId(
  id: string,
): WizardExtensionId | undefined {
  if (id === "extendedLicense") return "musicLicense";
  if (id === "collectorUsb") return "sanctuaryToken";
  if (id in EXTENSION_PRICE_BY_ID) return id as WizardExtensionId;
  return undefined;
}
