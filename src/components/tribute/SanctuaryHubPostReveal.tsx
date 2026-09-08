"use client";

import { useEffect, useState } from "react";

import { connexionSubmitButtonClass } from "@/src/components/salon/SalonCyanGlowText";

type SanctuaryHubPostRevealCopy = {
  /** Titre A. */
  circleShare: string;
  /** Sous-ligne B. */
  skyVsVault: string;
  /** Footer C. */
  noRush: string;
  continueCta: string;
  editEssentials: string;
};

type SanctuaryHubPostRevealProps = {
  copy: SanctuaryHubPostRevealCopy;
  /**
   * CTA unique — direct Étape 3 (Coffre). Option B (8 sept 2026) : on ne
   * pousse plus « Inviter » ici. La famille dépose d'abord un souvenir ;
   * l'invitation s'ouvre ensuite d'elle-même (cf. `TributeWizard` — effet
   * sur `projectMediaCount` 0→1, réutilise `handleOpenSanctuaryInvite`).
   */
  onContinue: () => void;
  /** Lien discret — rouvre Essentiels. */
  onEditEssentials: () => void;
};

/** Dwell avant apparition — laisse un battement sur la constellation. */
const DWELL_MS = 400;

/**
 * Carte J3 — post-reveal (hub.postReveal). Pédagogie ciel/coffre, CTA
 * unique vers le Coffre. Option B (8 sept 2026) : plus de bouton Inviter
 * ici — la séquence devient « dépôt d'abord, invitation ensuite ».
 * HTML pur, pas de WebGL — même famille que `SanctuaryHubHero`.
 */
export function SanctuaryHubPostReveal({
  copy,
  onContinue,
  onEditEssentials,
}: SanctuaryHubPostRevealProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = window.setTimeout(() => setVisible(true), DWELL_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-8 z-40 flex justify-center px-4 md:bottom-10"
      aria-hidden={false}
    >
      <div
        className={`parcours-monolith-glass pointer-events-auto w-full max-w-md rounded-2xl px-6 py-5 text-center transition-opacity duration-500 ease-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="text-sm font-light leading-relaxed text-zinc-100 md:text-base">
          {copy.circleShare}
        </p>
        <p className="mt-2 text-xs font-light leading-relaxed text-zinc-400 md:text-sm">
          {copy.skyVsVault}
        </p>
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onContinue}
            className={`${connexionSubmitButtonClass} min-h-[48px] w-full touch-manipulation sm:w-auto sm:px-8`}
          >
            {copy.continueCta}
          </button>
        </div>
        <p className="mt-4 text-[10px] font-light uppercase tracking-[0.28em] text-teal-400/45">
          {copy.noRush}
        </p>
        <button
          type="button"
          onClick={onEditEssentials}
          className="mt-3 rounded-lg px-2 py-1 text-[11px] font-light tracking-[0.12em] text-white/35 transition-colors hover:text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/35"
        >
          {copy.editEssentials}
        </button>
      </div>
    </div>
  );
}
