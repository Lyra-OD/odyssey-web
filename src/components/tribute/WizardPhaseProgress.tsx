"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

export type WizardTrailStar = {
  /** Numéro d'étape wizard réel (1–7, ou 3–5 pour Co-Créateur). */
  step: number;
  /** Titre visible sous le point — ancres seulement. */
  anchorLabel?: string;
  /** Nom pour a11y / hover title (toujours). */
  ariaName: string;
};

export type WizardConstellationTrailCopy = {
  ariaLabel: string;
  /** Doit contenir `{label}` — ex. « Aller à {label} ». */
  goToStepAria: string;
  /** Doit contenir `{label}` — annonce sr-only de la position. */
  hereAria: string;
};

type Props = {
  stars: readonly WizardTrailStar[];
  currentStep: number;
  furthestStep: number;
  onStepClick: (step: number) => void;
  copy: WizardConstellationTrailCopy;
};

/** Bande : assez haute pour ★ + orbe, zig modéré (boomer-proof). */
const BAND_H = 96;

/** Zig modéré inégal — personnalité sans chaos. */
const ZIG_Y = [8, -12, 5, -14, 7, -10, 4] as const;

function zigY(index: number): number {
  return ZIG_Y[index % ZIG_Y.length]!;
}

function replaceTokens(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce(
    (acc, [key, value]) => acc.replace(`{${key}}`, value),
    template,
  );
}

function TrailStarGlyph({ current }: { current: boolean }) {
  const size = current ? 36 : 26;
  return (
    <svg
      className={
        current
          ? "wizard-trail-star wizard-trail-star-current"
          : "wizard-trail-star wizard-trail-star-born"
      }
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
    >
      <path
        d="M12 1.2 13.4 8.6 21 10.2 13.4 11.8 12 19.2 10.6 11.8 3 10.2 10.6 8.6 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Fil rangée boomer-proof : ordre gauche→droite clair, ★ grosses,
 * ici + orbe, titres T2 (fort ici / whisper ancres passées).
 */
export function WizardPhaseProgress({
  stars,
  currentStep,
  furthestStep,
  onStepClick,
  copy,
}: Props) {
  const reduceMotion = useReducedMotion();
  const midY = BAND_H / 2;

  const currentStar = stars.find((star) => star.step === currentStep);
  const hereLabel =
    currentStar?.anchorLabel?.trim() || currentStar?.ariaName || "";

  const bornCount = useMemo(
    () => stars.filter((star) => star.step <= furthestStep).length,
    [stars, furthestStep],
  );

  return (
    <nav
      className="wizard-trail-sky relative mb-8 w-full md:mb-11"
      aria-label={copy.ariaLabel}
    >
      {hereLabel ? (
        <p className="sr-only" aria-live="polite">
          {replaceTokens(copy.hereAria, { label: hereLabel })}
        </p>
      ) : null}

      <ol className="relative mx-auto flex w-full max-w-4xl items-center justify-center px-2 sm:max-w-5xl sm:px-4">
        <svg
          className="pointer-events-none absolute inset-x-0 top-0 w-full overflow-visible"
          style={{ height: BAND_H }}
          viewBox={`0 0 ${Math.max(stars.length, 1)} ${BAND_H}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          {stars.map((star, index) => {
            if (index === 0) return null;
            const prev = stars[index - 1]!;
            if (prev.step > furthestStep || star.step > furthestStep) {
              return null;
            }
            const live = star.step === currentStep;
            return (
              <line
                key={`seg-${prev.step}-${star.step}`}
                className={
                  live
                    ? "wizard-trail-filament wizard-trail-filament-live"
                    : "wizard-trail-filament"
                }
                x1={index - 0.5}
                y1={midY + zigY(index - 1)}
                x2={index + 0.5}
                y2={midY + zigY(index)}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {stars.map((star, index) => {
          const isBorn = star.step <= furthestStep;
          const isCurrent = isBorn && star.step === currentStep;
          const hasAnchor = Boolean(star.anchorLabel?.trim());
          const showStrongTitle = isCurrent && hasAnchor;
          const showWhisperTitle = isBorn && !isCurrent && hasAnchor;
          const goLabel = star.anchorLabel?.trim() || star.ariaName;
          const y = zigY(index);

          return (
            <li
              key={star.step}
              className="group/trail relative z-[1] flex min-w-0 flex-1 flex-col items-center"
            >
              <div
                className="flex w-full items-center justify-center"
                style={{ height: BAND_H, transform: `translateY(${y}px)` }}
              >
                {isBorn ? (
                  <motion.button
                    type="button"
                    onClick={() => onStepClick(star.step)}
                    title={goLabel}
                    aria-label={replaceTokens(copy.goToStepAria, {
                      label: goLabel,
                    })}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`wizard-trail-hit relative flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 ${
                      isCurrent ? "h-16 w-16" : "h-14 w-14"
                    }`}
                    initial={
                      reduceMotion ? false : { opacity: 0, scale: 0.2 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.48,
                      ease: [0.16, 1, 0.3, 1],
                      delay: reduceMotion
                        ? 0
                        : Math.max(0, (bornCount - 1) * 0.025),
                    }}
                  >
                    {isCurrent ? (
                      <>
                        <span className="wizard-trail-orb" aria-hidden />
                        <span className="wizard-trail-halo" aria-hidden />
                        <span className="wizard-trail-dust" aria-hidden>
                          <i />
                          <i />
                          <i />
                          <i />
                        </span>
                      </>
                    ) : null}
                    <TrailStarGlyph current={isCurrent} />
                  </motion.button>
                ) : (
                  <span className="h-14 w-14" aria-hidden />
                )}
              </div>

              <span
                className={`mt-1.5 min-h-[1.35rem] max-w-[7rem] truncate text-center sm:max-w-[8rem] ${
                  showStrongTitle
                    ? "font-[family-name:var(--font-label)] text-base font-normal tracking-wide text-white sm:text-lg"
                    : showWhisperTitle
                      ? "text-xs font-light tracking-wide text-zinc-400 transition-colors group-hover/trail:text-zinc-200 sm:text-sm"
                      : "text-transparent text-xs"
                }`}
                aria-hidden
              >
                {showStrongTitle || showWhisperTitle
                  ? star.anchorLabel
                  : "\u00a0"}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
