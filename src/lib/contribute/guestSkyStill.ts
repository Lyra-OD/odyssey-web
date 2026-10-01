/** Capture DA portrait — premier paint (plein champ) avant le canvas. */
export const GUEST_SKY_STILL_SRC = "/craft/sky/guest-still-v3.jpg";

/** Reduced-motion : jamais de canvas. */
export function shouldKeepGuestSkyStill(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Mobile / tactile : WebGL après le premier paint (idle), pas dans le JS critique.
 * Desktop : canvas dès que le rituel est chargé.
 */
export function shouldDeferGuestWebgl(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(pointer: coarse)").matches) return true;
  if (window.innerWidth < 768) return true;
  const ua = navigator.userAgent || "";
  return /iPhone|iPod|iPad|Android|Mobile/i.test(ua);
}
