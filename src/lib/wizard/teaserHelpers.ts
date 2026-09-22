import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import type {
  MontageFocalPoint,
  WizardStoryboardState,
} from "@/src/lib/wizard/wizardState";

export type TeaserSlide = {
  imageUrl: string;
  trackKey: string;
  /** Titre de chapitre (jamais le titre de piste). */
  label: string;
  kind?: "image" | "video";
  durationSec?: number;
  /** Cadrage visage — ex. "42% 28%". */
  objectPosition?: string;
  /** Origine du Ken Burns (0–1 → %). */
  transformOrigin?: string;
  chapterIndex?: number;
};

export type TeaserTrack = {
  title: string;
  artist: string;
  trackId?: string;
  storagePath?: string;
  /** URL déjà signée (ex. `/stream/[token]`) — skip fetch owner music. */
  audioUrl?: string;
  creditLabel?: string;
  showCreditInSession?: boolean;
};

export type TeaserTracks = Record<string, TeaserTrack>;

/** Titres cinéma universels + crédit musical (FR/EN via dictionnaire). */
export type CinemaChapterTitlesCopy = {
  chapter1: string;
  chapter2: string;
  chapter3: string;
  chapter4: string;
  chapter5Plus: string;
  /** "Piste : {title} — {artist}" — artiste vide → "Piste : {title}". */
  trackCredit: string;
  trackCreditTitleOnly: string;
};

export function resolveCinemaChapterTitle(
  index: number,
  customLabel: string | null | undefined,
  copy: CinemaChapterTitlesCopy,
): string {
  const custom = customLabel?.trim();
  if (custom) return custom;
  if (index === 0) return copy.chapter1;
  if (index === 1) return copy.chapter2;
  if (index === 2) return copy.chapter3;
  if (index === 3) return copy.chapter4;
  return copy.chapter5Plus;
}

export function formatTrackCredit(
  track: TeaserTrack | undefined,
  copy: CinemaChapterTitlesCopy,
): string | null {
  if (!track) return null;
  if (track.showCreditInSession === false) return null;
  const title = (track.creditLabel?.trim() || track.title?.trim()) ?? "";
  if (!title) return null;
  const artist = track.artist?.trim();
  if (artist) {
    return copy.trackCredit
      .replace("{title}", title)
      .replace("{artist}", artist);
  }
  return copy.trackCreditTitleOnly.replace("{title}", title);
}

function focalToCss(focal: MontageFocalPoint | undefined): {
  objectPosition?: string;
  transformOrigin?: string;
} {
  if (!focal) return {};
  const x = Math.round(focal.x * 1000) / 10;
  const y = Math.round(focal.y * 1000) / 10;
  return {
    objectPosition: `${x}% ${y}%`,
    transformOrigin: `${x}% ${y}%`,
  };
}

export function buildTeaserFromStoryboard(
  storyboard: WizardStoryboardState,
  mediaById: Map<string, MontageMediaItem>,
  chapterTitles: CinemaChapterTitlesCopy,
): {
  slides: TeaserSlide[];
  tracks: TeaserTracks;
  chapterMeta: Record<
    string,
    { title: string; musicCredit: string | null; chapterIndex: number }
  >;
} {
  const excluded = new Set(storyboard.excludedIds);
  const slides: TeaserSlide[] = [];
  const tracks: TeaserTracks = {};
  const chapterMeta: Record<
    string,
    { title: string; musicCredit: string | null; chapterIndex: number }
  > = {};

  storyboard.chapters.forEach((chapter, index) => {
    const label = resolveCinemaChapterTitle(
      index,
      chapter.label,
      chapterTitles,
    );
    const trackKey = chapter.id;
    const song = chapter.song;

    if (song?.source === "stingray") {
      tracks[trackKey] = {
        title: song.title,
        artist: song.artist,
        trackId: song.trackId,
        ...(song.creditLabel ? { creditLabel: song.creditLabel } : {}),
        ...(song.showCreditInSession === false
          ? { showCreditInSession: false }
          : {}),
      };
    } else if (song?.source === "upload") {
      tracks[trackKey] = {
        title: song.title,
        artist: song.artist?.trim() || "",
        storagePath: song.storagePath,
        ...(song.creditLabel ? { creditLabel: song.creditLabel } : {}),
        ...(song.showCreditInSession === false
          ? { showCreditInSession: false }
          : {}),
      };
    }

    const mediaIds = chapter.mediaIds.filter((id) => !excluded.has(id));
    if (song && mediaIds.length === 0 && process.env.NODE_ENV === "development") {
      console.warn(
        `[teaser] chapitre « ${label} » a une piste mais 0 média — acte audio omis de la séance`,
        { chapterId: chapter.id, songTitle: song.title },
      );
    }

    chapterMeta[trackKey] = {
      title: label,
      musicCredit: formatTrackCredit(tracks[trackKey], chapterTitles),
      chapterIndex: index,
    };

    const ids = mediaIds;

    for (const id of ids) {
      const item = mediaById.get(id);
      const imageUrl = item?.previewUrl ?? item?.fullPreviewUrl;
      if (!imageUrl) continue;
      const focalCss = focalToCss(storyboard.focalPoints[id]);
      slides.push({
        imageUrl,
        trackKey,
        label,
        kind: item?.isVideo ? "video" : "image",
        durationSec: item?.isVideo ? 10 : undefined,
        chapterIndex: index,
        ...focalCss,
      });
    }
  });

  return { slides, tracks, chapterMeta };
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
