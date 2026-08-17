import { NextResponse } from "next/server";

import {
  formatTributeDisplayName,
  resolveTributeNames,
} from "@/src/lib/contribute/tributeName";
import { resolveScanSession } from "@/src/lib/scanner/resolveScanSession";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/**
 * GET /api/scan/sessions/[token]
 * Valide le token QR (TTL) · métadonnées minimales pour la page mobile.
 */
export async function GET(
  req: Request,
  { params }: { params: { token: string } },
) {
  const token = typeof params.token === "string" ? params.token.trim() : "";
  const session = await resolveScanSession(token);
  if (!session) {
    return NextResponse.json({ error: "invalid_or_expired_session" }, { status: 404 });
  }

  const url = new URL(req.url);
  const locale = url.searchParams.get("lang") === "en" ? "en" : "fr";

  const admin = getSupabaseAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("first_name, last_name, wizard_state")
    .eq("id", session.project_id)
    .maybeSingle();

  const tribute = resolveTributeNames({
    first_name: (project?.first_name as string | null) ?? null,
    last_name: (project?.last_name as string | null) ?? null,
    wizard_state: project?.wizard_state,
  });

  return NextResponse.json({
    ok: true,
    expiresAt: session.expires_at,
    uploadCount: session.upload_count,
    tributeName: formatTributeDisplayName(tribute, locale),
  });
}
