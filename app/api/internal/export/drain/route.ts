import { NextResponse } from "next/server";
import { z } from "zod";

import { drainQueuedExportJobs } from "@/src/lib/export/processExportJob";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

const BodySchema = z.object({
  limit: z.number().int().min(1).max(25).optional(),
});

/**
 * POST /api/internal/export/drain
 *
 * Ops / staging — consomme les jobs `queued` (mock Creatomate).
 * Auth : header `Authorization: Bearer <EXPORT_DRAIN_SECRET>`.
 */
export async function POST(req: Request) {
  const secret = process.env.EXPORT_DRAIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "export_drain_not_configured" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let limit = 5;
  try {
    const json = (await req.json()) as unknown;
    const parsed = BodySchema.safeParse(json ?? {});
    if (parsed.success && parsed.data.limit) {
      limit = parsed.data.limit;
    }
  } catch {
    /* empty body OK */
  }

  try {
    const admin = getSupabaseAdminClient();
    const result = await drainQueuedExportJobs(admin, { limit });
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "drain_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
