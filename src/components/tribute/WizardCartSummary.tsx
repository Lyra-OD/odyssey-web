"use client";

import { motion } from "framer-motion";

import { packagePartnerTokens } from "@/src/lib/wizard/pricingConfig";
import {
  computeWizardCart,
  formatWizardPrice,
  type WizardBasePackage,
  type WizardExtensionsState,
} from "@/src/lib/wizard/wizardPricing";

export type WizardCartSummaryCopy = {
  labelWithOptions: string;
  labelBaseOnly: string;
  totalFormula: string;
};

type Props = {
  copy: WizardCartSummaryCopy;
  locale?: "fr" | "en";
  extensions: WizardExtensionsState;
  basePackage?: WizardBasePackage;
  compact?: boolean;
};

export function WizardCartSummary({
  copy,
  locale = "fr",
  extensions,
  basePackage = "signature",
  compact = false,
}: Props) {
  const cart = computeWizardCart(extensions, basePackage);
  const base = formatWizardPrice(cart.baseCents, locale);
  const options = formatWizardPrice(cart.optionsCents, locale);
  const total = formatWizardPrice(cart.totalCents, locale);

  const headline =
    cart.optionsCents > 0
      ? copy.labelWithOptions.replace("{base}", base).replace("{options}", options)
      : copy.labelBaseOnly.replace("{base}", base);

  return (
    <motion.div
      layout
      className={`rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
      role="status"
      aria-live="polite"
    >
      <p
        className={`font-[family-name:var(--font-label)] ${
          compact ? "text-xs" : "text-sm"
        } font-medium tracking-wide text-zinc-200`}
      >
        {headline}
      </p>
      {cart.optionsCents > 0 ? (
        <p
          className={`mt-1 ${compact ? "text-[11px]" : "text-xs"} font-light text-zinc-500`}
        >
          {copy.totalFormula
            .replace("{base}", base)
            .replace("{options}", options)
            .replace("{total}", total)}
        </p>
      ) : null}
    </motion.div>
  );
}

export type ExtensionsFooterCopy = {
  totalFormula: string;
  partnerTokenCostLabel: string;
  continueCta: string;
  skipStep: string;
};

type ExtensionsFooterProps = {
  copy: ExtensionsFooterCopy;
  locale?: "fr" | "en";
  extensions: WizardExtensionsState;
  basePackage?: WizardBasePackage;
  isPartner?: boolean;
  onSkip: () => void;
  onContinue: () => void;
};

export function ExtensionsStickyFooter({
  copy,
  locale = "fr",
  extensions,
  basePackage = "signature",
  isPartner = false,
  onSkip,
  onContinue,
}: ExtensionsFooterProps) {
  const cart = computeWizardCart(extensions, basePackage);

  const totalLine = isPartner
    ? copy.partnerTokenCostLabel.replace(
        "{tokens}",
        String(packagePartnerTokens(basePackage)),
      )
    : (() => {
        const base = formatWizardPrice(cart.baseCents, locale);
        const options = formatWizardPrice(cart.optionsCents, locale);
        const total = formatWizardPrice(cart.totalCents, locale);
        return copy.totalFormula
          .replace("{base}", base)
          .replace("{options}", options)
          .replace("{total}", total);
      })();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#020202]/95 px-4 py-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-center text-sm font-light text-zinc-300 md:text-base">
          {totalLine}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="font-[family-name:var(--font-label)] min-h-[52px] flex-1 rounded-2xl border border-white/10 bg-transparent px-3 text-sm text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
          >
            {copy.skipStep}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="font-[family-name:var(--font-label)] min-h-[52px] flex-[1.4] rounded-2xl border border-teal-400/35 bg-gradient-to-r from-violet-600/25 to-teal-500/20 px-4 text-sm font-medium text-white shadow-[0_0_32px_rgba(45,212,191,0.2)] transition-all hover:shadow-[0_0_40px_rgba(139,92,246,0.25)]"
          >
            {copy.continueCta}
          </button>
        </div>
      </div>
    </div>
  );
}
