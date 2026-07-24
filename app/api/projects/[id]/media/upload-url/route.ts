import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveWizardCraftAccess } from "@/src/lib/api/projectAccess";
import { STORAGE_CACHE_CONTROL } from "@/src/lib/media/storageEgressPolicy";
import { thumbStoragePathFor } from "@/src/lib/media/thumbnailPath";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const ProjectIdSchema = z.string().uuid({ message: "invalid_project_id" });
const BodySchema = z
  .object({
    fileName: z.string().trim().min(1).max(200),
    mimeType: z.string().trim().max(120).optional(),
    sizeBytes: z.number().int().positive().max(300 * 1024 * 1024),
    orderIndex: z.number().int().min(0).max(9999).optional(),
    kind: z.enum(["original", "thumb"]).optional(),
    /** Pour thumb : path de l'original déjà alloué. */
    baseStoragePath: z.string().trim().max(500).optional(),
  })
  .strict();

const BUCKET = "user-assets";

function safeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

function extFromName(fileName: string, mimeType?: string): string {
  const fromName = fileName.split(".").pop();
  if (fromName && fromName.length <= 10) return fromName.toLowerCase();
  if (mimeType?.startsWith("image/")) return "jpg";
  if (mimeType?.startsWith("video/")) return "mp4";
  return "bin";
}

function buildOriginalPath(
  projectId: string,
  fileName: string,
  mimeType: string | undefined,
  orderIndex: number,
): string {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const ext = extFromName(fileName, mimeType);
  const baseName = safeFileName(fileName.replace(/\.[^.]+$/, ""));
  return `projects/${projectId}/${yyyy}/${mm}/${dd}/${orderIndex}-${baseName}-${crypto.randomUUID()}.${ext}`;
}

function isProjectMediaPath(projectId: string, storagePath: string): boolean {
  const prefix = `projects/${projectId}/`;
  return (
    storagePath.startsWith(prefix) &&
    !storagePath.includes("..") &&
    storagePath.length > prefix.length
  );
}

/**
 * POST /api/projects/[id]/media/upload-url
 * Signed upload URL (service role) — Owner ou Co-Créateur.
 * Pas de proxy fichier : le client upload directement vers Storage.
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

  const kind = parsed.data.kind ?? "original";
  let storagePath: string;

  if (kind === "thumb") {
    const base = parsed.data.baseStoragePath?.trim() ?? "";
    if (!base || !isProjectMediaPath(projectId, base)) {
      return NextResponse.json({ error: "invalid_base_path" }, { status: 400 });
    }
    storagePath = thumbStoragePathFor(base);
  } else {
    storagePath = buildOriginalPath(
      projectId,
      parsed.data.fileName,
      parsed.data.mimeType,
      parsed.data.orderIndex ?? 0,
    );
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (error || !data?.token || !data.path) {
    return NextResponse.json({ error: "signed_url_failed" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
    bucket: BUCKET,
    cacheControl: STORAGE_CACHE_CONTROL,
  });
}
