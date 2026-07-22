import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { resolveContributeToken } from "@/src/lib/contribute/accessToken";
import { STORAGE_CACHE_CONTROL } from "@/src/lib/media/storageEgressPolicy";

export const runtime = "nodejs";

const BUCKET = "user-assets";
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const MAX_MESSAGE_CHARS = 500;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const JsonBodySchema = z
  .object({
    kind: z.literal("message"),
    messageText: z.string().min(1).max(MAX_MESSAGE_CHARS),
    contributorName: z.string().min(1).max(200),
    contributorEmail: z.string().email().optional(),
    consentMarketing: z.boolean().optional(),
  })
  .strict();

function extensionForMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("heic") || mime.includes("heif")) return "heic";
  return "jpg";
}

/**
 * POST /api/contribute/[token]/deposit
 *
 * Dépôt gratuit Sanctuaire (Étape 1) — public anonymé via token.
 * - kind=message : JSON { messageText, contributorName, ... }
 * - kind=photo   : multipart form-data (file, contributorName, ...)
 *
 * Insert admin `media_assets` : contributor_type=guest, review_status=pending_review.
 * Hors Soft Cap famille (voir odyssey_p10_2_guest_sanctuary.sql).
 */
export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  const tokenRow = await resolveContributeToken(params.token);
  if (!tokenRow) {
    return NextResponse.json({ error: "invalid_or_expired_link" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  const admin = getSupabaseAdminClient();

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, user_id, tenant_id")
    .eq("id", tokenRow.project_id)
    .maybeSingle();

  if (projectError || !project?.user_id) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const ownerUserId = project.user_id as string;
  const tenantId =
    (tokenRow.tenant_id as string | null) ??
    (project.tenant_id as string | null);
  if (!tenantId) {
    return NextResponse.json({ error: "tenant_missing" }, { status: 400 });
  }

  let kind: "photo" | "message";
  let contributorName: string;
  let contributorEmail: string | undefined;
  let consentMarketing = false;
  let messageText: string | null = null;
  let fileBytes: ArrayBuffer | null = null;
  let mimeType: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "invalid_form" }, { status: 400 });
    }

    const kindRaw = String(form.get("kind") ?? "photo");
    if (kindRaw !== "photo" && kindRaw !== "message") {
      return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
    }
    kind = kindRaw;
    contributorName = String(form.get("contributorName") ?? "").trim();
    if (!contributorName) {
      return NextResponse.json({ error: "contributor_name_required" }, { status: 400 });
    }
    const emailRaw = form.get("contributorEmail");
    if (typeof emailRaw === "string" && emailRaw.trim()) {
      const emailParsed = z.string().email().safeParse(emailRaw.trim());
      if (!emailParsed.success) {
        return NextResponse.json({ error: "invalid_email" }, { status: 400 });
      }
      contributorEmail = emailParsed.data;
    }
    consentMarketing = String(form.get("consentMarketing") ?? "") === "true";

    if (kind === "message") {
      messageText = String(form.get("messageText") ?? "").trim();
      if (!messageText || messageText.length > MAX_MESSAGE_CHARS) {
        return NextResponse.json({ error: "invalid_message" }, { status: 400 });
      }
    } else {
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file_required" }, { status: 400 });
      }
      mimeType = file.type || "image/jpeg";
      if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
        return NextResponse.json({ error: "unsupported_media_type" }, { status: 400 });
      }
      if (file.size <= 0 || file.size > MAX_PHOTO_BYTES) {
        return NextResponse.json({ error: "file_too_large" }, { status: 400 });
      }
      fileBytes = await file.arrayBuffer();
    }
  } else {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    const parsed = JsonBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    kind = "message";
    contributorName = parsed.data.contributorName.trim();
    contributorEmail = parsed.data.contributorEmail;
    consentMarketing = parsed.data.consentMarketing === true;
    messageText = parsed.data.messageText.trim();
  }

  const assetId = randomUUID();
  const basePath = `projects/${tokenRow.project_id}/contribute/${tokenRow.id}`;

  let storagePath: string;
  let sizeBytes: number;
  let source: string;
  let uploadBody: Buffer;
  let contentTypeUpload: string;

  if (kind === "message") {
    storagePath = `${basePath}/${assetId}.txt`;
    const text = messageText ?? "";
    uploadBody = Buffer.from(text, "utf8");
    sizeBytes = uploadBody.byteLength;
    mimeType = "text/plain";
    source = "guest_message";
    contentTypeUpload = "text/plain; charset=utf-8";
  } else {
    const ext = extensionForMime(mimeType ?? "image/jpeg");
    storagePath = `${basePath}/${assetId}.${ext}`;
    uploadBody = Buffer.from(fileBytes!);
    sizeBytes = uploadBody.byteLength;
    source = "guest_photo";
    contentTypeUpload = mimeType ?? "image/jpeg";
  }

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, uploadBody, {
      contentType: contentTypeUpload,
      cacheControl: STORAGE_CACHE_CONTROL,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "storage_upload_failed", message: uploadError.message },
      { status: 400 },
    );
  }

  // order_index : append en fin de liste projet (hors Soft Cap, mais ordonné).
  const { count } = await admin
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq("project_id", tokenRow.project_id);

  const { data: inserted, error: insertError } = await admin
    .from("media_assets")
    .insert({
      project_id: tokenRow.project_id,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      source,
      upload_status: "uploaded",
      order_index: count ?? 0,
      owner_user_id: ownerUserId,
      tenant_id: tenantId,
      contributor_type: "guest",
      contributor_email: contributorEmail ?? null,
      contributor_name: contributorName,
      review_status: "pending_review",
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: "media_insert_failed", message: insertError?.message },
      { status: 400 },
    );
  }

  if (contributorEmail) {
    const consentRows: Record<string, unknown>[] = [
      {
        project_id: tokenRow.project_id,
        tenant_id: tenantId,
        email: contributorEmail,
        consent_type: "transactional",
        granted: true,
        source: "contribute_deposit",
      },
    ];
    if (consentMarketing) {
      consentRows.push({
        project_id: tokenRow.project_id,
        tenant_id: tenantId,
        email: contributorEmail,
        consent_type: "marketing",
        granted: true,
        source: "contribute_deposit",
      });
    }
    await admin.from("consent_records").insert(consentRows);
  }

  return NextResponse.json({
    ok: true,
    deposit: {
      id: inserted.id as string,
      kind,
      contributorName,
      contributorEmail: contributorEmail ?? null,
    },
  });
}
