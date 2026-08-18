import type { Locale } from "@/i18n.config";
import { formatUsdFromCents } from "@/src/lib/partner/partnerCommissionTypes";
import type { HqDirectorRow } from "@/src/lib/hq/hqDirectors";

export type HqDirectorsTableLabels = {
  title: string;
  caption: string;
  empty: string;
  director: string;
  invitations: string;
  engagement: string;
  conversion: string;
  attributed: string;
  rolePartner: string;
  roleAdmin: string;
  roleUnknown: string;
  roleUnassigned: string;
};

type HqDirectorsTableProps = {
  lang: Locale;
  labels: HqDirectorsTableLabels;
  rows: HqDirectorRow[];
};

function formatPercent(value: number): string {
  return `${value} %`;
}

function roleLabel(
  role: HqDirectorRow["role"],
  labels: HqDirectorsTableLabels,
): string {
  if (role === "partner_admin") return labels.roleAdmin;
  if (role === "partner") return labels.rolePartner;
  if (role === "unassigned") return labels.roleUnassigned;
  return labels.roleUnknown;
}

export function HqDirectorsTable({
  lang,
  labels,
  rows,
}: HqDirectorsTableProps) {
  return (
    <section
      aria-labelledby="hq-directors-title"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
    >
      <h2
        id="hq-directors-title"
        className="font-label text-[9px] font-bold uppercase tracking-[0.45em] text-zinc-500"
      >
        {labels.title}
      </h2>
      <p className="mt-3 max-w-2xl text-xs font-light leading-relaxed text-zinc-500">
        {labels.caption}
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm font-light text-zinc-500">{labels.empty}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">{labels.title}</caption>
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-3 pr-4 font-label text-[8px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                  {labels.director}
                </th>
                <th className="pb-3 pr-4 font-label text-[8px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                  {labels.invitations}
                </th>
                <th className="pb-3 pr-4 font-label text-[8px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                  {labels.engagement}
                </th>
                <th className="pb-3 pr-4 font-label text-[8px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                  {labels.conversion}
                </th>
                <th className="pb-3 font-label text-[8px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                  {labels.attributed}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.userId ?? "unassigned"}
                  className="border-b border-white/[0.06] last:border-b-0"
                >
                  <td className="py-4 pr-4">
                    <p className="font-light text-white">{row.label}</p>
                    <p className="mt-1 font-label text-[8px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
                      {roleLabel(row.role, labels)}
                    </p>
                  </td>
                  <td className="py-4 pr-4 tabular-nums text-zinc-300">
                    {row.invitationsSent}
                  </td>
                  <td className="py-4 pr-4 tabular-nums text-zinc-300">
                    {formatPercent(row.engagementRatePercent)}
                  </td>
                  <td className="py-4 pr-4 tabular-nums text-zinc-300">
                    {formatPercent(row.conversionRatePercent)}
                  </td>
                  <td className="py-4 font-editorial tabular-nums text-[var(--salon-cyan)]">
                    {formatUsdFromCents(row.attributedCents, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
