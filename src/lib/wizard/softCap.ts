import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import { packageTierRank } from "@/src/lib/wizard/pricingConfig";

/** Soft Cap freemium : cadeau Souvenir encore actif. */
export function isSoftCapEligible(
  grantedPackage: WizardBasePackage,
  intendedPackage: WizardBasePackage,
): boolean {
  return (
    packageTierRank(grantedPackage) === 0 &&
    packageTierRank(intendedPackage) === 0
  );
}

export function shouldOfferMediaSoftCap(
  grantedPackage: WizardBasePackage,
  intendedPackage: WizardBasePackage,
  mediaCount: number,
): boolean {
  return isSoftCapEligible(grantedPackage, intendedPackage) && mediaCount >= 50;
}

export function shouldOfferMagicSoftCap(
  grantedPackage: WizardBasePackage,
  intendedPackage: WizardBasePackage,
  mediaCount: number,
): boolean {
  // Soft Cap principal post-Composition Magique — uniquement si encore Souvenir
  // (si intended ≥ Héritage, ne pas re-spammer — voir NARRATIVE_SOFT_CAP.md)
  return isSoftCapEligible(grantedPackage, intendedPackage) && mediaCount >= 50;
}

export function shouldOfferMusicSoftCap(
  grantedPackage: WizardBasePackage,
  intendedPackage: WizardBasePackage,
  hasMusicLicense: boolean,
): boolean {
  if (hasMusicLicense) return false;
  if (packageTierRank(intendedPackage) >= 1) return false;
  return packageTierRank(grantedPackage) === 0;
}
