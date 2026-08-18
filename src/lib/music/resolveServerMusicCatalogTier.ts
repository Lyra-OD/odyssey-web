import type {
  MusicCatalogTier,
  WizardBasePackage,
  WizardExtensionsLike,
} from "@/src/lib/wizard/pricingConfig";
import { resolveMusicEntitlement } from "@/src/lib/wizard/pricingConfig";
import { shouldOfferMusicSoftCap } from "@/src/lib/wizard/softCap";

/**
 * Tier catalogue Stingray côté serveur — ne jamais faire confiance au param
 * `tier` client. Aligné sur `TributeWizard` (editor + Soft Cap musique).
 */
export function resolveServerMusicCatalogTier(params: {
  grantedPackage: WizardBasePackage;
  intendedPackage: WizardBasePackage;
  extensions: WizardExtensionsLike;
  role?: "owner" | "editor";
}): MusicCatalogTier {
  if (params.role === "editor") return "premium";

  const entitled = resolveMusicEntitlement(
    params.intendedPackage,
    params.extensions,
  );
  if (entitled === "premium") return "premium";

  const hasMusicLicense = Boolean(
    params.extensions.musicLicense || params.extensions.extendedLicense,
  );
  if (
    shouldOfferMusicSoftCap(
      params.grantedPackage,
      params.intendedPackage,
      hasMusicLicense,
    )
  ) {
    return "premium";
  }

  return "standard";
}
