"use client";

/**
 * Sas cinéma étape 6 — affiche documentaire + CTA éditoriaux.
 * Pose `data-odyssey-cinema` (ref-count) pour masquer Navbar / Aide.
 * Desktop : 1 plan net + spring + breath + specular (pas dual-plane).
 */

import { Play, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";

import { useOdysseyCinemaMode } from "@/src/hooks/useOdysseyCinemaMode";
import { sanctuaryFocusRing } from "@/src/lib/contribute/sanctuaryChrome";
import { editorialFont } from "@/src/lib/fonts";

const POSTER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")";

/** Parallaxe max (px) — Quiet Luxury. */
const PARALLAX_PX = 6;
const SPRING = 0.11;
/** Breath : entre le trop fort (0,014/10s) et le trop mou (0,006/16s). */
const BREATH_PERIOD_SEC = 12;
const BREATH_AMP = 0.01;
const BASE_SCALE = 1.04;
/** Specular soft-light — pic lisible (A/B desktop). */
const SPECULAR_PEAK = 0.42;

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

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

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

  const rootRef = useRef<HTMLDivElement | null>(null);
  const planeRef = useRef<HTMLDivElement | null>(null);
  const specularRef = useRef<HTMLDivElement | null>(null);
  const grainRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const engageRef = useRef(0);
  const engageTargetRef = useRef(0);
  const t0Ref = useRef(
    typeof performance !== "undefined" ? performance.now() : 0,
  );

  const [desktopPoster, setDesktopPoster] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(
      "(min-width: 1024px) and (pointer: fine)",
    );
    const apply = () => setDesktopPoster(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const tick = useCallback(() => {
    const cur = currentRef.current;
    const tgt = targetRef.current;
    cur.x += (tgt.x - cur.x) * SPRING;
    cur.y += (tgt.y - cur.y) * SPRING;
    engageRef.current +=
      (engageTargetRef.current - engageRef.current) * SPRING;

    const now =
      typeof performance !== "undefined" ? performance.now() : 0;
    const breathPhase =
      ((now - t0Ref.current) / 1000 / BREATH_PERIOD_SEC) * Math.PI * 2;
    const breath = BASE_SCALE * (1 + BREATH_AMP * Math.sin(breathPhase));
    const engage = engageRef.current;

    const fx = cur.x * PARALLAX_PX * engage;
    const fy = cur.y * PARALLAX_PX * 0.85 * engage;

    if (planeRef.current) {
      planeRef.current.style.transform = `translate3d(${fx.toFixed(2)}px, ${fy.toFixed(2)}px, 0) scale(${breath.toFixed(4)})`;
    }
    if (specularRef.current) {
      // Specular : voile chaud dérive avec la souris.
      const ox = 50 + cur.x * 22 * Math.max(0.5, engage);
      const oy = 40 + cur.y * 16 * Math.max(0.5, engage);
      const op =
        SPECULAR_PEAK *
        (0.75 + 0.25 * Math.max(0.4, engage)) *
        (0.9 + 0.1 * Math.sin(breathPhase));
      specularRef.current.style.opacity = op.toFixed(3);
      specularRef.current.style.background = `radial-gradient(ellipse 60% 48% at ${ox.toFixed(1)}% ${oy.toFixed(1)}%, rgba(255, 220, 180, 0.85) 0%, rgba(255, 200, 150, 0.25) 42%, transparent 72%)`;
    }
    if (grainRef.current) {
      const g = 0.045 + 0.015 * (0.5 + 0.5 * Math.sin(breathPhase));
      grainRef.current.style.opacity = g.toFixed(3);
    }

    rafRef.current = window.requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!desktopPoster || isLoading || !posterUrl) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    t0Ref.current =
      typeof performance !== "undefined" ? performance.now() : 0;
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [desktopPoster, isLoading, posterUrl, tick]);

  const onPointerMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!desktopPoster) return;
    const root = rootRef.current;
    if (!root) return;
    const r = root.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
    const ny = ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
    targetRef.current = {
      x: clamp(nx, -1, 1),
      y: clamp(ny, -1, 1),
    };
    engageTargetRef.current = 1;
  };

  const onPointerLeave = () => {
    targetRef.current = { x: 0, y: 0 };
    engageTargetRef.current = 0;
  };

  const showPosterFx = Boolean(posterUrl) && !isLoading;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[75] flex h-dvh w-screen flex-col overflow-hidden bg-[#020202] text-zinc-100"
      role="dialog"
      aria-modal="true"
      aria-label={copy.eyebrow ?? copy.play}
      onMouseMove={onPointerMove}
      onMouseLeave={onPointerLeave}
    >
      {/* Affiche — 1 plan net + spring + breath + specular */}
      {showPosterFx ? (
        desktopPoster ? (
          <>
            <div
              ref={planeRef}
              className="pointer-events-none absolute inset-0 will-change-transform"
              style={{
                transform: `translate3d(0,0,0) scale(${BASE_SCALE})`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterUrl!}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-40 grayscale"
                draggable={false}
              />
            </div>
            <div
              ref={specularRef}
              className="pointer-events-none absolute inset-0 z-[1] will-change-[opacity,background]"
              style={
                {
                  opacity: SPECULAR_PEAK * 0.8,
                  mixBlendMode: "soft-light",
                  background:
                    "radial-gradient(ellipse 60% 48% at 50% 40%, rgba(255, 220, 180, 0.85) 0%, rgba(255, 200, 150, 0.25) 42%, transparent 72%)",
                } satisfies CSSProperties
              }
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black via-black/60 to-black/20"
              aria-hidden
            />
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl!}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40 grayscale"
              draggable={false}
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black via-black/60 to-black/20"
              aria-hidden
            />
          </>
        )
      ) : null}

      <div
        ref={grainRef}
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          backgroundImage: POSTER_GRAIN,
          mixBlendMode: "overlay",
          opacity: 0.05,
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
              <p
                className={`${editorialFont.className} text-[clamp(1.85rem,5vw,3.15rem)] font-medium tracking-[0.04em] text-white`}
              >
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
