"use client";

/**
 * Adaptateur wizard (étape 6) → QuietLuxuryPlayer (C4).
 * Conserve l’API historique slides/tracks pour PreviewStep.
 */

import { useEffect, useMemo, useState } from "react";

import {
  QuietLuxuryPlayer,
  type QuietLuxuryAct,
  type QuietLuxuryClip,
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

type Props = {
  slides: TeaserSlide[];
  tracks: TeaserTracks;
  copy: CinematicTeaserCopy;
  autoPlay?: boolean;
  projectId?: string | null;
  emptyLabel: string;
  salonBadge?: string | null;
  openingPortraitUrl?: string | null;
  memoryCard?: { displayName: string; yearsLine: string } | null;
  onPlaybackComplete?: () => void;
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

export function CinematicTeaser({
  slides,
  tracks,
  copy,
  autoPlay = true,
  projectId = null,
  emptyLabel,
  salonBadge = null,
  openingPortraitUrl = null,
  memoryCard = null,
  onPlaybackComplete,
}: Props) {
  const [uploadAudioByPath, setUploadAudioByPath] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!projectId) return;
    const paths = Object.values(tracks)
      .map((t) => t.storagePath)
      .filter((p): p is string => Boolean(p));
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        paths.map(async (path) => {
          const url = await resolveUploadAudioUrl(projectId, path);
          if (url) next[path] = url;
        }),
      );
      if (!cancelled) setUploadAudioByPath(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, tracks]);

  const acts: QuietLuxuryAct[] = useMemo(() => {
    const groups = groupSlidesByTrack(slides);
    return groups.map((group) => {
      const track = tracks[group.trackKey];
      const clips: QuietLuxuryClip[] = group.slides.map((slide, idx) => ({
        id: `${group.trackKey}-${idx}`,
        kind: slide.kind === "video" ? "video" : "image",
        url: slide.imageUrl,
        durationSec:
          slide.durationSec ??
          (slide.kind === "video" ? 10 : TEASER_DEFAULT_SLIDE_MS / 1000),
        label: slide.label,
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

      return {
        id: group.trackKey,
        title: track?.title || group.slides[0]?.label,
        audioUrl,
        clips,
      };
    });
  }, [projectId, slides, tracks, uploadAudioByPath]);

  return (
    <QuietLuxuryPlayer
      acts={acts}
      openingPortraitUrl={openingPortraitUrl ?? slides[0]?.imageUrl ?? null}
      memoryCard={memoryCard}
      salonBadge={salonBadge}
      autoPlay={autoPlay}
      showControls
      onPlaybackComplete={onPlaybackComplete}
      copy={{ play: copy.play, pause: copy.pause, loading: copy.loading }}
      emptyLabel={emptyLabel}
    />
  );
}
