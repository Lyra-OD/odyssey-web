import type { Locale } from "@/i18n.config";
import type { PartnerMyPerformanceRow } from "@/src/lib/partner/partnerPerformance";

type PerformanceFollowUpListProps = {
  lang: Locale;
  rows: PartnerMyPerformanceRow[];
};

function followUpCopy(lang: Locale) {
  return lang === "en"
    ? {
        title: "Follow up",
        empty: "No pending links older than 3 days.",
        caption:
          "Hand the link back in person. Odyssey does not email the family.",
        date: "Sent",
        family: "Family",
      }
    : {
        title: "À relancer",
        empty: "Aucun lien en attente depuis plus de 3 jours.",
        caption:
          "Remettez le lien en personne. Odyssey n’écrit pas à la famille.",
        date: "Envoyé",
        family: "Famille",
      };
}

function formatDate(iso: string, lang: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "en" ? "en-CA" : "fr-CA", {
    dateStyle: "medium",
  }).format(date);
}

export function PerformanceFollowUpList({
  lang,
  rows,
}: PerformanceFollowUpListProps) {
  const copy = followUpCopy(lang);
  const title =
    rows.length > 0 ? `${copy.title} (${rows.length})` : copy.title;

  return (
    <section
      aria-labelledby="performance-followup-title"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
    >
      <h2
        id="performance-followup-title"
        className="font-label text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500"
      >
        {title}
      </h2>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm font-light text-zinc-500">{copy.empty}</p>
      ) : (
        <ul className="mt-6 divide-y divide-white/[0.06]">
          {rows.map((row) => (
            <li
              key={row.invitationId}
              className="flex flex-wrap items-baseline justify-between gap-3 py-4"
            >
              <p className="font-label text-sm font-light tracking-wide text-white/90">
                {row.familyEmailMasked}
              </p>
              <p className="text-sm font-light tabular-nums text-zinc-500">
                {copy.date} {formatDate(row.createdAt, lang)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 max-w-2xl text-xs font-light leading-relaxed text-zinc-500">
        {copy.caption}
      </p>
    </section>
  );
}
