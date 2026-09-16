"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

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

const ROW_H = 64;

function replaceTokens(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce(
    (acc, [key, value]) => acc.replace(`{${key}}`, value),
    template,
  );
}

/**
 * Fil colonnes — hit unique nœud+titre ; ici plus gros ; passés plus petits.
 */
export function WizardPhaseProgress({
  stars,
  currentStep,
  furthestStep,
  onStepClick,
  copy,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [flashStep, setFlashStep] = useState<number | null>(null);

  useEffect(() => {
    setFlashStep(currentStep);
    if (reduceMotion) return;
    const t = window.setTimeout(() => setFlashStep(null), 420);
    return () => window.clearTimeout(t);
  }, [currentStep, reduceMotion]);

  const currentStar = stars.find((star) => star.step === currentStep);
  const hereLabel =
    currentStar?.anchorLabel?.trim() || currentStar?.ariaName || "";

  const n = Math.max(stars.length, 1);

  const lastBornIndex = useMemo(() => {
    let last = -1;
    stars.forEach((star, index) => {
      if (star.step <= furthestStep) last = index;
    });
    return last;
  }, [stars, furthestStep]);

  const bornCount = lastBornIndex + 1;
  const currentIndex = stars.findIndex((star) => star.step === currentStep);

  const filamentPoints = useMemo(() => {
    if (lastBornIndex < 1) return "";
    const pts: string[] = [];
    for (let i = 0; i <= lastBornIndex; i++) {
      pts.push(`${i + 0.5},0.5`);
    }
    return pts.join(" ");
  }, [lastBornIndex]);

  const bridgePoints = useMemo(() => {
    if (currentIndex < 1) return "";
    if (currentIndex > lastBornIndex) return "";
    return `${currentIndex - 0.5},0.5 ${currentIndex + 0.5},0.5`;
  }, [currentIndex, lastBornIndex]);

  const futureGlowStyle =
    currentIndex >= 0
      ? { left: `${((currentIndex + 0.5) / n) * 100}%` }
      : undefined;

  return (
    <nav
      className="wizard-trail relative mb-7 w-full overflow-visible md:mb-10"
      aria-label={copy.ariaLabel}
    >
      {hereLabel ? (
        <p className="sr-only" aria-live="polite">
          {replaceTokens(copy.hereAria, { label: hereLabel })}
        </p>
      ) : null}

      {futureGlowStyle ? (
        <span
          className="wizard-trail-future-glow"
          style={futureGlowStyle}
          aria-hidden
        />
      ) : null}

      <div className="wizard-trail-band relative z-[1] w-full overflow-visible">
        {/* Filament aligné sur la rangée des nœuds */}
        <div className="wizard-trail-row relative w-full" style={{ height: ROW_H }}>
          {lastBornIndex >= 1 ? (
            <svg
              className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible"
              viewBox={`0 0 ${n} 1`}
              preserveAspectRatio="none"
              aria-hidden
            >
              <polyline
                className="wizard-trail-filament"
                points={filamentPoints}
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
              {bridgePoints ? (
                <polyline
                  className="wizard-trail-bridge"
                  points={bridgePoints}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </svg>
          ) : null}
        </div>

        {/* Une colonne = nœud + titre (hit unique pour hover cohérent) */}
        <ol
          className="relative z-[2] -mt-[64px] flex w-full"
          style={{ minHeight: ROW_H }}
        >
          {stars.map((star, index) => {
            const isBorn = star.step <= furthestStep;
            const isCurrent = isBorn && star.step === currentStep;
            const isFlashing = flashStep === star.step;
            const hasAnchor = Boolean(star.anchorLabel?.trim());
            const showStrongTitle = isCurrent && hasAnchor;
            const showWhisperTitle = isBorn && !isCurrent && hasAnchor;
            const goLabel = star.anchorLabel?.trim() || star.ariaName;
            const heightMod = index % 3;

            const labelClass = showStrongTitle
              ? "wizard-trail-label wizard-trail-label-current"
              : showWhisperTitle
                ? "wizard-trail-label wizard-trail-label-past"
                : "wizard-trail-label wizard-trail-label-empty";

            const node = isBorn ? (
              <span
                className={[
                  "wizard-trail-node",
                  isCurrent
                    ? "wizard-trail-node-current"
                    : "wizard-trail-node-born",
                  !isCurrent && heightMod === 1
                    ? "wizard-trail-node-short"
                    : "",
                  !isCurrent && heightMod === 2
                    ? "wizard-trail-node-tall"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ height: ROW_H }}
                aria-hidden
              >
                {isCurrent ? (
                  <>
                    <span className="wizard-trail-orb" />
                    <span className="wizard-trail-dust">
                      {Array.from({ length: 26 }, (_, i) => (
                        <i key={i} />
                      ))}
                    </span>
                  </>
                ) : null}
                {isFlashing ? (
                  <span className="wizard-trail-select-ring" />
                ) : null}
                <span className="wizard-trail-beam wizard-trail-beam-v" />
                <span className="wizard-trail-beam wizard-trail-beam-h" />
                <span className="wizard-trail-beam wizard-trail-beam-d" />
                <span className="wizard-trail-core" />
              </span>
            ) : (
              <span style={{ height: ROW_H }} className="block w-full" aria-hidden />
            );

            return (
              <li
                key={star.step}
                className="relative flex min-w-0 flex-1 flex-col items-center"
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
                    className="wizard-trail-hit relative flex w-full flex-col items-center focus-visible:outline-none"
                    initial={
                      reduceMotion ? false : { opacity: 0, scale: 0.25 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.45,
                      ease: [0.16, 1, 0.3, 1],
                      delay: reduceMotion
                        ? 0
                        : Math.max(0, (bornCount - 1) * 0.03),
                    }}
                  >
                    {node}
                    <span className={labelClass} aria-hidden>
                      {showStrongTitle || showWhisperTitle
                        ? star.anchorLabel
                        : "\u00a0"}
                    </span>
                  </motion.button>
                ) : (
                  <div className="flex w-full flex-col items-center" aria-hidden>
                    {node}
                    <span className="wizard-trail-label wizard-trail-label-empty">
                      {"\u00a0"}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
