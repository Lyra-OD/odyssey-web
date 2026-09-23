import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import {
  resolveTargetSecondsPerMedia,
  VIDEO_TRIM_DURATION_SEC,
} from "@/src/lib/wizard/storyboardPacing";
import type { PackageId } from "@/src/lib/wizard/wizardDeliverables";
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
  /** Début d’extrait vidéo (storyboard.videoTrims). */
  trimStartSec?: number;
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

export type TeaserChapterMeta = {
  title: string;
  musicCredit: string | null;
  chapterIndex: number;
  /**
   * Durée du carton + musique quand le chapitre n’a pas encore de médias
   * (titre + piste seuls).
   */
  holdDurationSec?: number;
};

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

/**
 * Titre défaut aligné Livre Ouvert : `paletteIndex ?? index` (identité
 * stable au réordonnancement).
 */
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

/**
 * Chapitre piste-seule (ou médias pas encore résolus) : carton titre + amorce
 * musique — **pas** la durée entière de la chanson (sinon N × 3–4 min).
 */
export const CHAPTER_TITLE_HOLD_SEC = 8;

/**
 * Miroir déterministe Livre Ouvert → Visionne.
 * `packageId` pilote le tempo photo (`targetSecondsPerMedia`).
 */
export function buildTeaserFromStoryboard(
  storyboard: WizardStoryboardState,
  mediaById: Map<string, MontageMediaItem>,
  chapterTitles: CinemaChapterTitlesCopy,
  packageId: PackageId = "SOUVENIR",
): {
  slides: TeaserSlide[];
  tracks: TeaserTracks;
  chapterMeta: Record<string, TeaserChapterMeta>;
  /** Ordre strict des actes = ordre des chapitres storyboard (y compris sans médias). */
  chapterOrder: string[];
} {
  const excluded = new Set(storyboard.excludedIds);
  const slides: TeaserSlide[] = [];
  const tracks: TeaserTracks = {};
  const chapterMeta: Record<string, TeaserChapterMeta> = {};
  const chapterOrder: string[] = [];
  const targetSecondsPerMedia = resolveTargetSecondsPerMedia(packageId);

  storyboard.chapters.forEach((chapter, index) => {
    const paletteIndex =
      typeof chapter.paletteIndex === "number" &&
      Number.isFinite(chapter.paletteIndex) &&
      chapter.paletteIndex >= 0
        ? Math.trunc(chapter.paletteIndex)
        : index;
    const label = resolveCinemaChapterTitle(
      paletteIndex,
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
    const slideCountBefore = slides.length;

    for (const id of mediaIds) {
      const item = mediaById.get(id);
      // Plein format pour la séance — le thumb grille masque souvent le cadrage focale.
      const imageUrl = item?.fullPreviewUrl ?? item?.previewUrl;
      if (!imageUrl) continue;
      const focalCss = focalToCss(storyboard.focalPoints[id]);
      const isVideo = Boolean(item?.isVideo);
      const trim = storyboard.videoTrims?.[id];
      const durationSec = isVideo
        ? trim?.durationSec && trim.durationSec > 0
          ? trim.durationSec
          : VIDEO_TRIM_DURATION_SEC
        : targetSecondsPerMedia;
      slides.push({
        imageUrl,
        trackKey,
        label,
        kind: isVideo ? "video" : "image",
        durationSec,
        ...(isVideo
          ? { trimStartSec: Math.max(0, trim?.trimStartSec ?? 0) }
          : {}),
        chapterIndex: paletteIndex,
        ...focalCss,
      });
    }

    const resolvedMediaCount = slides.length - slideCountBefore;
    const hasSong = Boolean(song);
    // Chapitre projetable : médias résolus OU piste (carton + musique même sans photos).
    if (resolvedMediaCount === 0 && !hasSong) {
      return;
    }

    chapterOrder.push(trackKey);
    chapterMeta[trackKey] = {
      title: label,
      musicCredit: formatTrackCredit(tracks[trackKey], chapterTitles),
      chapterIndex: paletteIndex,
      ...(resolvedMediaCount === 0 && hasSong
        ? { holdDurationSec: CHAPTER_TITLE_HOLD_SEC }
        : {}),
    };
  });

  return { slides, tracks, chapterMeta, chapterOrder };
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
/** @deprecated Fallback historique — le pacing canon est `storyboardPacing`. */
export const TEASER_DEFAULT_SLIDE_MS = 4200;

/**
 * Empreinte légère du storyboard pour forcer un remount React du teaser /
 * de la séance quand focale, titre, crédit, piste, trim ou tempo changent.
 */
export function storyboardPlaybackFingerprint(
  storyboard: WizardStoryboardState,
): string {
  const excluded = [...storyboard.excludedIds].sort().join(",");
  const focals = Object.keys(storyboard.focalPoints)
    .sort()
    .map((id) => {
      const pt = storyboard.focalPoints[id];
      return `${id}:${pt.x.toFixed(3)},${pt.y.toFixed(3)}`;
    })
    .join(";");

  const trims = Object.keys(storyboard.videoTrims ?? {})
    .sort()
    .map((id) => {
      const trim = storyboard.videoTrims[id];
      return `${id}:${trim.trimStartSec.toFixed(2)},${trim.durationSec.toFixed(2)}`;
    })
    .join(";");

  const chapters = storyboard.chapters
    .map((chapter, index) => {
      const song = chapter.song;
      let songKey = "";
      if (song?.source === "stingray") {
        songKey = `stingray:${song.trackId}:${song.durationSec ?? ""}`;
      } else if (song?.source === "upload") {
        songKey = `upload:${song.storagePath}:${song.durationSec ?? ""}`;
      }
      const credit = song?.creditLabel?.trim() ?? "";
      const showCredit =
        song?.showCreditInSession === false ? "hide" : "show";
      const label = chapter.label?.trim() ?? "";
      const palette =
        typeof chapter.paletteIndex === "number"
          ? chapter.paletteIndex
          : index;
      return [
        chapter.id,
        palette,
        label,
        songKey,
        credit,
        showCredit,
        chapter.mediaIds.join(","),
      ].join(":");
    })
    .join("|");

  return `ex=${excluded}|fp=${focals}|tr=${trims}|ch=${chapters}`;
}
