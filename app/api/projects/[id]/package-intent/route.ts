import { NextResponse } from "next/server";
import { z } from "zod";

import { requireProjectOwner } from "@/src/lib/api/projectAccess";
import {
  assertIntendedNotBelowGrant,
  loadInvitationGrantedPackage,
} from "@/src/lib/wizard/b2b2cPackageAuthority";
import { ProjectIdSchema } from "@/src/lib/api/projectIdSchema";
import {
  normalizeBasePackageId,
  type WizardBasePackage,
} from "@/src/lib/wizard/pricingConfig";
import {
  buildPersistedWizardState,
  coerceWizardState,
} from "@/src/lib/wizard/wizardState";
import { buildPricingSnapshot } from "@/src/lib/wizard/wizardPricing";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

const BodySchema = z
  .object({
    intendedPackage: z.enum([
      "essential",
      "signature",
      "heritage",
      "legendary",
      "prestige",
    ]),
  })
  .strict();

type RouteParams = { params: { id: string } };

/**
 * POST /api/projects/[id]/package-intent
 * Seule voie owner pour persister intendedPackage (Soft Cap, checkout).
 * B2B2C : intended ≥ grant invitation (SQL). Jamais grantedPackage client.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const projectIdResult = ProjectIdSchema.safeParse(params.id);
  if (!projectIdResult.success) {
    return NextResponse.json({ error: "invalid_project_id" }, { status: 400 });
  }
  const projectId = projectIdResult.data;

  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  let intendedPackage: WizardBasePackage;
  try {
    intendedPackage = normalizeBasePackageId(parsed.data.intendedPackage);
  } catch {
    return NextResponse.json({ error: "invalid_package" }, { status: 400 });
  }

  const { supabase, user } = access;

  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("wizard_state, invitation_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const invitationId = project.invitation_id as string | null;
  let grantedPackage: WizardBasePackage = intendedPackage;

  if (invitationId) {
    let admin;
    try {
      admin = getSupabaseAdminClient();
    } catch {
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    const lookup = await loadInvitationGrantedPackage(admin, invitationId);
    if (!lookup.ok) {
      return NextResponse.json(
        { error: "invitation_lookup_failed", reason: lookup.reason },
        { status: 400 },
      );
    }

    grantedPackage = lookup.grantedPackage;

    if (!assertIntendedNotBelowGrant(grantedPackage, intendedPackage)) {
      return NextResponse.json({ error: "intended_below_grant" }, { status: 422 });
    }
  }

  const currentState = coerceWizardState(project.wizard_state);
  const extensions = currentState.extensions ?? {};
  const pricing = buildPricingSnapshot(
    extensions,
    intendedPackage,
    Boolean(currentState.isPartner),
  );

  const merged = buildPersistedWizardState({
    ...currentState,
    grantedPackage,
    intendedPackage,
    basePackage: intendedPackage,
    pricing,
  });

  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update({
      wizard_state: merged,
      last_saved_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select("wizard_state, last_saved_at")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "update_failed" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    grantedPackage,
    intendedPackage,
    last_saved_at: updated.last_saved_at,
  });
}
