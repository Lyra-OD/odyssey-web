import { NextResponse } from "next/server";

import { requireProjectOwner, rejectEditorForOwnerOnlyRoute } from "@/src/lib/api/projectAccess";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { generateContributeToken } from "@/src/lib/contribute/contributeToken";
import { resolveSiteOrigin } from "@/src/lib/http/siteOrigin";
import { ProjectIdSchema } from "@/src/lib/api/projectIdSchema";

export const runtime = "nodejs";


/** TTL par défaut d'un lien de contribution invité (30 jours). */
const CONTRIBUTE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * POST /api/projects/[id]/contribute-link
 * Génère un lien invité opaque (Boucle Virale) pour un projet. Owner-only.
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
    "canManageContributeLink",
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

  const { token, tokenHash } = generateContributeToken();

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (error) {
    console.error("[contribute-link]", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const { error: insertError } = await admin
    .from("project_access_tokens")
    .insert({
      project_id: projectId,
      tenant_id: project.tenant_id ?? null,
      token_hash: tokenHash,
      purpose: "guest_contribute",
      expires_at: new Date(Date.now() + CONTRIBUTE_TOKEN_TTL_MS).toISOString(),
      created_by_user_id: user.id,
    });

  if (insertError) {
    return NextResponse.json(
      { error: "token_insert_failed", message: insertError.message },
      { status: 400 },
    );
  }

  const origin = resolveSiteOrigin(req);
  return NextResponse.json({
    ok: true,
    token,
    shareUrl: `${origin}/${locale}/contribute/${token}`,
  });
}
