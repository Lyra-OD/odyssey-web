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

function replaceTokens(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce(
    (acc, [key, value]) => acc.replace(`{${key}}`, value),
    template,
  );
}

function TrailStarGlyph({ current }: { current: boolean }) {
  const size = current ? 34 : 24;
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
 * Fil rangée droite boomer-proof : même hauteur, segments horizontaux
 * demi-gap (longueur correcte), largeur max-w-xl.
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
    <nav
      className="wizard-trail-sky relative mb-7 w-full md:mb-10"
      aria-label={copy.ariaLabel}
    >
      {hereLabel ? (
        <p className="sr-only" aria-live="polite">
          {replaceTokens(copy.hereAria, { label: hereLabel })}
        </p>
      ) : null}

      <ol className="mx-auto flex w-full max-w-md px-3 sm:max-w-lg md:max-w-xl">
        {stars.map((star, index) => {
          const isBorn = star.step <= furthestStep;
          const isCurrent = isBorn && star.step === currentStep;
          const hasAnchor = Boolean(star.anchorLabel?.trim());
          const showStrongTitle = isCurrent && hasAnchor;
          const showWhisperTitle = isBorn && !isCurrent && hasAnchor;
          const goLabel = star.anchorLabel?.trim() || star.ariaName;

          const prevBorn =
            index > 0 && stars[index - 1]!.step <= furthestStep;
          const nextBorn =
            index < stars.length - 1 &&
            stars[index + 1]!.step <= furthestStep;
          const leftOn = isBorn && prevBorn;
          const rightOn = isBorn && nextBorn;
          const leftLive = leftOn && isCurrent;
          const rightLive =
            rightOn && stars[index + 1]!.step === currentStep;

          return (
            <li
              key={star.step}
              className="group/trail flex min-w-0 flex-1 flex-col items-stretch"
            >
              <div className="flex h-14 items-center sm:h-16">
                <span
                  className={`h-px flex-1 ${
                    leftOn
                      ? leftLive
                        ? "wizard-trail-segment wizard-trail-segment-live"
                        : "wizard-trail-segment"
                      : "bg-transparent"
                  }`}
                  aria-hidden
                />

                {isBorn ? (
                  <motion.button
                    type="button"
                    onClick={() => onStepClick(star.step)}
                    title={goLabel}
                    aria-label={replaceTokens(copy.goToStepAria, {
                      label: goLabel,
                    })}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`wizard-trail-hit relative z-[1] flex shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 ${
                      isCurrent ? "h-14 w-14" : "h-12 w-12"
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
                  <span className="h-12 w-12 shrink-0" aria-hidden />
                )}

                <span
                  className={`h-px flex-1 ${
                    rightOn
                      ? rightLive
                        ? "wizard-trail-segment wizard-trail-segment-live"
                        : "wizard-trail-segment"
                      : "bg-transparent"
                  }`}
                  aria-hidden
                />
              </div>

              <span
                className={`mt-1 min-h-[1.25rem] px-0.5 text-center ${
                  showStrongTitle
                    ? "font-[family-name:var(--font-label)] text-sm font-normal tracking-wide text-white sm:text-base"
                    : showWhisperTitle
                      ? "text-[11px] font-light tracking-wide text-zinc-400 sm:text-xs"
                      : "text-transparent text-[11px]"
                }`}
                aria-hidden
              >
                <span className="mx-auto block max-w-full truncate">
                  {showStrongTitle || showWhisperTitle
                    ? star.anchorLabel
                    : "\u00a0"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
