import type { AppDictionary } from "@/lib/dictionaries";

import {
  legacyGrantedFromManifest,
  type LegacyGrantedPackage,
  type PackageId,
} from "@/src/lib/wizard/wizardDeliverables";

/** Libellés forfaits issus de `dictionaries/*.json` → `packages.names`. */
export type PackageNamesI18n = AppDictionary["packages"]["names"];

export type PackageStylesI18n = AppDictionary["packages"]["styles"];

export type PackageLabelsI18n = {
  names: PackageNamesI18n;
  styles: PackageStylesI18n;
};

export function packageNameFromLabels(
  packageId: PackageId,
  names: PackageNamesI18n,
): string {
  const legacy = legacyGrantedFromManifest(packageId);
  return names[legacy];
}

export function packageStyleFromLabels(
  packageId: PackageId,
  styles: PackageStylesI18n,
): string {
  const legacy = legacyGrantedFromManifest(packageId);
  return styles[legacy];
}

export function legacyPackageName(
  legacyId: LegacyGrantedPackage,
  names: PackageNamesI18n,
): string {
  return names[legacyId];
}
