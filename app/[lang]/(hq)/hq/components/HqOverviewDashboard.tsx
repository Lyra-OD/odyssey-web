"use client";

import { useEffect, useState } from "react";

import type { Locale } from "@/i18n.config";
import {
  HqNetworkOverviewResponseSchema,
  type HqNetworkOverview,
} from "@/src/lib/hq/hqNetworkOverview";
import { formatUsdFromCents } from "@/src/lib/partner/partnerCommissionTypes";

export type HqOverviewLabels = {
  loading: string;
  error: string;
  sectionMacro: string;
  gmv: string;
  gmvHint: string;
  odysseyNet: string;
  odysseyNetHint: string;
  conversion: string;
  conversionHint: string;
};

type HqOverviewDashboardProps = {
  lang: Locale;
  labels: HqOverviewLabels;
};

function formatPercent(value: number): string {
  return `${value} %`;
}

function macroCards(
  overview: HqNetworkOverview,
  lang: Locale,
  labels: HqOverviewLabels,
) {
  return [
    {
      key: "gmv",
      label: labels.gmv,
      hint: labels.gmvHint,
      value: formatUsdFromCents(overview.gmvTotalCents, lang),
    },
    {
      key: "odyssey-net",
      label: labels.odysseyNet,
      hint: labels.odysseyNetHint,
      value: formatUsdFromCents(overview.odysseyMarginCents, lang),
    },
    {
      key: "conversion",
      label: labels.conversion,
      hint: labels.conversionHint,
      value: formatPercent(overview.pilotage.conversionRatePercent),
    },
  ] as const;
}

export function HqOverviewDashboard({ lang, labels }: HqOverviewDashboardProps) {
  const [overview, setOverview] = useState<HqNetworkOverview | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/hq/overview", {
          credentials: "same-origin",
        });
        if (!response.ok) {
          throw new Error("hq_overview_failed");
        }
        const json: unknown = await response.json();
        const parsed = HqNetworkOverviewResponseSchema.parse(json);
        if (!cancelled) {
          setOverview(parsed);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="mt-8 text-sm font-light text-red-400/90" role="alert">
        {labels.error}
      </p>
    );
  }

  if (!overview) {
    return (
      <p className="mt-8 text-sm font-light text-zinc-500" aria-live="polite">
        {labels.loading}
      </p>
    );
  }

  const cards = macroCards(overview, lang, labels);

  return (
    <section
      aria-label={labels.sectionMacro}
      className="mt-10 grid gap-6 md:grid-cols-3"
    >
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
            {card.value}
          </p>
        </article>
      ))}
    </section>
  );
}
