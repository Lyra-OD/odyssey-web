"use client";

export type WizardPhaseDefinition = {
  id: number;
  label: string;
  /** Premier numéro d'étape (1-based) appartenant à cette phase. */
  firstStep: number;
  /** Dernier numéro d'étape (1-based) appartenant à cette phase. */
  lastStep: number;
};

export type WizardPhaseProgressCopy = {
  ariaLabel: string;
  /** Annonce complète pour lecteurs d'écran — doit contenir `{current}` et `{total}`. */
  stepAnnouncement: string;
  /** Libellé visible discret — doit contenir `{current}` et `{label}` (volontairement sans "sur {total}", pour ne pas rappeler un formulaire administratif). */
  stepProgressLabel: string;
};

type Props = {
  phases: readonly WizardPhaseDefinition[];
  currentStep: number;
  totalSteps: number;
  currentStepLabel: string;
  onPhaseClick: (step: number) => void;
  copy: WizardPhaseProgressCopy;
};

function replaceTokens(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce(
    (acc, [key, value]) => acc.replace(`{${key}}`, value),
    template,
  );
}

/**
 * Remplace l'ancien stepper linéaire (8 cercles) — jugé anxiogène ("effet
 * formulaire administratif") — par 3 phases cinématiques (Déposer / Composer
 * / Recevoir) associées à un fin liseré de progression. Le numéro d'étape
 * précis reste disponible (libellé discret sous la barre, + annonce complète
 * pour lecteurs d'écran), mais n'est plus l'élément visuellement dominant.
 */
export function WizardPhaseProgress({
  phases,
  currentStep,
  totalSteps,
  currentStepLabel,
  onPhaseClick,
  copy,
}: Props) {
  const progressPercent = Math.min(
    100,
    Math.max(0, (currentStep / totalSteps) * 100),
  );

  return (
    <nav className="mb-8 w-full" aria-label={copy.ariaLabel}>
      <p className="sr-only" aria-live="polite">
        {replaceTokens(copy.stepAnnouncement, {
          current: String(currentStep),
          total: String(totalSteps),
        })}
      </p>

      <ol className="flex items-center justify-center gap-2 sm:gap-3">
        {phases.map((phase, index) => {
          const isActive = currentStep >= phase.firstStep && currentStep <= phase.lastStep;
          const isCompleted = currentStep > phase.lastStep;
          const isLast = index === phases.length - 1;

          return (
            <li key={phase.id} className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => onPhaseClick(phase.firstStep)}
                aria-current={isActive ? "step" : undefined}
                className={`rounded-full px-1 py-1 text-[11px] font-light uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 sm:text-xs ${
                  isActive
                    ? "text-teal-200"
                    : isCompleted
                      ? "text-zinc-400 hover:text-zinc-200"
                      : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {phase.label}
              </button>
              {!isLast ? <span className="h-px w-6 bg-white/10 sm:w-10" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-3 h-px w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-teal-400/80 via-teal-300/70 to-cyan-400/50 transition-[width] duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className="mt-2.5 text-center text-[11px] font-light text-zinc-500">
        {replaceTokens(copy.stepProgressLabel, {
          current: String(currentStep),
          label: currentStepLabel,
        })}
      </p>
    </nav>
  );
}
