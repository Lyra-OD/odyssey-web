import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveWizardCraftAccess } from "@/src/lib/api/projectAccess";
import { ProjectIdSchema } from "@/src/lib/api/projectIdSchema";
import { resolveSiteOrigin } from "@/src/lib/http/siteOrigin";
import { appRoutes } from "@/src/lib/appRoutes";
import { SCAN_SESSION_TTL_MS } from "@/src/lib/scanner/scanLimits";
import { isMissingScanSessionsTable } from "@/src/lib/scanner/resolveScanSession";
import { generateScanSessionToken } from "@/src/lib/scanner/scanSessionToken";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    projectId: ProjectIdSchema,
    locale: z.enum(["fr", "en"]).optional(),
  })
  .strict();

/**
 * POST /api/scan/sessions
 * Crée une session QR Scanner (TTL 2 h). Titulaire ou Co-Créateur.
 */
export async function POST(req: Request) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const projectId = parsed.data.projectId;
  const locale = parsed.data.locale ?? "fr";

  const access = await resolveWizardCraftAccess(projectId);
  if (!access.ok) return access.response;

  const admin = getSupabaseAdminClient();
  const { data: project, error: projectError } = await admin
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

  const { token, tokenHash } = generateScanSessionToken();
  const expiresAt = new Date(Date.now() + SCAN_SESSION_TTL_MS).toISOString();
  const createdBy =
    access.role === "owner" ? access.user.id : access.projectOwnerUserId;

  const { data: inserted, error: insertError } = await admin
    .from("scan_sessions")
    .insert({
      project_id: projectId,
      tenant_id: project.tenant_id ?? null,
      token_hash: tokenHash,
      status: "active",
      expires_at: expiresAt,
      created_by_user_id: createdBy,
      upload_count: 0,
    })
    .select("id, expires_at, upload_count")
    .maybeSingle();

  if (insertError || !inserted) {
    if (isMissingScanSessionsTable(insertError)) {
      return NextResponse.json(
        { error: "scan_sessions_missing" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "session_insert_failed", message: insertError?.message },
      { status: 400 },
    );
  }

  const origin = resolveSiteOrigin(req);
  const scanPath = appRoutes.scan(locale, token);

  return NextResponse.json({
    ok: true,
    token,
    sessionId: inserted.id,
    expiresAt: inserted.expires_at,
    uploadCount: inserted.upload_count ?? 0,
    scanUrl: `${origin}${scanPath}`,
  });
}
