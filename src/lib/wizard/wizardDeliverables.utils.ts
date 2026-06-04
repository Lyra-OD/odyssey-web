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
  PACKAGE_IDS,
  type TransactionMode,
} from "@/src/lib/wizard/wizardDeliverables";

/** Forfait mis en avant sur le dashboard partenaire. */
export const RECOMMENDED_PACKAGE_ID: PackageId = "HERITAGE";

export type PartnerInvitationTierPresentation = {
  packageId: PackageId;
  title: string;
  style: string;
  features: string[];
  recommended: boolean;
};

function buildFeatures(
  packageId: PackageId,
  locale: Locale,
): string[] {
  const m = getPackageManifest(packageId);
  const { tokens } = m.pricing;

  if (locale === "en") {
    const tokenLine =
      tokens === 1
        ? "1 token debited on send"
        : `${tokens} tokens debited on send`;
    const lines = [tokenLine];

    if (m.salon.audio === "personal_mp3") {
      lines.push("Salon 16:9 · personal MP3 or catalog");
    } else {
      lines.push("Salon 16:9 · Stingray music");
    }

    if (m.social.enabled) {
      lines.push(
        `Social clip ${m.social.aspect} · ${m.social.duration}s · rights-safe music`,
      );
    } else {
      lines.push("Social clip not included");
    }

    if (m.features.aiRestoration) {
      lines.push("AI restoration included");
    }

    lines.push(`Cloud vault · ${m.features.cloudStorageYears} years`);

    return lines;
  }

  const tokenLine =
    tokens === 1
      ? "1 jeton débité à l’envoi"
      : `${tokens} jetons débités à l’envoi`;
  const lines = [tokenLine];

  if (m.salon.audio === "personal_mp3") {
    lines.push("Salon 16:9 · MP3 personnel ou catalogue");
  } else {
    lines.push("Salon 16:9 · musique Stingray");
  }

  if (m.social.enabled) {
    lines.push(
      `Clip Social ${m.social.aspect} · ${m.social.duration} s · musique libre de droits`,
    );
  } else {
    lines.push("Clip Social non inclus");
  }

  if (m.features.aiRestoration) {
    lines.push("Restauration IA incluse");
  }

  lines.push(`Coffre cloud · ${m.features.cloudStorageYears} ans`);

  return lines;
}

export function getPartnerInvitationTierPresentation(
  packageId: PackageId,
  labels: PackageLabelsI18n,
  locale: Locale,
): PartnerInvitationTierPresentation {
  return {
    packageId,
    title: packageNameFromLabels(packageId, labels.names),
    style: packageStyleFromLabels(packageId, labels.styles),
    features: buildFeatures(packageId, locale),
    recommended: packageId === RECOMMENDED_PACKAGE_ID,
  };
}

/** Cartes forfait dashboard partenaire — ordre manifeste. */
export function listPartnerInvitationTiers(
  locale: Locale,
  labels: PackageLabelsI18n,
): PartnerInvitationTierPresentation[] {
  return PACKAGE_IDS.map((packageId) =>
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
