"use client";

import { Loader2, Lock } from "lucide-react";

import {
  formatWizardPrice,
  resolvePartnerTokenCost,
  resolveWizardDisplayCart,
  type ExtensionLineKey,
  type WizardBasePackage,
  type WizardExtensionsState,
} from "@/src/lib/wizard/wizardPricing";

export type CheckoutStepCopy = {
  title: string;
  description: string;
  recapTitle: string;
  baseLabel: string;
  recapLineLabels: Record<Exclude<ExtensionLineKey, "base">, string>;
  totalLabel: string;
  secureNote: string;
  payCta: string;
  partnerPayCta: string;
  paying: string;
  payError: string;
  partnerRecapLabel: string;
  stayFreeCta?: string;
  stayFreeHint?: string;
  amputationHint?: string;
};

type Props = {
  copy: CheckoutStepCopy;
  locale?: "fr" | "en";
  extensions: WizardExtensionsState;
  basePackage?: WizardBasePackage;
  grantedPackage?: WizardBasePackage;
  isPartner?: boolean;
  isPaying: boolean;
  payError: string | null;
  showStayFree?: boolean;
  onPay: () => void;
  onStayFree?: () => void;
};

export function CheckoutStep({
  copy,
  locale = "fr",
  extensions,
  basePackage = "signature",
  grantedPackage,
  isPartner = false,
  isPaying,
  payError,
  showStayFree = false,
  onPay,
  onStayFree,
}: Props) {
  const cart = resolveWizardDisplayCart(
    extensions,
    basePackage,
    grantedPackage ?? basePackage,
  );
  const optionLines = cart.lineItems.filter((line) => line.key !== "base");
  const tokenCost = resolvePartnerTokenCost(basePackage);

  if (isPartner) {
    return (
      <div className="space-y-10 pb-44">
        <header className="space-y-3">
          <h2 className="font-[family-name:var(--font-label)] text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {copy.title}
          </h2>
          <p className="max-w-2xl text-sm font-light leading-relaxed text-zinc-400 md:text-base">
            {copy.description}
          </p>
        </header>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <p className="text-sm font-light text-zinc-400">{copy.partnerRecapLabel}</p>
          <p className="mt-4 font-[family-name:var(--font-label)] text-3xl font-semibold text-teal-200/95">
            {tokenCost !== undefined
              ? copy.partnerPayCta.replace("{tokens}", String(tokenCost))
              : copy.payError}
          </p>
        </section>

        {payError ? (
          <p className="text-sm text-rose-400/90" role="alert">
            {payError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onPay}
          disabled={isPaying || tokenCost === undefined}
          className="font-[family-name:var(--font-label)] flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl border border-teal-400/45 bg-gradient-to-r from-violet-600/35 via-teal-500/30 to-teal-400/25 px-6 text-lg font-semibold text-white shadow-[0_0_56px_rgba(139,92,246,0.3),0_0_40px_rgba(45,212,191,0.25)] transition-all duration-300 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPaying ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              {copy.paying}
            </>
          ) : (
            tokenCost !== undefined
              ? copy.partnerPayCta.replace("{tokens}", String(tokenCost))
              : copy.payError
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-44">
      <header className="space-y-3">
        <h2 className="font-[family-name:var(--font-label)] text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {copy.title}
        </h2>
        <p className="max-w-2xl text-sm font-light leading-relaxed text-zinc-400 md:text-base">
          {copy.description}
        </p>
      </header>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          {copy.recapTitle}
        </h3>
        <ul className="mt-5 space-y-3">
          <li className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-3 text-sm">
            <span className="font-light text-zinc-300">{copy.baseLabel}</span>
            <span className="font-medium text-zinc-100">
              {formatWizardPrice(cart.baseCents, locale)}
            </span>
          </li>
          {optionLines.map((line) => (
            <li
              key={line.key}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span className="font-light text-zinc-400">
                {
                  copy.recapLineLabels[
                    line.key as Exclude<ExtensionLineKey, "base">
                  ]
                }
              </span>
              <span className="font-medium text-teal-200/90">
                +{formatWizardPrice(line.cents, locale)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
          <span className="text-sm font-light text-zinc-400">
            {copy.totalLabel}
          </span>
          <span className="font-[family-name:var(--font-label)] text-2xl font-semibold text-white">
            {formatWizardPrice(cart.totalCents, locale)}
          </span>
        </div>
      </section>

      {showStayFree && copy.stayFreeHint ? (
        <div
          className="rounded-xl border border-amber-400/25 bg-amber-950/15 px-4 py-3"
          role="note"
        >
          <p className="text-sm font-light leading-relaxed text-amber-100/85">
            {copy.stayFreeHint}
          </p>
          {copy.amputationHint ? (
            <p className="mt-2 text-xs font-light text-amber-100/55">
              {copy.amputationHint}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="flex items-center gap-2 text-xs font-light text-zinc-500">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {copy.secureNote}
      </p>

      {payError ? (
        <p className="text-sm text-rose-400/90" role="alert">
          {payError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onPay}
        disabled={isPaying}
        className="font-[family-name:var(--font-label)] flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl border border-teal-400/45 bg-gradient-to-r from-violet-600/35 via-teal-500/30 to-teal-400/25 px-6 text-lg font-semibold text-white shadow-[0_0_56px_rgba(139,92,246,0.3),0_0_40px_rgba(45,212,191,0.25)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_64px_rgba(139,92,246,0.4),0_0_48px_rgba(45,212,191,0.32)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      >
        {isPaying ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            {copy.paying}
          </>
        ) : (
          copy.payCta.replace(
            "{total}",
            formatWizardPrice(cart.totalCents, locale),
          )
        )}
      </button>

      {showStayFree && onStayFree && copy.stayFreeCta ? (
        <button
          type="button"
          onClick={onStayFree}
          disabled={isPaying}
          className="w-full rounded-xl px-4 py-3 text-center text-sm text-white/55 transition hover:text-white/85 disabled:opacity-50"
        >
          {copy.stayFreeCta}
        </button>
      ) : null}
    </div>
  );
}
