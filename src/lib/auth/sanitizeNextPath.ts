/**
 * Sanitization des chemins `?next=` post-auth.
 * Rejette protocol-relative (`//evil.com`), hors `/fr|/en`, etc.
 */

import { defaultPostAuthPath } from "@/src/lib/appRoutes";
import type { Locale } from "@/i18n.config";

/**
 * True si `raw` est un chemin relatif d’app sûr (pas d’open redirect).
 */
export function isSafeAppRelativePath(raw: string | null | undefined): raw is string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return false;
  if (!/^\/(fr|en)(\/|$)/.test(raw)) return false;
  // Bloque backslash / encoded tricks courants
  if (raw.includes("\\") || raw.includes("%2f") || raw.includes("%2F")) {
    return false;
  }
  return true;
}

/**
 * Retourne un chemin sûr, ou le fallback post-auth (studio) si invalide.
 */
export function sanitizeNextPath(
  raw: string | null | undefined,
  fallbackLocale: Locale = "fr",
): string {
  if (isSafeAppRelativePath(raw)) return raw;
  return defaultPostAuthPath(fallbackLocale);
}

/**
 * Destination salon post-connexion : chemin `/…/salon…` hors `/connexion`.
 * `null` si absente ou dangereuse (pas de redirect).
 */
export function sanitizeSalonNextPath(
  raw: string | null | undefined,
): string | null {
  if (!isSafeAppRelativePath(raw)) return null;
  if (!/^\/(fr|en)\/salon(\/|$)/.test(raw)) return null;
  if (raw.includes("/connexion")) return null;
  return raw;
}

/**
 * Destination HQ post-connexion : chemin `/…/hq…` hors `/connexion`.
 * `null` si absente ou dangereuse (pas de redirect).
 */
export function sanitizeHqNextPath(
  raw: string | null | undefined,
): string | null {
  if (!isSafeAppRelativePath(raw)) return null;
  if (!/^\/(fr|en)\/hq(\/|$)/.test(raw)) return null;
  if (raw.includes("/connexion")) return null;
  return raw;
}
