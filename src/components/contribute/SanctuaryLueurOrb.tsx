"use client";

import { useState, type CSSProperties } from "react";

export type SanctuaryLueurOrbProps = {
  /** Taille visuelle (défaut carte empreinte). */
  size?: "card" | "ritual";
  className?: string;
  "aria-label"?: string;
};

/**
 * Présence Lueur organique — stage généreux + 3 lavis CSS.
 * Le blur meurt dans le padding du stage (pas de contain:paint / boîte).
 */
export function SanctuaryLueurOrb({
  size = "card",
  className = "",
  "aria-label": ariaLabel,
}: SanctuaryLueurOrbProps) {
  const [delaySec] = useState(() => Math.random() * 4.2);
  const dim = size === "ritual" ? "h-36 w-36 md:h-40 md:w-40" : "h-32 w-32";
  const stageClass =
    size === "ritual"
      ? "sanctuary-lueur-stage sanctuary-lueur-stage--ritual"
      : "sanctuary-lueur-stage";

  return (
    <div className={`${stageClass} ${className}`.trim()}>
      <div
        className={`sanctuary-lueur-orb relative ${dim}`}
        style={
          {
            ["--lueur-delay"]: `${delaySec.toFixed(2)}s`,
          } as CSSProperties
        }
        role="img"
        aria-label={ariaLabel}
      >
        <div className="sanctuary-lueur-orb__veil" aria-hidden />
        <div className="sanctuary-lueur-orb__plume" aria-hidden />
        <div className="sanctuary-lueur-orb__ember" aria-hidden />
      </div>
    </div>
  );
}
