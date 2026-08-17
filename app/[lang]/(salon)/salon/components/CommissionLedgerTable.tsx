import type { Locale } from "@/i18n.config";
import {
  formatUsdFromCents,
  type PartnerCommissionLedgerRow,
} from "@/src/lib/partner/partnerCommissionTypes";

type CommissionLedgerTableProps = {
  lang: Locale;
  rows: PartnerCommissionLedgerRow[];
};

function ledgerCopy(lang: Locale) {
  return lang === "en"
    ? {
        title: "Ledger",
        date: "Date",
        project: "Tribute / project",
        gross: "Family payment",
        commission: "Salon commission",
        status: "Status",
        confirmed: "Confirmed",
        pending: "Pending",
        reversed: "Reversed",
        payout: "Payout",
        clawback: "Clawback",
        empty: "No commission entries yet.",
        caption:
          "Commission = 30% of Net Distributable (after 10% platform fee). Never 30% of gross.",
      }
    : {
        title: "Registre",
        date: "Date",
        project: "Hommage / projet",
        gross: "Montant payé par la famille",
        commission: "Commission du salon",
        status: "Statut",
        confirmed: "Confirmé",
        pending: "En attente",
        reversed: "Annulé",
        payout: "Versement",
        clawback: "Clawback",
        empty: "Aucune écriture de commission pour le moment.",
        caption:
          "Commission = 30 % du Net Distribuable (après 10 % plateforme). Jamais 30 % du brut.",
      };
}

function formatLedgerDate(iso: string, lang: Locale): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-CA" : "fr-CA", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

function statusLabel(
  row: PartnerCommissionLedgerRow,
  copy: ReturnType<typeof ledgerCopy>,
): string {
  if (row.reason === "payout") return copy.payout;
  if (
    row.reason === "commission_clawback" ||
    row.reason === "guest_commission_clawback"
  ) {
    return copy.clawback;
  }
  if (row.status === "pending") return copy.pending;
  if (row.status === "reversed") return copy.reversed;
  return copy.confirmed;
}

function statusClass(row: PartnerCommissionLedgerRow): string {
  if (row.reason === "payout") {
    return "border-white/15 text-zinc-400";
  }
  if (row.status === "pending") {
    return "border-amber-400/30 text-amber-200/80";
  }
  return "border-[var(--salon-cyan)]/35 text-[var(--salon-cyan)]";
}

export function CommissionLedgerTable({
  lang,
  rows,
}: CommissionLedgerTableProps) {
  const copy = ledgerCopy(lang);

  return (
    <section
      aria-labelledby="commission-ledger-title"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
    >
      <h2
        id="commission-ledger-title"
        className="font-label text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500"
      >
        {copy.title}
      </h2>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm font-light text-zinc-500">{copy.empty}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th
                  scope="col"
                  className="pb-3 pr-4 font-label text-[9px] font-bold uppercase tracking-[0.32em] text-zinc-500"
                >
                  {copy.date}
                </th>
                <th
                  scope="col"
                  className="pb-3 pr-4 font-label text-[9px] font-bold uppercase tracking-[0.32em] text-zinc-500"
                >
                  {copy.project}
                </th>
                <th
                  scope="col"
                  className="pb-3 pr-4 font-label text-[9px] font-bold uppercase tracking-[0.32em] text-zinc-500"
                >
                  {copy.gross}
                </th>
                <th
                  scope="col"
                  className="pb-3 pr-4 font-label text-[9px] font-bold uppercase tracking-[0.32em] text-zinc-500"
                >
                  {copy.commission}
                </th>
                <th
                  scope="col"
                  className="pb-3 font-label text-[9px] font-bold uppercase tracking-[0.32em] text-zinc-500"
                >
                  {copy.status}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.06]">
                  <td className="py-4 pr-4 text-sm font-light tabular-nums text-zinc-400">
                    {formatLedgerDate(row.created_at, lang)}
                  </td>
                  <td className="py-4 pr-4 text-sm font-light text-white/90">
                    {row.project_label}
                  </td>
                  <td className="py-4 pr-4 text-sm font-light tabular-nums text-zinc-300">
                    {row.gross_payment_cents == null
                      ? "—"
                      : formatUsdFromCents(row.gross_payment_cents, lang)}
                  </td>
                  <td className="py-4 pr-4 font-editorial text-base font-medium tabular-nums text-white/95">
                    {row.delta_cents < 0 ? "−" : ""}
                    {formatUsdFromCents(row.commission_cents, lang)}
                  </td>
                  <td className="py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 font-label text-[9px] font-bold uppercase tracking-[0.22em] ${statusClass(row)}`}
                    >
                      {statusLabel(row, copy)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 max-w-2xl text-xs font-light leading-relaxed text-zinc-500">
        {copy.caption}
      </p>
    </section>
  );
}
