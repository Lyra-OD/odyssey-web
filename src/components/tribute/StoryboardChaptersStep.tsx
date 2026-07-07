"use client";

import { Music2, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChapterMusicPanel } from "@/src/components/tribute/storyboard/ChapterMusicPanel";
import { StoryboardCapacityBadge } from "@/src/components/tribute/storyboard/StoryboardCapacityBadge";
import { StoryboardChapterStats } from "@/src/components/tribute/storyboard/StoryboardChapterStats";
import { resolvePreviewUrl, waitForAudioReady } from "@/src/lib/wizard/musicPreview";
import { getChapterTheme } from "@/src/lib/wizard/chapterTheme";
import type { StingrayTrackApiPayload } from "@/src/lib/wizard/stingrayCatalog";
import {
  chapterRecommendedCapacity,
  resolveTargetSecondsPerMedia,
} from "@/src/lib/wizard/storyboardPacing";
import {
  addChapter,
  removeChapter,
  assignSongToChapter,
  clearChapterSong,
} from "@/src/lib/wizard/storyboardHelpers";
import type { PackageId } from "@/src/lib/wizard/wizardDeliverables";
import type {
  WizardStoryboardChapter,
  WizardStoryboardSong,
  WizardStoryboardState,
} from "@/src/lib/wizard/wizardState";
import type { MusicCatalogTier } from "@/src/lib/wizard/pricingConfig";

export type StoryboardChaptersStepCopy = {
  title: string;
  description: string;
  /** Bandeau éducatif — doit contenir `{minMinutes}` (durée mini. recommandée en minutes). */
  educationBanner: string;
  progress: string;
  chapterTitleFallback: string;
  chapterEmptyLabel: string;
  addChapterCta: string;
  removeChapterCta: string;
  maxReachedHint: string;
  capacityRecommended: string;
  capacityPending: string;
  shortTrackWarning: string;
  statsMediaLabel: string;
  /** Doit contenir `{count}` et `{max}`. */
  statsMediaValue: string;
  statsSongsLabel: string;
  /** Doit contenir `{min}` et `{max}`. */
  statsSongsValue: string;
  duplicateWarning: string;
  duplicateAckLabel: string;
  searchPlaceholder: string;
  searchHint: string;
  searching: string;
  noResults: string;
  listenCta: string;
  chooseCta: string;
  changeCta: string;
  serviceUnavailable: string;
  previewUnavailable: string;
  licensedNote: string;
  previewPremiumBadge: string;
  catalogAccessStandard: string;
  catalogAccessPremium: string;
};

type Props = {
  packageId: PackageId;
  maxSongs: number;
  minSongsRequired: number;
  maxMediaItems: number;
  /** Volume total de médias déjà uploadés (Étape 3) — pilote le nombre minimum de chapitres. */
  projectMediaCount: number;
  catalogTier: MusicCatalogTier;
  storyboard: WizardStoryboardState;
  onStoryboardChange: (next: WizardStoryboardState) => void;
  /** Chapitres dont la chanson est dupliquée ailleurs — dérivé, jamais stocké. */
  duplicateChapterIds: ReadonlySet<string>;
  hasDuplicateSongs: boolean;
  /**
   * Acquittement local (jamais persisté dans `WizardStoryboardState`) —
   * possédé et remis à zéro par l'orchestrateur (`TributeWizard`) car
   * `goNext()` doit pouvoir en dépendre pour bloquer la navigation.
   */
  duplicateSongsAcknowledged: boolean;
  onDuplicateSongsAcknowledgedChange: (value: boolean) => void;
  copy: StoryboardChaptersStepCopy;
};

