import { NextResponse } from "next/server";
import { z } from "zod";

import { requireProjectOwner } from "@/src/lib/api/projectAccess";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { coerceWizardState } from "@/src/lib/wizard/wizardState";
import { assertExportAllowed } from "@/src/lib/wizard/exportGate";
import {
  enqueueProjectExportJob,
  getProjectPaidEntitlements,
} from "@/src/lib/wizard/paidEntitlements";

const ProjectIdSchema = z.string().uuid({ message: "invalid_project_id" });

/**
 * POST /api/projects/[id]/export
 *
 * Phase 5 — gate entitlements puis enqueue job Creatomate stub.
 * Ne lance pas encore de rendu externe (provider = creatomate_stub).
 */
export async function POST(
  req: Request,
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
  let locale: "fr" | "en" = "fr";
  try {
    const body = (await req.json()) as { locale?: string };
    if (body.locale === "en") locale = "en";
  } catch {
    /* optional body */
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, wizard_state, status")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "project_not_found", message: projectError?.message },
      { status: 404 },
    );
  }

  const wizardState = coerceWizardState(project.wizard_state);
  const entitlements = await getProjectPaidEntitlements(supabase, projectId);
  const gate = assertExportAllowed({
    entitlements,
    storyboard: wizardState.storyboard,
    musicRightsAttestation: wizardState.musicRightsAttestation,
    locale,
  });

  const admin = getSupabaseAdminClient();

  if (!gate.ok) {
    const queued = await enqueueProjectExportJob(admin, {
      projectId,
      status: "blocked",
      allow4k: false,
      allowStingrayMaster: false,
      denialCode: gate.code,
      message: gate.message,
    });

    return NextResponse.json(
      {
        error: gate.code,
        message: gate.message,
        jobId: queued.ok ? queued.jobId : null,
      },
      { status: 402 },
    );
  }

  const queued = await enqueueProjectExportJob(admin, {
    projectId,
    status: "queued",
    allow4k: gate.allow4k,
    allowStingrayMaster: gate.allowStingrayMaster,
    message:
      locale === "en"
        ? "Export queued (Creatomate stub — worker not wired yet)."
        : "Export mis en file (stub Creatomate — worker à brancher).",
  });

  if (!queued.ok) {
    return NextResponse.json(
      { error: "export_enqueue_failed", message: queued.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    jobId: queued.jobId,
    allow4k: gate.allow4k,
    allowStingrayMaster: gate.allowStingrayMaster,
    provider: "creatomate_stub",
    projectStatus: project.status,
  });
}
