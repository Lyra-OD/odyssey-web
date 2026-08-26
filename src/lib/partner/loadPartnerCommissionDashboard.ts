import {
  formatTributeDisplayName,
  resolveTributeNames,
} from "@/src/lib/contribute/tributeName";
import {
  buildSalonPilotage,
  isCommissionLedgerReason,
  isCommissionLedgerStatus,
  type CommissionLedgerReason,
  type PartnerCommissionDashboardResponse,
  type PartnerCommissionLedgerRow,
} from "@/src/lib/partner/partnerCommissionTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

const LEDGER_LIMIT = 50;

type LedgerRowRaw = {
  id: string;
  created_at: string;
  project_id: string | null;
  reason: string;
  gross_payment_cents: number | null;
  net_distributable_cents: number | null;
  commission_cents: number | null;
  commission_rate_bps: number | null;
  status: string;
  delta_cents: number;
  notes: string | null;
};

type ProjectNameRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

function projectLabel(
  row: LedgerRowRaw,
  project: ProjectNameRow | undefined,
  locale: "fr" | "en",
): string {
  if (row.reason === "payout") {
    const notes = row.notes?.trim();
    if (notes) return notes;
    return locale === "en" ? "Odyssey payout" : "Versement Odyssey";
  }

  if (!project) {
    if (row.project_id) {
      return `Hommage ${row.project_id.slice(0, 8)}`;
    }
    return locale === "en" ? "Tribute" : "Hommage";
  }

  const name = formatTributeDisplayName(resolveTributeNames(project), locale);
  const fallback = locale === "en" ? "a loved one" : "un être cher";
  if (name === fallback) {
    return `Hommage ${project.id.slice(0, 8)}`;
  }
  return `Hommage ${name}`;
}

type AccrualPilotageRow = {
  gross_payment_cents: number | null;
  invitation_id: string | null;
};

async function loadSalonPilotage(admin: SupabaseClient, tenantId: string) {
  const [sentResult, acceptedResult, accrualResult] = await Promise.all([
    admin
      .from("partner_invitations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    admin
      .from("partner_invitations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "accepted"),
    admin
      .from("partner_commission_ledger")
      .select("gross_payment_cents, invitation_id")
      .eq("tenant_id", tenantId)
      .eq("reason", "commission_accrual")
      .eq("status", "confirmed"),
  ]);

  let grossVolumeCents = 0;
  const upsellIds = new Set<string>();
  for (const row of (accrualResult.data ?? []) as AccrualPilotageRow[]) {
    grossVolumeCents += Math.max(0, row.gross_payment_cents ?? 0);
    if (row.invitation_id) upsellIds.add(row.invitation_id);
  }

  return buildSalonPilotage({
    invitationsSent: sentResult.count ?? 0,
    invitationsAccepted: acceptedResult.count ?? 0,
    upsells: upsellIds.size,
    grossVolumeCents,
  });
}

/**
 * Soldes + ledger + pilotage — mêmes formules que GET /api/partner/commissions.
 * Appelant : membership salon OU allowlist HQ. Client admin (service_role).
 */
export async function loadPartnerCommissionDashboard(
  admin: SupabaseClient,
  tenantId: string,
  locale: "fr" | "en",
): Promise<PartnerCommissionDashboardResponse> {
  const { data: tenant } = await admin
    .from("tenants")
    .select("is_freemium")
    .eq("id", tenantId)
    .maybeSingle();

  const isFreemium = tenant?.is_freemium !== false;

  const { data: balanceRow } = await admin
    .from("partner_commission_balances")
    .select("accrued_cents, pending_cents, paid_cents")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const { data: ledgerRaw } = await admin
    .from("partner_commission_ledger")
    .select(
      "id, created_at, project_id, reason, gross_payment_cents, net_distributable_cents, commission_cents, commission_rate_bps, status, delta_cents, notes",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(LEDGER_LIMIT);

  const rows = (ledgerRaw ?? []) as LedgerRowRaw[];
  const projectIds = [
    ...new Set(
      rows
        .map((row) => row.project_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const projectById = new Map<string, ProjectNameRow>();
  if (projectIds.length > 0) {
    const { data: projects } = await admin
      .from("projects")
      .select("id, first_name, last_name")
      .in("id", projectIds);

    for (const project of (projects ?? []) as ProjectNameRow[]) {
      projectById.set(project.id, project);
    }
  }

  const ledger: PartnerCommissionLedgerRow[] = [];
  for (const row of rows) {
    if (!isCommissionLedgerReason(row.reason)) continue;
    const status = isCommissionLedgerStatus(row.status)
      ? row.status
      : "confirmed";
    const reason: CommissionLedgerReason = row.reason;
    ledger.push({
      id: row.id,
      created_at: row.created_at,
      project_label: projectLabel(
        row,
        row.project_id ? projectById.get(row.project_id) : undefined,
        locale,
      ),
      reason,
      gross_payment_cents: row.gross_payment_cents,
      net_distributable_cents: row.net_distributable_cents,
      commission_cents: row.commission_cents ?? Math.abs(row.delta_cents),
      commission_rate_bps: row.commission_rate_bps,
      status,
      delta_cents: row.delta_cents,
    });
  }

  const pilotage = await loadSalonPilotage(admin, tenantId);

  return {
    tenantId,
    isFreemium,
    balance: {
      accrued_cents: balanceRow?.accrued_cents ?? 0,
      pending_cents: balanceRow?.pending_cents ?? 0,
      paid_cents: balanceRow?.paid_cents ?? 0,
    },
    ledger,
    pilotage,
  };
}
