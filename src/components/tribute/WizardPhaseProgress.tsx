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

/**
 * Zig organique (px) — même lecture que :
 *   ·         ★         ·
 * ·     ·           ·       ·
 */
const ZIG_Y = [6, -8, 4, -7, 5, -6, 3] as const;

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
  return (
    <svg
      className={
        current ? "wizard-trail-star wizard-trail-star-current" : "wizard-trail-star"
      }
      viewBox="0 0 24 24"
      width={current ? 14 : 11}
      height={current ? 14 : 11}
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
 * Fil constellation : grille fixe (espace calme), zig, traits droits,
 * étoiles nées seulement visibles, halo animé sur l’étape courante.
 */
export function WizardPhaseProgress({
  stars,
  currentStep,
  furthestStep,
  onStepClick,
  copy,
}: Props) {
  const reduceMotion = useReducedMotion();

  const currentStar = stars.find((star) => star.step === currentStep);
  const hereLabel =
    currentStar?.anchorLabel?.trim() || currentStar?.ariaName || "";

  const bornCount = useMemo(
    () => stars.filter((star) => star.step <= furthestStep).length,
    [stars, furthestStep],
  );

  return (
    <nav className="mb-5 w-full md:mb-9" aria-label={copy.ariaLabel}>
      {hereLabel ? (
        <p className="sr-only" aria-live="polite">
          {replaceTokens(copy.hereAria, { label: hereLabel })}
        </p>
      ) : null}

      <ol className="relative mx-auto flex max-w-xl items-center justify-center px-1 sm:max-w-2xl">
        {/* Filaments droits entre étoiles nées consécutives (sous les boutons). */}
        <svg
          className="pointer-events-none absolute inset-x-0 top-0 h-10 w-full overflow-visible"
          viewBox={`0 0 ${Math.max(stars.length, 1)} 40`}
          preserveAspectRatio="none"
          aria-hidden
        >
          {stars.map((star, index) => {
            if (index === 0) return null;
            const prev = stars[index - 1]!;
            if (prev.step > furthestStep || star.step > furthestStep) {
              return null;
            }
            const x0 = index - 0.5;
            const x1 = index + 0.5;
            const y0 = 20 + zigY(index - 1);
            const y1 = 20 + zigY(index);
            const live = star.step === currentStep;
            return (
              <line
                key={`seg-${prev.step}-${star.step}`}
                className={
                  live
                    ? "wizard-trail-filament wizard-trail-filament-live"
                    : "wizard-trail-filament"
                }
                x1={x0}
                y1={y0}
                x2={x1}
                y2={y1}
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
                className="flex h-10 w-full items-center justify-center"
                style={{ transform: `translateY(${y}px)` }}
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
                    className="relative flex h-9 w-9 items-center justify-center rounded-full text-teal-300/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/45"
                    initial={
                      reduceMotion
                        ? false
                        : { opacity: 0, scale: 0.2 }
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
                        </span>
                      </>
                    ) : null}
                    <TrailStarGlyph current={isCurrent} />
                  </motion.button>
                ) : (
                  <span className="h-9 w-9" aria-hidden />
                )}
              </div>

              <span
                className={`mt-1 h-4 max-w-[4.5rem] truncate text-center text-[9px] font-light uppercase tracking-[0.16em] sm:max-w-[5.5rem] sm:text-[10px] ${
                  showAnchor
                    ? isCurrent
                      ? "text-teal-200/95"
                      : "text-zinc-500"
                    : "text-transparent"
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
