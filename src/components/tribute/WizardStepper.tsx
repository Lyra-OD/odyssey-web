"use client";

import { Check } from "lucide-react";

export type WizardStepperStep = {
  id: number;
  label: string;
};

export type WizardStepperCopy = {
  ariaLabel: string;
  stepLabel: string;
};

type Props = {
  steps: WizardStepperStep[];
  currentStep: number;
  totalSteps: number;
  onStepClick: (step: number) => void;
  copy: WizardStepperCopy;
};

function replaceStepLabel(template: string, current: number, total: number): string {
  return template
    .replace("{current}", String(current))
    .replace("{total}", String(total));
}

export function WizardStepper({
  steps,
  currentStep,
  totalSteps,
  onStepClick,
  copy,
}: Props) {
  return (
    <nav
      className="mb-10 w-full"
      aria-label={copy.ariaLabel}
    >
      <p className="sr-only">
        {replaceStepLabel(copy.stepLabel, currentStep, totalSteps)}
      </p>

      <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ol className="flex min-w-max items-start md:min-w-0 md:w-full">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const isLast = index === steps.length - 1;

            return (
              <li
                key={step.id}
                className={`flex items-start ${isLast ? "" : "flex-1 md:min-w-0"}`}
              >
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => onStepClick(step.id)}
                    aria-current={isActive ? "step" : undefined}
                    aria-label={`${step.id}. ${step.label}`}
                    className={`group relative flex flex-col items-center gap-2 rounded-lg px-1.5 py-1 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020202] md:px-2 ${
                      isActive ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    <span
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums transition-all duration-300 md:h-9 md:w-9 md:text-xs ${
                        isActive
                          ? "border-teal-400/50 bg-teal-400/10 text-teal-100 shadow-[0_0_24px_rgba(45,212,191,0.25),0_0_12px_rgba(139,92,246,0.15)]"
                          : isCompleted
                            ? "border-white/20 bg-white/[0.06] text-zinc-300 group-hover:border-white/30"
                            : "border-white/10 bg-white/[0.02] text-zinc-500 group-hover:border-white/20 group-hover:text-zinc-400"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                      ) : (
                        step.id
                      )}
                      {isActive ? (
                        <span
                          className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-teal-400/30"
                          aria-hidden
                        />
                      ) : null}
                    </span>

                    <span
                      className={`max-w-[4.5rem] text-center text-[10px] font-light leading-tight tracking-wide transition-colors md:max-w-none md:text-[11px] ${
                        isActive
                          ? "text-zinc-100"
                          : isCompleted
                            ? "text-zinc-400 group-hover:text-zinc-300"
                            : "text-zinc-500 group-hover:text-zinc-400"
                      }`}
                    >
                      <span className="hidden sm:inline">{step.id}. </span>
                      {step.label}
                    </span>
                  </button>
                </div>

                {!isLast ? (
                  <div
                    className="mx-1 mt-4 h-px min-w-[1.25rem] flex-1 self-start md:mx-2 md:mt-[18px]"
                    aria-hidden
                  >
                    <div
                      className={`h-full w-full transition-colors duration-300 ${
                        step.id < currentStep
                          ? "bg-gradient-to-r from-teal-400/35 to-violet-400/20"
                          : "bg-white/[0.08]"
                      }`}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
