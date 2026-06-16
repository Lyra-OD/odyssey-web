import { OdysseyBrandLockup } from "@/src/components/OdysseyBrandLockup";
import type { PartnerPublicBranding } from "@/src/lib/partner/partnerBrandingTypes";

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
      <div className="salon-cinema mb-8 flex w-full justify-center">
        <div className="salon-cinema-logo">
          <OdysseyBrandLockup wordmark={defaultWordmark} size="page" />
        </div>
      </div>
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
