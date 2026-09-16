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

/** Décalages verticaux organiques (px) — zig, pas une barre droite. */
const ZIG_Y = [0, -7, 5, -6, 4, -5, 3] as const;

function zigY(index: number): number {
  return ZIG_Y[index % ZIG_Y.length]!;
}

function replaceTokens(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce(
    (acc, [key, value]) => acc.replace(`{${key}}`, value),
    template,
  );
}

/**
 * Fil constellation WOW (règle C) : uniquement les étoiles déjà nées
 * (`≤ furthestStep`). Zig organique, filaments, halo sur l’ici, naissance
 * à chaque avancée. Pas de points futurs (décourageants).
 */
export function WizardPhaseProgress({
  stars,
  currentStep,
  furthestStep,
  onStepClick,
  copy,
}: Props) {
  const reduceMotion = useReducedMotion();

  const visibleStars = useMemo(
    () => stars.filter((star) => star.step <= furthestStep),
    [stars, furthestStep],
  );

  const currentStar = visibleStars.find((star) => star.step === currentStep);
  const hereLabel =
    currentStar?.anchorLabel?.trim() || currentStar?.ariaName || "";

  return (
    <nav className="mb-5 w-full md:mb-9" aria-label={copy.ariaLabel}>
      {hereLabel ? (
        <p className="sr-only" aria-live="polite">
          {replaceTokens(copy.hereAria, { label: hereLabel })}
        </p>
      ) : null}

      <ol className="mx-auto flex max-w-lg items-center justify-center px-2 sm:max-w-xl">
        {visibleStars.map((star, index) => {
          const isCurrent = star.step === currentStep;
          const showAnchor = Boolean(star.anchorLabel?.trim());
          const goLabel = star.anchorLabel?.trim() || star.ariaName;
          const y = zigY(index);
          const prevY = index > 0 ? zigY(index - 1) : y;

          return (
            <li key={star.step} className="flex min-w-0 flex-1 items-center">
              {index > 0 ? (
                <div
                  className="relative h-10 min-w-[0.75rem] flex-1 sm:min-w-[1.25rem]"
                  aria-hidden
                >
                  <svg
                    className="absolute inset-0 h-full w-full overflow-visible"
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                  >
                    <path
                      className={
                        star.step === currentStep
                          ? "wizard-trail-filament wizard-trail-filament-live"
                          : "wizard-trail-filament"
                      }
                      d={`M 0 ${20 + prevY * 0.85} Q 50 ${
                        20 + ((prevY + y) / 2) * 0.85 - 5
                      } 100 ${20 + y * 0.85}`}
                      fill="none"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
              ) : null}

              <motion.div
                className="relative flex shrink-0 flex-col items-center"
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, scale: 0.15, y }
                }
                animate={{ opacity: 1, scale: 1, y }}
                transition={{
                  duration: 0.48,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <button
                  type="button"
                  onClick={() => onStepClick(star.step)}
                  title={goLabel}
                  aria-label={replaceTokens(copy.goToStepAria, {
                    label: goLabel,
                  })}
                  aria-current={isCurrent ? "step" : undefined}
                  className="relative z-[1] flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/45"
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
                  <span
                    className={
                      isCurrent
                        ? "wizard-trail-core wizard-trail-core-current"
                        : "wizard-trail-core"
                    }
                    aria-hidden
                  />
                </button>

                <span
                  className={`mt-1 max-w-[4.5rem] truncate text-center text-[9px] font-light uppercase tracking-[0.16em] sm:max-w-[5.5rem] sm:text-[10px] ${
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
              </motion.div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
