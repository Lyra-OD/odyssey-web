/**
 * Résolution export Creatomate selon forfait payé (jamais le client).
 *
 * Souvenir (essential) + Héritage (signature) → 1080p
 * Éternité (heritage) + Légendaire (legendary) → Master 4K
 */

import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import { normalizeBasePackageId } from "@/src/lib/wizard/pricingConfig";
import type { CreatomatePixelSize } from "@/src/lib/creatomate/types";

const SIZE_1080: CreatomatePixelSize = {
  width: 1920,
  height: 1080,
  label: "1080p",
};

const SIZE_4K: CreatomatePixelSize = {
  width: 3840,
  height: 2160,
  label: "4K",
};

/** Forfaits qui débloquent le master 4K. */
const MASTER_4K_PACKAGES = new Set<WizardBasePackage>([
  "heritage",
  "legendary",
]);

/**
 * @param paidPackage — `project_paid_entitlements.paid_package`
 *   (miroir granted / forfait réellement acquis).
 */
export function resolveCreatomateResolution(
  paidPackage: WizardBasePackage | string | null | undefined,
): CreatomatePixelSize {
  const pkg = normalizeBasePackageId(
    paidPackage == null ? undefined : String(paidPackage),
  );
  if (MASTER_4K_PACKAGES.has(pkg)) return SIZE_4K;
  return SIZE_1080;
}

export function isMaster4kPackage(
  paidPackage: WizardBasePackage | string | null | undefined,
): boolean {
  return resolveCreatomateResolution(paidPackage).label === "4K";
}
