"use client";

/**
 * Adaptateur wizard (étape 6 / séance) → QuietLuxuryPlayer (C4).
 * Conserve l’API historique slides/tracks pour PreviewStep.
 */

import { useEffect, useMemo, useState } from "react";

import {
  QuietLuxuryPlayer,
  type QuietLuxuryAct,
  type QuietLuxuryClip,
  type QuietLuxuryPlayerProps,
} from "@/src/components/tribute/QuietLuxuryPlayer";
import { buildMusicPreviewProxyUrl } from "@/src/lib/music/stingrayTrackId";
import { VIDEO_TRIM_DURATION_SEC } from "@/src/lib/wizard/storyboardPacing";
import {
  groupSlidesByTrack,
  type TeaserChapterMeta,
  type TeaserSlide,
  type TeaserTracks,
} from "@/src/lib/wizard/teaserHelpers";

export type CinematicTeaserCopy = {
  loading: string;
  nowPlaying: string;
  play: string;
  pause: string;
};

export type ChapterActMeta = TeaserChapterMeta;

type Props = {
  slides: TeaserSlide[];
  tracks: TeaserTracks;
  chapterMeta?: Record<string, ChapterActMeta>;
  /** Ordre des actes = ordre Livre Ouvert (inclut chapitres sans médias). */
  chapterOrder?: string[];
  copy: CinematicTeaserCopy;
  autoPlay?: boolean;
  projectId?: string | null;
  emptyLabel: string;
  salonBadge?: string | null;
  openingPortraitUrl?: string | null;
  memoryCard?: { displayName: string; yearsLine: string } | null;
  onPlaybackComplete?: () => void;
  cinema?: boolean;
  primedAudio?: HTMLAudioElement | null;
  exitHub?: QuietLuxuryPlayerProps["exitHub"];
  className?: string;
  enableSound?: string;
  /** Tempo photo fallback si slide.durationSec absent (secondes). */
  defaultImageDurationSec?: number;
};

async function resolveUploadAudioUrl(
  projectId: string,
  storagePath: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/projects/${projectId}/music?path=${encodeURIComponent(storagePath)}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { signedUrl?: string };
    return body.signedUrl?.trim() || null;
  } catch {
    return null;
  }
}

function uploadStoragePathsKey(tracks: TeaserTracks): string {
  return Object.values(tracks)
    .filter((t) => t.storagePath && !t.audioUrl)
    .map((t) => t.storagePath as string)
    .sort()
    .join("|");
}

export function CinematicTeaser({
  slides,
  tracks,
  chapterMeta = {},
  chapterOrder,
  copy,
  autoPlay = true,
  projectId = null,
  emptyLabel,
  salonBadge = null,
  openingPortraitUrl = null,
  memoryCard = null,
  onPlaybackComplete,
  cinema = false,
  primedAudio = null,
  exitHub = null,
  className,
  enableSound,
  defaultImageDurationSec = 7,
}: Props) {
  const [uploadAudioByPath, setUploadAudioByPath] = useState<
    Record<string, string>
  >({});
  const [uploadResolveDone, setUploadResolveDone] = useState(false);

  const uploadPathsKey = uploadStoragePathsKey(tracks);
  const needsUploadAudio = uploadPathsKey.length > 0;

  useEffect(() => {
    if (!projectId || !needsUploadAudio) {
      setUploadAudioByPath({});
      setUploadResolveDone(true);
      return;
    }
    const paths = uploadPathsKey.split("|").filter(Boolean);
    let cancelled = false;
    setUploadResolveDone(false);
    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        paths.map(async (path) => {
          const url = await resolveUploadAudioUrl(projectId, path);
          if (url) next[path] = url;
        }),
      );
      if (!cancelled) {
        setUploadAudioByPath(next);
        setUploadResolveDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsUploadAudio, projectId, uploadPathsKey]);

  const acts: QuietLuxuryAct[] = useMemo(() => {
    const slidesByTrack = new Map<string, TeaserSlide[]>();
    for (const slide of slides) {
      const list = slidesByTrack.get(slide.trackKey);
      if (list) list.push(slide);
      else slidesByTrack.set(slide.trackKey, [slide]);
    }

    const order =
      chapterOrder && chapterOrder.length > 0
        ? chapterOrder
        : Object.keys(chapterMeta).length > 0
          ? Object.keys(chapterMeta)
          : groupSlidesByTrack(slides).map((g) => g.trackKey);

    return order.map((trackKey, groupIndex) => {
      const groupSlides = slidesByTrack.get(trackKey) ?? [];
      const track = tracks[trackKey];
      const meta = chapterMeta[trackKey];
      const chapterIndex = meta?.chapterIndex ?? groupIndex;
      const clips: QuietLuxuryClip[] = groupSlides.map((slide, idx) => ({
        id: `${trackKey}-${idx}`,
        kind: slide.kind === "video" ? "video" : "image",
        url: slide.imageUrl,
        durationSec:
          slide.durationSec ??
          (slide.kind === "video"
            ? VIDEO_TRIM_DURATION_SEC
            : defaultImageDurationSec),
        label: slide.label,
        objectPosition: slide.objectPosition,
        transformOrigin: slide.transformOrigin,
        chapterIndex: slide.chapterIndex ?? chapterIndex,
        ...(slide.kind === "video"
          ? { trimStartSec: Math.max(0, slide.trimStartSec ?? 0) }
          : {}),
      }));

      let audioUrl: string | null = null;
      if (track?.audioUrl) {
        audioUrl = track.audioUrl;
      } else if (track?.trackId) {
        audioUrl = buildMusicPreviewProxyUrl(
          track.trackId,
          projectId ?? undefined,
        );
      } else if (track?.storagePath) {
        audioUrl = uploadAudioByPath[track.storagePath] ?? null;
      }

      const musicCredit =
        meta?.musicCredit ??
        (track && track.showCreditInSession !== false && track.title?.trim()
          ? track.artist?.trim()
            ? `${(track.creditLabel || track.title).trim()} — ${track.artist.trim()}`
            : (track.creditLabel || track.title).trim()
          : null);

      return {
        id: trackKey,
        title: meta?.title || groupSlides[0]?.label,
        musicCredit,
        chapterIndex,
        audioUrl,
        clips,
        ...(meta?.holdDurationSec != null
          ? { holdDurationSec: meta.holdDurationSec }
          : {}),
      };
    });
  }, [
    chapterMeta,
    chapterOrder,
    defaultImageDurationSec,
    projectId,
    slides,
    tracks,
    uploadAudioByPath,
  ]);

  // MP3 perso : attendre l'URL signée avant autoplay, sinon la séance part muette.
  const canAutoPlay = autoPlay && (!needsUploadAudio || uploadResolveDone);

  if (needsUploadAudio && !uploadResolveDone) {
    return (
      <div
        className={`flex items-center justify-center bg-black text-sm font-light text-zinc-500 ${className ?? ""}`}
      >
        {copy.loading}
      </div>
    );
  }

  return (
    <QuietLuxuryPlayer
      acts={acts}
      openingPortraitUrl={openingPortraitUrl ?? slides[0]?.imageUrl ?? null}
      memoryCard={memoryCard}
      salonBadge={salonBadge}
      autoPlay={canAutoPlay}
      showControls={!cinema}
      cinema={cinema}
      primedAudio={primedAudio}
      exitHub={exitHub}
      onPlaybackComplete={onPlaybackComplete}
      copy={{
        play: copy.play,
        pause: copy.pause,
        loading: copy.loading,
        enableSound,
      }}
      emptyLabel={emptyLabel}
      className={className}
    />
  );
}
