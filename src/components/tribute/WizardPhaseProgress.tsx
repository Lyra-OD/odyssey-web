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

/** Hauteur de la bande étoiles (px) — laisse respirer le zig. */
const BAND_H = 64;

/**
 * Zig inégal (px) — lecture type :
 *   ·         ★         ·
 * ·     ·           ·       ·
 */
const ZIG_Y = [10, -14, 6, -16, 8, -11, 4] as const;

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
  const size = current ? 19 : 14;
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
        d="M12 2.2 13.15 9.2 20 10.35 13.15 11.5 12 18.5 10.85 11.5 4 10.35 10.85 9.2 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Fil constellation WOW calibré : grille fixe, zig fort, ★ cliquables,
 * ici dominante + halo, traits droits.
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
    <nav className="mb-6 w-full md:mb-10" aria-label={copy.ariaLabel}>
      {hereLabel ? (
        <p className="sr-only" aria-live="polite">
          {replaceTokens(copy.hereAria, { label: hereLabel })}
        </p>
      ) : null}

      <ol className="relative mx-auto flex max-w-2xl items-center justify-center px-1 sm:max-w-3xl">
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
          const showAnchor = isBorn && Boolean(star.anchorLabel?.trim());
          const goLabel = star.anchorLabel?.trim() || star.ariaName;
          const y = zigY(index);

          return (
            <li
              key={star.step}
              className="relative z-[1] flex min-w-0 flex-1 flex-col items-center"
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
                    className={`wizard-trail-hit relative flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/45 ${
                      isCurrent
                        ? "h-11 w-11 text-cyan-100"
                        : "h-10 w-10 text-teal-300/90"
                    }`}
                    initial={
                      reduceMotion ? false : { opacity: 0, scale: 0.2 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.45,
                      ease: [0.16, 1, 0.3, 1],
                      delay: reduceMotion
                        ? 0
                        : Math.max(0, (bornCount - 1) * 0.02),
                    }}
                  >
                    {isCurrent ? (
                      <>
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
                  <span className="h-10 w-10" aria-hidden />
                )}
              </div>

              <span
                className={`mt-0.5 h-4 max-w-[4.75rem] truncate text-center font-light uppercase tracking-[0.16em] sm:max-w-[5.75rem] ${
                  showAnchor
                    ? isCurrent
                      ? "text-[10px] text-teal-100 sm:text-[11px]"
                      : "text-[9px] text-zinc-500 sm:text-[10px]"
                    : "text-transparent text-[9px]"
                }`}
                aria-hidden
              >
                {showAnchor ? star.anchorLabel : "\u00a0"}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
