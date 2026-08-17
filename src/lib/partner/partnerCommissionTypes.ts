import type { Locale } from "@/i18n.config";

/**
 * Types calqués sur `partner_commission_balances` / `partner_commission_ledger` (P6/P6.1).
 * Montants toujours en centimes entiers — jamais recalculer 30 % du brut côté UI.
 */

export type CommissionLedgerStatus = "pending" | "confirmed" | "reversed";

export type CommissionLedgerReason = "commission_accrual" | "payout";

export type PartnerCommissionBalance = {
  accrued_cents: number;
  pending_cents: number;
  paid_cents: number;
};

export type PartnerCommissionLedgerRow = {
  id: string;
  created_at: string;
  project_label: string;
  reason: CommissionLedgerReason;
  gross_payment_cents: number | null;
  net_distributable_cents: number | null;
  commission_cents: number;
  commission_rate_bps: number | null;
  status: CommissionLedgerStatus;
};

export type PartnerCommissionDashboard = {
  balance: PartnerCommissionBalance;
  ledger: PartnerCommissionLedgerRow[];
};

/** Solde payable affiché en légende, pas en 4ᵉ carte KPI. */
export function payableCents(balance: PartnerCommissionBalance): number {
  return Math.max(0, balance.accrued_cents - balance.paid_cents);
}

export function formatUsdFromCents(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "en" ? "en-CA" : "fr-CA", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
