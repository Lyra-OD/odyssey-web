"use client";

import { useEffect, useState } from "react";

type SanctuaryHubIntroCopy = {
  title: string;
  subtitle: string;
  promise: string;
  next: string;
};

type SanctuaryHubIntroProps = {
  copy: SanctuaryHubIntroCopy;
};

/** Dwell avant apparition — même battement que `SanctuaryHubPostReveal`. */
const DWELL_MS = 300;

/**
 * Pitch d'intro — hub.idle avec draft Essentiel **incomplet** (live),
 * monté par l'appelant avec `SanctuaryHubHero`. HTML pur, pas de WebGL.
 * `pointer-events-none` : ne doit jamais intercepter le clic sur l'étoile
 * (`SanctuaryHubHero` + `hubStarAnchorRef`).
 */
export function SanctuaryHubIntro({ copy }: SanctuaryHubIntroProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = window.setTimeout(() => setVisible(true), DWELL_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-center px-6 pt-[max(2.75rem,env(safe-area-inset-top))] sm:pt-16"
      aria-hidden={false}
    >
      <div
        className={`w-full max-w-lg text-center transition-opacity duration-700 ease-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="font-editorial text-xl font-medium leading-tight tracking-[0.01em] text-zinc-100 md:text-2xl">
          {copy.title}
        </p>
        <p className="mt-1.5 text-xs font-light uppercase tracking-[0.24em] text-teal-400/60 md:text-sm">
          {copy.subtitle}
        </p>
        <p className="mx-auto mt-6 max-w-md whitespace-pre-line text-sm font-light leading-relaxed text-zinc-300 md:text-base">
          {copy.promise}
        </p>
        <p className="mx-auto mt-5 max-w-md whitespace-pre-line text-sm font-light leading-relaxed text-zinc-500 md:text-[0.9375rem]">
          {copy.next}
        </p>
      </div>
    </div>
  );
}
