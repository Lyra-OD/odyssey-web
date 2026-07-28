import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import type { CreatomateRender } from "@/src/lib/video/creatomate";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/creatomate
 *
 * Retour async Creatomate (render succeeded | failed).
 * Auth obligatoire : Bearer ou header CREATOMATE_WEBHOOK_SECRET (fail-closed).
 * Corrélation : external_render_id (= render.id) ou metadata (= job.id).
 */

function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Fail-closed : secret absent ou signature invalide → unauthorized.
 */
function authorizeWebhook(req: Request): boolean {
  const secret = process.env.CREATOMATE_WEBHOOK_SECRET?.trim();
  if (!secret) return false;

  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (bearer && safeEqualString(bearer, secret)) return true;

  const headerSecret = req.headers.get("x-creatomate-webhook-secret")?.trim();
  if (headerSecret && safeEqualString(headerSecret, secret)) return true;

  return false;
}

function normalizePayload(body: unknown): CreatomateRender | null {
  if (!body || typeof body !== "object") return null;

  const maybeArray = Array.isArray(body) ? body[0] : body;
  if (!maybeArray || typeof maybeArray !== "object") return null;

  const render = maybeArray as Record<string, unknown>;
  const id = typeof render.id === "string" ? render.id : null;
  if (!id) return null;

  return {
    id,
    status: typeof render.status === "string" ? render.status : "unknown",
    url: typeof render.url === "string" ? render.url : null,
    error_message:
      typeof render.error_message === "string" ? render.error_message : null,
    metadata: typeof render.metadata === "string" ? render.metadata : null,
  };
}

export async function POST(req: Request) {
  if (!authorizeWebhook(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const render = normalizePayload(raw);
  if (!render) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const status = String(render.status).toLowerCase();
  if (status === "planned" || status === "waiting" || status === "rendering" || status === "transcribing") {
    return NextResponse.json({ ok: true, ignored: true, status });
  }

  const admin = getSupabaseAdminClient();

  let jobQuery = admin
    .from("project_export_jobs")
    .select("id, status")
    .limit(1);

  if (render.metadata) {
    jobQuery = jobQuery.eq("id", render.metadata);
  } else {
    jobQuery = jobQuery.eq("external_render_id", render.id);
  }

  const { data: job, error: lookupError } = await jobQuery.maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: "job_lookup_failed", message: lookupError.message },
      { status: 500 },
    );
  }

  if (!job?.id) {
    // Fallback : metadata manquante → lookup par render id
    if (render.metadata) {
      const { data: byRender } = await admin
        .from("project_export_jobs")
        .select("id, status")
        .eq("external_render_id", render.id)
        .maybeSingle();
      if (!byRender?.id) {
        return NextResponse.json({ error: "job_not_found" }, { status: 404 });
      }
      return finalizeJob(admin, byRender.id, render, status);
    }
    return NextResponse.json({ error: "job_not_found" }, { status: 404 });
  }

  return finalizeJob(admin, job.id, render, status);
}

async function finalizeJob(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  jobId: string,
  render: CreatomateRender,
  status: string,
) {
  const now = new Date().toISOString();

  if (status === "succeeded") {
    const { error } = await admin
      .from("project_export_jobs")
      .update({
        status: "completed",
        provider: "creatomate",
        external_render_id: render.id,
        output_url: render.url ?? null,
        message: "creatomate succeeded",
        updated_at: now,
      })
      .eq("id", jobId)
      .in("status", ["processing", "queued"]);

    if (error) {
      return NextResponse.json(
        { error: "job_update_failed", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      jobId,
      status: "completed",
      outputUrl: render.url ?? null,
    });
  }

  if (status === "failed") {
    const { error } = await admin
      .from("project_export_jobs")
      .update({
        status: "failed",
        provider: "creatomate",
        external_render_id: render.id,
        message: render.error_message
          ? `creatomate failed: ${render.error_message}`
          : "creatomate failed",
        updated_at: now,
      })
      .eq("id", jobId)
      .in("status", ["processing", "queued"]);

    if (error) {
      return NextResponse.json(
        { error: "job_update_failed", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      jobId,
      status: "failed",
    });
  }

  return NextResponse.json({ ok: true, ignored: true, status });
}
