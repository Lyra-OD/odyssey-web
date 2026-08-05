"use client";

import { useEffect, useState, type CSSProperties } from "react";

import type { ScreenAnchor } from "@/src/components/contribute/constellation/StarScreenReporter";
import { getMockSoul } from "@/src/components/contribute/constellation/mockSouls";

type MemoryRevealProps = {
  soulId: string;
  locale: "fr" | "en";
  onClose: () => void;
  /** false = encore en approche caméra ; true = média émerge */
  open: boolean;
  /** Retour caméra — effet inverse du portail */
  exiting?: boolean;
  /** Position écran de l’étoile (%). */
  anchor: ScreenAnchor | null;
};

/**
 * E2 — Portail lumière : le souvenir naît / revient vers son étoile.
 */
export function MemoryReveal({
  soulId,
  locale,
  onClose,
  open,
  exiting = false,
  anchor,
}: MemoryRevealProps) {
  const soul = getMockSoul(soulId);
  const memory = soul?.memory;
  const [captionReady, setCaptionReady] = useState(false);
  const [figurePos, setFigurePos] = useState({ x: 50, y: 46 });

  useEffect(() => {
    if (!open || exiting) {
      setCaptionReady(false);
      return;
    }
    const t = window.setTimeout(() => setCaptionReady(true), 720);
    return () => window.clearTimeout(t);
  }, [open, exiting, soulId]);

  // Ouvert au centre ; à la fermeture, suit l’étoile (depuis le centre)
  useEffect(() => {
    if (!exiting) {
      setFigurePos({ x: 50, y: 46 });
      return;
    }
    // 1 frame au centre pour que la transition CSS parte bien du milieu
    setFigurePos({ x: 50, y: 46 });
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setFigurePos({
          x: anchor?.x ?? 50,
          y: anchor?.y ?? 46,
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [exiting]); // eslint-disable-line react-hooks/exhaustive-deps -- ancrage initial seulement

  useEffect(() => {
    if (!exiting || !anchor) return;
    setFigurePos({ x: anchor.x, y: anchor.y });
  }, [exiting, anchor]);

  if (!soul || !memory) return null;

  const caption = locale === "en" ? memory.captionEn : memory.captionFr;
  const closeLabel = locale === "en" ? "Close" : "Fermer";
  const fromLabel =
    locale === "en" ? `From ${soul.name}` : `De ${soul.name}`;
  const showMedia = open || exiting;

  const starX = anchor?.x ?? 50;
  const starY = anchor?.y ?? 48;

  return (
    <div
      className={[
        "absolute inset-0 z-30",
        exiting
          ? "pointer-events-none"
          : open
            ? "pointer-events-auto"
            : "pointer-events-none",
      ].join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={caption}
      onClick={open && !exiting ? onClose : undefined}
      style={
        {
          ["--star-x" as string]: `${starX}%`,
          ["--star-y" as string]: `${starY}%`,
        } as CSSProperties
      }
    >
      <div
        className={[
          "pointer-events-none absolute inset-0 transition-opacity duration-700",
          exiting
            ? "opacity-0"
            : open
              ? "opacity-100"
              : "opacity-55",
        ].join(" ")}
        aria-hidden
      >
        <div className="sanctuary-memory-portal__scrim" />
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={[
          "absolute left-4 top-4 z-40 rounded-sm border border-white/15 bg-black/30 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.22em] text-teal-50/70 backdrop-blur-sm transition-all duration-500 hover:border-teal-400/30 hover:text-teal-50 md:left-8 md:top-8",
          open && !exiting ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        {closeLabel}
        <span className="ml-2 hidden text-white/30 sm:inline">Esc</span>
      </button>

      <figure
        className={[
          "sanctuary-memory-portal__figure absolute z-10 w-[min(92vw,32rem)] px-4",
          exiting ? "is-returning" : open ? "is-open" : "",
        ].join(" ")}
        style={{
          left: `${exiting ? figurePos.x : 50}%`,
          top: `${exiting ? figurePos.y : 46}%`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {showMedia ? (
          <>
            <div
              className={[
                "sanctuary-memory-portal__halo transition-opacity duration-500",
                exiting ? "opacity-0" : "opacity-100",
              ].join(" ")}
              aria-hidden
            />
            <div
              className={[
                "sanctuary-memory-portal__media",
                exiting ? "is-exiting" : "is-entering",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- mock distant URL */}
              <img src={memory.src} alt={caption} />
            </div>
            <figcaption
              className={[
                "mt-6 text-center transition-all duration-500 ease-out",
                captionReady && !exiting
                  ? "translate-y-0 opacity-100"
                  : "translate-y-3 opacity-0",
              ].join(" ")}
            >
              <p className="font-editorial text-xl font-light tracking-wide text-teal-50/92 md:text-2xl">
                {caption}
              </p>
              <p className="mt-3 text-[10px] font-light uppercase tracking-[0.32em] text-white/32">
                {fromLabel}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 text-[10px] font-light uppercase tracking-[0.28em] text-teal-50/55 transition-colors hover:text-teal-50"
              >
                {closeLabel}
              </button>
            </figcaption>
          </>
        ) : null}
      </figure>
    </div>
  );
}
