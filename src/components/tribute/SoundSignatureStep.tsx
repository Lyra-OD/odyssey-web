"use client";

import {
  ArrowLeft,
  Loader2,
  Music2,
  Pause,
  Play,
  Search,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import {
  catalogTrackToSelected,
  type StingrayTrackApiPayload,
  type WizardActTrackKey,
  type WizardActTracks,
  type WizardSelectedTrack,
  WIZARD_ACT_TRACK_KEYS,
} from "@/src/lib/wizard/stingrayCatalog";

export type SoundSignatureStepCopy = {
  title: string;
  description: string;
  act1Title: string;
  act2Title: string;
  act3Title: string;
  actEmptyLabel: string;
  actProgress: string;
  searchPlaceholder: string;
  searchHint: string;
  searching: string;
  noResults: string;
  serviceUnavailable: string;
  previewUnavailable: string;
  listenCta: string;
  chooseCta: string;
  changeCta: string;
  licensedNote: string;
};

type Props = {
  copy: SoundSignatureStepCopy;
  tracks: WizardActTracks;
  onTracksChange: (tracks: WizardActTracks) => void;
};

const ACT_THEME: Record<
  WizardActTrackKey,
  { ring: string; active: string; dot: string }
> = {
  acte1: {
    ring: "ring-amber-400/30",
    active: "border-amber-400/35 bg-amber-400/[0.05]",
    dot: "bg-amber-400",
  },
  acte2: {
    ring: "ring-teal-400/30",
    active: "border-teal-400/35 bg-teal-400/[0.05]",
    dot: "bg-teal-400",
  },
  acte3: {
    ring: "ring-fuchsia-400/30",
    active: "border-fuchsia-400/35 bg-fuchsia-400/[0.05]",
    dot: "bg-fuchsia-400",
  },
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function actTitleForKey(
  key: WizardActTrackKey,
  copy: SoundSignatureStepCopy,
): string {
  if (key === "acte1") return copy.act1Title;
  if (key === "acte2") return copy.act2Title;
  return copy.act3Title;
}

function resolvePreviewUrl(track: StingrayTrackApiPayload): string {
  const url = track.previewUrl?.trim() || track.streamUrl?.trim() || "";
  if (!url) {
    console.error("URL audio manquante pour", track.title);
  }
  return url;
}

async function waitForAudioReady(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return;

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("audio_load_failed"));
    };
    const cleanup = () => {
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("error", onError);
    };
    audio.addEventListener("canplay", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
  });
}

type ActMusicPanelProps = {
  actKey: WizardActTrackKey;
  actTitle: string;
  selectedTrack: WizardSelectedTrack | undefined;
  copy: SoundSignatureStepCopy;
  previewTrackId: string | null;
  previewUnavailableIds: ReadonlySet<string>;
  isPlaying: boolean;
  progress: { current: number; duration: number };
  serviceError: string | null;
  onChoose: (track: WizardSelectedTrack | null) => void;
  onTogglePreview: (track: StingrayTrackApiPayload) => void;
  onSeek: (value: number) => void;
};

