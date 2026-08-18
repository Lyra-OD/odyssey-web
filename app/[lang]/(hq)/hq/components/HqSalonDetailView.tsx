"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CommissionKpiCards } from "@/app/[lang]/(salon)/salon/components/CommissionKpiCards";
import { CommissionLedgerTable } from "@/app/[lang]/(salon)/salon/components/CommissionLedgerTable";
import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";
import {
  HqTenantDetailResponseSchema,
  type HqTenantDetailResponse,
} from "@/src/lib/hq/hqTenantsList";
import { formatUsdFromCents, payableCents } from "@/src/lib/partner/partnerCommissionTypes";

export type HqSalonDetailLabels = {
  back: string;
  subtitle: string;
  notFound: string;
  markPaid: string;
  markPaidConfirm: string;
  markPaidLoading: string;
  payoutError: string;
};

type HqSalonDetailViewProps = {
  lang: Locale;
  labels: HqSalonDetailLabels;
  initial: HqTenantDetailResponse;
};

export function HqSalonDetailView({
  lang,
  labels,
  initial,
}: HqSalonDetailViewProps) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(initial);
  const [paying, setPaying] = useState(false);
  const payable = payableCents(dashboard.balance);

  async function handleMarkPaid() {
    if (payable <= 0 || paying) return;
    const confirmed = window.confirm(
      labels.markPaidConfirm
        .replace("{amount}", formatUsdFromCents(payable, lang))
        .replace("{name}", dashboard.name),
    );
    if (!confirmed) return;

    setPaying(true);
    try {
      const payoutResponse = await fetch(
        `/api/hq/tenants/${dashboard.tenantId}/payout`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      if (!payoutResponse.ok) {
        throw new Error("hq_payout_failed");
      }

      const detailResponse = await fetch(
        `/api/hq/tenants/${dashboard.tenantId}?lang=${lang}`,
        { credentials: "same-origin" },
      );
      if (!detailResponse.ok) {
        throw new Error("hq_detail_failed");
      }
      const json: unknown = await detailResponse.json();
      setDashboard(HqTenantDetailResponseSchema.parse(json));
      router.refresh();
    } catch {
      window.alert(labels.payoutError);
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link
          href={appRoutes.hq(lang)}
          className="font-label text-[10px] font-bold uppercase tracking-[0.38em] text-zinc-500 transition-colors hover:text-[var(--salon-cyan)]"
        >
          ← {labels.back}
        </Link>
        <h1 className="mt-6 font-[family-name:var(--font-label)] text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {dashboard.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-light leading-relaxed text-zinc-400">
          {labels.subtitle}
        </p>
      </div>

      <CommissionKpiCards
        lang={lang}
        balance={dashboard.balance}
        pilotage={dashboard.pilotage}
        payout={{
          label: labels.markPaid,
          loadingLabel: labels.markPaidLoading,
          loading: paying,
          disabled: payable <= 0,
          onClick: () => void handleMarkPaid(),
        }}
      />
      <CommissionLedgerTable lang={lang} rows={dashboard.ledger} />
    </div>
  );
}
