import { z } from "zod";

import {
  buildSalonPilotage,
  type PartnerCommissionPilotage,
} from "@/src/lib/partner/partnerCommissionTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Ligne ledger `commission_accrual` confirmée — mêmes champs que le pilotage Salon. */
export type HqAccrualRow = {
  gross_payment_cents: number | null;
  net_distributable_cents: number | null;
  commission_cents: number | null;
  platform_fee_cents: number | null;
  invitation_id: string | null;
};

export type HqNetworkOverview = {
  gmvTotalCents: number;
  salonShareCents: number;
  odysseyMarginCents: number;
  platformFeeCents: number;
  pilotage: PartnerCommissionPilotage;
};

export const HqNetworkOverviewResponseSchema = z
  .object({
    gmvTotalCents: z.number().int().nonnegative(),
    salonShareCents: z.number().int().nonnegative(),
    odysseyMarginCents: z.number().int().nonnegative(),
    platformFeeCents: z.number().int().nonnegative(),
    pilotage: z.object({
      grossVolumeCents: z.number().int().nonnegative(),
      invitationsSent: z.number().int().nonnegative(),
      invitationsAccepted: z.number().int().nonnegative(),
      upsells: z.number().int().nonnegative(),
      openingRatePercent: z.number().int().min(0).max(100),
      conversionRatePercent: z.number().int().min(0).max(100),
    }),
  })
  .strict();

export const EMPTY_HQ_NETWORK_OVERVIEW: HqNetworkOverview = {
  gmvTotalCents: 0,
  salonShareCents: 0,
  odysseyMarginCents: 0,
  platformFeeCents: 0,
  pilotage: {
    grossVolumeCents: 0,
    invitationsSent: 0,
    invitationsAccepted: 0,
    upsells: 0,
    openingRatePercent: 0,
    conversionRatePercent: 0,
  },
};

/**
 * Agrège le réseau freemium à partir des mêmes sources que `loadSalonPilotage`.
 * Revenu net Odyssey = SUM(net − commission) sur accruals confirmés — jamais recalculé depuis le GMV.
 */
export function buildHqNetworkOverview(input: {
  accruals: HqAccrualRow[];
  invitationsSent: number;
  invitationsAccepted: number;
}): HqNetworkOverview {
  let gmvTotalCents = 0;
  let salonShareCents = 0;
  let odysseyMarginCents = 0;
  let platformFeeCents = 0;
  const upsellIds = new Set<string>();

  for (const row of input.accruals) {
    const gross = Math.max(0, row.gross_payment_cents ?? 0);
    const net = Math.max(0, row.net_distributable_cents ?? 0);
    const commission = Math.max(0, row.commission_cents ?? 0);
    const fee = Math.max(0, row.platform_fee_cents ?? 0);

    gmvTotalCents += gross;
    salonShareCents += commission;
    odysseyMarginCents += net - commission;
    platformFeeCents += fee;

    if (row.invitation_id) {
      upsellIds.add(row.invitation_id);
    }
  }

  const pilotage = buildSalonPilotage({
    invitationsSent: input.invitationsSent,
    invitationsAccepted: input.invitationsAccepted,
    upsells: upsellIds.size,
    grossVolumeCents: gmvTotalCents,
  });

  return {
    gmvTotalCents,
    salonShareCents,
    odysseyMarginCents,
    platformFeeCents,
    pilotage,
  };
}

export const HQ_KNOWN_VERTICALS = ["human", "pet", "wedding", "event"] as const;

export type HqKnownVertical = (typeof HQ_KNOWN_VERTICALS)[number];
export type HqVerticalKey = HqKnownVertical | "other";
export type HqVerticalTabId = "all" | HqVerticalKey;

export function normalizeHqVertical(
  raw: string | null | undefined,
): HqVerticalKey {
  const key = raw?.trim().toLowerCase();
  if (
    key === "human" ||
    key === "pet" ||
    key === "wedding" ||
    key === "event"
  ) {
    return key;
  }
  return "other";
}

export type HqFreemiumTenant = {
  id: string;
  name: string;
  slug: string | null;
  vertical: HqVerticalKey;
};

/**
 * Tenants freemium via RPC P14.1 / P14.2 (SECURITY DEFINER).
 * Pas de `.from("tenants")` : PostgREST refuse le GRANT table à service_role.
 */
export async function loadHqFreemiumTenants(
  admin: SupabaseClient,
): Promise<HqFreemiumTenant[]> {
  const { data, error } = await admin.rpc("hq_list_freemium_tenants");

  if (error) {
    throw new Error(`hq_tenants: ${error.message}`);
  }

  return ((data ?? []) as Array<{
    id?: string;
    name?: string | null;
    slug?: string | null;
    vertical?: string | null;
  }>)
    .filter((row) => typeof row.id === "string" && row.id.length > 0)
    .map((row) => ({
      id: row.id as string,
      name:
        typeof row.name === "string" && row.name.trim().length > 0
          ? row.name
          : "Salon",
      slug: row.slug ?? null,
      vertical: normalizeHqVertical(row.vertical),
    }));
}

/** Tenants freemium : `is_freemium !== false` (null = freemium). */
export async function loadHqNetworkOverview(
  admin: SupabaseClient,
): Promise<HqNetworkOverview> {
  const tenants = await loadHqFreemiumTenants(admin);

  const tenantIds = tenants.map((row) => row.id);

  if (tenantIds.length === 0) {
    return EMPTY_HQ_NETWORK_OVERVIEW;
  }

  const [sentResult, acceptedResult, accrualResult] = await Promise.all([
    admin
      .from("partner_invitations")
      .select("id", { count: "exact", head: true })
      .in("tenant_id", tenantIds),
    admin
      .from("partner_invitations")
      .select("id", { count: "exact", head: true })
      .in("tenant_id", tenantIds)
      .eq("status", "accepted"),
    admin
      .from("partner_commission_ledger")
      .select(
        "gross_payment_cents, net_distributable_cents, commission_cents, platform_fee_cents, invitation_id",
      )
      .in("tenant_id", tenantIds)
      .eq("reason", "commission_accrual")
      .eq("status", "confirmed"),
  ]);

  if (sentResult.error) {
    throw new Error(`hq_invitations_sent: ${sentResult.error.message}`);
  }
  if (acceptedResult.error) {
    throw new Error(`hq_invitations_accepted: ${acceptedResult.error.message}`);
  }
  if (accrualResult.error) {
    throw new Error(`hq_accruals: ${accrualResult.error.message}`);
  }

  return buildHqNetworkOverview({
    accruals: (accrualResult.data ?? []) as HqAccrualRow[],
    invitationsSent: sentResult.count ?? 0,
    invitationsAccepted: acceptedResult.count ?? 0,
  });
}
