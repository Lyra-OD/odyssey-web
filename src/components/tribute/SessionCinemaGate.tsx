"use client";

/**
 * Sas cinéma étape 6 — plein écran, poster traité, 2 CTA.
 * Pose `data-odyssey-cinema` (ref-count) pour masquer Navbar / Aide.
 */

import { Play, X } from "lucide-react";

import { useOdysseyCinemaMode } from "@/src/hooks/useOdysseyCinemaMode";
import {
  sanctuaryFocusRing,
  wizardMiniCapsAction,
} from "@/src/lib/contribute/sanctuaryChrome";

/** Kodak A24 allégé + N&B pour look affiche (sas seulement). */
const POSTER_FILTER =
  "grayscale(1) contrast(1.12) brightness(0.92) saturate(0)";

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
  salonBadge?: string | null;
  onPlay: () => void;
  onSkip: () => void;
  onClose: () => void;
};

export function SessionCinemaGate({
  copy,
  memoryCard,
  posterUrl,
  isLoading = false,
  salonBadge = null,
  onPlay,
  onSkip,
  onClose,
}: Props) {
  useOdysseyCinemaMode(true);

  return (
    <div
      className="fixed inset-0 z-[75] flex h-dvh w-screen flex-col overflow-hidden bg-black text-zinc-100"
      role="dialog"
      aria-modal="true"
      aria-label={copy.eyebrow ?? copy.play}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={copy.close}
        className={`absolute right-4 top-4 z-[90] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-zinc-300 transition-colors hover:border-white/30 hover:text-zinc-50 md:right-6 md:top-6 ${sanctuaryFocusRing}`}
      >
        <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      </button>

      <div className="relative min-h-0 flex-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="max-w-md text-sm font-light leading-relaxed text-zinc-400 md:text-base">
              {copy.loading}
            </p>
          </div>
        ) : posterUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: POSTER_FILTER }}
              draggable={false}
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{
                backgroundImage: POSTER_GRAIN,
                mixBlendMode: "overlay",
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 z-[2]"
              style={{
                background:
                  "radial-gradient(ellipse 75% 70% at 50% 40%, transparent 35%, rgba(0,0,0,0.45) 75%, rgba(0,0,0,0.92) 100%)",
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black via-black/50 to-black/25"
              aria-hidden
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-black px-6 text-center">
            <p className="max-w-md text-sm font-light leading-relaxed text-zinc-400 md:text-base">
              {copy.empty}
            </p>
          </div>
        )}

        {!isLoading ? (
          <div className="absolute inset-x-0 bottom-0 z-[10] flex flex-col items-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-24 text-center md:px-10 md:pb-10">
            {copy.eyebrow ? (
              <p className="mb-4 font-label text-[10px] font-medium uppercase tracking-[0.42em] text-zinc-400">
                {copy.eyebrow}
              </p>
            ) : null}

            {memoryCard.displayName ? (
              <p className="font-editorial text-[clamp(1.65rem,5vw,2.75rem)] font-medium tracking-[0.04em] text-zinc-50">
                {memoryCard.displayName}
              </p>
            ) : null}
            {memoryCard.yearsLine ? (
              <p className="mt-3 text-[clamp(0.7rem,1.4vw,0.88rem)] font-light tracking-[0.36em] text-zinc-400">
                {memoryCard.yearsLine}
              </p>
            ) : null}

            {salonBadge ? (
              <p className="mt-4 text-[10px] font-light tracking-[0.14em] text-zinc-400/85 md:text-[11px]">
                {salonBadge}
              </p>
            ) : null}

            <div className="mt-8 flex w-full max-w-md flex-col gap-3">
              <button
                type="button"
                onClick={onPlay}
                aria-label={copy.playAria}
                className={`${wizardMiniCapsAction} inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border border-white/25 bg-white/[0.12] px-6 text-base font-medium text-zinc-50 backdrop-blur-md transition-[colors,box-shadow,transform] hover:border-white/40 hover:bg-white/[0.18] hover:shadow-[0_0_28px_rgba(255,255,255,0.1)] active:scale-[0.985] ${sanctuaryFocusRing}`}
              >
                <Play
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.4}
                  aria-hidden
                />
                {copy.play}
              </button>
              <button
                type="button"
                onClick={onSkip}
                aria-label={copy.skipAria}
                className={`${wizardMiniCapsAction} inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-white/10 bg-transparent px-6 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:text-zinc-100 ${sanctuaryFocusRing}`}
              >
                {copy.skip}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
