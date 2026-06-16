/** Halos atmosphériques Salon — alignés sur la page connexion. */
export const SALON_HALO_GRADIENT =
  "radial-gradient(ellipse 108% 76% at 50% 50%, rgba(192, 167, 255, 0.62) 0%, rgba(139, 92, 246, 0.38) 18%, rgba(91, 33, 182, 0.18) 40%, transparent 68%)";

type SalonAtmosphereProps = {
  /** Connexion : pleine intensité. Dashboard : atténué (~35 %). */
  variant?: "connexion" | "dashboard";
};

export function SalonAtmosphere({ variant = "dashboard" }: SalonAtmosphereProps) {
  const intensity =
    variant === "dashboard" ? "opacity-[0.38]" : "opacity-100";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        className={`pointer-events-none absolute left-1/2 top-[18%] z-0 h-[min(72vh,720px)] w-[min(140vw,62rem)] max-w-none -translate-x-1/2 -translate-y-1/2 blur-[200px] ${intensity}`}
        style={{ backgroundImage: SALON_HALO_GRADIENT }}
      />
      <div
        className={`pointer-events-none absolute left-1/2 top-[22%] z-0 h-[min(88vh,880px)] w-[min(170vw,76rem)] max-w-none -translate-x-1/2 -translate-y-1/2 blur-[240px] ${intensity}`}
        style={{ backgroundImage: SALON_HALO_GRADIENT }}
      />
    </div>
  );
}
