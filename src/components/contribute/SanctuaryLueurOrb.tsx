"use client";

import { useId, useState, type CSSProperties } from "react";

export type SanctuaryLueurOrbProps = {
  /** Taille visuelle (défaut carte empreinte). */
  size?: "card" | "ritual";
  className?: string;
  "aria-label"?: string;
};

/**
 * Lueur hybride Quiet Luxury :
 * - enveloppe CSS (blob morph) = forme méduse
 * - matière SVG feTurbulence (filtre figé) animée en transform seulement
 * - ember teal dense, jamais blanc / jamais WebGL
 */
export function SanctuaryLueurOrb({
  size = "card",
  className = "",
  "aria-label": ariaLabel,
}: SanctuaryLueurOrbProps) {
  const uid = useId().replace(/:/g, "");
  const [delaySec] = useState(() => Math.random() * 4.2);
  const filterId = `lueurTurb-${uid}`;
  const gradId = `lueurGrad-${uid}`;
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
        {/* Enveloppe — forme organique (méduse) */}
        <div className="sanctuary-lueur-orb__envelope" aria-hidden />
        <div className="sanctuary-lueur-orb__envelope sanctuary-lueur-orb__envelope--soft" aria-hidden />

        {/* Matière gazeuse — turbulence figée, vie via transform */}
        <svg
          className="sanctuary-lueur-orb__matter"
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          aria-hidden
          focusable="false"
        >
          <defs>
            <radialGradient id={gradId} cx="48%" cy="46%" r="52%">
              <stop offset="0%" stopColor="rgba(94, 234, 212, 0.55)" />
              <stop offset="42%" stopColor="rgba(45, 212, 191, 0.38)" />
              <stop offset="78%" stopColor="rgba(34, 211, 238, 0.12)" />
              <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
            </radialGradient>
            <filter
              id={filterId}
              x="-35%"
              y="-35%"
              width="170%"
              height="170%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.018 0.022"
                numOctaves="3"
                seed="7"
                result="noise"
              />
              <feColorMatrix
                in="noise"
                type="matrix"
                values="0 0 0 0 0.18
                        0 0 0 0 0.82
                        0 0 0 0 0.78
                        0 0 0 0.55 0"
                result="tealNoise"
              />
              <feGaussianBlur in="tealNoise" stdDeviation="1.2" result="softNoise" />
              <feComposite
                in="softNoise"
                in2="SourceGraphic"
                operator="in"
                result="masked"
              />
              <feBlend in="SourceGraphic" in2="masked" mode="screen" />
            </filter>
          </defs>
          <g className="sanctuary-lueur-orb__matter-spin" filter={`url(#${filterId})`}>
            <ellipse
              cx="50"
              cy="50"
              rx="34"
              ry="36"
              fill={`url(#${gradId})`}
              opacity="0.9"
            />
          </g>
        </svg>

        {/* Ember — ancrage dense */}
        <div className="sanctuary-lueur-orb__ember" aria-hidden />
      </div>
    </div>
  );
}
