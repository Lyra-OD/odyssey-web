/** Identifiant composite Stingray : playlist + chanson (persisté pour Stripe / rendu). */

export const STINGRAY_TRACK_PREFIX = "sr:";

export function encodeStingrayTrackId(
  playlistId: string,
  songId: string,
): string {
  return `${STINGRAY_TRACK_PREFIX}${playlistId}:${songId}`;
}

export function parseStingrayTrackId(
  trackId: string,
): { playlistId: string; songId: string } | null {
  if (!trackId.startsWith(STINGRAY_TRACK_PREFIX)) return null;
  const rest = trackId.slice(STINGRAY_TRACK_PREFIX.length);
  const splitAt = rest.indexOf(":");
  if (splitAt <= 0) return null;
  const playlistId = rest.slice(0, splitAt);
  const songId = rest.slice(splitAt + 1);
  if (!playlistId || !songId) return null;
  return { playlistId, songId };
}

export function buildMusicPreviewProxyUrl(
  trackId: string,
  projectId?: string,
): string {
  const params = new URLSearchParams({ trackId });
  const scopedProjectId = projectId?.trim();
  if (scopedProjectId) {
    params.set("projectId", scopedProjectId);
  }
  return `/api/music/preview?${params.toString()}`;
}
