"use client";

import type { ScreenAnchor } from "@/src/components/contribute/constellation/StarScreenReporter";

type SanctuaryHubHeroProps = {
  openLabel: string;
  onOpen: () => void;
  /** Zone clic calée sur l’étoile WebGL projetée. */
  starAnchor?: ScreenAnchor | null;
  webglHero?: boolean;
};

/**
 * Hub idle — hit target sur l’étoile. Invite + hint = Html 3D craft sur le Hero.
 */
export function SanctuaryHubHero({
  openLabel,
  onOpen,
  starAnchor = null,
  webglHero = false,
}: SanctuaryHubHeroProps) {
  if (!webglHero || !starAnchor) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[5]"
      aria-hidden={false}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={openLabel}
        className="pointer-events-auto absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40"
        style={{
          left: `${starAnchor.x}%`,
          top: `${starAnchor.y}%`,
        }}
      />
    </div>
  );
}
