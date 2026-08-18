import { z } from "zod";

import type { PartnerMemberRole } from "@/src/lib/partner/partnerRoles";
import { isPartnerMemberRole } from "@/src/lib/partner/partnerRoles";
import {
  PERFORMANCE_ACCRUAL_REASONS,
  PERFORMANCE_INVITATION_CAP,
  aggregateMyPerformance,
  type PartnerMyPerformanceKpis,
  type PartnerPerformanceInvitationInput,
  type PartnerPerformanceLedgerInput,
} from "@/src/lib/partner/partnerPerformance";
import type { SupabaseClient } from "@supabase/supabase-js";

const LEDGER_IN_CHUNK = 100;
const UNASSIGNED_KEY = "__unassigned__";

export type HqDirectorRow = {
  userId: string | null;
  label: string;
  role: PartnerMemberRole | "unassigned" | "unknown";
  invitationsSent: number;
  invitationsAccepted: number;
  upsells: number;
  attributedCents: number;
  engagementRatePercent: number;
  conversionRatePercent: number;
};

export const HqDirectorRowSchema = z
  .object({
    userId: z.string().uuid().nullable(),
    label: z.string(),
    role: z.enum(["partner", "partner_admin", "unassigned", "unknown"]),
    invitationsSent: z.number().int().nonnegative(),
    invitationsAccepted: z.number().int().nonnegative(),
    upsells: z.number().int().nonnegative(),
    attributedCents: z.number().int().nonnegative(),
    engagementRatePercent: z.number().int().min(0).max(100),
    conversionRatePercent: z.number().int().min(0).max(100),
  })
  .strict();

export const HqDirectorsResponseSchema = z
  .object({
    directors: z.array(HqDirectorRowSchema),
  })
  .strict();

type InvitationWithActor = PartnerPerformanceInvitationInput & {
  invited_by_user_id: string | null;
};

function kpisToRow(
  userId: string | null,
  label: string,
  role: HqDirectorRow["role"],
  kpis: PartnerMyPerformanceKpis,
): HqDirectorRow {
  return {
    userId,
    label,
    role,
    invitationsSent: kpis.invitationsSent,
    invitationsAccepted: kpis.invitationsAccepted,
    upsells: kpis.upsells,
    attributedCents: kpis.attributedCents,
    engagementRatePercent: kpis.engagementRatePercent,
    conversionRatePercent: kpis.conversionRatePercent,
  };
}

/**
 * Agrège les invitations d’un salon par `invited_by_user_id`.
 * Réutilise `aggregateMyPerformance` — pas de payable, pas d’e-mail famille.
 */
export function buildHqDirectorRows(
  invitations: InvitationWithActor[],
  ledgerRows: PartnerPerformanceLedgerInput[],
  labels: {
    unassigned: string;
    unknown: string;
  },
  identityByUserId: Map<string, { label: string; role: HqDirectorRow["role"] }>,
): HqDirectorRow[] {
  const groups = new Map<string, InvitationWithActor[]>();

  for (const invitation of invitations) {
    const key = invitation.invited_by_user_id ?? UNASSIGNED_KEY;
    const list = groups.get(key);
    if (list) {
      list.push(invitation);
    } else {
      groups.set(key, [invitation]);
    }
  }

  const rows: HqDirectorRow[] = [];
  for (const [key, group] of groups) {
    const kpis = aggregateMyPerformance(group, ledgerRows);
    if (key === UNASSIGNED_KEY) {
      rows.push(kpisToRow(null, labels.unassigned, "unassigned", kpis));
      continue;
    }
    const identity = identityByUserId.get(key);
    rows.push(
      kpisToRow(
        key,
        identity?.label || labels.unknown,
        identity?.role ?? "unknown",
        kpis,
      ),
    );
  }

  rows.sort((left, right) => {
    if (right.attributedCents !== left.attributedCents) {
      return right.attributedCents - left.attributedCents;
    }
    return right.invitationsSent - left.invitationsSent;
  });

  return rows;
}

async function fetchConfirmedAccruals(
  admin: SupabaseClient,
  tenantId: string,
  invitationIds: string[],
): Promise<PartnerPerformanceLedgerInput[]> {
  const rows: PartnerPerformanceLedgerInput[] = [];

  for (let offset = 0; offset < invitationIds.length; offset += LEDGER_IN_CHUNK) {
    const chunk = invitationIds.slice(offset, offset + LEDGER_IN_CHUNK);
    const { data } = await admin
      .from("partner_commission_ledger")
      .select("invitation_id, reason, status, commission_cents")
      .eq("tenant_id", tenantId)
      .in("invitation_id", chunk)
      .in("reason", [...PERFORMANCE_ACCRUAL_REASONS])
      .eq("status", "confirmed");

    for (const row of data ?? []) {
      rows.push({
        invitation_id: row.invitation_id,
        reason: String(row.reason),
        status: String(row.status),
        commission_cents: row.commission_cents,
      });
    }
  }

  return rows;
}

function counsellorLabel(email: string | undefined, fallback: string): string {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return fallback;
  return trimmed;
}

export async function loadHqDirectors(
  admin: SupabaseClient,
  tenantId: string,
  labels: { unassigned: string; unknown: string },
): Promise<HqDirectorRow[]> {
  const { data: invitationRaw, error } = await admin
    .from("partner_invitations")
    .select("id, invited_email, status, created_at, invited_by_user_id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(PERFORMANCE_INVITATION_CAP);

  if (error) {
    throw new Error(`hq_directors_invitations: ${error.message}`);
  }

  const invitations: InvitationWithActor[] = (invitationRaw ?? []).map(
    (row) => ({
      id: String(row.id),
      invited_email: String(row.invited_email ?? ""),
      status: String(row.status ?? "pending"),
      created_at: String(row.created_at),
      invited_by_user_id:
        typeof row.invited_by_user_id === "string"
          ? row.invited_by_user_id
          : null,
    }),
  );

  if (invitations.length === 0) return [];

  const invitationIds = invitations.map((row) => row.id);
  const ledgerRows = await fetchConfirmedAccruals(
    admin,
    tenantId,
    invitationIds,
  );

  const directorIds = [
    ...new Set(
      invitations
        .map((row) => row.invited_by_user_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  const identityByUserId = new Map<
    string,
    { label: string; role: HqDirectorRow["role"] }
  >();

  if (directorIds.length > 0) {
    const { data: members } = await admin
      .from("tenant_members")
      .select("user_id, role")
      .eq("tenant_id", tenantId)
      .in("user_id", directorIds);

    for (const member of members ?? []) {
      const userId = String(member.user_id);
      const role = String(member.role);
      identityByUserId.set(userId, {
        label: labels.unknown,
        role: isPartnerMemberRole(role) ? role : "unknown",
      });
    }

    await Promise.all(
      directorIds.map(async (userId) => {
        try {
          const { data, error: userError } =
            await admin.auth.admin.getUserById(userId);
          if (userError || !data.user) return;
          const current = identityByUserId.get(userId);
          identityByUserId.set(userId, {
            label: counsellorLabel(data.user.email, labels.unknown),
            role: current?.role ?? "unknown",
          });
        } catch {
          /* fail-soft : le scoreboard reste lisible sans e-mail */
        }
      }),
    );
  }

  return buildHqDirectorRows(
    invitations,
    ledgerRows,
    labels,
    identityByUserId,
  );
}
