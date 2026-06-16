import { OdysseyBrandLockup } from "@/src/components/OdysseyBrandLockup";
import type { PartnerPublicBranding } from "@/src/lib/partner/partnerBrandingTypes";

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
      <div className="mb-10 flex flex-col items-center">
        <OdysseyBrandLockup wordmark={defaultWordmark} size="page" />
      </div>
    );
  }

  return (
    <div className="mb-10 flex flex-col items-center gap-5 text-center">
      {branding.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logoUrl}
          alt={branding.brandLabel}
          className="h-[4.5rem] max-w-[min(100%,18rem)] object-contain object-center md:h-24 md:max-w-[22rem]"
        />
      ) : (
        <p className="font-brand max-w-[18rem] text-[clamp(1.25rem,4vw,1.875rem)] font-light uppercase leading-tight tracking-[0.22em] text-white/92 md:max-w-[22rem] md:tracking-[0.28em]">
          {branding.brandLabel}
        </p>
      )}

      <div
        className="flex items-center gap-3 text-[9px] font-medium uppercase tracking-[0.42em] text-white/28"
        aria-hidden
      >
        <span className="h-px w-8 bg-white/12" />
        <span>{poweredByLabel}</span>
        <span className="h-px w-8 bg-white/12" />
      </div>

      <OdysseyBrandLockup
        wordmark="Odyssey"
        size="section"
        className="opacity-80"
      />
    </div>
  );
}
