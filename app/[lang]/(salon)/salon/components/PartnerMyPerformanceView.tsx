"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";
import {
  EMPTY_PERFORMANCE_KPIS,
  PartnerMyPerformanceResponseSchema,
  type PartnerMyPerformanceKpis,
  type PartnerMyPerformanceRow,
} from "@/src/lib/partner/partnerPerformance";
import { usePartner } from "@/src/lib/partner/PartnerContext";

import { PerformanceFollowUpList } from "./PerformanceFollowUpList";
import { PerformanceInvitationTable } from "./PerformanceInvitationTable";
import { PerformanceKpiCards } from "./PerformanceKpiCards";

type PartnerMyPerformanceViewProps = {
  lang: Locale;
};

function performanceCopy(lang: Locale) {
  return lang === "en"
    ? {
        back: "Back to invitations",
        title: "My performance",
        subtitle:
          "Your invitations and the family upsells tied to them. This is not the salon balance.",
        loading: "Loading…",
        loadError: "Unable to load your performance right now.",
      }
    : {
        back: "Retour aux invitations",
        title: "Mes performances",
        subtitle:
          "Vos invitations et les upsells famille qui y sont rattachés. Ce n’est pas le solde du salon.",
        loading: "Chargement…",
        loadError: "Impossible de charger vos performances pour le moment.",
      };
}

export function PartnerMyPerformanceView({
  lang,
}: PartnerMyPerformanceViewProps) {
  const copy = performanceCopy(lang);
  const { capabilities, activeTenantId, isLoading } = usePartner();
  const canInvite = capabilities?.canInvite === true;

  const [kpis, setKpis] = useState<PartnerMyPerformanceKpis>(
    EMPTY_PERFORMANCE_KPIS,
  );
  const [rows, setRows] = useState<PartnerMyPerformanceRow[]>([]);
  const [followUp, setFollowUp] = useState<PartnerMyPerformanceRow[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (isLoading || !canInvite || !activeTenantId) {
      setKpis(EMPTY_PERFORMANCE_KPIS);
      setRows([]);
      setFollowUp([]);
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
          `/api/partner/my-performance?tenantId=${encodeURIComponent(activeTenantId)}`,
          { method: "GET", credentials: "same-origin" },
        );
        const payload: unknown = await response.json().catch(() => null);
        if (cancelled) return;

        if (!response.ok) {
          setKpis(EMPTY_PERFORMANCE_KPIS);
          setRows([]);
          setFollowUp([]);
          setLoadError(true);
          return;
        }

        const parsed = PartnerMyPerformanceResponseSchema.safeParse(payload);
        if (!parsed.success) {
          setKpis(EMPTY_PERFORMANCE_KPIS);
          setRows([]);
          setFollowUp([]);
          setLoadError(true);
          return;
        }

        setKpis(parsed.data.kpis);
        setRows(parsed.data.rows);
        setFollowUp(parsed.data.followUp);
        setLoadError(false);
      } catch {
        if (!cancelled) {
          setKpis(EMPTY_PERFORMANCE_KPIS);
          setRows([]);
          setFollowUp([]);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTenantId, canInvite, isLoading]);

  if (isLoading) {
    return (
      <p className="text-sm font-light text-zinc-500">{copy.loading}</p>
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

      {isFetching && rows.length === 0 && !loadError ? (
        <p className="text-sm font-light text-zinc-500">{copy.loading}</p>
      ) : loadError ? (
        <p className="text-sm font-light text-zinc-500">{copy.loadError}</p>
      ) : (
        <>
          <PerformanceKpiCards lang={lang} kpis={kpis} />
          <PerformanceFollowUpList
            lang={lang}
            rows={followUp}
            onSent={(invitationId) => {
              setFollowUp((current) =>
                current.filter((row) => row.invitationId !== invitationId),
              );
              setKpis((current) => ({
                ...current,
                followUpCount: Math.max(0, current.followUpCount - 1),
              }));
            }}
          />
          <PerformanceInvitationTable lang={lang} rows={rows} />
        </>
      )}
    </div>
  );
}
