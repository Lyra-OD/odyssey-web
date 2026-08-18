import type { Locale } from "@/i18n.config";
import {
  formatUsdFromCents,
  payableCents,
  type PartnerCommissionBalance,
  type PartnerCommissionPilotage,
} from "@/src/lib/partner/partnerCommissionTypes";

type CommissionKpiCardsProps = {
  lang: Locale;
  balance: PartnerCommissionBalance;
  pilotage: PartnerCommissionPilotage;
  payout?: {
    label: string;
    loadingLabel: string;
    loading: boolean;
    disabled: boolean;
    onClick: () => void;
  };
};

function kpiCopy(lang: Locale) {
  return lang === "en"
    ? {
        accrued: "Commissions generated",
        accruedHint: "Accrued",
        pending: "Pending balance",
        pendingHint: "Pending",
        paid: "Already paid out",
        paidHint: "Paid",
        payoutCta: "Request a payout",
        payoutTitle: "Monthly payout handled by Odyssey",
        payable: "Payable",
        gross: "Family gross volume",
        grossHint: "Soft Cap GMV — not the salon commission",
        opening: "Sanctuaries opened",
        openingHint: "Accepted invitations / sent",
        conversion: "Upsell conversion",
        conversionHint: "Families who paid / invitations sent",
      }
    : {
        accrued: "Commissions générées",
        accruedHint: "Accrued",
        pending: "Solde en attente",
        pendingHint: "Pending",
        paid: "Déjà versé",
        paidHint: "Paid",
        payoutCta: "Demander un versement",
        payoutTitle: "Versement mensuel géré par Odyssey",
        payable: "Payable",
        gross: "Volume brut familles",
        grossHint: "GMV Soft Cap — ce n’est pas la commission",
        opening: "Sanctuaires ouverts",
        openingHint: "Invitations acceptées / envoyées",
        conversion: "Conversion upsell",
        conversionHint: "Familles ayant payé / invitations envoyées",
      };
}

function formatPercent(value: number): string {
  return `${value} %`;
}

export function CommissionKpiCards({
  lang,
  balance,
  pilotage,
  payout,
}: CommissionKpiCardsProps) {
  const copy = kpiCopy(lang);
  const cards = [
    {
      key: "accrued",
      label: copy.accrued,
      hint: copy.accruedHint,
      cents: balance.accrued_cents,
    },
    {
      key: "pending",
      label: copy.pending,
      hint: copy.pendingHint,
      cents: balance.pending_cents,
    },
    {
      key: "paid",
      label: copy.paid,
      hint: copy.paidHint,
      cents: balance.paid_cents,
    },
  ] as const;

  const pilotageCards = [
    {
      key: "gross",
      label: copy.gross,
      hint: copy.grossHint,
      value: formatUsdFromCents(pilotage.grossVolumeCents, lang),
    },
    {
      key: "opening",
      label: copy.opening,
      hint: copy.openingHint,
      value: formatPercent(pilotage.openingRatePercent),
    },
    {
      key: "conversion",
      label: copy.conversion,
      hint: copy.conversionHint,
      value: formatPercent(pilotage.conversionRatePercent),
    },
  ] as const;

  return (
    <section
      aria-label={lang === "en" ? "Commission totals" : "Totaux des commissions"}
      className="flex flex-col gap-6"
    >
      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.key}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
          >
            <p className="font-label text-[9px] font-bold uppercase tracking-[0.45em] text-zinc-500">
              {card.label}
            </p>
            <p className="mt-1 font-label text-[8px] font-semibold uppercase tracking-[0.28em] text-zinc-600">
              {card.hint}
            </p>
            <p className="mt-3 font-editorial text-4xl font-medium tabular-nums tracking-tight text-[var(--salon-cyan)] md:text-5xl">
              {formatUsdFromCents(card.cents, lang)}
            </p>
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-light tabular-nums text-zinc-500">
          {copy.payable} : {formatUsdFromCents(payableCents(balance), lang)}
        </p>
        {payout ? (
          <button
            type="button"
            disabled={payout.disabled || payout.loading}
            onClick={payout.onClick}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[var(--salon-cyan)]/40 bg-white/[0.04] px-6 font-label text-[11px] font-bold uppercase tracking-[0.32em] text-[var(--salon-cyan)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-zinc-500 disabled:opacity-45"
          >
            {payout.loading ? payout.loadingLabel : payout.label}
          </button>
        ) : (
          <button
            type="button"
            disabled
            title={copy.payoutTitle}
            aria-label={`${copy.payoutCta}. ${copy.payoutTitle}`}
            className="inline-flex min-h-[48px] cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-6 font-label text-[11px] font-bold uppercase tracking-[0.32em] text-zinc-500 opacity-60"
          >
            {copy.payoutCta}
          </button>
        )}
      </div>

      <div
        aria-label={lang === "en" ? "Salon steering" : "Pilotage salon"}
        className="grid gap-6 md:grid-cols-3"
      >
        {pilotageCards.map((card) => (
          <article
            key={card.key}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
          >
            <p className="font-label text-[9px] font-bold uppercase tracking-[0.45em] text-zinc-500">
              {card.label}
            </p>
            <p className="mt-1 font-label text-[8px] font-semibold uppercase tracking-[0.28em] text-zinc-600">
              {card.hint}
            </p>
            <p className="mt-3 font-editorial text-4xl font-medium tabular-nums tracking-tight text-[var(--salon-cyan)] md:text-5xl">
              {card.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
