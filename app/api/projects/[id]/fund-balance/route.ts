import { NextResponse } from "next/server";

import { requireProjectOwner, rejectEditorForOwnerOnlyRoute } from "@/src/lib/api/projectAccess";
import { ProjectIdSchema } from "@/src/lib/api/projectIdSchema";
import { parseTenantViralSettings } from "@/src/lib/wizard/tenantViralSettings";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";


/**
 * GET /api/projects/[id]/fund-balance
 * Solde Fonds Commémoratif pour le thermomètre Checkout (owner-only).
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const projectIdResult = ProjectIdSchema.safeParse(params.id);
  if (!projectIdResult.success) {
    return NextResponse.json({ error: "invalid_project_id" }, { status: 400 });
  }
  const projectId = projectIdResult.data;

  const editorBlocked = await rejectEditorForOwnerOnlyRoute(
    projectId,
    "canViewFundBalance",
  );
  if (editorBlocked) return editorBlocked;

  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;
  const { supabase } = access;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, tenant_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return NextResponse.json(
      { error: "project_lookup_failed", message: projectError.message },
      { status: 400 },
    );
  }
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let viralLoopEnabled = false;
  let ownerFloorCents = 0;

  // Settings tenant : client admin (RLS tenants = partenaires seulement —
  // la famille freemium ne verrait sinon jamais viral_loop_enabled).
  const admin = getSupabaseAdminClient();

  if (project.tenant_id) {
    const { data: tenant } = await admin
      .from("tenants")
      .select("settings")
      .eq("id", project.tenant_id)
      .maybeSingle();
    const parsed = parseTenantViralSettings(
      (tenant?.settings ?? {}) as Record<string, unknown>,
    );
    viralLoopEnabled = parsed.viralLoopEnabled;
    ownerFloorCents = parsed.ownerFloorCents;
  }

  const { data: fundBal } = await admin
    .from("family_tribute_fund_balances")
    .select("accrued_cents, consumed_cents")
    .eq("project_id", projectId)
    .maybeSingle();

  const accrued = Math.max(0, fundBal?.accrued_cents ?? 0);
  const consumed = Math.max(0, fundBal?.consumed_cents ?? 0);
  const availableCents = Math.max(0, accrued - consumed);

  return NextResponse.json({
    ok: true,
    availableCents: viralLoopEnabled ? availableCents : 0,
    accruedCents: viralLoopEnabled ? accrued : 0,
    consumedCents: viralLoopEnabled ? consumed : 0,
    viralLoopEnabled,
    ownerFloorCents,
  });
}
