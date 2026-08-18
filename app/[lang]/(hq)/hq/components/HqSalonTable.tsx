"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";
import {
  filterHqTenantsByVertical,
  presentHqVerticalTabs,
  HqTenantsListResponseSchema,
  type HqTenantListRow,
} from "@/src/lib/hq/hqTenantsList";
import type { HqVerticalTabId } from "@/src/lib/hq/hqNetworkOverview";
import { formatUsdFromCents } from "@/src/lib/partner/partnerCommissionTypes";

export type HqSalonTableLabels = {
  title: string;
  loading: string;
  error: string;
  empty: string;
  emptyTab: string;
  name: string;
  invitations: string;
  conversion: string;
  payable: string;
  actions: string;
  markPaid: string;
  markPaidConfirm: string;
  markPaidLoading: string;
  noPayable: string;
  tabAll: string;
  tabHuman: string;
  tabPet: string;
  tabWedding: string;
  tabEvent: string;
  tabOther: string;
};

type HqSalonTableProps = {
  lang: Locale;
  labels: HqSalonTableLabels;
  initialRows: HqTenantListRow[];
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

function tabLabel(
  tab: HqVerticalTabId,
  labels: HqSalonTableLabels,
): string {
  if (tab === "all") return labels.tabAll;
  if (tab === "human") return labels.tabHuman;
  if (tab === "pet") return labels.tabPet;
  if (tab === "wedding") return labels.tabWedding;
  if (tab === "event") return labels.tabEvent;
  return labels.tabOther;
}

export function HqSalonTable({
  lang,
  labels,
  initialRows,
}: HqSalonTableProps) {
  const [tenants, setTenants] = useState<HqTenantListRow[]>(initialRows);
  const [payingTenantId, setPayingTenantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HqVerticalTabId>("all");

  useEffect(() => {
    setTenants(initialRows);
  }, [initialRows]);

  useEffect(() => {
    const nextTabs = presentHqVerticalTabs(tenants);
    if (!nextTabs.includes(activeTab)) {
      setActiveTab("all");
    }
  }, [tenants, activeTab]);

  const tabs = presentHqVerticalTabs(tenants);
  const visible = filterHqTenantsByVertical(tenants, activeTab);
  const showTabs = tabs.length > 2;

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
      const payoutResponse = await fetch(`/api/hq/tenants/${row.id}/payout`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!payoutResponse.ok) {
        throw new Error("hq_payout_failed");
      }

      const listResponse = await fetch("/api/hq/tenants", {
        credentials: "same-origin",
      });
      if (!listResponse.ok) {
        throw new Error("hq_tenants_failed");
      }
      const json: unknown = await listResponse.json();
      setTenants(
        HqTenantsListResponseSchema.parse(json).tenants.map((row) => ({
          ...row,
          slug: row.slug ?? null,
          vertical: row.vertical ?? "other",
        })),
      );
    } catch {
      window.alert(labels.error);
    } finally {
      setPayingTenantId(null);
    }
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

      {showTabs ? (
        <div
          role="tablist"
          aria-label={labels.title}
          className="mt-6 flex flex-wrap gap-2"
        >
          {tabs.map((tab) => {
            const selected = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab)}
                className={
                  selected
                    ? "rounded-lg border border-[var(--salon-cyan)]/50 bg-white/[0.06] px-4 py-2 font-label text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--salon-cyan)]"
                    : "rounded-lg border border-white/10 bg-transparent px-4 py-2 font-label text-[9px] font-bold uppercase tracking-[0.28em] text-zinc-500 transition-colors hover:text-zinc-300"
                }
              >
                {tabLabel(tab, labels)}
              </button>
            );
          })}
        </div>
      ) : null}

      {tenants.length === 0 ? (
        <p className="mt-6 text-sm font-light text-zinc-500">{labels.empty}</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 text-sm font-light text-zinc-500">{labels.emptyTab}</p>
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
              {visible.map((row) => {
                const isPaying = payingTenantId === row.id;
                const canPay = row.payable_cents > 0;

                return (
                  <tr
                    key={row.id}
                    className="border-b border-white/[0.06] last:border-b-0"
                  >
                    <td className="py-4 pr-4 font-light text-white">
                      <Link
                        href={appRoutes.hqSalon(lang, row.id)}
                        className="transition-colors hover:text-[var(--salon-cyan)]"
                      >
                        {row.name}
                      </Link>
                    </td>
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
