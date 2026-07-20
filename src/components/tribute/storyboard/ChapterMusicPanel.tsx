"use client";

import {
  Loader2,
  Music2,
  Pause,
  Play,
  Search,
  ArrowLeft,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { StoryboardCapacityBadge } from "@/src/components/tribute/storyboard/StoryboardCapacityBadge";
import type { StoryboardChaptersStepCopy } from "@/src/components/tribute/StoryboardChaptersStep";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { STORAGE_CACHE_CONTROL } from "@/src/lib/media/storageEgressPolicy";
import { resolvePreviewUrl } from "@/src/lib/wizard/musicPreview";
import {
  chapterRecommendedCapacity,
  RECOMMENDED_MIN_TRACK_DURATION_SEC,
} from "@/src/lib/wizard/storyboardPacing";
import {
  buildChapterMusicUploadPath,
  isPersonalAudioFile,
  readAudioFileDurationSec,
  storyboardSongFromCatalogTrack,
  storyboardSongFromUploadFile,
} from "@/src/lib/wizard/storyboardHelpers";
import type { StingrayTrackApiPayload } from "@/src/lib/wizard/stingrayCatalog";
import type {
  WizardStoryboardChapter,
  WizardStoryboardSong,
} from "@/src/lib/wizard/wizardState";
import type { MusicCatalogTier } from "@/src/lib/wizard/pricingConfig";
import { createClient } from "@/utils/supabase/client";

const MAX_PERSONAL_AUDIO_BYTES = 40 * 1024 * 1024;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type ChapterMusicPanelProps = {
  chapter: WizardStoryboardChapter;
  chapterLabel: string;
  targetSecondsPerMedia: number;
  catalogTier: MusicCatalogTier;
  copy: StoryboardChaptersStepCopy;
  previewTrackId: string | null;
  previewUnavailableIds: ReadonlySet<string>;
  isPlaying: boolean;
  progress: { current: number; duration: number };
  serviceError: string | null;
  onChoose: (song: WizardStoryboardSong | null) => void;
  onTogglePreview: (track: StingrayTrackApiPayload) => void;
  onSeek: (value: number) => void;
  /** Héritage+ : soupape MP3/WAV. */
  canUploadPersonalAudio?: boolean;
  projectId?: string | null;
  musicRightsAccepted?: boolean;
  onAcceptMusicRights?: () => void;
};

/**
 * Recherche/sélection de la chanson d'un chapitre (Étape 4).
 * L'audio (élément `<audio>`, transport, previews) reste piloté par le
 * parent `StoryboardChaptersStep` : ce panneau est purement présentational,
 * il ne fait que déclencher les callbacks fournis.
 */
export function ChapterMusicPanel({
  chapter,
  chapterLabel,
  targetSecondsPerMedia,
  catalogTier,
  copy,
  previewTrackId,
  previewUnavailableIds,
  isPlaying,
  progress,
  serviceError,
  onChoose,
  onTogglePreview,
  onSeek,
  canUploadPersonalAudio = false,
  projectId = null,
  musicRightsAccepted = false,
  onAcceptMusicRights,
}: ChapterMusicPanelProps) {
  const searchId = useId();
  const uploadInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StingrayTrackApiPayload[]>([]);
  const [isSearching, setIsSearching] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tosChecked, setTosChecked] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query, 280);
  const song = chapter.song;

  const handlePersonalAudioFile = async (file: File | undefined) => {
    if (!file || !projectId || !canUploadPersonalAudio) return;
    setUploadError(null);

    if (!isPersonalAudioFile(file)) {
      setUploadError(copy.uploadUnsupported);
      return;
    }
    if (file.size > MAX_PERSONAL_AUDIO_BYTES) {
      setUploadError(copy.uploadTooLarge);
      return;
    }
    if (!musicRightsAccepted) {
      setUploadError(copy.uploadNeedsAttestation);
      return;
    }

    setIsUploading(true);
    try {
      const durationSec = await readAudioFileDurationSec(file);
      const storagePath = buildChapterMusicUploadPath(projectId, file);
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("user-assets")
        .upload(storagePath, file, {
          cacheControl: STORAGE_CACHE_CONTROL,
          upsert: false,
          contentType: file.type || "audio/mpeg",
        });
      if (error) throw error;

      onChoose(
        storyboardSongFromUploadFile({
          storagePath,
          fileName: file.name,
          mimeType: file.type || undefined,
          durationSec,
        }),
      );
    } catch {
      setUploadError(copy.uploadFailed);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    let cancelled = false;
    setIsSearching(true);
    setSearchError(null);

    const runSearch = async () => {
      try {
        const params = new URLSearchParams({
          q: debouncedQuery,
          limit: "12",
          tier: catalogTier,
        });
        const res = await fetch(`/api/music/search?${params.toString()}`);
        const body = (await res.json()) as {
          ok?: boolean;
          tracks?: StingrayTrackApiPayload[];
          message?: string;
        };

        if (cancelled) return;

        if (!res.ok) {
          setResults([]);
          setSearchError(body.message || copy.serviceUnavailable);
          return;
        }

        setResults(body.tracks ?? []);
      } catch {
        if (!cancelled) {
          setResults([]);
          setSearchError(copy.serviceUnavailable);
        }
      }
    };

    void runSearch().finally(() => {
      if (!cancelled) setIsSearching(false);
    });

    return () => {
      cancelled = true;
    };
  }, [catalogTier, copy.serviceUnavailable, debouncedQuery]);

  if (song) {
    const capacity = chapterRecommendedCapacity(song.durationSec, targetSecondsPerMedia);

    return (
      <section
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        aria-labelledby={`${chapter.id}-selected`}
      >
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-[0_0_20px_rgba(167,139,250,0.08)]">
            {song.source === "stingray" && song.coverUrl ? (
              <Image
                src={song.coverUrl}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/[0.06]">
                <Music2 className="h-8 w-8 text-zinc-500" strokeWidth={1.2} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              {chapterLabel}
            </p>
            <p className="mt-1 font-[family-name:var(--font-label)] text-xl font-medium text-white">
              {song.title}
            </p>
            <p className="mt-0.5 text-sm font-light text-zinc-400">
              {song.source === "upload"
                ? (song.fileName ?? song.artist ?? copy.uploadPersonalLabel)
                : (song.artist ?? "")}
            </p>
            <div className="mt-2">
              <StoryboardCapacityBadge
                capacity={capacity}
                copy={{
                  recommended: copy.capacityRecommended,
                  pending: copy.capacityPending,
                }}
              />
            </div>
            {typeof song.durationSec === "number" &&
            song.durationSec > 0 &&
            song.durationSec < RECOMMENDED_MIN_TRACK_DURATION_SEC ? (
              <p className="mt-1.5 text-xs font-light text-amber-300/80">
                {copy.shortTrackWarning}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onChoose(null)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-light text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {copy.changeCta}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby={`${chapter.id}-search`}>
      <h3
        id={`${chapter.id}-search`}
        className="font-[family-name:var(--font-label)] text-base font-medium text-zinc-300"
      >
        {chapterLabel}
      </h3>

      <div>
        <label htmlFor={searchId} className="sr-only">
          {copy.searchPlaceholder}
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.searchPlaceholder}
            autoComplete="off"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-11 text-sm font-light text-zinc-100 outline-none transition-[border,box-shadow] placeholder:text-zinc-600 focus:border-violet-400/30 focus:shadow-[0_0_24px_rgba(139,92,246,0.1)]"
          />
          {isSearching ? (
            <Loader2
              className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500"
              aria-hidden
            />
          ) : null}
        </div>
        <p className="mt-2 text-xs font-light text-zinc-600">{copy.searchHint}</p>
        {searchError || serviceError ? (
          <p className="mt-3 text-sm font-light text-amber-200/90" role="alert">
            {searchError ?? serviceError}
          </p>
        ) : null}
      </div>

      <ul className="space-y-3" aria-live="polite">
        {results.length === 0 && !isSearching && !searchError ? (
          <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-sm font-light text-zinc-500">
            {copy.noResults}
          </li>
        ) : null}

        {results.map((track) => {
          const isActivePreview = previewTrackId === track.id;
          const isPreviewPlaying = isActivePreview && isPlaying;
          const previewUrl = resolvePreviewUrl(track);
          const previewBlocked = previewUnavailableIds.has(track.id);

          return (
            <li
              key={track.id}
              className={`rounded-xl border p-4 transition-all duration-200 ${
                isActivePreview
                  ? "border-violet-400/25 bg-violet-400/[0.04]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/15"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10">
                    {track.coverUrl ? (
                      <Image
                        src={track.coverUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music2 className="h-5 w-5 text-zinc-500" strokeWidth={1.2} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {track.title}
                    </p>
                    <p className="truncate text-xs font-light text-zinc-500">
                      {track.artist} · {track.duration}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2 sm:ml-auto">
                  <button
                    type="button"
                    onClick={() => onTogglePreview(track)}
                    disabled={!previewUrl || previewBlocked}
                    className={`inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-light transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      isActivePreview
                        ? "border-violet-400/30 bg-violet-400/10 text-violet-100"
                        : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-white/20"
                    }`}
                  >
                    {isPreviewPlaying ? (
                      <Pause className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Play className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {previewBlocked ? copy.previewUnavailable : copy.listenCta}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChoose(storyboardSongFromCatalogTrack(track))}
                    className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-teal-400/30 bg-teal-400/[0.08] px-3 text-xs font-medium text-teal-100 hover:border-teal-400/45"
                  >
                    {copy.chooseCta}
                  </button>
                </div>
              </div>

              {isActivePreview && previewUrl ? (
                <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
                  <input
                    type="range"
                    min={0}
                    max={progress.duration || 0}
                    step={0.1}
                    value={progress.current}
                    onChange={(e) => onSeek(Number(e.target.value))}
                    aria-label={copy.listenCta}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-teal-400 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-300"
                  />
                  <div className="flex justify-between text-[10px] tabular-nums text-zinc-500">
                    <span>{formatTime(progress.current)}</span>
                    <span>{formatTime(progress.duration)}</span>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {canUploadPersonalAudio ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300">
              <Upload className="h-5 w-5" strokeWidth={1.8} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="font-[family-name:var(--font-label)] text-sm font-medium text-zinc-100">
                  {copy.uploadPersonalTitle}
                </p>
                <p className="mt-1 text-xs font-light leading-relaxed text-zinc-500">
                  {copy.uploadPersonalHint}
                </p>
              </div>

              {!musicRightsAccepted ? (
                <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3.5">
                  <label className="flex cursor-pointer items-start gap-2.5 text-xs font-light leading-relaxed text-zinc-300">
                    <input
                      type="checkbox"
                      checked={tosChecked}
                      onChange={(e) => setTosChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-teal-400"
                    />
                    <span>{copy.uploadTosLabel}</span>
                  </label>
                  <button
                    type="button"
                    disabled={!tosChecked}
                    onClick={() => onAcceptMusicRights?.()}
                    className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-teal-400/30 bg-teal-400/[0.08] px-3 text-xs font-medium text-teal-100 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copy.uploadTosAccept}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    id={uploadInputId}
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.mp3,.wav"
                    className="sr-only"
                    disabled={isUploading || !projectId}
                    onChange={(e) => {
                      void handlePersonalAudioFile(e.target.files?.[0]);
                    }}
                  />
                  <label
                    htmlFor={uploadInputId}
                    className={`inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-teal-400/30 bg-teal-400/[0.08] px-3 text-xs font-medium text-teal-100 ${
                      isUploading || !projectId
                        ? "pointer-events-none opacity-40"
                        : "hover:border-teal-400/45"
                    }`}
                  >
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Upload className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {isUploading ? copy.uploadUploading : copy.uploadCta}
                  </label>
                </div>
              )}

              {uploadError ? (
                <p className="text-sm font-light text-amber-200/90" role="alert">
                  {uploadError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
