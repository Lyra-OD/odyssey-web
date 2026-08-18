import type { MusicCatalogTier } from "@/src/lib/wizard/pricingConfig";
import {
  findCatalogTrack,
  type StingrayTrackApiPayload,
} from "@/src/lib/wizard/stingrayCatalog";

/** Tier effectif d'une piste — inconnu = premium (fail-closed pour tier standard). */
export function resolveTrackMusicTier(
  trackId: string,
  explicitTier?: MusicCatalogTier,
): MusicCatalogTier {
  if (explicitTier === "standard" || explicitTier === "premium") {
    return explicitTier;
  }
  return findCatalogTrack(trackId)?.musicTier ?? "premium";
}

export function isTrackAllowedForCatalogTier(
  trackId: string,
  catalogTier: MusicCatalogTier,
  explicitTier?: MusicCatalogTier,
): boolean {
  if (catalogTier === "premium") return true;
  return resolveTrackMusicTier(trackId, explicitTier) === "standard";
}

export function filterApiTracksByCatalogTier(
  tracks: StingrayTrackApiPayload[],
  catalogTier: MusicCatalogTier,
): StingrayTrackApiPayload[] {
  if (catalogTier === "premium") return tracks;
  return tracks.filter(
    (track) =>
      resolveTrackMusicTier(track.id, track.musicTier) === "standard",
  );
}
