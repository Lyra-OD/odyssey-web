/**
 * Hub post-séance — CTA Archive Master selon forfait / paiement (C1/C2/C8).
 */

import {
  isExtensionBundledInBasePackage,
  type WizardBasePackage,
} from "@/src/lib/wizard/pricingConfig";

export type OrganizerMasterHubMode =
  | "buy_master"
  | "download_included"
  | "finalize_heritage";

/**
 * - Souvenir (essential) sans Master payé → achat 49 $.
 * - Héritage+ intenté mais projet non validé → finaliser l’Écrin (pas 49 $ orphelin).
 * - Master déjà inclus / débloqué → télécharger.
 */
export function resolveOrganizerMasterHubMode(input: {
  grantedPackage: WizardBasePackage;
  intendedPackage: WizardBasePackage;
  projectStatus?: string | null;
  /** Entitlements serveur : Master inclus ou add-on payé. */
  masterEntitled?: boolean | null;
}): OrganizerMasterHubMode {
  if (input.masterEntitled === true) return "download_included";

  const grantedHasMaster = isExtensionBundledInBasePackage(
    input.grantedPackage,
    "cinemaMaster",
  );
  const intendedHasMaster = isExtensionBundledInBasePackage(
    input.intendedPackage,
    "cinemaMaster",
  );
  const submitted = input.projectStatus === "submitted";

  if (grantedHasMaster && submitted) return "download_included";

  // Draft / freemium : intention Héritage+ sans Master encore « validé ».
  if (intendedHasMaster && !submitted) return "finalize_heritage";
  if (intendedHasMaster && !grantedHasMaster) return "finalize_heritage";
  if (grantedHasMaster && !submitted) return "finalize_heritage";

  return "buy_master";
}
