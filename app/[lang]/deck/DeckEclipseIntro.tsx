"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const SESSION_KEY = "odyssey_deck_eclipse_intro_v1";
const FADE_MS = 700;

const EclipseCraftPlay = dynamic(
  () =>
    import("@/src/components/contribute/EclipseCraftPlay").then(
      (m) => m.EclipseCraftPlay,
    ),
  { ssr: false },
);

type DeckEclipseIntroProps = {
  locale: "fr" | "en";
  skipLabel: string;
  onDone: () => void;
};

function markSeen() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function hasSeenDeckEclipseIntro(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Intro courte B — vrai craft play (`EclipseCraftPlay` mode prologue, ~9,5 s).
 * Une fois / session · Skip · prefers-reduced-motion.
 */
export function DeckEclipseIntro({
  locale,
  skipLabel,
  onDone,
}: DeckEclipseIntroProps) {
  const doneRef = useRef(false);
  const [fading, setFading] = useState(false);
  const [mountPlay, setMountPlay] = useState(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    markSeen();
    setFading(true);
    window.setTimeout(() => onDone(), FADE_MS);
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      finish();
      return;
    }
    setMountPlay(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish once
  }, []);

  return (
    <div
      className={`fixed inset-0 z-40 bg-black transition-opacity ease-out ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      role="dialog"
      aria-modal="true"
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
