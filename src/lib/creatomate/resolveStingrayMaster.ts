/**
 * Résolution URL master Stingray pour export Creatomate (server-only).
 *
 * Provider pluggable :
 * 1. `STINGRAY_MASTER_URL_TEMPLATE` — ex. `https://…/masters/{trackId}.mp3`
 * 2. Sinon null (bed Stingray omis ; upload famille reste OK).
 *
 * Ne jamais utiliser l’URL de *preview* catalogue comme master export.
 */

import "server-only";

export type StingrayMasterResolveResult =
  | { ok: true; url: string; source: "env_template" }
  | { ok: false; reason: "not_configured" | "invalid_track" };

/**
 * Résout une URL master Stingray durable pour la durée du job Creatomate.
 */
export async function resolveStingrayMasterUrl(
  trackId: string,
): Promise<StingrayMasterResolveResult> {
  const id = trackId.trim();
  if (!id) return { ok: false, reason: "invalid_track" };

  const template = process.env.STINGRAY_MASTER_URL_TEMPLATE?.trim();
  if (!template) {
    return { ok: false, reason: "not_configured" };
  }

  const url = template
    .replaceAll("{trackId}", encodeURIComponent(id))
    .replaceAll("{track_id}", encodeURIComponent(id));

  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, reason: "not_configured" };
  }

  return { ok: true, url, source: "env_template" };
}

export function isStingrayMasterConfigured(): boolean {
  return Boolean(process.env.STINGRAY_MASTER_URL_TEMPLATE?.trim());
}
