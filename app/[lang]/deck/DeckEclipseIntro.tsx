"use client";

import { useCallback } from "react";

import { DeckEclipseCinema } from "./DeckEclipseCinema";

const SESSION_KEY = "odyssey_deck_eclipse_intro_v1";

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
 * Intro session — même cinéma que Contact (`DeckEclipseCinema` / prologue).
 * Une fois / session · Skip · prefers-reduced-motion.
 */
export function DeckEclipseIntro({
  locale,
  skipLabel,
  onDone,
}: DeckEclipseIntroProps) {
  const finish = useCallback(() => {
    markSeen();
    onDone();
  }, [onDone]);

  return (
    <DeckEclipseCinema
      locale={locale}
      skipLabel={skipLabel}
      play
      role="dialog"
      onDone={finish}
    />
  );
}
