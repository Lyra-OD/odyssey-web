import type { Locale } from "@/i18n.config";
import { formatUsdFromCents } from "@/src/lib/partner/partnerCommissionTypes";
import type { PartnerMyPerformanceKpis } from "@/src/lib/partner/partnerPerformance";

type PerformanceKpiCardsProps = {
  lang: Locale;
  kpis: PartnerMyPerformanceKpis;
};

function kpiCopy(lang: Locale) {
  return lang === "en"
    ? {
        sent: "Invitations sent",
        accepted: "Sanctuary opened",
        upsells: "Family upsells",
        attributed: "Attributed commission",
        attributedHint: "Salon commission on your links — not an Odyssey payout.",
      }
    : {
        sent: "Invitations envoyées",
        accepted: "Sanctuaire ouvert",
        upsells: "Upsells famille",
        attributed: "Commission attribuée",
        attributedHint:
          "Commission salon sur vos liens — pas un versement Odyssey.",
      };
}

export function PerformanceKpiCards({ lang, kpis }: PerformanceKpiCardsProps) {
  const copy = kpiCopy(lang);
  const cards = [
    {
      key: "sent",
      label: copy.sent,
      value: String(kpis.invitationsSent),
    },
    {
      key: "accepted",
      label: copy.accepted,
      value: String(kpis.invitationsAccepted),
    },
    {
      key: "upsells",
      label: copy.upsells,
      value: String(kpis.upsells),
    },
    {
      key: "attributed",
      label: copy.attributed,
      value: formatUsdFromCents(kpis.attributedCents, lang),
      hint: copy.attributedHint,
    },
  ] as const;

  return (
    <section
      aria-label={
        lang === "en" ? "Your performance totals" : "Vos totaux de performance"
      }
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
    >
      {cards.map((card) => (
        <article
          key={card.key}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
        >
          <p className="font-label text-[9px] font-bold uppercase tracking-[0.45em] text-zinc-500">
            {card.label}
          </p>
          <p className="mt-3 font-editorial text-4xl font-medium tabular-nums tracking-tight text-white/95 md:text-5xl">
            {card.value}
          </p>
          {"hint" in card && card.hint ? (
            <p className="mt-3 text-xs font-light leading-relaxed text-zinc-500">
              {card.hint}
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
