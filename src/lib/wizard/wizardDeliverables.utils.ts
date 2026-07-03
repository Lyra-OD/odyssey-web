/**
 * Utilitaires UI / présentation — complément de `wizardDeliverables.ts`.
 */

import type { Locale } from "@/i18n.config";

import {
  packageNameFromLabels,
  packageStyleFromLabels,
  type PackageLabelsI18n,
} from "@/src/lib/wizard/packageI18n";
import {
  getPackageManifest,
  type PackageId,
  PARTNER_PACKAGE_IDS,
  type PartnerPackageId,
  type TransactionMode,
} from "@/src/lib/wizard/wizardDeliverables";

/** Forfait mis en avant sur le dashboard partenaire. */
export const RECOMMENDED_PACKAGE_ID: PartnerPackageId = "HERITAGE";

export type PartnerInvitationFeatureId =
  | "salon"
  | "social"
  | "aiRestoration"
  | "cloudVault";

export type PartnerInvitationFeature = {
  id: PartnerInvitationFeatureId;
  label: string;
  included: boolean;
};

export type PartnerInvitationTierPresentation = {
  packageId: PartnerPackageId;
  title: string;
  style: string;
  /** Donnée transactionnelle — débit jetons à l’envoi (hors matrice features). */
  tokenDebitLabel: string;
  features: PartnerInvitationFeature[];
  recommended: boolean;
};

function buildTokenDebitLabel(
  packageId: PartnerPackageId,
  locale: Locale,
): string {
  const { tokens } = getPackageManifest(packageId).pricing;
  if (locale === "en") {
    return tokens === 1
      ? "1 token debited on send"
      : `${tokens} tokens debited on send`;
  }
  return tokens === 1
    ? "1 jeton débité à l’envoi"
    : `${tokens} jetons débités à l’envoi`;
}

function buildFeatureRows(
  packageId: PartnerPackageId,
  locale: Locale,
): PartnerInvitationFeature[] {
  const m = getPackageManifest(packageId);

  if (locale === "en") {
    return [
      {
        id: "salon",
        label:
          m.salon.audio === "personal_mp3"
            ? "Salon 16:9 · personal MP3 or catalog"
            : "Salon 16:9 · Stingray music",
        included: true,
      },
      {
        id: "social",
        label: m.social.enabled
          ? `Social clip ${m.social.aspect} · ${m.social.duration}s · rights-safe music`
          : "Social clip not included",
        included: m.social.enabled,
      },
      {
        id: "aiRestoration",
        label: m.features.aiRestoration
          ? "AI restoration included"
          : "AI restoration not included",
        included: m.features.aiRestoration,
      },
      {
        id: "cloudVault",
        label: `Cloud vault · ${m.features.cloudStorageYears} years`,
        included: true,
      },
    ];
  }

  return [
    {
      id: "salon",
      label:
        m.salon.audio === "personal_mp3"
          ? "Salon 16:9 · MP3 personnel ou catalogue"
          : "Salon 16:9 · musique Stingray",
      included: true,
    },
    {
      id: "social",
      label: m.social.enabled
        ? `Clip Social ${m.social.aspect} · ${m.social.duration} s · musique libre de droits`
        : "Clip Social non inclus",
      included: m.social.enabled,
    },
    {
      id: "aiRestoration",
      label: m.features.aiRestoration
        ? "Restauration IA incluse"
        : "Restauration IA non incluse",
      included: m.features.aiRestoration,
    },
    {
      id: "cloudVault",
      label: `Coffre cloud · ${m.features.cloudStorageYears} ans`,
      included: true,
    },
  ];
}

export function getPartnerInvitationTierPresentation(
  packageId: PartnerPackageId,
  labels: PackageLabelsI18n,
  locale: Locale,
): PartnerInvitationTierPresentation {
  return {
    packageId,
    title: packageNameFromLabels(packageId, labels.names),
    style: packageStyleFromLabels(packageId, labels.styles),
    tokenDebitLabel: buildTokenDebitLabel(packageId, locale),
    features: buildFeatureRows(packageId, locale),
    recommended: packageId === RECOMMENDED_PACKAGE_ID,
  };
}

/** Cartes forfait dashboard partenaire — ordre manifeste. */
export function listPartnerInvitationTiers(
  locale: Locale,
  labels: PackageLabelsI18n,
): PartnerInvitationTierPresentation[] {
  return PARTNER_PACKAGE_IDS.map((packageId) =>
    getPartnerInvitationTierPresentation(packageId, labels, locale),
  );
}

export type PackagePriceParts = {
  amount: string;
  suffix: string;
  formatted: string;
};

/** Découpe le libellé prix pour la carte éditoriale (grand nombre + suffixe). */
export function packagePricePartsForMode(
  packageId: PackageId,
  mode: TransactionMode,
  formatted: string,
): PackagePriceParts {
  const { tokens, dollars } = getPackageManifest(packageId).pricing;

  if (mode === "tokens") {
    return {
      amount: String(tokens),
      suffix: formatted.replace(/^\d+\s*/, "").trim() || "jetons",
      formatted,
    };
  }

  return {
    amount: String(dollars),
    suffix: formatted.includes("$") ? "" : "$",
    formatted,
  };
}
