/** Capture hub recadrée (étoile teal, sans copy gravée) — premier paint mobile. */
export const GUEST_SKY_STILL_SRC = "/craft/sky/guest-still-v1.jpg";

/**
 * Téléphone / iPad / reduced-motion : pas de WebGL.
 * SSR et premier paint client = still (jamais de canvas avant d’être sûr).
 */
export function shouldUseGuestSkyStill(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }
  if (window.matchMedia("(pointer: coarse)").matches) return true;
  return window.innerWidth < 768;
}
