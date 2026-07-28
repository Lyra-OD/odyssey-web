"use client";

import { useId, useState, type CSSProperties } from "react";

export type SanctuaryLueurOrbProps = {
  size?: "card" | "ritual";
  className?: string;
  "aria-label"?: string;
};

/**
 * Lueur vivante :
 * 1) enveloppe CSS blob SANS gros blur (la morph reste lisible)
 * 2) SVG : turbulence → displacement de l’ellipse + couche bruit screen
 * 3) ember teal dense
 *
 * Ne jamais animer baseFrequency (perf mobile).
 */
export function SanctuaryLueurOrb({
  size = "card",
  className = "",
  "aria-label": ariaLabel,
}: SanctuaryLueurOrbProps) {
  const uid = useId().replace(/:/g, "");
  const [delaySec] = useState(() => Math.random() * 4.2);
  const warpId = `lueurWarp-${uid}`;
  const grainId = `lueurGrain-${uid}`;
  const veilGradId = `lueurVeil-${uid}`;
  const dim = size === "ritual" ? "h-40 w-40 md:h-44 md:w-44" : "h-36 w-36";
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
        {/* Halo ambiant très soft — flou OK ici (loin, pas la silhouette) */}
        <div className="sanctuary-lueur-orb__aura" aria-hidden />

        {/* Enveloppe morph — blur minimal pour garder l’asymétrie */}
        <div className="sanctuary-lueur-orb__envelope" aria-hidden />
        <div
          className="sanctuary-lueur-orb__envelope sanctuary-lueur-orb__envelope--drift"
          aria-hidden
        />

        <svg
          className="sanctuary-lueur-orb__matter"
          viewBox="0 0 120 120"
          width="100%"
          height="100%"
          aria-hidden
          focusable="false"
        >
          <defs>
            <radialGradient id={veilGradId} cx="46%" cy="44%" r="55%">
              <stop offset="0%" stopColor="#5eead4" stopOpacity="0.75" />
              <stop offset="35%" stopColor="#2dd4bf" stopOpacity="0.55" />
              <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>

            {/* Déforme l’enveloppe — c’est ça qui casse le cercle parfait */}
            <filter
              id={warpId}
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.035 0.045"
                numOctaves="3"
                seed="11"
                result="warpNoise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="warpNoise"
                scale="18"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>

            {/* Grain gazeux visible (haute fréquence) */}
            <filter
              id={grainId}
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.08 0.1"
                numOctaves="4"
                seed="3"
                result="grain"
              />
              <feColorMatrix
                in="grain"
                type="matrix"
                values="0 0 0 0 0.12
                        0 0 0 0 0.9
                        0 0 0 0 0.85
                        0 0 0 0.85 0"
                result="tealGrain"
              />
              <feGaussianBlur in="tealGrain" stdDeviation="0.35" />
            </filter>
          </defs>

          {/* Corps déformé */}
          <g className="sanctuary-lueur-orb__body" filter={`url(#${warpId})`}>
            <ellipse
              cx="60"
              cy="60"
              rx="32"
              ry="36"
              fill={`url(#${veilGradId})`}
            />
          </g>

          {/* Texture vaporeuse par-dessus — dérive lente */}
          <g className="sanctuary-lueur-orb__grain" filter={`url(#${grainId})`}>
            <ellipse cx="60" cy="60" rx="30" ry="34" fill="#fff" opacity="0.55" />
          </g>
        </svg>

        <div className="sanctuary-lueur-orb__ember" aria-hidden />
      </div>
    </div>
  );
}
