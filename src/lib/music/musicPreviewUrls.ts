import type { StingrayTrackApiPayload } from "@/src/lib/wizard/stingrayCatalog";
import { buildMusicPreviewProxyUrl } from "@/src/lib/music/stingrayTrackId";

/** Réécrit les URLs preview avec le projectId requis par P0-05. */
export function attachProjectIdToTrackPreviews(
  tracks: StingrayTrackApiPayload[],
  projectId: string,
): StingrayTrackApiPayload[] {
  return tracks.map((track) => {
    const previewUrl = buildMusicPreviewProxyUrl(track.id, projectId);
    return {
      ...track,
      previewUrl,
      streamUrl: previewUrl,
      playbackUrl: previewUrl,
    };
  });
}
