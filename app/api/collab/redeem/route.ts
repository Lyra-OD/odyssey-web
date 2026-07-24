import { NextResponse } from "next/server";
import { z } from "zod";

import {
  WIZARD_EDITOR_TOKEN_PURPOSE,
} from "@/src/lib/wizard/collabCapabilities";
import {
  attachWizardEditorCookie,
  buildWizardEditorCookiePayload,
} from "@/src/lib/wizard/collabSessionCookie";
import { hashWizardEditorToken } from "@/src/lib/wizard/collabToken";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    token: z.string().trim().min(20).max(200),
    locale: z.enum(["fr", "en"]).optional(),
  })
  .strict();

/**
 * POST /api/collab/redeem
 * Valide le token URL wizard_editor (one-shot), pose le cookie httpOnly signé,
 * révoque le token, retourne projectId + redirect Studio.
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
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { token, locale = "fr" } = parsed.data;
  const tokenHash = hashWizardEditorToken(token);
  const admin = getSupabaseAdminClient();

  const { data: row, error: lookupError } = await admin
    .from("project_access_tokens")
    .select("id, project_id, purpose, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: "token_lookup_failed", message: lookupError.message },
      { status: 400 },
    );
  }

  if (!row || row.purpose !== WIZARD_EDITOR_TOKEN_PURPOSE) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  if (row.revoked_at) {
    return NextResponse.json({ error: "token_revoked" }, { status: 410 });
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "token_expired" }, { status: 410 });
  }

  const nowIso = new Date().toISOString();
  const { error: revokeError } = await admin
    .from("project_access_tokens")
    .update({ revoked_at: nowIso })
    .eq("id", row.id)
    .is("revoked_at", null);

  if (revokeError) {
    return NextResponse.json(
      { error: "token_revoke_failed", message: revokeError.message },
      { status: 400 },
    );
  }

  const { data: project } = await admin
    .from("projects")
    .select("id, status")
    .eq("id", row.project_id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const cookiePayload = buildWizardEditorCookiePayload({
    projectId: row.project_id,
    tokenId: row.id,
  });

  const response = NextResponse.json({
    ok: true,
    projectId: row.project_id,
    role: "editor" as const,
    redirectPath: `/${locale}/studio`,
    expiresAt: new Date(cookiePayload.exp * 1000).toISOString(),
  });

  attachWizardEditorCookie(response, cookiePayload);
  return response;
}
