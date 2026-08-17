import type { Locale } from "@/i18n.config";
import { formatUsdFromCents } from "@/src/lib/partner/partnerCommissionTypes";
import type {
  PartnerInvitationStatus,
  PartnerMyPerformanceRow,
} from "@/src/lib/partner/partnerPerformance";

type PerformanceInvitationTableProps = {
  lang: Locale;
  rows: PartnerMyPerformanceRow[];
};

function tableCopy(lang: Locale) {
  return lang === "en"
    ? {
        title: "Your invitations",
        date: "Date",
        family: "Family",
        status: "Status",
        attributed: "Attributed",
        empty: "No invitations sent yet.",
        caption:
          "Attributed amounts are salon RevShare on your magic links. Odyssey does not pay the counsellor.",
        pending: "Pending",
        accepted: "Opened",
        expired: "Expired",
        revoked: "Revoked",
      }
    : {
        title: "Vos invitations",
        date: "Date",
        family: "Famille",
        status: "Statut",
        attributed: "Attribué",
        empty: "Aucune invitation envoyée pour le moment.",
        caption:
          "Les montants sont la commission salon rattachée à vos liens. Odyssey ne verse pas le conseiller.",
        pending: "En attente",
        accepted: "Ouvert",
        expired: "Expiré",
        revoked: "Révoqué",
      };
}

function formatDate(iso: string, lang: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "en" ? "en-CA" : "fr-CA", {
    dateStyle: "medium",
  }).format(date);
}

function statusLabel(
  status: PartnerInvitationStatus,
  copy: ReturnType<typeof tableCopy>,
): string {
  return copy[status];
}

function statusClass(status: PartnerInvitationStatus): string {
  if (status === "accepted") {
    return "border-[var(--salon-cyan)]/35 text-[var(--salon-cyan)]";
  }
  if (status === "pending") {
    return "border-amber-400/30 text-amber-200/80";
  }
  return "border-white/15 text-zinc-400";
}

export function PerformanceInvitationTable({
  lang,
  rows,
}: PerformanceInvitationTableProps) {
  const copy = tableCopy(lang);

  return (
    <section
      aria-labelledby="performance-invitations-title"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
    >
      <h2
        id="performance-invitations-title"
        className="font-label text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500"
      >
        {copy.title}
      </h2>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm font-light text-zinc-500">{copy.empty}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
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
                  {copy.family}
                </th>
                <th
                  scope="col"
                  className="pb-3 pr-4 font-label text-[9px] font-bold uppercase tracking-[0.32em] text-zinc-500"
                >
                  {copy.status}
                </th>
                <th
                  scope="col"
                  className="pb-3 font-label text-[9px] font-bold uppercase tracking-[0.32em] text-zinc-500"
                >
                  {copy.attributed}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.invitationId} className="border-b border-white/[0.06]">
                  <td className="py-4 pr-4 text-sm font-light tabular-nums text-zinc-400">
                    {formatDate(row.createdAt, lang)}
                  </td>
                  <td className="py-4 pr-4 font-label text-sm font-light tracking-wide text-white/90">
                    {row.familyEmailMasked}
                  </td>
                  <td className="py-4 pr-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 font-label text-[9px] font-bold uppercase tracking-[0.22em] ${statusClass(row.status)}`}
                    >
                      {statusLabel(row.status, copy)}
                    </span>
                  </td>
                  <td className="py-4 font-editorial text-base font-medium tabular-nums text-white/95">
                    {formatUsdFromCents(row.attributedCents, lang)}
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
