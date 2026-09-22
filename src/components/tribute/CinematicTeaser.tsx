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
import {
  groupSlidesByTrack,
  TEASER_DEFAULT_SLIDE_MS,
  type TeaserSlide,
  type TeaserTracks,
} from "@/src/lib/wizard/teaserHelpers";

export type CinematicTeaserCopy = {
  loading: string;
  nowPlaying: string;
  play: string;
  pause: string;
};

export type ChapterActMeta = {
  title: string;
  musicCredit: string | null;
  chapterIndex: number;
};

type Props = {
  slides: TeaserSlide[];
  tracks: TeaserTracks;
  chapterMeta?: Record<string, ChapterActMeta>;
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
    .map((t) => t.storagePath)
    .filter((p): p is string => Boolean(p))
    .sort()
    .join("|");
}

export function CinematicTeaser({
  slides,
  tracks,
  chapterMeta = {},
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
    const groups = groupSlidesByTrack(slides);
    return groups.map((group, groupIndex) => {
      const track = tracks[group.trackKey];
      const meta = chapterMeta[group.trackKey];
      const chapterIndex = meta?.chapterIndex ?? groupIndex;
      const clips: QuietLuxuryClip[] = group.slides.map((slide, idx) => ({
        id: `${group.trackKey}-${idx}`,
        kind: slide.kind === "video" ? "video" : "image",
        url: slide.imageUrl,
        durationSec:
          slide.durationSec ??
          (slide.kind === "video" ? 10 : TEASER_DEFAULT_SLIDE_MS / 1000),
        label: slide.label,
        objectPosition: slide.objectPosition,
        transformOrigin: slide.transformOrigin,
        chapterIndex: slide.chapterIndex ?? chapterIndex,
      }));

      let audioUrl: string | null = null;
      if (track?.trackId) {
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
        id: group.trackKey,
        title: meta?.title || group.slides[0]?.label,
        musicCredit,
        chapterIndex,
        audioUrl,
        clips,
      };
    });
  }, [chapterMeta, projectId, slides, tracks, uploadAudioByPath]);

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
