/** Capture DA portrait — premier paint mobile (plein champ). */
export const GUEST_SKY_STILL_SRC = "/craft/sky/guest-still-v3.jpg";

/**
 * Téléphone / iPad / reduced-motion : pas de WebGL.
 * SSR et premier paint client = still (jamais de canvas avant d’être sûr).
 * Inclut UA mobile : Safari « site bureau » peut mentir sur pointer/width.
 */
export function shouldUseGuestSkyStill(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }
  if (window.matchMedia("(pointer: coarse)").matches) return true;
  if (window.innerWidth < 768) return true;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPod|iPad|Android|Mobile/i.test(ua)) return true;
  return false;
}
