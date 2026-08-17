import {
  EMPTY_COMMISSION_PILOTAGE,
  type PartnerCommissionDashboard,
} from "@/src/lib/partner/partnerCommissionTypes";

/**
 * Snapshot démo — chiffres canon PARTNER_REVSHARE (waterfall Bulletproof).
 * Fixture tests uniquement. L’UI Salon lit GET /api/partner/commissions.
 */
export const MOCK_COMMISSION_DASHBOARD: PartnerCommissionDashboard = {
  balance: {
    accrued_cents: 20_412,
    pending_cents: 1_053,
    paid_cents: 10_000,
  },
  pilotage: EMPTY_COMMISSION_PILOTAGE,
  ledger: [
    {
      id: "8f3c1a2e-4b9d-4e71-9c08-1d2a3b4c5d6e",
      created_at: "2026-08-15T14:22:00.000Z",
      project_label: "Hommage Claire Lavoie",
      reason: "commission_accrual",
      gross_payment_cents: 3_900,
      net_distributable_cents: 3_510,
      commission_cents: 1_053,
      commission_rate_bps: 3_000,
      status: "pending",
      delta_cents: 1_053,
    },
    {
      id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
      created_at: "2026-08-12T09:00:00.000Z",
      project_label: "Versement Odyssey — juillet",
      reason: "payout",
      gross_payment_cents: null,
      net_distributable_cents: null,
      commission_cents: 10_000,
      commission_rate_bps: null,
      status: "confirmed",
      delta_cents: -10_000,
    },
    {
      id: "b7e9d041-2c55-4f8a-9e31-0a1b2c3d4e5f",
      created_at: "2026-08-08T16:41:00.000Z",
      project_label: "Hommage Paul Bouchard",
      reason: "commission_accrual",
      gross_payment_cents: 22_800,
      net_distributable_cents: 20_520,
      commission_cents: 6_156,
      commission_rate_bps: 3_000,
      status: "confirmed",
      delta_cents: 6_156,
    },
    {
      id: "c0ffee00-1111-4222-8333-444455556666",
      created_at: "2026-08-03T11:18:00.000Z",
      project_label: "Hommage Marie Gagnon",
      reason: "commission_accrual",
      gross_payment_cents: 34_900,
      net_distributable_cents: 31_410,
      commission_cents: 9_423,
      commission_rate_bps: 3_000,
      status: "confirmed",
      delta_cents: 9_423,
    },
    {
      id: "d1e2f3a4-b5c6-4789-8d0e-f1a2b3c4d5e6",
      created_at: "2026-07-28T19:05:00.000Z",
      project_label: "Hommage Jean Tremblay",
      reason: "commission_accrual",
      gross_payment_cents: 17_900,
      net_distributable_cents: 16_110,
      commission_cents: 4_833,
      commission_rate_bps: 3_000,
      status: "confirmed",
      delta_cents: 4_833,
    },
  ],
};
