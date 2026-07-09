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
};

type Props = {
  copy: MontageOnboardingGateCopy;
  onChooseMagic: () => void;
  onChooseManual: () => void;
};

export function MontageOnboardingGate({
  copy,
  onChooseMagic,
  onChooseManual,
}: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#020202] px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT_LUXE }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="montage-onboarding-title"
    >
        <div className="w-full max-w-2xl space-y-10 text-center">
        <div className="space-y-4">
          <h2
            id="montage-onboarding-title"
            className="font-[family-name:var(--font-label)] text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl"
          >
            {copy.title}
          </h2>
          <p className="mx-auto max-w-lg text-sm font-light leading-relaxed text-zinc-400 md:text-base">
            {copy.description}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={onChooseMagic}
            className="group relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-400/[0.08] to-transparent px-6 py-8 text-left transition-all duration-300 hover:border-amber-400/35 hover:shadow-[0_0_48px_rgba(251,191,36,0.08)]"
          >
            <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10 text-amber-300">
              <Wand2 className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </span>
            <span className="block font-[family-name:var(--font-label)] text-lg font-semibold text-white">
              {copy.magic}
            </span>
            <span className="mt-2 block text-sm font-light leading-relaxed text-zinc-400">
              {copy.magicHint}
            </span>
          </button>

          <button
            type="button"
            onClick={onChooseManual}
            className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-8 text-left transition-all duration-300 hover:border-white/15 hover:bg-white/[0.04]"
          >
            <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400">
              <Sparkles className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </span>
            <span className="block font-[family-name:var(--font-label)] text-lg font-semibold text-white">
              {copy.manual}
            </span>
            <span className="mt-2 block text-sm font-light leading-relaxed text-zinc-500">
              {copy.manualHint}
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
