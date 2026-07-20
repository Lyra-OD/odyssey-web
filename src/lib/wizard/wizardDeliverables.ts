/**
 * Contrat de livrables Odyssey — source de vérité produit (Quiet Luxury / B2B2C).
 *
 * Forfaits :
 * - SOUVENIR   → `essential`
 * - HERITAGE   → `signature`
 * - ETERNITE   → `heritage`
 * - LEGENDAIRE → `legendary`
 *
 * Les IDs legacy (`essential` | `signature` | `heritage`) restent utilisés en DB P5
 * et dans `wizard_state` jusqu’à migration complète. `legendary` n’a PAS de mapping
 * legacy partenaire et ne doit jamais être utilisé côté jetons / invitations.
 */

import type {
  WizardBasePackage,
  WizardPartnerGrantedPackage,
} from "@/src/lib/wizard/pricingConfig";
import {
  packageCents,
  packagePartnerTokens,
  WIZARD_PRICING,
} from "@/src/lib/wizard/pricingConfig";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PackageId = "SOUVENIR" | "HERITAGE" | "ETERNITE" | "LEGENDAIRE";
export type PartnerPackageId = Extract<
  PackageId,
  "SOUVENIR" | "HERITAGE" | "ETERNITE"
>;
export type B2CDirectPackageId = Extract<
  PackageId,
  "HERITAGE" | "ETERNITE" | "LEGENDAIRE"
>;

export type SalonAspect = "16:9";
export type SocialAspect = "9:16";
export type SalonAudioMode = "personal_mp3" | "stingray_acts";
export type SocialAudioMode = "safe_music";
export type ExportResolution = "1080p" | "4K";
export type RenderPriority = "standard" | "high" | "ultra";

/** Mode d’affichage / encaissement côté UI et checkout. */
export type TransactionMode = "tokens" | "dollars";

/**
 * Modes checkout cible (P5 `tribute_checkouts.checkout_mode`).
 * Détermine quel axe du manifeste s’applique au paiement principal.
 */
export type CheckoutMode = "b2c" | "b2b_partner" | "b2b2c_family";

