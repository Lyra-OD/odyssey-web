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
import { appRoutes } from "@/src/lib/appRoutes";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    token: z.string().trim().min(20).max(200),
    locale: z.enum(["fr", "en"]).optional(),
  })
  .strict();

/**
 * Fenêtre d'idempotence après revoke (Strict Mode / double POST).
 * Au-delà : one-shot strict → 410 token_revoked.
 */
const REDEEM_IDEMPOTENT_GRACE_MS = 60_000;

function buildRedeemSuccessResponse(params: {
  projectId: string;
  tokenId: string;
  locale: "fr" | "en";
}): NextResponse {
  const cookiePayload = buildWizardEditorCookiePayload({
    projectId: params.projectId,
    tokenId: params.tokenId,
  });

  const response = NextResponse.json({
    ok: true,
    projectId: params.projectId,
    role: "editor" as const,
    redirectPath: appRoutes.studio(params.locale),
    expiresAt: new Date(cookiePayload.exp * 1000).toISOString(),
  });

  attachWizardEditorCookie(response, cookiePayload);
  return response;
}

function isWithinRedeemGrace(revokedAt: string): boolean {
  const age = Date.now() - new Date(revokedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age <= REDEEM_IDEMPOTENT_GRACE_MS;
}

/**
 * POST /api/collab/redeem
 * Valide le token URL wizard_editor (one-shot), pose le cookie httpOnly signé,
 * révoque le token, retourne projectId + redirect Studio.
 *
 * Idempotent ~60 s après revoke : un 2e POST (Strict Mode) re-pose le cookie
 * au lieu de 410 — le secret URL reste mort après la fenêtre de grâce.
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
    return NextResponse.json({ error: "token_lookup_failed" }, { status: 400 });
  }

  if (!row || row.purpose !== WIZARD_EDITOR_TOKEN_PURPOSE) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "token_expired" }, { status: 410 });
  }

  const { data: project } = await admin
    .from("projects")
    .select("id, status")
    .eq("id", row.project_id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Déjà révoqué : idempotent dans la fenêtre de grâce (double mount / retry).
  if (row.revoked_at) {
    if (!isWithinRedeemGrace(row.revoked_at)) {
      return NextResponse.json({ error: "token_revoked" }, { status: 410 });
    }
    return buildRedeemSuccessResponse({
      projectId: row.project_id,
      tokenId: row.id,
      locale,
    });
  }

  const nowIso = new Date().toISOString();
  const { data: revokedRow, error: revokeError } = await admin
    .from("project_access_tokens")
    .update({ revoked_at: nowIso })
    .eq("id", row.id)
    .is("revoked_at", null)
    .select("id, project_id")
    .maybeSingle();

  if (revokeError) {
    return NextResponse.json({ error: "token_revoke_failed" }, { status: 400 });
  }

  // Course : un autre POST a déjà révoqué entre le SELECT et l'UPDATE.
  if (!revokedRow) {
    const { data: again } = await admin
      .from("project_access_tokens")
      .select("id, project_id, revoked_at, expires_at")
      .eq("id", row.id)
      .maybeSingle();

    if (
      again?.revoked_at &&
      isWithinRedeemGrace(again.revoked_at) &&
      new Date(again.expires_at).getTime() > Date.now()
    ) {
      return buildRedeemSuccessResponse({
        projectId: again.project_id,
        tokenId: again.id,
        locale,
      });
    }

    return NextResponse.json({ error: "token_revoked" }, { status: 410 });
  }

  return buildRedeemSuccessResponse({
    projectId: revokedRow.project_id,
    tokenId: revokedRow.id,
    locale,
  });
}
