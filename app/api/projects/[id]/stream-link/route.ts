import { NextResponse } from "next/server";

import {
  rejectEditorForOwnerOnlyRoute,
  requireProjectOwner,
} from "@/src/lib/api/projectAccess";
import { ProjectIdSchema } from "@/src/lib/api/projectIdSchema";
import { generateContributeToken } from "@/src/lib/contribute/contributeToken";
import { resolveSiteOrigin } from "@/src/lib/http/siteOrigin";
import { SESSION_STREAM_TOKEN_PURPOSE } from "@/src/lib/wizard/sessionStreamToken";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/** TTL lien séance privée (90 jours — QR salon / partage famille). */
const STREAM_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * POST /api/projects/[id]/stream-link
 * Mint (ou réutilise) un lien `/[lang]/stream/[token]` — purpose `view_only`.
 * Owner-only.
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
    /* optional */
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

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (error) {
    console.error("[stream-link]", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // Plusieurs tokens view_only actifs OK (QR + reshare) — on ne révoque pas.
  const { token, tokenHash } = generateContributeToken();

  const { error: insertError } = await admin.from("project_access_tokens").insert({
    project_id: projectId,
    tenant_id: project.tenant_id ?? null,
    token_hash: tokenHash,
    purpose: SESSION_STREAM_TOKEN_PURPOSE,
    expires_at: new Date(Date.now() + STREAM_TOKEN_TTL_MS).toISOString(),
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
    shareUrl: `${origin}/${locale}/stream/${token}`,
  });
}
