"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";
import { usePartner } from "@/src/lib/partner/PartnerContext";

const RECHARGE_URL =
  process.env.NEXT_PUBLIC_PARTNER_TOKEN_RECHARGE_URL?.trim() ?? "";

type PartnerFacturationViewProps = {
  lang: Locale;
};

function facturationCopy(lang: Locale) {
  return lang === "en"
    ? {
        back: "Back to partner space",
        title: "Billing & tokens",
        subtitle:
          "View your token balance and top up your partner wallet for invitations.",
        balanceLabel: "Available tokens",
        creditLimitLabel: "Overdraft limit",
        creditHint:
          "Invitations can temporarily draw below zero up to this limit (P5.5).",
        rechargeTitle: "Top up tokens",
        rechargeBody:
          "Purchase token packs via our secure payment link. Credits are applied to your active workspace after payment confirmation.",
        rechargeCta: "Open payment link",
        rechargePending:
          "Online top-up is being configured. Contact Odyssey support to credit your wallet manually.",
        ledgerTitle: "Transaction history",
        ledgerBody:
          "Ledger entries (invitations, manual credits, checkouts) will appear here in a future release.",
        loading: "Loading…",
        redirecting: "Redirecting…",
      }
    : {
        back: "Retour à l'espace partenaire",
        title: "Facturation & jetons",
        subtitle:
          "Consultez votre solde de jetons et rechargez le portefeuille partenaire pour vos invitations.",
        balanceLabel: "Jetons disponibles",
        creditLimitLabel: "Limite de découvert",
        creditHint:
          "Les invitations peuvent temporairement descendre sous zéro jusqu'à cette limite (P5.5).",
        rechargeTitle: "Recharger des jetons",
        rechargeBody:
          "Achetez des packs de jetons via notre lien de paiement sécurisé. Le crédit est appliqué à l'espace actif après confirmation du paiement.",
        rechargeCta: "Ouvrir le lien de paiement",
        rechargePending:
          "La recharge en ligne est en cours de configuration. Contactez le support Odyssey pour un crédit manuel.",
        ledgerTitle: "Historique des opérations",
        ledgerBody:
          "Les écritures (invitations, crédits manuels, checkouts) apparaîtront ici dans une prochaine version.",
        loading: "Chargement…",
        redirecting: "Redirection…",
      };
}

export function PartnerFacturationView({ lang }: PartnerFacturationViewProps) {
  const router = useRouter();
  const copy = facturationCopy(lang);
  const {
    capabilities,
    isLoading,
    isWalletLoading,
    walletBalance,
    walletCreditLimitTokens,
  } = usePartner();

  const canAccess =
    capabilities?.canRecharge === true || capabilities?.canViewLedger === true;

  useEffect(() => {
    if (isLoading) return;
    if (!canAccess) {
      router.replace(appRoutes.salon(lang));
    }
  }, [canAccess, isLoading, lang, router]);

  if (isLoading || !canAccess) {
    return (
      <p className="text-sm font-light text-zinc-500">
        {isLoading ? copy.loading : copy.redirecting}
      </p>
    );
  }

  const balanceDisplay =
    isWalletLoading || walletBalance === null ? "—" : String(walletBalance);
  const creditDisplay =
    walletCreditLimitTokens === null ? "—" : String(walletCreditLimitTokens);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link
          href={appRoutes.salon(lang)}
          className="font-label text-[10px] font-bold uppercase tracking-[0.38em] text-zinc-500 transition-colors hover:text-violet-300/90"
        >
          ← {copy.back}
        </Link>
        <h1 className="mt-6 font-[family-name:var(--font-label)] text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-light leading-relaxed text-zinc-400">
          {copy.subtitle}
        </p>
      </div>

      <section
        aria-labelledby="facturation-balance"
        className="grid gap-6 md:grid-cols-2"
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <p
            id="facturation-balance"
            className="font-label text-[9px] font-bold uppercase tracking-[0.45em] text-zinc-500"
          >
            {copy.balanceLabel}
          </p>
          <p className="mt-3 font-editorial text-5xl font-medium tabular-nums tracking-tight text-white/95">
            {balanceDisplay}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <p className="font-label text-[9px] font-bold uppercase tracking-[0.45em] text-zinc-500">
            {copy.creditLimitLabel}
          </p>
          <p className="mt-3 font-editorial text-5xl font-medium tabular-nums tracking-tight text-white/80">
            {creditDisplay}
          </p>
          <p className="mt-4 text-xs font-light leading-relaxed text-zinc-500">
            {copy.creditHint}
          </p>
        </div>
      </section>

      {capabilities?.canRecharge ? (
        <section
          aria-labelledby="facturation-recharge"
          className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-600/10 via-transparent to-teal-500/5 p-6 md:p-8"
        >
          <h2
            id="facturation-recharge"
            className="font-[family-name:var(--font-label)] text-lg font-semibold text-white"
          >
            {copy.rechargeTitle}
          </h2>
          <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-zinc-400">
            {copy.rechargeBody}
          </p>
          <div className="mt-6">
            {RECHARGE_URL ? (
              <a
                href={RECHARGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-teal-400/45 bg-gradient-to-r from-violet-600/30 to-teal-500/25 px-6 font-label text-[11px] font-bold uppercase tracking-[0.32em] text-white shadow-[0_0_40px_-12px_rgba(139,92,246,0.45)] transition-transform hover:scale-[1.01]"
              >
                {copy.rechargeCta}
              </a>
            ) : (
              <p className="text-sm font-light leading-relaxed text-zinc-500">
                {copy.rechargePending}
              </p>
            )}
          </div>
        </section>
      ) : null}

      {capabilities?.canViewLedger ? (
        <section
          aria-labelledby="facturation-ledger"
          className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 md:p-8"
        >
          <h2
            id="facturation-ledger"
            className="font-label text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500"
          >
            {copy.ledgerTitle}
          </h2>
          <p className="mt-3 text-sm font-light leading-relaxed text-zinc-500">
            {copy.ledgerBody}
          </p>
        </section>
      ) : null}
    </div>
  );
}
