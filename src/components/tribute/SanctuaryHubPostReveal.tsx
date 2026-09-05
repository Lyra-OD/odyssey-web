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
  inviteCta: string;
  continueCta: string;
  editEssentials: string;
};

type SanctuaryHubPostRevealProps = {
  copy: SanctuaryHubPostRevealCopy;
  /** CTA dominant — Étape 2 (Inviter). */
  onInvite: () => void;
  /** CTA soft — bypass direct Étape 3 (Coffre). */
  onContinue: () => void;
  /** Lien discret — rouvre Essentiels. */
  onEditEssentials: () => void;
};

/** Dwell avant apparition — laisse un battement sur la constellation. */
const DWELL_MS = 400;

/**
 * Carte J3 — post-reveal (hub.postReveal). Pédagogie ciel/coffre + poussée
 * Inviter (G2 « Inviter first · Continuer soft · skip toujours possible »).
 * HTML pur, pas de WebGL — même famille que `SanctuaryHubHero`.
 */
export function SanctuaryHubPostReveal({
  copy,
  onInvite,
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
        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onInvite}
            className={`${connexionSubmitButtonClass} min-h-[48px] w-full touch-manipulation sm:w-auto sm:px-8`}
          >
            {copy.inviteCta}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="text-xs font-light tracking-[0.08em] text-zinc-400 underline decoration-white/10 underline-offset-4 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/35"
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
