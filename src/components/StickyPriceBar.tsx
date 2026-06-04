"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

import { packagePartnerTokens } from "@/src/lib/wizard/pricingConfig";
import {
  buildPricingSnapshot,
  computeWizardCart,
  type WizardBasePackage,
  type WizardExtensionsState,
} from "@/src/lib/wizard/wizardPricing";

export type StickyPriceBarCopy = {
  /** B2C — ex. "Total : {amount} $" — `{amount}` = totalCents ÷ 100 */
  consumerTotalLabel: string;
  /** B2B — ex. "Coût : {tokens} jeton(s)" — sans symbole $. */
  partnerTokenCostLabel: string;
};

type Props = {
  copy: StickyPriceBarCopy;
  extensions: WizardExtensionsState;
  basePackage: WizardBasePackage;
  isPartner?: boolean;
};

/** Affichage B2C uniquement : conversion cents → dollars au dernier moment. */
function centsToDisplayAmount(totalCents: number): string {
  const wholeCents = Math.trunc(totalCents);
  const dollars = wholeCents / 100;
  return dollars % 1 === 0
    ? String(Math.trunc(dollars))
    : dollars.toFixed(2);
}

export function StickyPriceBar({
  copy,
  extensions,
  basePackage,
  isPartner = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const cart = useMemo(
    () => computeWizardCart(extensions, basePackage),
    [extensions, basePackage],
  );
  const pricing = useMemo(
    () => buildPricingSnapshot(extensions, basePackage, isPartner),
    [extensions, basePackage, isPartner],
  );

  const tokenCount =
    pricing.partnerTokenCost ?? packagePartnerTokens(basePackage);

  const displayLine = isPartner
    ? copy.partnerTokenCostLabel.replace("{tokens}", String(tokenCount))
    : copy.consumerTotalLabel.replace(
        "{amount}",
        centsToDisplayAmount(cart.totalCents),
      );

  const pulseKeySource = isPartner ? tokenCount : cart.totalCents;

  const prevPulseRef = useRef(pulseKeySource);
  const pulseKeyRef = useRef(0);

  useEffect(() => {
    if (prevPulseRef.current !== pulseKeySource) {
      pulseKeyRef.current += 1;
      prevPulseRef.current = pulseKeySource;
    }
  }, [pulseKeySource]);

  const pulseKey = pulseKeyRef.current;

  return (
    <div
      className="sticky top-0 z-30 -mx-4 mb-6 border-b border-white/[0.08] bg-[#020202]/92 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <motion.p
        key={`${pulseKeySource}-${pulseKey}`}
        initial={reduceMotion ? false : { scale: 1 }}
        animate={
          reduceMotion
            ? undefined
            : {
                scale: [1, 1.02, 1],
                textShadow: [
                  "0 0 0px rgba(167,139,250,0)",
                  "0 0 20px rgba(167,139,250,0.45), 0 0 6px rgba(45,212,191,0.3)",
                  "0 0 0px rgba(167,139,250,0)",
                ],
              }
        }
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="mx-auto max-w-3xl text-center font-[family-name:var(--font-label)] text-sm font-medium tracking-wide text-zinc-200 md:text-base"
      >
        {displayLine}
      </motion.p>
    </div>
  );
}
