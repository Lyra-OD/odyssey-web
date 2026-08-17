"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";
import {
  EMPTY_COMMISSION_BALANCE,
  PartnerCommissionDashboardResponseSchema,
  type PartnerCommissionDashboard,
} from "@/src/lib/partner/partnerCommissionTypes";
import { usePartner } from "@/src/lib/partner/PartnerContext";

import { CommissionKpiCards } from "./CommissionKpiCards";
import { CommissionLedgerTable } from "./CommissionLedgerTable";

type PartnerCommissionsViewProps = {
  lang: Locale;
};

function commissionsCopy(lang: Locale) {
  return lang === "en"
    ? {
        back: "Back to partner space",
        title: "Commissions",
        subtitle:
          "Passive revenue from family upsells — 30% RevShare on Net Distributable.",
        loading: "Loading…",
        redirecting: "Redirecting…",
        loadError: "Unable to load commissions right now.",
      }
    : {
        back: "Retour à l'espace partenaire",
        title: "Commissions",
        subtitle:
          "Revenus passifs générés par les upsells famille — RevShare 30 % du Net Distribuable.",
        loading: "Chargement…",
        redirecting: "Redirection…",
        loadError: "Impossible de charger les commissions pour le moment.",
      };
}

export function PartnerCommissionsView({ lang }: PartnerCommissionsViewProps) {
  const router = useRouter();
  const copy = commissionsCopy(lang);
  const { capabilities, activeTenantId, isLoading } = usePartner();
  const canViewLedger = capabilities?.canViewLedger === true;

  const [dashboard, setDashboard] = useState<PartnerCommissionDashboard | null>(
    null,
  );
  const [isFetching, setIsFetching] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!canViewLedger) {
      router.replace(appRoutes.salon(lang));
    }
  }, [canViewLedger, isLoading, lang, router]);

  useEffect(() => {
    if (isLoading || !canViewLedger || !activeTenantId) {
      setDashboard(null);
      setLoadError(false);
      setIsFetching(false);
      return;
    }

    let cancelled = false;
    setIsFetching(true);
    setLoadError(false);

    void (async () => {
      try {
        const response = await fetch(
          `/api/partner/commissions?tenantId=${encodeURIComponent(activeTenantId)}&lang=${lang}`,
          { method: "GET", credentials: "same-origin" },
        );
        const payload: unknown = await response.json().catch(() => null);
        if (cancelled) return;

        if (!response.ok) {
          setDashboard(null);
          setLoadError(true);
          return;
        }

        const parsed =
          PartnerCommissionDashboardResponseSchema.safeParse(payload);
        if (!parsed.success) {
          setDashboard(null);
          setLoadError(true);
          return;
        }

        setDashboard({
          balance: parsed.data.balance,
          ledger: parsed.data.ledger,
        });
        setLoadError(false);
      } catch {
        if (!cancelled) {
          setDashboard(null);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTenantId, canViewLedger, isLoading, lang]);

  if (isLoading || !canViewLedger) {
    return (
      <p className="text-sm font-light text-zinc-500">
        {isLoading ? copy.loading : copy.redirecting}
      </p>
    );
  }

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

      {isFetching && !dashboard ? (
        <p className="text-sm font-light text-zinc-500">{copy.loading}</p>
      ) : loadError ? (
        <p className="text-sm font-light text-zinc-500">{copy.loadError}</p>
      ) : (
        <>
          <CommissionKpiCards
            lang={lang}
            balance={dashboard?.balance ?? EMPTY_COMMISSION_BALANCE}
          />
          <CommissionLedgerTable
            lang={lang}
            rows={dashboard?.ledger ?? []}
          />
        </>
      )}
    </div>
  );
}
