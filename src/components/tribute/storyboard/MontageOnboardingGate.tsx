"use client";

import { motion } from "framer-motion";
import { Sparkles, Wand2 } from "lucide-react";

import { EASE_OUT_LUXE } from "@/src/lib/motion/easing";

export type MontageOnboardingGateCopy = {
  title: string;
  description: string;
  magic: string;
  magicHint: string;
  manual: string;
  manualHint: string;
  /** Lien discret — 3ᵉ option, déléguer au Co-Créateur (divulgation progressive). */
  delegate: string;
};

type Props = {
  copy: MontageOnboardingGateCopy;
  onChooseMagic: () => void;
  onChooseManual: () => void;
  /** Ouvre le panneau Co-Créateur existant — pas un 3ᵉ choix à égalité. */
  onChooseDelegate?: () => void;
};

export function MontageOnboardingGate({
  copy,
  onChooseMagic,
  onChooseManual,
  onChooseDelegate,
}: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[#020202]/85 backdrop-blur-md md:items-center md:bg-[#020202] md:px-6 md:backdrop-blur-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT_LUXE }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="montage-onboarding-title"
    >
      {/* Mobile : feuille ancrée en bas (bottom sheet natif). Desktop : dialogue
          centré inchangé. */}
      <div className="max-h-[92vh] w-full max-w-2xl space-y-6 overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#08080a] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 text-center shadow-[0_-24px_60px_rgba(0,0,0,0.55)] md:max-h-none md:space-y-10 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0 md:shadow-none">
        <span
          className="mx-auto block h-1 w-10 rounded-full bg-white/15 md:hidden"
          aria-hidden
        />

        <div className="space-y-3 md:space-y-4">
          <h2
            id="montage-onboarding-title"
            className="font-[family-name:var(--font-label)] text-balance text-2xl font-semibold tracking-tight text-white md:text-4xl"
          >
            {copy.title}
          </h2>
          <p className="mx-auto max-w-lg text-sm font-light leading-relaxed text-zinc-400 md:text-base">
            {copy.description}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          {/* Violet au repos, cyan dès qu'on la vise ou qu'on l'appuie : le cyan
              est la couleur du choix retenu partout ailleurs (`sanctuaryChrome`). */}
          <button
            type="button"
            onClick={onChooseMagic}
            className="group relative overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-b from-violet-400/[0.10] to-transparent px-5 py-5 text-left transition-all duration-300 hover:border-teal-400/40 hover:from-teal-400/[0.10] hover:shadow-[0_0_48px_rgba(45,212,191,0.12)] active:border-teal-400/55 active:from-teal-400/[0.14] active:shadow-[0_0_48px_rgba(45,212,191,0.16)] md:px-6 md:py-8"
          >
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/30 bg-violet-400/10 text-violet-300 transition-colors duration-300 group-hover:border-teal-400/40 group-hover:bg-teal-400/[0.10] group-hover:text-teal-300 group-active:border-teal-400/55 group-active:text-teal-200 md:mb-4">
              <Wand2 className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </span>
            <span className="block font-[family-name:var(--font-label)] text-base font-semibold text-white md:text-lg">
              {copy.magic}
            </span>
            <span className="mt-1.5 block text-[13px] font-light leading-relaxed text-zinc-400 md:mt-2 md:text-sm">
              {copy.magicHint}
            </span>
          </button>

          <button
            type="button"
            onClick={onChooseManual}
            className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-5 text-left transition-all duration-300 hover:border-white/15 hover:bg-white/[0.04] md:px-6 md:py-8"
          >
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 md:mb-4">
              <Sparkles className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </span>
            <span className="block font-[family-name:var(--font-label)] text-base font-semibold text-white md:text-lg">
              {copy.manual}
            </span>
            <span className="mt-1.5 block text-[13px] font-light leading-relaxed text-zinc-500 md:mt-2 md:text-sm">
              {copy.manualHint}
            </span>
          </button>
        </div>

        {onChooseDelegate ? (
          <button
            type="button"
            onClick={onChooseDelegate}
            className="mx-auto block px-2 py-2 text-xs font-light tracking-[0.08em] text-teal-200/55 underline decoration-teal-400/20 underline-offset-4 transition-colors hover:text-teal-100/90 hover:decoration-teal-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/35 md:py-0"
          >
            {copy.delegate}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
