"use client";

import { useId } from "react";

type HubInviteArcsProps = {
  prompt: string;
  tapHint?: string;
  /** Opacité arc haut (discret). */
  promptOpacity?: number;
  /** Opacité arc bas (CTA). */
  tapOpacity?: number;
  /** Scale breath arc bas (1 = repos). */
  tapScale?: number;
};

/**
 * T-invite-2 — typo en deux arcs SVG autour de l’étoile Hero.
 * pointer-events: none — la hitbox reste `SanctuaryHubHero`.
 */
export function HubInviteArcs({
  prompt,
  tapHint,
  promptOpacity = 0.72,
  tapOpacity = 1,
  tapScale = 1,
}: HubInviteArcsProps) {
  const rawId = useId().replace(/:/g, "");
  const topPathId = `hub-invite-arc-top-${rawId}`;
  const botPathId = `hub-invite-arc-bot-${rawId}`;

  return (
    <svg
      viewBox="0 0 200 200"
      width="13.5rem"
      height="13.5rem"
      overflow="visible"
      aria-hidden
      style={{
        display: "block",
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <defs>
        {/* Haut : bulge vers le haut (concave vu du centre). */}
        <path
          id={topPathId}
          d="M 22 92 Q 100 28 178 92"
          fill="none"
        />
        {/* Bas : bulge vers le bas. */}
        <path
          id={botPathId}
          d="M 22 108 Q 100 172 178 108"
          fill="none"
        />
      </defs>

      <text
        fill="rgba(244, 244, 245, 0.9)"
        style={{
          fontFamily:
            'var(--font-label), "Inter", ui-sans-serif, system-ui, sans-serif',
          fontSize: "9.5px",
          fontWeight: 300,
          letterSpacing: "0.14em",
          opacity: promptOpacity,
          transform: "translateZ(0)",
          willChange: "opacity",
        }}
      >
        <textPath
          href={`#${topPathId}`}
          startOffset="50%"
          textAnchor="middle"
        >
          {prompt}
        </textPath>
      </text>

      {tapHint ? (
        <g
          transform={`translate(100 140) scale(${tapScale}) translate(-100 -140)`}
          opacity={tapOpacity}
          style={{ willChange: "transform, opacity" }}
        >
          <text
            fill="rgba(161, 161, 170, 0.92)"
            style={{
              fontFamily:
                'var(--font-label), "Inter", ui-sans-serif, system-ui, sans-serif',
              fontSize: "7px",
              fontWeight: 300,
              letterSpacing: "0.12em",
            }}
          >
            <textPath
              href={`#${botPathId}`}
              startOffset="50%"
              textAnchor="middle"
            >
              {tapHint}
            </textPath>
          </text>
        </g>
      ) : null}
    </svg>
  );
}
