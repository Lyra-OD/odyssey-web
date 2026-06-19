import type { PartnerPublicBranding } from "@/src/lib/partner/partnerBrandingTypes";

import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import { PartnerBrandLockup } from "@/src/components/partner/PartnerBrandLockup";

type SalonConnexionBrandProps = {
  branding: PartnerPublicBranding | null;
  poweredByLabel: string;
  defaultWordmark: string;
};

export function SalonConnexionBrand({
  branding,
  poweredByLabel,
  defaultWordmark,
}: SalonConnexionBrandProps) {
  if (!branding) {
    return (
      <OdysseyConnexionMark
        wordmark={defaultWordmark}
        animate
        className="mb-8"
      />
    );
  }

  return (
    <div className="salon-cinema mb-8 flex w-full justify-center">
      <PartnerBrandLockup
        brandLabel={branding.brandLabel}
        logoUrl={branding.logoUrl}
        poweredByLabel={poweredByLabel}
        variant="cinema"
        animate
        animationPreset="connexion"
      />
    </div>
  );
}
