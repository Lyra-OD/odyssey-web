"use client";

import { useCallback, useEffect, useState } from "react";

import type { Locale } from "@/i18n.config";
import {
  HqTenantsListResponseSchema,
  type HqTenantListRow,
} from "@/src/lib/hq/hqTenantsList";
import { formatUsdFromCents } from "@/src/lib/partner/partnerCommissionTypes";

export type HqSalonTableLabels = {
  title: string;
  loading: string;
  error: string;
  empty: string;
  name: string;
  invitations: string;
  conversion: string;
  payable: string;
  actions: string;
  markPaid: string;
  markPaidConfirm: string;
  markPaidLoading: string;
  noPayable: string;
};

type HqSalonTableProps = {
  lang: Locale;
  labels: HqSalonTableLabels;
};

function formatPercent(value: number): string {
  return `${value} %`;
}

function interpolate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

export function HqSalonTable({ lang, labels }: HqSalonTableProps) {
  const [tenants, setTenants] = useState<HqTenantListRow[] | null>(null);
  const [error, setError] = useState(false);
  const [payingTenantId, setPayingTenantId] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    const response = await fetch("/api/hq/tenants", {
      credentials: "same-origin",
    });
    if (!response.ok) {
      throw new Error("hq_tenants_failed");
    }
    const json: unknown = await response.json();
    return HqTenantsListResponseSchema.parse(json).tenants;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const rows = await loadTenants();
        if (!cancelled) {
          setTenants(rows);
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
  }, [loadTenants]);

  async function handleMarkPaid(row: HqTenantListRow) {
    if (row.payable_cents <= 0 || payingTenantId) return;

    const amountLabel = formatUsdFromCents(row.payable_cents, lang);
    const confirmed = window.confirm(
      interpolate(labels.markPaidConfirm, {
        amount: amountLabel,
        name: row.name,
      }),
    );
    if (!confirmed) return;

    setPayingTenantId(row.id);
    try {
      const response = await fetch(`/api/hq/tenants/${row.id}/payout`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("hq_payout_failed");
      }

      const rows = await loadTenants();
      setTenants(rows);
    } catch {
      window.alert(labels.error);
    } finally {
      setPayingTenantId(null);
    }
  }

  if (error) {
    return (
      <section className="mt-14">
        <p className="text-sm font-light text-red-400/90" role="alert">
          {labels.error}
        </p>
      </section>
    );
  }

  if (!tenants) {
    return (
      <section className="mt-14">
        <p className="text-sm font-light text-zinc-500" aria-live="polite">
          {labels.loading}
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="hq-salons-title"
      className="mt-14 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
    >
      <h2
        id="hq-salons-title"
        className="font-label text-[9px] font-bold uppercase tracking-[0.45em] text-zinc-500"
      >
        {labels.title}
      </h2>

      {tenants.length === 0 ? (
        <p className="mt-6 text-sm font-light text-zinc-500">{labels.empty}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">{labels.title}</caption>
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-3 pr-4 font-label text-[8px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                  {labels.name}
                </th>
                <th className="pb-3 pr-4 font-label text-[8px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                  {labels.invitations}
                </th>
                <th className="pb-3 pr-4 font-label text-[8px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                  {labels.conversion}
                </th>
                <th className="pb-3 pr-4 font-label text-[8px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                  {labels.payable}
                </th>
                <th className="pb-3 font-label text-[8px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                  {labels.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((row) => {
                const isPaying = payingTenantId === row.id;
                const canPay = row.payable_cents > 0;

                return (
                  <tr
                    key={row.id}
                    className="border-b border-white/[0.06] last:border-b-0"
                  >
                    <td className="py-4 pr-4 font-light text-white">{row.name}</td>
                    <td className="py-4 pr-4 tabular-nums text-zinc-300">
                      {row.invitationsSent}
                    </td>
                    <td className="py-4 pr-4 tabular-nums text-zinc-300">
                      {formatPercent(row.conversionRatePercent)}
                    </td>
                    <td className="py-4 pr-4 font-editorial tabular-nums text-[var(--salon-cyan)]">
                      {formatUsdFromCents(row.payable_cents, lang)}
                    </td>
                    <td className="py-4">
                      {canPay ? (
                        <button
                          type="button"
                          disabled={isPaying || payingTenantId !== null}
                          onClick={() => void handleMarkPaid(row)}
                          className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[var(--salon-cyan)]/40 bg-white/[0.04] px-4 font-label text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--salon-cyan)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-45"
                        >
                          {isPaying ? labels.markPaidLoading : labels.markPaid}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-600">
                          {labels.noPayable}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