function ActMusicPanel({
  actKey,
  actTitle,
  selectedTrack,
  copy,
  previewTrackId,
  previewUnavailableIds,
  isPlaying,
  progress,
  serviceError,
  onChoose,
  onTogglePreview,
  onSeek,
}: ActMusicPanelProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StingrayTrackApiPayload[]>([]);
  const [isSearching, setIsSearching] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query, 280);

  useEffect(() => {
    let cancelled = false;
    setIsSearching(true);
    setSearchError(null);

    const runSearch = async () => {
      try {
        const params = new URLSearchParams({ q: debouncedQuery, limit: "12" });
        const res = await fetch(`/api/music/search?${params.toString()}`);
        const body = (await res.json()) as {
          ok?: boolean;
          tracks?: StingrayTrackApiPayload[];
          message?: string;
          error?: string;
        };

        if (cancelled) return;

        if (!res.ok) {
          setResults([]);
          setSearchError(
            body.message ||
              copy.serviceUnavailable,
          );
          return;
        }

        setResults(body.tracks ?? []);
      } catch (error) {
        console.error("[SoundSignatureStep] search failed:", error);
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
  }, [copy.serviceUnavailable, debouncedQuery]);

  if (selectedTrack) {
    return (
      <section
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        aria-labelledby={`${actKey}-selected`}
      >
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-[0_0_20px_rgba(167,139,250,0.08)]">
            {selectedTrack.coverUrl ? (
              <Image
                src={selectedTrack.coverUrl}
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
              {actTitle}
            </p>
            <p className="mt-1 font-[family-name:var(--font-label)] text-xl font-medium text-white">
              {selectedTrack.title}
            </p>
            <p className="mt-0.5 text-sm font-light text-zinc-400">
              {selectedTrack.artist}
            </p>
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
    <section className="space-y-6" aria-labelledby={`${actKey}-search`}>
      <h3
        id={`${actKey}-search`}
        className="font-[family-name:var(--font-label)] text-base font-medium text-zinc-300"
      >
        {actTitle}
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
                      {track.artist}
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
                    onClick={() => onChoose(catalogTrackToSelected(track))}
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
    </section>
  );
}

export function SoundSignatureStep({
  copy,
  tracks,
  onTracksChange,
}: Props) {
  const [activeAct, setActiveAct] = useState<WizardActTrackKey>("acte1");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [previewUnavailableIds, setPreviewUnavailableIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState({ current: 0, duration: 0 });

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
      setProgress({
        current: audio.currentTime,
        duration: audio.duration || 0,
      });
    };
    const onLoadedMetadata = () => {
      setProgress((prev) => ({
        ...prev,
        duration: audio.duration || 0,
      }));
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

      console.log("Lecture de la piste :", track.title, "URL:", previewUrl);

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
      } catch (error) {
        console.error(
          "[SoundSignatureStep] Échec lecture audio:",
          track.title,
          previewUrl,
          error,
        );
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

  const handleActTrackChange = useCallback(
    (actKey: WizardActTrackKey, track: WizardSelectedTrack | null) => {
      stopPreview();
      setPreviewTrackId(null);
      const next = { ...tracks };
      if (track) next[actKey] = track;
      else delete next[actKey];
      onTracksChange(next);
    },
    [onTracksChange, stopPreview, tracks],
  );

  const selectAct = useCallback(
    (key: WizardActTrackKey) => {
      stopPreview();
      setPreviewTrackId(null);
      setActiveAct(key);
    },
    [stopPreview],
  );

  const selectedCount = WIZARD_ACT_TRACK_KEYS.filter((key) =>
    Boolean(tracks[key]?.trackId),
  ).length;

  return (
    <div className="space-y-8 pb-10">
      <header className="space-y-3">
        <h2 className="font-[family-name:var(--font-label)] text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {copy.title}
        </h2>
        <p className="max-w-2xl text-sm font-light leading-relaxed text-zinc-400 md:text-base">
          {copy.description}
        </p>
        <p className="text-xs font-light text-zinc-500">
          {copy.actProgress.replace("{count}", String(selectedCount))}
        </p>
      </header>

      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        role="tablist"
        aria-label={copy.title}
      >
        {WIZARD_ACT_TRACK_KEYS.map((key) => {
          const theme = ACT_THEME[key];
          const isActive = activeAct === key;
          const selected = tracks[key];
          const actLabel = actTitleForKey(key, copy);

          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectAct(key)}
              className={`rounded-2xl border p-4 text-center transition-all duration-200 ${
                isActive
                  ? `${theme.active} ring-1 ${theme.ring}`
                  : "border-white/10 bg-white/[0.02] hover:border-white/15"
              }`}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30">
                {selected?.coverUrl ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={selected.coverUrl}
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
                  selected ? "text-zinc-100" : "text-zinc-500"
                }`}
              >
                {selected?.title ?? copy.actEmptyLabel}
              </p>
              <p className="mt-1 truncate text-[10px] font-light uppercase tracking-widest text-zinc-600">
                {actLabel}
              </p>
              {selected ? (
                <p className="mt-0.5 truncate text-xs font-light text-zinc-500">
                  {selected.artist}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        <ActMusicPanel
          actKey={activeAct}
          actTitle={actTitleForKey(activeAct, copy)}
          selectedTrack={tracks[activeAct]}
          copy={copy}
          previewTrackId={previewTrackId}
          previewUnavailableIds={previewUnavailableIds}
          isPlaying={isPlaying}
          progress={progress}
          serviceError={playbackError}
          onChoose={(track) => handleActTrackChange(activeAct, track)}
          onTogglePreview={togglePreview}
          onSeek={handleSeek}
        />
      </div>

      <p className="text-center text-xs font-light text-zinc-600">
        {copy.licensedNote}
      </p>
    </div>
  );
}
