import { NextResponse } from "next/server";
import { z } from "zod";

import { requireProjectOwner, rejectEditorForOwnerOnlyRoute } from "@/src/lib/api/projectAccess";
import {
  WIZARD_EDITOR_TOKEN_PURPOSE,
  WIZARD_EDITOR_TOKEN_TTL_DAYS,
} from "@/src/lib/wizard/collabCapabilities";
import { generateWizardEditorToken } from "@/src/lib/wizard/collabToken";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const ProjectIdSchema = z.string().uuid({ message: "invalid_project_id" });

function resolveSiteOrigin(request: Request): string {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (envOrigin) return envOrigin;
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/**
 * POST /api/projects/[id]/collab-link
 * Mint un lien Co-Créateur (wizard_editor). Owner-only.
 * Révoque tout token wizard_editor actif du projet avant insert (≤1 outstanding).
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

  const editorBlocked = await rejectEditorForOwnerOnlyRoute(
    projectId,
    "canManageCollabLink",
  );
  if (editorBlocked) return editorBlocked;

  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;
  const { supabase, user } = access;

  let locale: "fr" | "en" = "fr";
  try {
    const body = (await req.json()) as { locale?: string };
    if (body.locale === "en") locale = "en";
  } catch {
    /* optional body */
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, tenant_id, status")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return NextResponse.json({ error: "project_lookup_failed" }, { status: 400 });
  }
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { error: revokeError } = await admin
    .from("project_access_tokens")
    .update({ revoked_at: nowIso })
    .eq("project_id", projectId)
    .eq("purpose", WIZARD_EDITOR_TOKEN_PURPOSE)
    .is("revoked_at", null);

  if (revokeError) {
    return NextResponse.json({ error: "token_revoke_failed" }, { status: 400 });
  }

  const { token, tokenHash } = generateWizardEditorToken();
  const expiresAt = new Date(
    Date.now() + WIZARD_EDITOR_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: inserted, error: insertError } = await admin
    .from("project_access_tokens")
    .insert({
      project_id: projectId,
      tenant_id: project.tenant_id ?? null,
      token_hash: tokenHash,
      purpose: WIZARD_EDITOR_TOKEN_PURPOSE,
      expires_at: expiresAt,
      created_by_user_id: user.id,
      metadata: { locale },
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: "token_insert_failed" }, { status: 400 });
  }

  const origin = resolveSiteOrigin(req);
  return NextResponse.json({
    ok: true,
    token,
    tokenId: inserted.id,
    expiresAt,
    shareUrl: `${origin}/${locale}/collab/${token}`,
  });
}
