/**
 * Résout la liste exhaustive des inclusions d'un forfait — « Le Dossier »
 * (panneau off-canvas global, voir `PackageDossierPanel.tsx`) — directement
 * depuis `PACKAGE_MANIFEST` plutôt que depuis un texte marketing figé dans
 * les dictionnaires. Garantit que le client ne peut jamais lire une
 * inclusion qui ne correspond pas au contrat produit réel.
 */

import { getPackageManifest, type PackageId } from "@/src/lib/wizard/wizardDeliverables";

export type PackageDossierRow = {
  id: string;
  label: string;
  value: string;
};

export type PackageDossierRowsCopy = {
  mediaLabel: string;
  /** Doit contenir `{count}`. */
  mediaValue: string;
  songsLabel: string;
  /** Doit contenir `{count}`. */
  songsValue: string;
  resolutionLabel: string;
  resolution1080p: string;
  resolution4k: string;
  priorityLabel: string;
  priorityStandard: string;
  priorityHigh: string;
  priorityUltra: string;
  salonLabel: string;
  salonPersonal: string;
  salonCatalog: string;
  socialLabel: string;
  vaultLabel: string;
  /** Doit contenir `{years}`. */
  vaultValue: string;
  aiRestorationLabel: string;
  scannerLabel: string;
  whiteGloveLabel: string;
  included: string;
  notIncluded: string;
};

export function resolvePackageDossierRows(
  packageId: PackageId,
  copy: PackageDossierRowsCopy,
): PackageDossierRow[] {
  const manifest = getPackageManifest(packageId);

  return [
    {
      id: "media",
      label: copy.mediaLabel,
      value: copy.mediaValue.replace("{count}", String(manifest.limits.maxMediaItems)),
    },
    {
      id: "songs",
      label: copy.songsLabel,
      value: copy.songsValue.replace("{count}", String(manifest.limits.maxSongs)),
    },
    {
      id: "resolution",
      label: copy.resolutionLabel,
      value:
        manifest.rendering.exportResolution === "4K"
          ? copy.resolution4k
          : copy.resolution1080p,
    },
    {
      id: "priority",
      label: copy.priorityLabel,
      value:
        manifest.rendering.renderPriority === "ultra"
          ? copy.priorityUltra
          : manifest.rendering.renderPriority === "high"
            ? copy.priorityHigh
            : copy.priorityStandard,
    },
    {
      id: "salon",
      label: copy.salonLabel,
      value: manifest.salon.audio === "personal_mp3" ? copy.salonPersonal : copy.salonCatalog,
    },
    {
      id: "social",
      label: copy.socialLabel,
      value: manifest.social.enabled ? copy.included : copy.notIncluded,
    },
    {
      id: "vault",
      label: copy.vaultLabel,
      value: copy.vaultValue.replace("{years}", String(manifest.features.cloudStorageYears)),
    },
    {
      id: "aiRestoration",
      label: copy.aiRestorationLabel,
      value: manifest.features.aiRestoration ? copy.included : copy.notIncluded,
    },
    {
      id: "scanner",
      label: copy.scannerLabel,
      value: manifest.features.scannerCompanion ? copy.included : copy.notIncluded,
    },
    {
      id: "whiteGlove",
      label: copy.whiteGloveLabel,
      value: manifest.features.whiteGloveDigitization ? copy.included : copy.notIncluded,
    },
  ];
}
