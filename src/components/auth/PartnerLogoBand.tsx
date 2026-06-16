import type { SalonBrandAnimationPreset } from "@/src/lib/partner/partnerBrandingTypes";

/**
 * Scène logo partenaire.
 * - `cinema` : héros connexion (grand, halo animé).
 * - `dashboard` : header salon — même PNG, échelle adaptée.
 */
export function PartnerLogoBand({
  src,
  alt,
  variant = "cinema",
  animate = false,
  animationPreset = "connexion",
}: {
  src: string;
  alt: string;
  variant?: "cinema" | "dashboard" | "header";
  animate?: boolean;
  animationPreset?: SalonBrandAnimationPreset;
}) {
  const isCinema = variant === "cinema";
  const isDashboard = variant === "dashboard" || variant === "header";

  const logoClass = animate
    ? animationPreset === "dashboard"
      ? "salon-dashboard-logo"
      : "salon-cinema-logo"
    : "";

  const glowClass = animate
    ? animationPreset === "dashboard"
      ? "salon-dashboard-glow"
      : "salon-logo-glow"
    : "";

  if (isDashboard) {
    return (
      <div className={`relative inline-block overflow-visible py-0.5 ${logoClass}`}>
        <div className="relative inline-flex items-center justify-center overflow-visible">
          <div
            aria-hidden
            className={`pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[min(110%,20rem)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_92%_78%_at_50%_50%,rgba(192,167,255,0.08)_0%,rgba(139,92,246,0.035)_42%,transparent_72%)] ${glowClass}`}
          />
          <div className="relative z-10 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-[clamp(2.75rem,8vw,4rem)] w-auto max-w-[min(100%,20rem)] object-contain object-center md:max-w-[22rem]"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-block overflow-visible py-1 ${logoClass}`}
    >
      <div className="relative inline-flex items-center justify-center overflow-visible">
        <div
          aria-hidden
          className={`pointer-events-none absolute left-1/2 top-1/2 h-[115%] w-[min(105%,26rem)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_92%_78%_at_50%_50%,rgba(192,167,255,0.09)_0%,rgba(139,92,246,0.04)_42%,transparent_72%)] ${glowClass}`}
        />

        <div className="relative z-10 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[clamp(4.5rem,14vw,6.75rem)] w-auto max-w-[min(100%,26rem)] object-contain object-center md:max-w-[28rem]"
          />
        </div>
      </div>
    </div>
  );
}
