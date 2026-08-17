import { z } from "zod";

import type { Locale } from "@/i18n.config";

/**
 * Types calqués sur `partner_commission_balances` / `partner_commission_ledger` (P6/P6.1).
 * Montants toujours en centimes entiers — jamais recalculer 30 % du brut côté UI.
 */

export const COMMISSION_LEDGER_STATUSES = [
  "pending",
  "confirmed",
  "reversed",
] as const;

export type CommissionLedgerStatus = (typeof COMMISSION_LEDGER_STATUSES)[number];

export const COMMISSION_LEDGER_REASONS = [
  "commission_accrual",
  "commission_clawback",
  "guest_commission_accrual",
  "guest_commission_clawback",
  "payout",
  "adjustment",
] as const;

export type CommissionLedgerReason = (typeof COMMISSION_LEDGER_REASONS)[number];

export function isCommissionLedgerReason(
  value: string,
): value is CommissionLedgerReason {
  return (COMMISSION_LEDGER_REASONS as readonly string[]).includes(value);
}

export function isCommissionLedgerStatus(
  value: string,
): value is CommissionLedgerStatus {
  return (COMMISSION_LEDGER_STATUSES as readonly string[]).includes(value);
}

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
  delta_cents: number;
};

export type PartnerCommissionDashboard = {
  balance: PartnerCommissionBalance;
  ledger: PartnerCommissionLedgerRow[];
};

export const PartnerCommissionQuerySchema = z.object({
  tenantId: z.string().uuid(),
});

export const PartnerCommissionDashboardResponseSchema = z
  .object({
    tenantId: z.string().uuid(),
    isFreemium: z.boolean(),
    balance: z.object({
      accrued_cents: z.number().int().nonnegative(),
      pending_cents: z.number().int().nonnegative(),
      paid_cents: z.number().int().nonnegative(),
    }),
    ledger: z.array(
      z.object({
        id: z.string().uuid(),
        created_at: z.string(),
        project_label: z.string(),
        reason: z.enum(COMMISSION_LEDGER_REASONS),
        gross_payment_cents: z.number().int().nullable(),
        net_distributable_cents: z.number().int().nullable(),
        commission_cents: z.number().int(),
        commission_rate_bps: z.number().int().nullable(),
        status: z.enum(COMMISSION_LEDGER_STATUSES),
        delta_cents: z.number().int(),
      }),
    ),
  })
  .strict();

export type PartnerCommissionDashboardResponse = z.infer<
  typeof PartnerCommissionDashboardResponseSchema
>;

export const EMPTY_COMMISSION_BALANCE: PartnerCommissionBalance = {
  accrued_cents: 0,
  pending_cents: 0,
  paid_cents: 0,
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