export function StoryboardChaptersStep({
  packageId,
  maxSongs,
  minSongsRequired,
  maxMediaItems,
  projectMediaCount,
  catalogTier,
  storyboard,
  onStoryboardChange,
  duplicateChapterIds,
  hasDuplicateSongs,
  duplicateSongsAcknowledged,
  onDuplicateSongsAcknowledgedChange,
  copy,
}: Props) {
  // Le mood d'un chapitre (S4, structure prête) pondère à terme son propre
  // rythme — voir resolveTargetSecondsPerMedia. Chaque tuile/panneau calcule
  // donc sa cible à partir de son propre chapitre plutôt que d'une valeur
  // unique partagée.
  const targetSecondsPerMediaForChapter = useCallback(
    (chapter: Pick<WizardStoryboardChapter, "mood">) =>
      resolveTargetSecondsPerMedia(packageId, chapter.mood),
    [packageId],
  );

  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [previewUnavailableIds, setPreviewUnavailableIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState({ current: 0, duration: 0 });

  useEffect(() => {
    if (!storyboard.chapters.length) {
      setActiveChapterId(null);
      return;
    }
    if (activeChapterId && storyboard.chapters.some((c) => c.id === activeChapterId)) {
      return;
    }
    setActiveChapterId(storyboard.chapters[0].id);
  }, [storyboard.chapters, activeChapterId]);

  const stopPreview = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setProgress({ current: audio.currentTime, duration: audio.duration || 0 });
    };
    const onLoadedMetadata = () => {
      setProgress((prev) => ({ ...prev, duration: audio.duration || 0 }));
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress((prev) => ({ ...prev, current: 0 }));
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audioRef.current = null;
    };
  }, []);

  const togglePreview = useCallback(
    async (track: StingrayTrackApiPayload) => {
      const audio = audioRef.current;
      if (!audio) return;

      const previewUrl = resolvePreviewUrl(track);
      if (!previewUrl) {
        setPreviewUnavailableIds((prev) => new Set(prev).add(track.id));
        setPlaybackError(copy.previewUnavailable);
        return;
      }

      if (previewTrackId === track.id && isPlaying) {
        audio.pause();
        return;
      }

      setPlaybackError(null);
      audio.pause();
      audio.currentTime = 0;
      audio.src = previewUrl;
      audio.load();
      setPreviewTrackId(track.id);
      setProgress({ current: 0, duration: 0 });

      try {
        await waitForAudioReady(audio);
        await audio.play();
      } catch {
        setPreviewUnavailableIds((prev) => new Set(prev).add(track.id));
        setPlaybackError(copy.previewUnavailable);
        setIsPlaying(false);
      }
    },
    [copy.previewUnavailable, isPlaying, previewTrackId],
  );

  const handleSeek = useCallback((value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setProgress((prev) => ({ ...prev, current: value }));
  }, []);

  const selectChapter = useCallback(
    (chapterId: string) => {
      stopPreview();
      setPreviewTrackId(null);
      setActiveChapterId(chapterId);
    },
    [stopPreview],
  );

  const handleChapterSongChange = useCallback(
    (chapterId: string, song: WizardStoryboardSong | null) => {
      stopPreview();
      setPreviewTrackId(null);
      onStoryboardChange(
        song
          ? assignSongToChapter(storyboard, chapterId, song)
          : clearChapterSong(storyboard, chapterId),
      );
    },
    [onStoryboardChange, storyboard, stopPreview],
  );

  const handleAddChapter = useCallback(() => {
    onStoryboardChange(addChapter(storyboard, maxSongs));
  }, [maxSongs, onStoryboardChange, storyboard]);

  const handleRemoveChapter = useCallback(
    (chapterId: string) => {
      onStoryboardChange(removeChapter(storyboard, chapterId));
    },
    [onStoryboardChange, storyboard],
  );

  const selectedCount = useMemo(
    () => storyboard.chapters.filter((chapter) => Boolean(chapter.song)).length,
    [storyboard.chapters],
  );

  const activeChapter = useMemo(
    () => storyboard.chapters.find((chapter) => chapter.id === activeChapterId) ?? null,
    [storyboard.chapters, activeChapterId],
  );

  const canAddChapter = storyboard.chapters.length < maxSongs;
  const canRemoveChapters = storyboard.chapters.length > 1;

  return (
    <div className="space-y-8 pb-10">
      <header className="space-y-3">
        <h2 className="font-[family-name:var(--font-label)] text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {copy.title}
        </h2>
        <p className="max-w-2xl text-sm font-light leading-relaxed text-zinc-400 md:text-base">
          {copy.description}
        </p>
        <StoryboardChapterStats
          mediaCount={projectMediaCount}
          maxMediaItems={maxMediaItems}
          minSongsRequired={minSongsRequired}
          maxSongs={maxSongs}
          copy={{
            mediaLabel: copy.statsMediaLabel,
            mediaValue: copy.statsMediaValue,
            songsLabel: copy.statsSongsLabel,
            songsValue: copy.statsSongsValue,
          }}
        />
        <p
          className="max-w-2xl rounded-xl border border-violet-400/20 bg-violet-500/[0.05] px-4 py-3 text-sm font-light leading-relaxed text-violet-100/85"
          role="note"
        >
          {copy.educationBanner}
        </p>
        <p
          className="max-w-2xl rounded-xl border border-indigo-400/20 bg-indigo-500/[0.06] px-4 py-3 text-sm font-light leading-relaxed text-indigo-100/90"
          role="status"
        >
          {catalogTier === "premium"
            ? copy.catalogAccessPremium
            : copy.catalogAccessStandard}
        </p>
        <p className="text-xs font-light text-zinc-500">
          {copy.progress
            .replace("{count}", String(selectedCount))
            .replace("{total}", String(storyboard.chapters.length))}
        </p>
      </header>

      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
        role="tablist"
        aria-label={copy.title}
      >
        {storyboard.chapters.map((chapter, index) => {
          const theme = getChapterTheme(index);
          const isActive = activeChapterId === chapter.id;
          const song = chapter.song;
          const fallbackLabel = copy.chapterTitleFallback.replace(
            "{index}",
            String(index + 1),
          );
          const capacity = chapterRecommendedCapacity(
            song?.durationSec,
            targetSecondsPerMediaForChapter(chapter),
          );
          const isDuplicate = duplicateChapterIds.has(chapter.id);

          return (
            <div key={chapter.id} className="group relative">
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => selectChapter(chapter.id)}
                className={`w-full rounded-2xl border p-4 text-center transition-all duration-200 ${
                  isDuplicate
                    ? "border-amber-400/40 bg-amber-500/[0.06] ring-1 ring-amber-400/30"
                    : isActive
                      ? `${theme.active} ring-1 ${theme.ring}`
                      : "border-white/10 bg-white/[0.02] hover:border-white/15"
                }`}
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  {song?.source === "stingray" && song.coverUrl ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={song.coverUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <Music2
                      className="h-7 w-7 text-zinc-600"
                      strokeWidth={1.2}
                      aria-hidden
                    />
                  )}
                </div>
                <p
                  className={`mt-3 truncate text-sm font-medium ${
                    song ? "text-zinc-100" : "text-zinc-500"
                  }`}
                >
                  {song?.title ?? copy.chapterEmptyLabel}
                </p>
                <p
                  className={`mt-1 truncate text-[10px] font-light uppercase tracking-widest ${theme.text}`}
                >
                  {fallbackLabel}
                </p>
                {song ? (
                  <p className="mt-0.5 truncate text-xs font-light text-zinc-500">
                    {song.artist ?? ""}
                  </p>
                ) : null}
                <div className="mt-1.5">
                  <StoryboardCapacityBadge
                    capacity={capacity}
                    copy={{
                      recommended: copy.capacityRecommended,
                      pending: copy.capacityPending,
                    }}
                  />
                </div>
              </button>

              {canRemoveChapters ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveChapter(chapter.id);
                  }}
                  aria-label={copy.removeChapterCta}
                  className="absolute -right-1.5 -top-1.5 z-[2] flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/70 text-zinc-400 opacity-0 backdrop-blur-md transition-opacity duration-200 hover:border-red-500/30 hover:text-red-400/90 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.8} aria-hidden />
                </button>
              ) : null}
            </div>
          );
        })}

        {canAddChapter ? (
          <button
            type="button"
            onClick={handleAddChapter}
            className="flex min-h-[9.5rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.01] text-sm font-light text-zinc-500 transition-colors hover:border-white/25 hover:bg-white/[0.03] hover:text-zinc-300"
          >
            <Plus className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            {copy.addChapterCta}
          </button>
        ) : null}
      </div>

      {!canAddChapter ? (
        <p className="text-center text-xs font-light text-zinc-600">
          {copy.maxReachedHint.replace("{max}", String(maxSongs))}
        </p>
      ) : null}

      {hasDuplicateSongs ? (
        <div
          className="max-w-2xl space-y-3 rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-4 py-3.5"
          role="alert"
        >
          <p className="text-sm font-light leading-relaxed text-amber-200/90">
            {copy.duplicateWarning}
          </p>
          <label className="flex cursor-pointer items-start gap-2.5 text-xs font-light text-amber-100/85">
            <input
              type="checkbox"
              checked={duplicateSongsAcknowledged}
              onChange={(e) => onDuplicateSongsAcknowledgedChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400/40 bg-transparent text-amber-400 accent-amber-400"
            />
            <span>{copy.duplicateAckLabel}</span>
          </label>
        </div>
      ) : null}

      {activeChapter ? (
        <div role="tabpanel">
          <ChapterMusicPanel
            chapter={activeChapter}
            chapterLabel={copy.chapterTitleFallback.replace(
              "{index}",
              String(storyboard.chapters.findIndex((c) => c.id === activeChapter.id) + 1),
            )}
            targetSecondsPerMedia={targetSecondsPerMediaForChapter(activeChapter)}
            catalogTier={catalogTier}
            copy={copy}
            previewTrackId={previewTrackId}
            previewUnavailableIds={previewUnavailableIds}
            isPlaying={isPlaying}
            progress={progress}
            serviceError={playbackError}
            onChoose={(song) => handleChapterSongChange(activeChapter.id, song)}
            onTogglePreview={togglePreview}
            onSeek={handleSeek}
          />
        </div>
      ) : null}

      <p className="text-center text-xs font-light text-zinc-600">{copy.licensedNote}</p>
    </div>
  );
}
