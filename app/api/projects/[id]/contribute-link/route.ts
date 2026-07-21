import { NextResponse } from "next/server";
import { z } from "zod";

import { requireProjectOwner } from "@/src/lib/api/projectAccess";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { generateContributeToken } from "@/src/lib/contribute/contributeToken";

export const runtime = "nodejs";

const ProjectIdSchema = z.string().uuid({ message: "invalid_project_id" });

/** TTL par défaut d'un lien de contribution invité (30 jours). */
const CONTRIBUTE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function resolveSiteOrigin(request: Request): string {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (envOrigin) return envOrigin;
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

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
  const admin = getSupabaseAdminClient();

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
