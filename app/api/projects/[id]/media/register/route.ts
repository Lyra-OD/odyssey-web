import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveWizardCraftAccess } from "@/src/lib/api/projectAccess";
import { ensureFreemiumMediaSoftCapIntent } from "@/src/lib/media/ensureFreemiumMediaSoftCapIntent";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { ProjectIdSchema } from "@/src/lib/api/projectIdSchema";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    storagePath: z.string().trim().min(1).max(500),
    mimeType: z.string().trim().max(120).nullable().optional(),
    sizeBytes: z.number().int().nonnegative().max(300 * 1024 * 1024),
    orderIndex: z.number().int().min(0).max(9999),
    source: z
      .enum(["local", "facebook", "instagram", "tiktok", "google_photos"])
      .optional(),
  })
  .strict();

function isProjectMediaPath(projectId: string, storagePath: string): boolean {
  const prefix = `projects/${projectId}/`;
  return (
    storagePath.startsWith(prefix) &&
    !storagePath.includes("..") &&
    storagePath.length > prefix.length
  );
}

/**
 * POST /api/projects/[id]/media/register
 * Enregistre `media_assets` après upload signé (admin).
 * `owner_user_id` = titulaire du projet (jamais l'éditeur anonyme).
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

  const access = await resolveWizardCraftAccess(projectId);
  if (!access.ok) return access.response;

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

  if (!isProjectMediaPath(projectId, parsed.data.storagePath)) {
    return NextResponse.json({ error: "invalid_storage_path" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, user_id, tenant_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project?.user_id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Soft Cap intent avant upsert — évite media_quota_exceeded à 50 sur freemium.
  await ensureFreemiumMediaSoftCapIntent(admin, projectId);

  const row = {
    project_id: projectId,
    storage_path: parsed.data.storagePath,
    mime_type: parsed.data.mimeType ?? null,
    size_bytes: parsed.data.sizeBytes,
    source: parsed.data.source ?? "local",
    upload_status: "uploaded",
    order_index: parsed.data.orderIndex,
    owner_user_id: project.user_id,
    ...(project.tenant_id ? { tenant_id: project.tenant_id } : {}),
  };

  const { data: inserted, error: insertError } = await admin
    .from("media_assets")
    .upsert(row, {
      onConflict: "project_id,storage_path",
      ignoreDuplicates: false,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    const msg = insertError.message.toLowerCase();
    if (msg.includes("media_quota_exceeded")) {
      return NextResponse.json({ error: "media_quota_exceeded" }, { status: 400 });
    }
    return NextResponse.json({ error: "media_register_failed" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    assetId: inserted?.id ?? null,
    storagePath: parsed.data.storagePath,
  });
}
