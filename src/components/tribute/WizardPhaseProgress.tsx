"use client";

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

/**
 * Fil d’Ariane constellation (règle C) : points = étapes réelles,
 * visités allumés + cliquables, futurs éteints. Titres seulement aux ancres.
 * Remplace l’ancien indicateur 3-phases Déposer / Composer / Recevoir.
 */
export function WizardPhaseProgress({
  stars,
  currentStep,
  furthestStep,
  onStepClick,
  copy,
}: Props) {
  const currentStar = stars.find((star) => star.step === currentStep);
  const hereLabel =
    currentStar?.anchorLabel?.trim() || currentStar?.ariaName || "";

  return (
    <nav className="mb-4 w-full md:mb-8" aria-label={copy.ariaLabel}>
      {hereLabel ? (
        <p className="sr-only" aria-live="polite">
          {replaceTokens(copy.hereAria, { label: hereLabel })}
        </p>
      ) : null}

      <ol className="mx-auto flex max-w-xl items-start justify-center px-1 sm:max-w-2xl">
        {stars.map((star, index) => {
          const isCurrent = star.step === currentStep;
          const isReached = star.step <= furthestStep;
          const isFuture = !isReached;
          const isLast = index === stars.length - 1;
          const showAnchor =
            Boolean(star.anchorLabel?.trim()) && (isReached || isCurrent);
          const goLabel = star.anchorLabel?.trim() || star.ariaName;
          const segmentLit = star.step < furthestStep;

          return (
            <li key={star.step} className="flex min-w-0 flex-1 items-start">
              <div className="flex w-full flex-col items-center">
                <div className="flex h-7 w-full items-center">
                  <span
                    className={`h-px flex-1 ${
                      index === 0
                        ? "bg-transparent"
                        : stars[index - 1]!.step <= furthestStep
                          ? "bg-teal-400/30"
                          : "bg-white/10"
                    }`}
                    aria-hidden
                  />

                  <button
                    type="button"
                    disabled={isFuture}
                    onClick={() => {
                      if (isFuture) return;
                      onStepClick(star.step);
                    }}
                    title={isReached ? goLabel : undefined}
                    aria-label={replaceTokens(copy.goToStepAria, {
                      label: goLabel,
                    })}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 disabled:cursor-default ${
                      isFuture ? "" : "cursor-pointer"
                    }`}
                  >
                    <span
                      className={`block rounded-full transition-[box-shadow,background-color,transform] duration-300 ${
                        isCurrent
                          ? "h-2.5 w-2.5 scale-110 bg-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.65),0_0_4px_rgba(34,211,238,0.45)]"
                          : isReached
                            ? "h-2 w-2 bg-teal-400/75 hover:bg-teal-300"
                            : "h-1.5 w-1.5 bg-white/15"
                      }`}
                      aria-hidden
                    />
                  </button>

                  <span
                    className={`h-px flex-1 ${
                      isLast
                        ? "bg-transparent"
                        : segmentLit
                          ? "bg-teal-400/30"
                          : "bg-white/10"
                    }`}
                    aria-hidden
                  />
                </div>

                <span
                  className={`mt-1.5 h-4 max-w-[4.25rem] truncate text-center text-[9px] font-light uppercase tracking-[0.14em] sm:max-w-[5.25rem] sm:text-[10px] ${
                    showAnchor
                      ? isCurrent
                        ? "text-teal-200/90"
                        : "text-zinc-500"
                      : "text-transparent"
                  }`}
                  aria-hidden
                >
                  {showAnchor ? star.anchorLabel : "\u00a0"}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
