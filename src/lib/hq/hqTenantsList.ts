import { z } from "zod";

import { loadHqFreemiumTenants, type HqFreemiumTenant, type HqVerticalKey, type HqVerticalTabId, HQ_KNOWN_VERTICALS } from "@/src/lib/hq/hqNetworkOverview";
import {
  buildSalonPilotage,
  payableCents,
  type PartnerCommissionBalance,
} from "@/src/lib/partner/partnerCommissionTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

type BalanceRow = {
  tenant_id: string;
  accrued_cents: number;
  paid_cents: number;
};

type InvitationRow = {
  tenant_id: string;
};

type AccrualInvitationRow = {
  tenant_id: string;
  invitation_id: string | null;
};

export type HqTenantListRow = {
  id: string;
  name: string;
  slug: string | null;
  vertical: HqVerticalKey;
  invitationsSent: number;
  conversionRatePercent: number;
  accrued_cents: number;
  paid_cents: number;
  payable_cents: number;
};

export const HqTenantListRowSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string().nullish(),
    vertical: z
      .enum(["human", "pet", "wedding", "event", "other"])
      .optional()
      .default("other"),
    invitationsSent: z.number().int().nonnegative(),
    conversionRatePercent: z.number().int().min(0).max(100),
    accrued_cents: z.number().int().nonnegative(),
    paid_cents: z.number().int().nonnegative(),
    payable_cents: z.number().int().nonnegative(),
  })
  .strict();

export const HqTenantsListResponseSchema = z
  .object({
    tenants: z.array(HqTenantListRowSchema),
  })
  .strict();

export function buildHqTenantListRow(input: {
  tenant: HqFreemiumTenant;
  balance: PartnerCommissionBalance;
  invitationsSent: number;
  upsells: number;
}): HqTenantListRow {
  const pilotage = buildSalonPilotage({
    invitationsSent: input.invitationsSent,
    invitationsAccepted: 0,
    upsells: input.upsells,
    grossVolumeCents: 0,
  });

  return {
    id: input.tenant.id,
    name: input.tenant.name,
    slug: input.tenant.slug ?? null,
    vertical: input.tenant.vertical,
    invitationsSent: pilotage.invitationsSent,
    conversionRatePercent: pilotage.conversionRatePercent,
    accrued_cents: input.balance.accrued_cents,
    paid_cents: input.balance.paid_cents,
    payable_cents: payableCents(input.balance),
  };
}

export function filterHqTenantsByVertical(
  rows: HqTenantListRow[],
  tab: HqVerticalTabId,
): HqTenantListRow[] {
  if (tab === "all") return rows;
  return rows.filter((row) => row.vertical === tab);
}

export function presentHqVerticalTabs(
  rows: HqTenantListRow[],
): HqVerticalTabId[] {
  const present = new Set(rows.map((row) => row.vertical));
  const tabs: HqVerticalTabId[] = ["all"];
  for (const key of HQ_KNOWN_VERTICALS) {
    if (present.has(key)) tabs.push(key);
  }
  if (present.has("other")) tabs.push("other");
  return tabs;
}

function countByTenant<T extends { tenant_id: string }>(
  rows: T[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.tenant_id, (counts.get(row.tenant_id) ?? 0) + 1);
  }
  return counts;
}

function upsellsByTenant(rows: AccrualInvitationRow[]): Map<string, number> {
  const sets = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.invitation_id) continue;
    let set = sets.get(row.tenant_id);
    if (!set) {
      set = new Set<string>();
      sets.set(row.tenant_id, set);
    }
    set.add(row.invitation_id);
  }
  const counts = new Map<string, number>();
  for (const [tenantId, set] of sets) {
    counts.set(tenantId, set.size);
  }
  return counts;
}

/** Liste micro HQ — tenants freemium + pilotage + payable. */
export async function loadHqTenantsList(
  admin: SupabaseClient,
): Promise<HqTenantListRow[]> {
  const tenants = await loadHqFreemiumTenants(admin);
  if (tenants.length === 0) return [];

  const tenantIds = tenants.map((t) => t.id);

  const [balancesResult, invitationsResult, accrualsResult] = await Promise.all([
    admin
      .from("partner_commission_balances")
      .select("tenant_id, accrued_cents, paid_cents")
      .in("tenant_id", tenantIds),
    admin
      .from("partner_invitations")
      .select("tenant_id")
      .in("tenant_id", tenantIds),
    admin
      .from("partner_commission_ledger")
      .select("tenant_id, invitation_id")
      .in("tenant_id", tenantIds)
      .eq("reason", "commission_accrual")
      .eq("status", "confirmed"),
  ]);

  if (balancesResult.error) {
    throw new Error(`hq_balances: ${balancesResult.error.message}`);
  }
  if (invitationsResult.error) {
    throw new Error(`hq_invitations: ${invitationsResult.error.message}`);
  }
  if (accrualsResult.error) {
    throw new Error(`hq_accruals: ${accrualsResult.error.message}`);
  }

  const balanceByTenant = new Map<string, PartnerCommissionBalance>();
  for (const row of (balancesResult.data ?? []) as BalanceRow[]) {
    balanceByTenant.set(row.tenant_id, {
      accrued_cents: Math.max(0, row.accrued_cents ?? 0),
      pending_cents: 0,
      paid_cents: Math.max(0, row.paid_cents ?? 0),
    });
  }

  const sentByTenant = countByTenant(
    (invitationsResult.data ?? []) as InvitationRow[],
  );
  const upsellsByTenantId = upsellsByTenant(
    (accrualsResult.data ?? []) as AccrualInvitationRow[],
  );

  return tenants.map((tenant) => {
    const balance = balanceByTenant.get(tenant.id) ?? {
      accrued_cents: 0,
      pending_cents: 0,
      paid_cents: 0,
    };

    return buildHqTenantListRow({
      tenant,
      balance,
      invitationsSent: sentByTenant.get(tenant.id) ?? 0,
      upsells: upsellsByTenantId.get(tenant.id) ?? 0,
    });
  });
}

export const HqPayoutResultSchema = z
  .object({
    ok: z.literal(true),
    ledger_id: z.string().uuid(),
    amount_cents: z.number().int().positive(),
    paid_cents: z.number().int().nonnegative(),
    accrued_cents: z.number().int().nonnegative(),
  })
  .strict();

export type HqPayoutResult = z.infer<typeof HqPayoutResultSchema>;

export async function recordHqTenantPayout(
  admin: SupabaseClient,
  tenantId: string,
  actorUserId: string,
  notes?: string | null,
): Promise<
  | { ok: true; result: HqPayoutResult }
  | { ok: false; reason: string; status: number }
> {
  const { data, error } = await admin.rpc("record_partner_commission_payout", {
    p_tenant_id: tenantId,
    p_actor_user_id: actorUserId,
    p_notes: notes ?? null,
  });

  if (error) {
    if (error.message.includes("record_partner_commission_payout")) {
      return { ok: false, reason: "rpc_not_deployed", status: 500 };
    }
    throw new Error(`hq_payout_rpc: ${error.message}`);
  }

  const payload = data as { ok?: boolean; reason?: string } | null;

  if (!payload?.ok) {
    const reason = payload?.reason ?? "unknown";
    if (reason === "nothing_payable") {
      return { ok: false, reason, status: 409 };
    }
    if (reason === "tenant_not_freemium") {
      return { ok: false, reason, status: 404 };
    }
    return { ok: false, reason, status: 400 };
  }

  const parsed = HqPayoutResultSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("hq_payout_invalid_response");
  }

  return { ok: true, result: parsed.data };
}
