"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildMusicPreviewProxyUrl } from "@/src/lib/music/stingrayTrackId";
import type { WizardActTracks } from "@/src/lib/wizard/wizardState";
import {
  groupSlidesByAct,
  TEASER_DEFAULT_SLIDE_MS,
  TEASER_FADE_MS,
  type TeaserSlide,
} from "@/src/lib/wizard/teaserHelpers";

export type CinematicTeaserCopy = {
  loading: string;
  empty: string;
  nowPlaying: string;
  play: string;
  pause: string;
};

type Props = {
  slides: TeaserSlide[];
  tracks: WizardActTracks;
  copy: CinematicTeaserCopy;
  autoPlay?: boolean;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CinematicTeaser({
  slides,
  tracks,
  copy,
  autoPlay = true,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const slideStartRef = useRef<number>(Date.now());
  const rafRef = useRef<number | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  const actGroups = useMemo(() => groupSlidesByAct(slides), [slides]);

  const slideDurations = useMemo(() => {
    const durations = new Map<number, number>();
    let offset = 0;

    for (const group of actGroups) {
      const perSlide = TEASER_DEFAULT_SLIDE_MS;
      for (const slide of group.slides) {
        const idx = slides.indexOf(slide);
        if (idx >= 0) {
          durations.set(idx, perSlide);
          offset += perSlide;
        }
      }
    }

    if (offset === 0 && slides.length) {
      slides.forEach((_, idx) => durations.set(idx, TEASER_DEFAULT_SLIDE_MS));
    }

    return durations;
  }, [actGroups, slides]);

  useEffect(() => {
    let total = 0;
    for (let i = 0; i < slides.length; i += 1) {
      total += slideDurations.get(i) ?? TEASER_DEFAULT_SLIDE_MS;
    }
    setTotalDuration(total / 1000);
  }, [slideDurations, slides.length]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audioRef.current = null;
    };
  }, []);

  const playMusicForSlide = useCallback(
    async (slideIndex: number) => {
      const slide = slides[slideIndex];
      const track = slide ? tracks[slide.actKey] : undefined;
      const audio = audioRef.current;
      if (!slide || !track?.trackId || !audio) return;

      setIsAudioLoading(true);
      try {
        const url =
          track.previewUrl?.trim() ||
          buildMusicPreviewProxyUrl(track.trackId);
        if (!url) {
          console.error("URL audio manquante pour", track.title);
          return;
        }
        console.log("Lecture de la piste :", track.title, "URL:", url);
        audio.pause();
        audio.currentTime = 0;
        audio.src = url;
        audio.load();
        await audio.play();
      } catch {
        /* preview best-effort */
      } finally {
        setIsAudioLoading(false);
      }
    },
    [slides, tracks],
  );

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tickProgress = useCallback(() => {
    const slideMs = slideDurations.get(currentIndex) ?? TEASER_DEFAULT_SLIDE_MS;
    const slideElapsed = Date.now() - slideStartRef.current;
    let priorMs = 0;
    for (let i = 0; i < currentIndex; i += 1) {
      priorMs += slideDurations.get(i) ?? TEASER_DEFAULT_SLIDE_MS;
    }
    setElapsed((priorMs + Math.min(slideElapsed, slideMs)) / 1000);

    if (slideElapsed >= slideMs) {
      const next = currentIndex + 1;
      if (next >= slides.length) {
        stopPlayback();
        setCurrentIndex(0);
        setElapsed(0);
        return;
      }
      setCurrentIndex(next);
      slideStartRef.current = Date.now();
      const nextSlide = slides[next];
      const prevSlide = slides[currentIndex];
      if (nextSlide?.actKey !== prevSlide?.actKey) {
        void playMusicForSlide(next);
      }
    }

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tickProgress);
    }
  }, [
    currentIndex,
    isPlaying,
    playMusicForSlide,
    slideDurations,
    slides,
    stopPlayback,
  ]);

  const startPlayback = useCallback(async () => {
    if (!slides.length) return;
    slideStartRef.current = Date.now();
    setIsPlaying(true);
    await playMusicForSlide(currentIndex);
    rafRef.current = requestAnimationFrame(tickProgress);
  }, [currentIndex, playMusicForSlide, slides.length, tickProgress]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    void startPlayback();
  }, [isPlaying, startPlayback, stopPlayback]);

  useEffect(() => {
    if (autoPlay && slides.length && !hasAutoStarted) {
      setHasAutoStarted(true);
      void startPlayback();
    }
  }, [autoPlay, hasAutoStarted, slides.length, startPlayback]);

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tickProgress);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentIndex, isPlaying, tickProgress]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const handleSeek = (ratio: number) => {
    if (!slides.length || !totalDuration) return;
    const targetMs = ratio * totalDuration * 1000;
    let acc = 0;
    let targetIndex = 0;
    for (let i = 0; i < slides.length; i += 1) {
      const dur = slideDurations.get(i) ?? TEASER_DEFAULT_SLIDE_MS;
      if (acc + dur >= targetMs) {
        targetIndex = i;
        break;
      }
      acc += dur;
      targetIndex = i;
    }
    setCurrentIndex(targetIndex);
    slideStartRef.current = Date.now();
    setElapsed(targetMs / 1000);
    if (isPlaying) void playMusicForSlide(targetIndex);
  };

  if (!slides.length) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02]">
        <p className="text-sm font-light text-zinc-500">{copy.empty}</p>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];
  const progressRatio = totalDuration > 0 ? elapsed / totalDuration : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
      <div className="relative aspect-video w-full bg-[#050505]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentIndex}-${currentSlide.imageUrl}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TEASER_FADE_MS / 1000, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentSlide.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-zinc-300 backdrop-blur-md">
          {currentSlide.label}
        </div>

        {isAudioLoading ? (
          <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-zinc-400 backdrop-blur-md">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {copy.loading}
          </div>
        ) : null}
      </div>

      <div className="border-t border-white/10 bg-[#0a0a0a]/95 px-4 py-4 backdrop-blur-xl md:px-6">
        <p className="mb-3 truncate text-xs font-light text-zinc-500">
          {tracks[currentSlide.actKey]
            ? `${tracks[currentSlide.actKey]?.title} — ${tracks[currentSlide.actKey]?.artist}`
            : copy.nowPlaying}
        </p>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={isPlaying ? copy.pause : copy.play}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-zinc-100 transition-colors hover:bg-white/[0.1]"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" fill="currentColor" aria-hidden />
            ) : (
              <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                handleSeek(Math.min(1, Math.max(0, ratio)));
              }}
              className="group relative h-1.5 w-full cursor-pointer rounded-full bg-white/10"
              aria-label={copy.play}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-150"
                style={{ width: `${Math.min(100, progressRatio * 100)}%` }}
              />
              <span
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-[0_0_12px_rgba(255,255,255,0.4)] transition-opacity group-hover:opacity-100"
                style={{
                  left: `calc(${Math.min(100, progressRatio * 100)}% - 6px)`,
                }}
              />
            </button>
            <div className="mt-2 flex justify-between text-[11px] tabular-nums text-zinc-500">
              <span>{formatTime(elapsed)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
