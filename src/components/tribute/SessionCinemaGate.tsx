"use client";

/**
 * Sas cinéma étape 6 — affiche documentaire + CTA éditoriaux.
 * Pose `data-odyssey-cinema` (ref-count) pour masquer Navbar / Aide.
 */

import { Play, X } from "lucide-react";

import { useOdysseyCinemaMode } from "@/src/hooks/useOdysseyCinemaMode";
import { sanctuaryFocusRing } from "@/src/lib/contribute/sanctuaryChrome";

const POSTER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")";

export type SessionCinemaGateCopy = {
  play: string;
  playAria: string;
  skip: string;
  skipAria: string;
  close: string;
  loading: string;
  empty: string;
  /** Eyebrow optionnel (ex. « La séance »). */
  eyebrow?: string;
};

export type SessionCinemaGateMemoryCard = {
  displayName: string;
  yearsLine: string;
};

type Props = {
  copy: SessionCinemaGateCopy;
  memoryCard: SessionCinemaGateMemoryCard;
  posterUrl: string | null;
  isLoading?: boolean;
  onPlay: () => void;
  onSkip: () => void;
  onClose: () => void;
};

export function SessionCinemaGate({
  copy,
  memoryCard,
  posterUrl,
  isLoading = false,
  onPlay,
  onSkip,
  onClose,
}: Props) {
  useOdysseyCinemaMode(true);

  return (
    <div
      className="fixed inset-0 z-[75] flex h-dvh w-screen flex-col overflow-hidden bg-[#020202] text-zinc-100"
      role="dialog"
      aria-modal="true"
      aria-label={copy.eyebrow ?? copy.play}
    >
      {/* Affiche — N&B, opacity basse, gradient + grain. */}
      {!isLoading && posterUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterUrl}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40 grayscale"
            draggable={false}
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black via-black/60 to-black/20"
            aria-hidden
          />
        </>
      ) : null}

      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          backgroundImage: POSTER_GRAIN,
          mixBlendMode: "overlay",
        }}
        aria-hidden
      />

      <button
        type="button"
        onClick={onClose}
        aria-label={copy.close}
        className={`absolute right-4 top-4 z-[90] flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200 md:right-6 md:top-6 ${sanctuaryFocusRing}`}
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.4} aria-hidden />
      </button>

      {isLoading ? (
        <div className="relative z-[10] flex flex-1 items-center justify-center px-6 text-center">
          <p className="max-w-md text-sm font-light leading-relaxed text-zinc-500 md:text-base">
            {copy.loading}
          </p>
        </div>
      ) : (
        <>
          <div className="relative z-[10] flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center md:px-10">
            {!posterUrl ? (
              <p className="mb-10 max-w-md text-sm font-light leading-relaxed text-zinc-500 md:text-base">
                {copy.empty}
              </p>
            ) : null}

            {copy.eyebrow ? (
              <p className="mb-5 font-label text-[10px] font-medium uppercase tracking-[0.42em] text-zinc-400">
                {copy.eyebrow}
              </p>
            ) : null}

            {memoryCard.displayName ? (
              <p className="font-editorial text-[clamp(1.85rem,5vw,3.15rem)] font-medium tracking-[0.04em] text-white">
                {memoryCard.displayName}
              </p>
            ) : null}

            {memoryCard.yearsLine ? (
              <p className="mt-4 text-[clamp(0.7rem,1.4vw,0.88rem)] font-light tracking-[0.36em] text-zinc-400">
                {memoryCard.yearsLine}
              </p>
            ) : null}

            <button
              type="button"
              onClick={onPlay}
              aria-label={copy.playAria}
              className={`mt-10 inline-flex min-h-11 items-center justify-center gap-2.5 px-4 py-3 text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:text-teal-200 md:text-base ${sanctuaryFocusRing}`}
            >
              <Play
                className="h-3 w-3 shrink-0"
                strokeWidth={1.5}
                aria-hidden
              />
              {copy.play}
            </button>
          </div>

          <div className="relative z-[10] flex shrink-0 justify-center pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.5rem))] pt-4">
            <button
              type="button"
              onClick={onSkip}
              aria-label={copy.skipAria}
              className={`px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-300 ${sanctuaryFocusRing}`}
            >
              {copy.skip}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
