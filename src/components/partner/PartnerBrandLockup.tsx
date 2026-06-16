import { PartnerLogoBand } from "@/src/components/auth/PartnerLogoBand";
import type { SalonBrandAnimationPreset } from "@/src/lib/partner/partnerBrandingTypes";

type PartnerPoweredByCreditProps = {
  poweredByLabel: string;
  animate?: boolean;
  animationPreset?: SalonBrandAnimationPreset;
};

function creditAnimationClasses(
  animate: boolean,
  preset: SalonBrandAnimationPreset,
): { kicker: string; wordmark: string } {
  if (!animate) return { kicker: "", wordmark: "" };
  if (preset === "dashboard") {
    return {
      kicker: "salon-dashboard-kicker",
      wordmark: "salon-dashboard-wordmark",
    };
  }
  return {
    kicker: "salon-cinema-kicker",
    wordmark: "salon-cinema-wordmark",
  };
}

export function PartnerPoweredByCredit({
  poweredByLabel,
  animate = false,
  animationPreset = "connexion",
}: PartnerPoweredByCreditProps) {
  const anim = creditAnimationClasses(animate, animationPreset);

  return (
    <div className="mt-2.5 flex flex-col items-end gap-1 text-right">
      <p
        className={`text-[8px] font-medium uppercase tracking-[0.44em] text-white/26 ${anim.kicker}`}
      >
        {poweredByLabel}
      </p>
      <p
        className={`font-brand text-[10px] font-medium uppercase leading-none tracking-[0.24em] text-white/36 md:text-[11px] md:tracking-[0.26em] ${anim.wordmark}`}
      >
        Odyssey
      </p>
    </div>
  );
}

type PartnerBrandLockupProps = {
  brandLabel: string;
  logoUrl: string | null;
  poweredByLabel: string;
  variant?: "cinema" | "dashboard" | "header";
  animate?: boolean;
  animationPreset?: SalonBrandAnimationPreset;
};

/**
 * Co-branding partenaire + signature Odyssey — connexion et dashboard.
 */
export function PartnerBrandLockup({
  brandLabel,
  logoUrl,
  poweredByLabel,
  variant = "dashboard",
  animate = false,
  animationPreset = "connexion",
}: PartnerBrandLockupProps) {
  const isCinema = variant === "cinema";
  const logoVariant = isCinema ? "cinema" : "dashboard";
  const preset = isCinema ? "connexion" : animationPreset;
  const labelAnimClass =
    animate && preset === "dashboard"
      ? "salon-dashboard-logo"
      : animate
        ? "salon-cinema-logo"
        : "";

  return (
    <div className="inline-flex flex-col items-end">
      {logoUrl ? (
        <PartnerLogoBand
          src={logoUrl}
          alt={brandLabel}
          variant={logoVariant}
          animate={animate}
          animationPreset={preset}
        />
      ) : (
        <p
          className={`text-right font-brand font-light uppercase leading-tight tracking-[0.22em] text-white/92 ${labelAnimClass} ${
            isCinema
              ? "text-[clamp(1.25rem,4vw,1.875rem)] md:tracking-[0.28em]"
              : "max-w-[14rem] text-[11px] leading-snug tracking-[0.26em] text-white/75 md:text-xs"
          }`}
        >
          {brandLabel}
        </p>
      )}

      <PartnerPoweredByCredit
        poweredByLabel={poweredByLabel}
        animate={animate}
        animationPreset={preset}
      />
    </div>
  );
}
