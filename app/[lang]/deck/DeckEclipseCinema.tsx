"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

/** Même fade entrée deck ↔ Contact — un seul ADN. */
export const DECK_ECLIPSE_CINEMA_FADE_MS = 700;

const EclipseCraftPlay = dynamic(
  () =>
    import("@/src/components/contribute/EclipseCraftPlay").then(
      (m) => m.EclipseCraftPlay,
    ),
  { ssr: false },
);

type DeckEclipseCinemaProps = {
  locale: "fr" | "en";
  skipLabel: string;
  /** false = démonte / reset. */
  play?: boolean;
  onDone: () => void;
  /** Intro : dialog modal. Contact : presentation. */
  role?: "dialog" | "presentation";
};

/**
 * Cinéma eclipse plein cadre — prologue craft + fade vers le ciel.
 * Partagé : intro session + slide Contact (même effet, z-40 au-dessus du chrome).
 */
export function DeckEclipseCinema({
  locale,
  skipLabel,
  play = true,
  onDone,
  role = "presentation",
}: DeckEclipseCinemaProps) {
  const doneRef = useRef(false);
  const [fading, setFading] = useState(false);
  const [mountPlay, setMountPlay] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFading(true);
    window.setTimeout(() => {
      onDoneRef.current();
    }, DECK_ECLIPSE_CINEMA_FADE_MS);
  }, []);

  useEffect(() => {
    if (!play) {
      doneRef.current = false;
      setFading(false);
      setMountPlay(false);
      return;
    }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      finish();
      return;
    }

    doneRef.current = false;
    setFading(false);
    setMountPlay(true);
  }, [play, finish]);

  if (!play && !fading) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black transition-opacity ease-out ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${DECK_ECLIPSE_CINEMA_FADE_MS}ms` }}
      role={role}
      aria-modal={role === "dialog" ? true : undefined}
      aria-label={skipLabel}
    >
      {mountPlay ? (
        <EclipseCraftPlay
          locale={locale}
          mode="prologue"
          onComplete={finish}
        />
      ) : null}
      <button
        type="button"
        onClick={finish}
        className="font-label absolute bottom-10 left-1/2 z-50 -translate-x-1/2 text-[0.65rem] uppercase tracking-[0.4em] text-white/40 transition-colors hover:text-white/70"
      >
        {skipLabel}
      </button>
    </div>
  );
}
