"use client";

import { useId, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { editorialFieldLabel } from "@/src/lib/editorialFormClasses";
import { sanctuaryFieldInput } from "@/src/lib/contribute/sanctuaryChrome";
import {
  DURATION_BREATH,
  EASE_OUT_LUXE,
} from "@/src/lib/motion/easing";
import { formatWizardPrice } from "@/src/lib/wizard/wizardPricing";
import {
  GUEST_PATRON_MIN_CENTS,
  GUEST_TXN_MAX_CENTS,
} from "@/src/lib/wizard/guestSupportPacks";

export type PatronAmountFieldProps = {
  locale: "fr" | "en";
  /** Montant en centimes (contrôlé par le parent). */
  amountCents: number;
  onChange: (amountCents: number) => void;
  amountMinCents?: number | null;
  amountMaxCents?: number | null;
  amountSuggestedCents?: number | null;
  /** Afficher / masquer avec animation (sélection Mécène). */
  open: boolean;
};

const copy = {
  fr: {
    label: "Votre contribution",
    hint: (min: number, max: number, suggested: number) =>
      `Entre ${formatWizardPrice(min, "fr")} et ${formatWizardPrice(max, "fr")} · suggestion ${formatWizardPrice(suggested, "fr")}`,
    invalid: (min: number, max: number) =>
      `Choisissez un montant entre ${formatWizardPrice(min, "fr")} et ${formatWizardPrice(max, "fr")}.`,
    useSuggested: "Utiliser la suggestion",
  },
  en: {
    label: "Your contribution",
    hint: (min: number, max: number, suggested: number) =>
      `Between ${formatWizardPrice(min, "en")} and ${formatWizardPrice(max, "en")} · suggested ${formatWizardPrice(suggested, "en")}`,
    invalid: (min: number, max: number) =>
      `Choose an amount between ${formatWizardPrice(min, "en")} and ${formatWizardPrice(max, "en")}.`,
    useSuggested: "Use suggested amount",
  },
} as const;

function centsToDollarsInput(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return "";
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}

function dollarsInputToCents(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".").replace(/[^\d.]/g, "");
  if (!normalized) return null;
  const dollars = Number.parseFloat(normalized);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

/**
 * Montant libre Mécène — bornes canon guestSupportPacks.
 * Pas de checkout ici (étape 3).
 */
export function PatronAmountField({
  locale,
  amountCents,
  onChange,
  amountMinCents,
  amountMaxCents,
  amountSuggestedCents,
  open,
}: PatronAmountFieldProps) {
  const t = copy[locale];
  const inputId = useId();

  const min = amountMinCents ?? GUEST_PATRON_MIN_CENTS;
  const max = amountMaxCents ?? GUEST_TXN_MAX_CENTS;
  const suggested = amountSuggestedCents ?? 25_000;

  const valid =
    Number.isInteger(amountCents) &&
    amountCents >= min &&
    amountCents <= max;

  const displayValue = useMemo(
    () => centsToDollarsInput(amountCents),
    [amountCents],
  );

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="patron-amount"
          initial={{ opacity: 0, y: 10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: DURATION_BREATH, ease: EASE_OUT_LUXE }}
          className="overflow-hidden"
        >
          <div className="rounded-xl border border-teal-400/25 bg-teal-400/[0.03] px-5 py-6 shadow-[0_0_32px_rgba(45,212,191,0.08)]">
            <label htmlFor={inputId} className={editorialFieldLabel}>
              {t.label}
            </label>
            <div className="relative mt-1">
              <span
                className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 font-editorial text-lg text-teal-500/70"
                aria-hidden
              >
                $
              </span>
              <input
                id={inputId}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={displayValue}
                onChange={(e) => {
                  const cents = dollarsInputToCents(e.target.value);
                  if (cents === null) {
                    onChange(0);
                    return;
                  }
                  onChange(cents);
                }}
                className={`${sanctuaryFieldInput} pl-5`}
                aria-invalid={!valid}
                aria-describedby={`${inputId}-hint`}
              />
            </div>
            <p
              id={`${inputId}-hint`}
              className="mt-3 text-[11px] font-light leading-relaxed text-zinc-500"
            >
              {t.hint(min, max, suggested)}
            </p>
            {!valid && amountCents > 0 ? (
              <p className="mt-2 text-sm font-light text-amber-200/90" role="alert">
                {t.invalid(min, max)}
              </p>
            ) : null}
            {amountCents !== suggested ? (
              <button
                type="button"
                onClick={() => onChange(suggested)}
                className="mt-4 font-label text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition-colors hover:text-teal-300/90"
              >
                {t.useSuggested}
              </button>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** True si le montant Mécène est dans les bornes (prêt pour checkout étape 3). */
export function isPatronAmountValid(
  amountCents: number,
  amountMinCents?: number | null,
  amountMaxCents?: number | null,
): boolean {
  const min = amountMinCents ?? GUEST_PATRON_MIN_CENTS;
  const max = amountMaxCents ?? GUEST_TXN_MAX_CENTS;
  return (
    Number.isInteger(amountCents) &&
    amountCents >= min &&
    amountCents <= max
  );
}
