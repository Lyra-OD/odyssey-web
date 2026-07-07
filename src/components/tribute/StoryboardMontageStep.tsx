"use client";

import { Clapperboard } from "lucide-react";

/**
 * Étape 5 (Montage) — placeholder "table de montage en construction".
 *
 * Remplace l'ancien SoundSignatureStep (cul-de-sac fonctionnel : ses
 * sélections n'étaient plus lues nulle part depuis le passage au
 * WizardStoryboardState en Étape 4). Cette étape accueillera prochainement
 * le drag & drop des médias dans les chapitres (dnd-kit) en s'appuyant sur
 * `storyboard.chapters` déjà peuplés par l'Étape 4.
 */
export type StoryboardMontageStepCopy = {
  title: string;
  description: string;
  placeholderBadge: string;
  placeholderBody: string;
};

type Props = {
  copy: StoryboardMontageStepCopy;
};

export function StoryboardMontageStep({ copy }: Props) {
  return (
    <div className="space-y-8 pb-10">
      <header className="space-y-3">
        <h2 className="font-[family-name:var(--font-label)] text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {copy.title}
        </h2>
        <p className="max-w-2xl text-sm font-light leading-relaxed text-zinc-400 md:text-base">
          {copy.description}
        </p>
      </header>

      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-teal-400/25 bg-teal-400/[0.06]">
          <Clapperboard
            className="h-6 w-6 text-teal-300"
            strokeWidth={1.4}
            aria-hidden
          />
        </div>
        <p className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
          {copy.placeholderBadge}
        </p>
        <p className="max-w-md text-sm font-light leading-relaxed text-zinc-400">
          {copy.placeholderBody}
        </p>
      </div>
    </div>
  );
}
