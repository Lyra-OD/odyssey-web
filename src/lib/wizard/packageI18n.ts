import type { AppDictionary } from "@/lib/dictionaries";

import {
  type LegacyGrantedPackage,
  MANIFEST_TO_WIZARD_BASE_PACKAGE,
  type PackageId,
} from "@/src/lib/wizard/wizardDeliverables";
import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";

/** Libellés forfaits issus de `dictionaries/*.json` → `packages.names`. */
export type PackageNamesI18n = AppDictionary["packages"]["names"];

export type PackageStylesI18n = AppDictionary["packages"]["styles"];

export type PackageLabelsI18n = {
  names: PackageNamesI18n;
  styles: PackageStylesI18n;
};

type LabelsRecord = Record<string, string | undefined>;

function technicalPackageId(packageId: PackageId): WizardBasePackage {
  return MANIFEST_TO_WIZARD_BASE_PACKAGE[packageId];
}

function isEnglishDictionary(
  labels: PackageNamesI18n | PackageStylesI18n,
): boolean {
  const record = labels as LabelsRecord;
  return record.essential === "Keepsake" || record.signature === "Legacy";
}

function fallbackPackageName(
  packageId: PackageId,
  names: PackageNamesI18n,
): string {
  if (packageId === "LEGENDAIRE") {
    return isEnglishDictionary(names) ? "Legendary" : "Légendaire";
  }
  return packageId;
}

function fallbackPackageStyle(
  packageId: PackageId,
  styles: PackageStylesI18n,
): string {
  if (packageId === "LEGENDAIRE") {
    return isEnglishDictionary(styles) ? "White Gloves" : "Gants Blancs";
  }
  return packageId;
}

export function packageNameFromLabels(
  packageId: PackageId,
  names: PackageNamesI18n,
): string {
  const technicalId = technicalPackageId(packageId);
  const record = names as LabelsRecord;
  return record[technicalId] ?? fallbackPackageName(packageId, names);
}

export function packageStyleFromLabels(
  packageId: PackageId,
  styles: PackageStylesI18n,
): string {
  const technicalId = technicalPackageId(packageId);
  const record = styles as LabelsRecord;
  return record[technicalId] ?? fallbackPackageStyle(packageId, styles);
}

export function legacyPackageName(
  legacyId: LegacyGrantedPackage,
  names: PackageNamesI18n,
): string {
  return names[legacyId];
}
