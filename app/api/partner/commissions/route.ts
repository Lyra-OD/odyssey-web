import { NextResponse } from "next/server";

import {
  formatTributeDisplayName,
  resolveTributeNames,
} from "@/src/lib/contribute/tributeName";
import {
  PARTNER_API_ERROR,
  partnerApiErrorResponse,
} from "@/src/lib/partner/partnerApiErrors";
import {
  EMPTY_COMMISSION_BALANCE,
  isCommissionLedgerReason,
  isCommissionLedgerStatus,
  PartnerCommissionQuerySchema,
  type CommissionLedgerReason,
  type PartnerCommissionLedgerRow,
} from "@/src/lib/partner/partnerCommissionTypes";
import { resolvePartnerMembership } from "@/src/lib/partner/resolvePartnerMembership";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

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
  wizard_state: unknown;
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

/**
 * GET /api/partner/commissions?tenantId=<uuid>
 * Soldes + ledger RevShare. `partner_admin` only (`canViewLedger`).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = PartnerCommissionQuerySchema.safeParse({
    tenantId: searchParams.get("tenantId"),
  });

  if (!parsedQuery.success) {
    return partnerApiErrorResponse(PARTNER_API_ERROR.INVALID_TENANT, 400);
  }

  const { tenantId } = parsedQuery.data;
  const locale = searchParams.get("lang") === "en" ? "en" : "fr";

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return partnerApiErrorResponse(PARTNER_API_ERROR.UNAUTHENTICATED, 401);
  }

  const membership = await resolvePartnerMembership(
    supabase,
    user.id,
    tenantId,
    { requiredCapability: "canViewLedger" },
  );

  if (!membership.ok) {
    return partnerApiErrorResponse(PARTNER_API_ERROR.FORBIDDEN, 403);
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return partnerApiErrorResponse(PARTNER_API_ERROR.INTERNAL, 500);
  }

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .select("is_freemium")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError) {
    return partnerApiErrorResponse(PARTNER_API_ERROR.INTERNAL, 500);
  }

  const isFreemium = tenant?.is_freemium === true;

  if (!isFreemium) {
    return NextResponse.json({
      tenantId,
      isFreemium: false,
      balance: EMPTY_COMMISSION_BALANCE,
      ledger: [] satisfies PartnerCommissionLedgerRow[],
    });
  }

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
      .select("id, first_name, last_name, wizard_state")
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

  return NextResponse.json({
    tenantId,
    isFreemium: true,
    balance: {
      accrued_cents: balanceRow?.accrued_cents ?? 0,
      pending_cents: balanceRow?.pending_cents ?? 0,
      paid_cents: balanceRow?.paid_cents ?? 0,
    },
    ledger,
  });
}
