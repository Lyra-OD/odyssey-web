import type { ReactNode } from "react";

type SalonCyanGlowTextProps = {
  children: ReactNode;
  className?: string;
};

/** Texte turquoise `--salon-cyan` avec halo blanc — aligné sur le LocaleSwitcher actif. */
export function SalonCyanGlowText({
  children,
  className = "",
}: SalonCyanGlowTextProps) {
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-white opacity-80 blur-[5px]"
      >
        {children}
      </span>
      <span
        className="relative text-[var(--salon-cyan)]"
        style={{
          textShadow:
            "0 0 8px rgba(255, 255, 255, 0.9), 0 0 18px rgba(255, 255, 255, 0.45)",
        }}
      >
        {children}
      </span>
    </span>
  );
}

export const connexionSubmitButtonClass =
  "connexion-submit-breathe relative flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[var(--salon-cyan)] bg-white/[0.06] py-3.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/90 transition-[background,opacity] disabled:cursor-not-allowed disabled:opacity-45";
