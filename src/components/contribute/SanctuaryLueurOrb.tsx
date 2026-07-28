"use client";

import { useId, useState, type CSSProperties } from "react";

export type SanctuaryLueurOrbProps = {
  /** Taille visuelle (défaut carte empreinte). */
  size?: "card" | "ritual";
  className?: string;
  "aria-label"?: string;
};

/**
 * Présence Lueur — halo teal vaporeux (ADN breathe ~4,2 s).
 * `--lueur-delay` aléatoire : base du breathe déphasé (ciel Phase 2).
 */
export function SanctuaryLueurOrb({
  size = "card",
  className = "",
  "aria-label": ariaLabel,
}: SanctuaryLueurOrbProps) {
  const uid = useId().replace(/:/g, "");
  const [delaySec] = useState(() => Math.random() * 4.2);
  const dim = size === "ritual" ? "h-40 w-40 md:h-48 md:w-48" : "h-36 w-36";

  return (
    <div
      className={`sanctuary-lueur-orb relative mx-auto ${dim} ${className}`}
      style={
        {
          ["--lueur-delay"]: `${delaySec.toFixed(2)}s`,
        } as CSSProperties
      }
      role="img"
      aria-label={ariaLabel}
    >
      <div className="sanctuary-lueur-orb__mist" aria-hidden />
      <div className="sanctuary-lueur-orb__halo" aria-hidden />
      <div className="sanctuary-lueur-orb__core" aria-hidden>
        <svg viewBox="0 0 80 80" className="h-full w-full" aria-hidden>
          <defs>
            <radialGradient id={`lueurCore-${uid}`} cx="50%" cy="45%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
              <stop offset="35%" stopColor="rgba(153,246,228,0.75)" />
              <stop offset="70%" stopColor="rgba(45,212,191,0.35)" />
              <stop offset="100%" stopColor="rgba(45,212,191,0)" />
            </radialGradient>
          </defs>
          <circle cx="40" cy="40" r="28" fill={`url(#lueurCore-${uid})`} />
        </svg>
      </div>
    </div>
  );
}
