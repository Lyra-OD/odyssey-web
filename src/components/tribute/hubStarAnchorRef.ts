import type { ScreenAnchor } from "@/src/components/contribute/constellation/StarScreenReporter";
import { Vector3 } from "three";

/**
 * Position monde Hero @ useFrame (StarScreenReporter) — cible filante 3D.
 */
export const hubStarWorldRef = { current: new Vector3() };

/** true dès qu’un frame hub a publié la position monde. */
export const hubStarWorldReadyRef = { current: false };

/** Gel dérive caméra idle pendant la filante fermeture. */
export const parcoursCloseStreakLockRef = { current: false };

export function resetHubStarWorldRef(): void {
  hubStarWorldRef.current.set(0, 0, 0);
  hubStarWorldReadyRef.current = false;
}

/**
 * Projection étoile hub — écrit depuis le Canvas (useFrame), lu en DOM (rAF).
 * Pas de setState React : évite le jank main-thread sur le wizard.
 *
 * **Unité :** `x` / `y` = **% viewport** (0–100), comme `SanctuaryHubHero` `left` / `top`.
 */
export const hubStarAnchorRef: { current: ScreenAnchor | null } = {
  current: null,
};

/** Défaut `SanctuaryHubHero` — Esc avant 1er frame WebGL. */
export const HUB_HERO_FALLBACK_ANCHOR: ScreenAnchor = { x: 50, y: 48 };

/** Dernière ancre hub connue — conservée pendant saisie panneau (gel 2D). */
export const hubStarLastKnownAnchorRef: { current: ScreenAnchor } = {
  current: { ...HUB_HERO_FALLBACK_ANCHOR },
};

export function rememberHubStarAnchor(anchor: ScreenAnchor | null): void {
  if (anchor) {
    hubStarLastKnownAnchorRef.current = anchor;
  }
  hubStarAnchorRef.current = anchor;
}

/** Fermeture — live WebGL ou dernière position hub avant unmount. */
export function resolveHubStarAnchorForClose(): ScreenAnchor {
  return hubStarAnchorRef.current ?? hubStarLastKnownAnchorRef.current;
}

/** Aligné `SanctuaryHubHero` — hit `13.5rem` · `-translate-y-[28%]`. */
export const HUB_HERO_HIT_HEIGHT_REM = 13.5;

const HUB_STAR_OPTICAL_Y_RATIO = 0.22;

function rootFontSizePx(): number {
  if (typeof document === "undefined") return 16;
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

/**
 * Projection WebGL Hero → viewport px (StarScreenReporter).
 * Rituel fermeture : kiss CSS · collapse · filante — même cible que `hubStarWorldRef`.
 */
export function hubStarProjectedViewportPx(
  anchor: ScreenAnchor | null,
): { x: number; y: number } | null {
  if (typeof window === "undefined" || !anchor) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: (anchor.x / 100) * vw,
    y: (anchor.y / 100) * vh,
  };
}

/** % viewport — rituel fermeture (pas l’offset hitbox invite). */
export function hubStarProjectedViewportPercent(
  anchor: ScreenAnchor | null,
): ScreenAnchor {
  if (!anchor) return { ...HUB_HERO_FALLBACK_ANCHOR };
  return {
    x: Math.min(92, Math.max(8, anchor.x)),
    y: Math.min(90, Math.max(10, anchor.y)),
  };
}

/** Centre optique Hero (viewport px) — hit `SanctuaryHubHero` · invite sous l’étoile. */
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
    const fb = hubStarVisualViewportPercent(HUB_HERO_FALLBACK_ANCHOR);
    return fb;
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: (px.x / vw) * 100,
    y: (px.y / vh) * 100,
  };
}

/** transform-origin local — aspiration verre → projection Hero (alignée filante). */
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
  const visual = hubStarProjectedViewportPx(anchor);
  if (!visual) return "50% 45%";
  const ox = ((visual.x - rect.left) / rect.width) * 100;
  const oy = ((visual.y - rect.top) / rect.height) * 100;
  const clamp = (v: number) => {
    if (!Number.isFinite(v)) return 45;
    return Math.min(98, Math.max(2, v));
  };
  return `${clamp(ox)}% ${clamp(oy)}%`;
}

/** Sync CSS vars étoile sur un élément (fermeture rAF · projection 3D). */
export function syncHubStarCssVars(
  el: HTMLElement,
  anchor: ScreenAnchor | null,
): void {
  const star = hubStarProjectedViewportPercent(anchor);
  el.style.setProperty("--parcours-star-x", `${star.x}%`);
  el.style.setProperty("--parcours-star-y", `${star.y}%`);
}

/** Centre optique du monolithe (viewport %) — départ tracteur T-close-3. */
export function hubGlassCenterViewportPercent(rect: DOMRect): ScreenAnchor {
  if (typeof window === "undefined" || rect.width <= 0 || rect.height <= 0) {
    return { x: 50, y: 48 };
  }
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return {
    x: (cx / window.innerWidth) * 100,
    y: (cy / window.innerHeight) * 100,
  };
}

/** Haut du verre (~16 %) — départ filante fermeture (arc vers Hero). */
export function hubGlassLaunchViewportPercent(rect: DOMRect): ScreenAnchor {
  if (typeof window === "undefined" || rect.width <= 0 || rect.height <= 0) {
    return { x: 50, y: 38 };
  }
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height * 0.16;
  return {
    x: (cx / window.innerWidth) * 100,
    y: (cy / window.innerHeight) * 100,
  };
}

/** Délai kiss CSS aligné filante @ impact (~255 ms depuis début collapse). */
export const PARCOURS_CLOSE_IMPACT_DELAY_MS = 255;

/** T-close-3 — halo tracteur : verre → étoile (viewport px + %). */
export function syncCloseTracteurCssVars(
  el: HTMLElement,
  anchor: ScreenAnchor | null,
  glassRect: DOMRect,
): void {
  syncHubStarCssVars(el, anchor);
  const glass = hubGlassCenterViewportPercent(glassRect);
  const launch = hubGlassLaunchViewportPercent(glassRect);
  el.style.setProperty("--parcours-glass-x", `${glass.x}%`);
  el.style.setProperty("--parcours-glass-y", `${glass.y}%`);
  el.style.setProperty("--parcours-glass-launch-x", `${launch.x}%`);
  el.style.setProperty("--parcours-glass-launch-y", `${launch.y}%`);
  el.style.setProperty(
    "--parcours-impact-delay-ms",
    `${PARCOURS_CLOSE_IMPACT_DELAY_MS}`,
  );
  const projected = hubStarProjectedViewportPx(anchor);
  if (projected) {
    const launchPx = hubGlassLaunchViewportPercent(glassRect);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const lx = (launchPx.x / 100) * vw;
    const ly = (launchPx.y / 100) * vh;
    const dx = projected.x - lx;
    const dy = projected.y - ly;
    el.style.setProperty("--parcours-tracteur-dx", `${dx}px`);
    el.style.setProperty("--parcours-tracteur-dy", `${dy}px`);
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    el.style.setProperty("--parcours-tracteur-angle", `${angleDeg}deg`);
    const dist = Math.hypot(dx, dy);
    el.style.setProperty("--parcours-tracteur-dist", `${dist}px`);
  } else {
    el.style.setProperty("--parcours-tracteur-dx", "0px");
    el.style.setProperty("--parcours-tracteur-dy", "0px");
    el.style.setProperty("--parcours-tracteur-angle", "0deg");
    el.style.setProperty("--parcours-tracteur-dist", "0px");
  }
}
