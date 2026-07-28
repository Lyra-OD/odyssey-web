"use client";

import { useState, type CSSProperties } from "react";

export type SanctuaryLueurOrbProps = {
  /** Taille visuelle (défaut carte empreinte). */
  size?: "card" | "ritual";
  className?: string;
  "aria-label"?: string;
};

/**
 * Présence Lueur organique — 3 lavis CSS (veil / plume / ember).
 * Pas de SVG, pas de blanc pur. Breathe 4,2 s + morph blob lent, déphasés.
 */
export function SanctuaryLueurOrb({
  size = "card",
  className = "",
  "aria-label": ariaLabel,
}: SanctuaryLueurOrbProps) {
  const [delaySec] = useState(() => Math.random() * 4.2);
  const dim = size === "ritual" ? "h-44 w-44 md:h-52 md:w-52" : "h-40 w-40";

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
      <div className="sanctuary-lueur-orb__veil" aria-hidden />
      <div className="sanctuary-lueur-orb__plume" aria-hidden />
      <div className="sanctuary-lueur-orb__ember" aria-hidden />
    </div>
  );
}