export interface DeliverablesConfig {
  pricing: {
    /** Jetons débités au partenaire (legacy uniquement). */
    tokens: number;
    /** Prix public famille en dollars entiers (affichage). */
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
  limits: {
    maxMediaItems: number;
    maxSongs: number;
  };
  rendering: {
    exportResolution: ExportResolution;
    renderPriority: RenderPriority;
  };
  pacing: {
    /**
     * Décision éditoriale : nombre max de médias toléré par chanson.
     * @deprecated Conservé comme proxy de calcul (nombre de chansons minimum
     * requis avant que l'utilisateur ait choisi ses pistes / connu `durationSec`).
     * La règle produit de référence est désormais `targetSecondsPerMedia` (S4).
     */
    maxMediaItemsPerSong: number;
    /**
     * Cible éditoriale du pacing temporel (S4) : rythme strict de 7 s / média,
     * quel que soit le forfait. Capacité recommandée d'un chapitre =
     * `floor(chanson.durationSec / targetSecondsPerMedia)`.
     */
    targetSecondsPerMedia: number;
  };
  features: {
    aiRestoration: boolean;
    cloudStorageYears: number;
    scannerCompanion: boolean;
    whiteGloveDigitization: boolean;
  };
}

// ---------------------------------------------------------------------------
// Manifeste
// ---------------------------------------------------------------------------

export const PACKAGE_MANIFEST: Record<PackageId, DeliverablesConfig> = {
  SOUVENIR: {
    pricing: { tokens: 0, dollars: 0 },
    salon: { enabled: true, aspect: "16:9", audio: "stingray_acts" },
    social: {
      enabled: false,
      aspect: "9:16",
      duration: 45,
      audio: "safe_music",
    },
    limits: { maxMediaItems: 50, maxSongs: 2 },
    rendering: { exportResolution: "1080p", renderPriority: "standard" },
    pacing: { maxMediaItemsPerSong: 25, targetSecondsPerMedia: 7 },
    features: {
      aiRestoration: false,
      cloudStorageYears: 5,
      scannerCompanion: false,
      whiteGloveDigitization: false,
    },
  },
  HERITAGE: {
    pricing: { tokens: 0, dollars: 149 },
    salon: { enabled: true, aspect: "16:9", audio: "stingray_acts" },
    social: {
      enabled: true,
      aspect: "9:16",
      duration: 45,
      audio: "safe_music",
    },
    limits: { maxMediaItems: 125, maxSongs: 5 },
    /** Freemium V1 : Héritage = 4K + catalogue Stingray officiel. */
    rendering: { exportResolution: "4K", renderPriority: "high" },
    pacing: { maxMediaItemsPerSong: 25, targetSecondsPerMedia: 7 },
    features: {
      aiRestoration: false,
      cloudStorageYears: 50,
      scannerCompanion: false,
      whiteGloveDigitization: false,
    },
  },
  ETERNITE: {
    pricing: { tokens: 0, dollars: 299 },
    /** Stingray officiel + soupape MP3 (ToS) — audio primary stingray; upload gated in UI. */
    salon: { enabled: true, aspect: "16:9", audio: "stingray_acts" },
    social: {
      enabled: true,
      aspect: "9:16",
      duration: 45,
      audio: "safe_music",
    },
    limits: { maxMediaItems: 175, maxSongs: 7 },
    rendering: { exportResolution: "4K", renderPriority: "high" },
    pacing: { maxMediaItemsPerSong: 25, targetSecondsPerMedia: 7 },
    features: {
      aiRestoration: true,
      cloudStorageYears: 50,
      scannerCompanion: true,
      whiteGloveDigitization: false,
    },
  },
  LEGENDAIRE: {
    pricing: { tokens: 0, dollars: 499 },
    salon: { enabled: true, aspect: "16:9", audio: "stingray_acts" },
    social: {
      enabled: true,
      aspect: "9:16",
      duration: 45,
      audio: "safe_music",
    },
    limits: { maxMediaItems: 250, maxSongs: 10 },
    rendering: { exportResolution: "4K", renderPriority: "ultra" },
    pacing: { maxMediaItemsPerSong: 25, targetSecondsPerMedia: 7 },
    features: {
      aiRestoration: true,
      cloudStorageYears: 50,
      scannerCompanion: true,
      whiteGloveDigitization: true,
    },
  },
};

export const PACKAGE_IDS: PackageId[] = [
  "SOUVENIR",
  "HERITAGE",
  "ETERNITE",
  "LEGENDAIRE",
];

export const PARTNER_PACKAGE_IDS: PartnerPackageId[] = [
  "SOUVENIR",
  "HERITAGE",
  "ETERNITE",
];

export const B2C_DIRECT_PACKAGE_IDS: B2CDirectPackageId[] = [
  "HERITAGE",
  "ETERNITE",
  "LEGENDAIRE",
];

/** Valeur `partner_invitations.granted_package` / `wizard_state.basePackage` (P3–P5). */
export type LegacyGrantedPackage = "essential" | "signature" | "heritage";

/** Mapping manifeste → colonnes SQL actuelles (strictement packages partenaire). */
export const MANIFEST_TO_LEGACY_GRANTED: Record<
  PartnerPackageId,
  LegacyGrantedPackage
> = {
  SOUVENIR: "essential",
  HERITAGE: "signature",
  ETERNITE: "heritage",
};

/** Mapping inverse (rehydratation projet / invitation). */
export const LEGACY_GRANTED_TO_MANIFEST: Record<
  LegacyGrantedPackage,
  PartnerPackageId
> = {
  essential: "SOUVENIR",
  signature: "HERITAGE",
  heritage: "ETERNITE",
};

/** Mapping complet wizard runtime → manifeste. */
export const WIZARD_BASE_PACKAGE_TO_MANIFEST: Record<
  WizardBasePackage,
  PackageId
> = {
  essential: "SOUVENIR",
  signature: "HERITAGE",
  heritage: "ETERNITE",
  legendary: "LEGENDAIRE",
};

/** Mapping manifeste → wizard runtime (4 packages). */
export const MANIFEST_TO_WIZARD_BASE_PACKAGE: Record<
  PackageId,
  WizardBasePackage
> = {
  SOUVENIR: WIZARD_PRICING.packages.ESSENTIEL.id,
  HERITAGE: WIZARD_PRICING.packages.SIGNATURE.id,
  ETERNITE: WIZARD_PRICING.packages.HERITAGE.id,
  LEGENDAIRE: WIZARD_PRICING.packages.LEGENDARY.id,
};

/** Alias legacy partenaire uniquement (`wizard_state` / invitation). */
export const LEGACY_WIZARD_PACKAGE_TO_MANIFEST: Record<
  WizardPartnerGrantedPackage,
  PartnerPackageId
> = {
  essential: "SOUVENIR",
  signature: "HERITAGE",
  heritage: "ETERNITE",
};

// ---------------------------------------------------------------------------
// Guards & accessors
// ---------------------------------------------------------------------------

export function isPartnerPackageId(
  packageId: PackageId,
): packageId is PartnerPackageId {
  return (PARTNER_PACKAGE_IDS as readonly string[]).includes(packageId);
}

export function isB2CDirectPackageId(
  packageId: PackageId,
): packageId is B2CDirectPackageId {
  return (B2C_DIRECT_PACKAGE_IDS as readonly string[]).includes(packageId);
}

export function getPackageManifest(packageId: PackageId): DeliverablesConfig {
  return PACKAGE_MANIFEST[packageId];
}

export function manifestPackageFromLegacy(
  legacy: string | undefined,
): PartnerPackageId {
  if (!legacy) return "HERITAGE";
  const key = legacy as LegacyGrantedPackage;
  if (key in LEGACY_GRANTED_TO_MANIFEST) {
    return LEGACY_GRANTED_TO_MANIFEST[key];
  }
  if ((PARTNER_PACKAGE_IDS as readonly string[]).includes(legacy)) {
    return legacy as PartnerPackageId;
  }
  if (legacy === "prestige") return "HERITAGE";
  return "HERITAGE";
}

export function manifestPackageFromWizardBasePackage(
  packageId: WizardBasePackage,
): PackageId {
  return WIZARD_BASE_PACKAGE_TO_MANIFEST[packageId];
}

/**
 * @deprecated Transition helper.
 * `LEGENDAIRE` n’a volontairement AUCUN mapping legacy partenaire.
 */
export function legacyGrantedFromManifest(
  packageId: PackageId,
): LegacyGrantedPackage {
  if (!isPartnerPackageId(packageId)) {
    throw new Error(
      `legacyGrantedFromManifest: ${packageId} has no legacy granted mapping.`,
    );
  }
  return MANIFEST_TO_LEGACY_GRANTED[packageId];
}

/**
 * Mapping manifeste → package wizard legacy strict.
 * `LEGENDAIRE` est exclu par design.
 */
export function legacyWizardPackageFromManifest(
  packageId: PartnerPackageId,
): WizardPartnerGrantedPackage {
  return MANIFEST_TO_LEGACY_GRANTED[packageId];
}

/** Prix public en centimes (entier) — aligné manifeste × 100. */
export function packageDollarsCents(packageId: PackageId): number {
  return PACKAGE_MANIFEST[packageId].pricing.dollars * 100;
}

export function packageManifestTokens(packageId: PartnerPackageId): number {
  return PACKAGE_MANIFEST[packageId].pricing.tokens;
}

export function packageRenderPriority(packageId: PackageId): RenderPriority {
  return PACKAGE_MANIFEST[packageId].rendering.renderPriority;
}

export function packageExportResolution(packageId: PackageId): ExportResolution {
  return PACKAGE_MANIFEST[packageId].rendering.exportResolution;
}

export function packageMaxMediaItems(packageId: PackageId): number {
  return PACKAGE_MANIFEST[packageId].limits.maxMediaItems;
}

export function packageMaxSongs(packageId: PackageId): number {
  return PACKAGE_MANIFEST[packageId].limits.maxSongs;
}

export function packageMaxMediaItemsPerSong(packageId: PackageId): number {
  return PACKAGE_MANIFEST[packageId].pacing.maxMediaItemsPerSong;
}

/** Cible éditoriale du pacing temporel (S4) — secondes de chanson par média. */
export function packageTargetSecondsPerMedia(packageId: PackageId): number {
  return PACKAGE_MANIFEST[packageId].pacing.targetSecondsPerMedia;
}

export function salonAllowsPersonalMp3(packageId: PackageId): boolean {
  return PACKAGE_MANIFEST[packageId].salon.audio === "personal_mp3";
}

export function socialDeliverableEnabled(packageId: PackageId): boolean {
  return PACKAGE_MANIFEST[packageId].social.enabled;
}

export function packageSupportsScannerCompanion(packageId: PackageId): boolean {
  return PACKAGE_MANIFEST[packageId].features.scannerCompanion;
}

export function packageSupportsWhiteGloveDigitization(
  packageId: PackageId,
): boolean {
  return PACKAGE_MANIFEST[packageId].features.whiteGloveDigitization;
}

// ---------------------------------------------------------------------------
// Pacing helpers (pure logic only — no UI enforcement here)
// ---------------------------------------------------------------------------

export function getRequiredSongCountForMediaCount(
  packageId: PackageId,
  mediaCount: number,
): number {
  const normalizedMediaCount = Math.max(0, Math.trunc(mediaCount));
  if (normalizedMediaCount === 0) return 0;

  const manifest = getPackageManifest(packageId);
  const cappedMediaCount = Math.min(
    normalizedMediaCount,
    manifest.limits.maxMediaItems,
  );

  return Math.min(
    manifest.limits.maxSongs,
    Math.max(
      1,
      Math.ceil(cappedMediaCount / manifest.pacing.maxMediaItemsPerSong),
    ),
  );
}

export function validatePackagePacing(
  packageId: PackageId,
  mediaCount: number,
  selectedSongCount: number,
): {
  minSongsRequired: number;
  maxSongsAllowed: number;
  isValid: boolean;
} {
  const minSongsRequired = getRequiredSongCountForMediaCount(
    packageId,
    mediaCount,
  );
  const maxSongsAllowed = packageMaxSongs(packageId);
  const normalizedSongCount = Math.max(0, Math.trunc(selectedSongCount));

  return {
    minSongsRequired,
    maxSongsAllowed,
    isValid:
      normalizedSongCount >= minSongsRequired &&
      normalizedSongCount <= maxSongsAllowed,
  };
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
 * - `dollars` : Stripe famille (`b2c` ou `b2b2c_family`).
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
  if (mode === "tokens") {
    if (!isPartnerPackageId(packageId)) {
      throw new Error(
        `formatPackagePriceForMode: ${packageId} is not available in token mode.`,
      );
    }
    const tokens = packageManifestTokens(packageId);
    return locale === "en"
      ? `${tokens} ${tokens === 1 ? "token" : "tokens"}`
      : `${tokens} ${tokens === 1 ? "jeton" : "jetons"}`;
  }

  const { dollars } = PACKAGE_MANIFEST[packageId].pricing;
  return locale === "en" ? `$${dollars}` : `${dollars} $`;
}

/**
 * Delta famille B2B2C legacy : forfait choisi − forfait offert (`granted`).
 * `LEGENDAIRE` est exclu car non proposé dans le catalogue partenaire.
 */
export function familyPackageDeltaDollars(
  granted: PartnerPackageId,
  selected: PartnerPackageId,
): number {
  const grantedDollars = PACKAGE_MANIFEST[granted].pricing.dollars;
  const selectedDollars = PACKAGE_MANIFEST[selected].pricing.dollars;
  return Math.max(0, selectedDollars - grantedDollars);
}

export function familyPackageDeltaCents(
  granted: PartnerPackageId,
  selected: PartnerPackageId,
): number {
  return familyPackageDeltaDollars(granted, selected) * 100;
}

// ---------------------------------------------------------------------------
// Cohérence avec pricingConfig (garde-fou migration)
// ---------------------------------------------------------------------------

/**
 * Vérifie que le manifeste et `pricingConfig.ts` restent alignés.
 * À appeler en dev / tests — pas en runtime hot path production si coût inutile.
 */
export function assertManifestPricingAlignedWithLegacyConfig(): void {
  for (const packageId of PACKAGE_IDS) {
    const wizardPackage = MANIFEST_TO_WIZARD_BASE_PACKAGE[packageId];
    const manifest = PACKAGE_MANIFEST[packageId];
    const cents = packageCents(wizardPackage);

    if (cents !== manifest.pricing.dollars * 100) {
      throw new Error(
        `Manifest/pricingConfig drift: ${packageId} dollars — manifest=${manifest.pricing.dollars} config=${cents / 100}`,
      );
    }
  }

  for (const packageId of PARTNER_PACKAGE_IDS) {
    const wizardPackage = legacyWizardPackageFromManifest(packageId);
    const manifest = PACKAGE_MANIFEST[packageId];
    const tokens = packagePartnerTokens(wizardPackage);

    if (tokens !== manifest.pricing.tokens) {
      throw new Error(
        `Manifest/pricingConfig drift: ${packageId} tokens — manifest=${manifest.pricing.tokens} config=${tokens}`,
      );
    }
  }

  // Freemium V1 : Héritage = 4K
  if (PACKAGE_MANIFEST.HERITAGE.rendering.exportResolution !== "4K") {
    throw new Error("Freemium V1: HERITAGE must export 4K");
  }
}
