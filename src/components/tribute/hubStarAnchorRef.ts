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

/** Aligné `SanctuaryHubHero` — hit `13.5rem` · `-translate-y-[28%]`. */
export const HUB_HERO_HIT_HEIGHT_REM = 13.5;

const HUB_STAR_OPTICAL_Y_RATIO = 0.22;

function rootFontSizePx(): number {
  if (typeof document === "undefined") return 16;
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

/** Centre optique Hero (viewport px) — pas seulement l’origine 3D projetée. */
export function hubStarVisualViewportPx(
  anchor: ScreenAnchor | null,
): { x: number; y: number } | null {
  if (typeof window === "undefined" || !anchor) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hitHeightPx = HUB_HERO_HIT_HEIGHT_REM * rootFontSizePx();
  const px = (anchor.x / 100) * vw;
  const py = (anchor.y / 100) * vh;
  const visualPy = py + hitHeightPx * HUB_STAR_OPTICAL_Y_RATIO;
  return { x: px, y: visualPy };
}

/** % viewport pour voiles / tracteur (T2+). */
export function hubStarVisualViewportPercent(
  anchor: ScreenAnchor | null,
): ScreenAnchor {
  const px = hubStarVisualViewportPx(anchor);
  if (!px || typeof window === "undefined") {
    return { x: 50, y: 45 };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: (px.x / vw) * 100,
    y: (px.y / vh) * 100,
  };
}

/** transform-origin local — aspiration verre → centre optique étoile. */
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
  const visual = hubStarVisualViewportPx(anchor);
  if (!visual) return "50% 45%";
  const ox = ((visual.x - rect.left) / rect.width) * 100;
  const oy = ((visual.y - rect.top) / rect.height) * 100;
  const clamp = (v: number) => {
    if (!Number.isFinite(v)) return 45;
    return Math.min(98, Math.max(2, v));
  };
  return `${clamp(ox)}% ${clamp(oy)}%`;
}

/** Sync CSS vars étoile sur un élément (fermeture rAF). */
export function syncHubStarCssVars(
  el: HTMLElement,
  anchor: ScreenAnchor | null,
): void {
  const star = hubStarVisualViewportPercent(anchor);
  el.style.setProperty("--parcours-star-x", `${star.x}%`);
  el.style.setProperty("--parcours-star-y", `${star.y}%`);
}
