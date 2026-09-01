import type { ScreenAnchor } from "@/src/components/contribute/constellation/StarScreenReporter";

/**
 * Projection étoile hub — écrit depuis le Canvas (useFrame), lu en DOM (rAF).
 * Pas de setState React : évite le jank main-thread sur le wizard.
 *
 * **Unité :** `x` / `y` = **% viewport** (0–100), comme `SanctuaryHubHero` `left` / `top`.
 */
export const hubStarAnchorRef: { current: ScreenAnchor | null } = {
  current: null,
};

/** transform-origin local pour aspiration verre → étoile Hero. */
export function hubStarCollapseTransformOrigin(
  anchor: ScreenAnchor | null,
  rect: DOMRect,
): string {
  if (typeof window === "undefined") {
    return "50% 45%";
  }
  if (!anchor || rect.width <= 0 || rect.height <= 0) {
    return "50% 45%";
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const px = (anchor.x / 100) * vw;
  const py = (anchor.y / 100) * vh;
  const ox = ((px - rect.left) / rect.width) * 100;
  const oy = ((py - rect.top) / rect.height) * 100;
  const clamp = (v: number) => {
    if (!Number.isFinite(v)) return 45;
    return Math.min(98, Math.max(2, v));
  };
  return `${clamp(ox)}% ${clamp(oy)}%`;
}
