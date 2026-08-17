import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { ensureFreemiumMediaSoftCapIntent } from "@/src/lib/media/ensureFreemiumMediaSoftCapIntent";
import { STORAGE_CACHE_CONTROL } from "@/src/lib/media/storageEgressPolicy";
import {
  SCAN_ALLOWED_IMAGE_TYPES,
  SCAN_MAX_FILE_BYTES,
  SCAN_MAX_UPLOADS_PER_SESSION,
  SCAN_MEDIA_SOURCE,
  SCAN_STORAGE_BUCKET,
} from "@/src/lib/scanner/scanLimits";
import { resolveScanSession } from "@/src/lib/scanner/resolveScanSession";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

function extensionForMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("heic") || mime.includes("heif")) return "heic";
  return "jpg";
}

/**
 * POST /api/scan/sessions/[token]/upload
 * Multipart `file` — photo famille via téléphone. Compte dans le Soft Cap.
 */
export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  const token = typeof params.token === "string" ? params.token.trim() : "";
  const session = await resolveScanSession(token);
  if (!session) {
    return NextResponse.json({ error: "invalid_or_expired_session" }, { status: 404 });
  }

  if (session.upload_count >= SCAN_MAX_UPLOADS_PER_SESSION) {
    return NextResponse.json(
      {
        error: "session_upload_limit",
        max: SCAN_MAX_UPLOADS_PER_SESSION,
      },
      { status: 403 },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }

  const mimeType = (file.type || "image/jpeg").split(";")[0].trim().toLowerCase();
  if (!SCAN_ALLOWED_IMAGE_TYPES.has(mimeType)) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > SCAN_MAX_FILE_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, user_id, tenant_id")
    .eq("id", session.project_id)
    .maybeSingle();

  if (projectError || !project?.user_id) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const tenantId =
    (session.tenant_id as string | null) ??
    (project.tenant_id as string | null);
  if (!tenantId) {
    return NextResponse.json({ error: "tenant_missing" }, { status: 400 });
  }

  await ensureFreemiumMediaSoftCapIntent(admin, session.project_id);

  const assetId = randomUUID();
  const ext = extensionForMime(mimeType);
  const storagePath = `projects/${session.project_id}/scanner/${session.id}/${assetId}.${ext}`;
  const uploadBody = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(SCAN_STORAGE_BUCKET)
    .upload(storagePath, uploadBody, {
      contentType: mimeType,
      cacheControl: STORAGE_CACHE_CONTROL,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "storage_upload_failed", message: uploadError.message },
      { status: 400 },
    );
  }

  const { count } = await admin
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq("project_id", session.project_id);

  const { data: inserted, error: insertError } = await admin
    .from("media_assets")
    .insert({
      project_id: session.project_id,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: file.size,
      source: SCAN_MEDIA_SOURCE,
      upload_status: "uploaded",
      order_index: count ?? 0,
      owner_user_id: project.user_id,
      tenant_id: tenantId,
    })
    .select("id")
    .maybeSingle();

  if (insertError || !inserted?.id) {
    await admin.storage.from(SCAN_STORAGE_BUCKET).remove([storagePath]);
    const msg = (insertError?.message ?? "").toLowerCase();
    if (msg.includes("media_quota_exceeded")) {
      return NextResponse.json({ error: "media_quota_exceeded" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "media_insert_failed", message: insertError?.message },
      { status: 400 },
    );
  }

  await admin
    .from("scan_sessions")
    .update({
      upload_count: session.upload_count + 1,
      last_upload_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  return NextResponse.json({
    ok: true,
    assetId: inserted.id,
    uploadCount: session.upload_count + 1,
  });
}
