import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

export type TeaserSlide = {
  imageUrl: string;
  trackKey: string;
  label: string;
};

export type TeaserTrack = {
  title: string;
  artist: string;
  trackId?: string;
  storagePath?: string;
};

export type TeaserTracks = Record<string, TeaserTrack>;

/** Teaser : quelques photos par chapitre, tous les chapitres. */
const PHOTOS_PER_CHAPTER = 3;

export function buildTeaserFromStoryboard(
  storyboard: WizardStoryboardState,
  mediaById: Map<string, MontageMediaItem>,
  chapterTitleFallback: string,
): { slides: TeaserSlide[]; tracks: TeaserTracks } {
  const excluded = new Set(storyboard.excludedIds);
  const slides: TeaserSlide[] = [];
  const tracks: TeaserTracks = {};

  storyboard.chapters.forEach((chapter, index) => {
    const label =
      chapter.label?.trim() ||
      chapterTitleFallback.replace("{index}", String(index + 1));
    const trackKey = chapter.id;
    const song = chapter.song;

    if (song?.source === "stingray") {
      tracks[trackKey] = {
        title: song.title,
        artist: song.artist,
        trackId: song.trackId,
      };
    } else if (song?.source === "upload") {
      tracks[trackKey] = {
        title: song.title,
        artist: song.artist?.trim() || "",
        storagePath: song.storagePath,
      };
    }

    const ids = chapter.mediaIds
      .filter((id) => !excluded.has(id))
      .slice(0, PHOTOS_PER_CHAPTER);

    for (const id of ids) {
      const item = mediaById.get(id);
      const imageUrl = item?.previewUrl ?? item?.fullPreviewUrl;
      if (!imageUrl) continue;
      slides.push({
        imageUrl,
        trackKey,
        label,
      });
    }
  });

  return { slides, tracks };
}

export function estimateStoryboardFilmDurationMinutes(
  storyboard: WizardStoryboardState,
): number {
  const excluded = new Set(storyboard.excludedIds);
  let included = 0;
  for (const chapter of storyboard.chapters) {
    included += chapter.mediaIds.filter((id) => !excluded.has(id)).length;
  }
  const seconds = 90 + included * 6;
  return Math.max(3, Math.round(seconds / 60));
}

export function groupSlidesByTrack(
  slides: TeaserSlide[],
): { trackKey: string; slides: TeaserSlide[] }[] {
  const order: string[] = [];
  for (const slide of slides) {
    if (!order.includes(slide.trackKey)) order.push(slide.trackKey);
  }
  return order.map((trackKey) => ({
    trackKey,
    slides: slides.filter((s) => s.trackKey === trackKey),
  }));
}

export const TEASER_FADE_MS = 900;
export const TEASER_DEFAULT_SLIDE_MS = 4200;
