import { NextResponse } from "next/server";
import { z } from "zod";

import { requireProjectOwner } from "@/src/lib/api/projectAccess";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const ProjectIdSchema = z.string().uuid({ message: "invalid_project_id" });

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

  if (project.tenant_id) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", project.tenant_id)
      .maybeSingle();
    const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
    viralLoopEnabled = settings.viral_loop_enabled === true;
    ownerFloorCents =
      typeof settings.owner_floor_cents === "number" &&
      settings.owner_floor_cents >= 0
        ? settings.owner_floor_cents
        : 0;
  }

  const admin = getSupabaseAdminClient();
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
