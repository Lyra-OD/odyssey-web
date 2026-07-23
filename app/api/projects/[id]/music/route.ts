import { NextResponse } from "next/server";
import { z } from "zod";

import { requireProjectOwner } from "@/src/lib/api/projectAccess";
import { ensureUserAssetsAllowsPersonalAudio } from "@/src/lib/media/ensureUserAssetsAudioMime";
import {
  SIGNED_URL_TTL_SEC,
  STORAGE_CACHE_CONTROL,
} from "@/src/lib/media/storageEgressPolicy";
import {
  buildChapterMusicUploadPath,
  isPersonalAudioFile,
} from "@/src/lib/wizard/storyboardHelpers";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

const ProjectIdSchema = z.string().uuid({ message: "invalid_project_id" });
const MAX_PERSONAL_AUDIO_BYTES = 40 * 1024 * 1024;
const BUCKET = "user-assets";

function isProjectMusicPath(projectId: string, storagePath: string): boolean {
  const prefix = `projects/${projectId}/music/`;
  return storagePath.startsWith(prefix) && !storagePath.includes("..");
}

/**
 * GET /api/projects/[id]/music?path=projects/{id}/music/...
 * Signed URL pour préécoute d'un MP3/WAV perso.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const projectIdResult = ProjectIdSchema.safeParse(params.id);
  if (!projectIdResult.success) {
    return NextResponse.json({ error: "invalid_project_id" }, { status: 400 });
  }

  const projectId = projectIdResult.data;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const storagePath = new URL(req.url).searchParams.get("path")?.trim() ?? "";
  if (!storagePath || !isProjectMusicPath(projectId, storagePath)) {
    return NextResponse.json({ error: "invalid_music_path" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "signed_url_failed", message: error?.message ?? "missing_url" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, signedUrl: data.signedUrl });
}

/**
 * POST /api/projects/[id]/music
 *
 * Upload MP3/WAV perso (ToS côté wizard). Assure que le bucket accepte
 * les MIME audio, puis écrit via service role sous `projects/{id}/music/`.
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
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_multipart" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  if (!isPersonalAudioFile(file)) {
    return NextResponse.json(
      { error: "unsupported_mime", message: "MP3 or WAV required" },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_PERSONAL_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", message: "max 40MB" },
      { status: 400 },
    );
  }

  try {
    await ensureUserAssetsAllowsPersonalAudio();
  } catch (err) {
    const message = err instanceof Error ? err.message : "mime_allowlist_failed";
    return NextResponse.json(
      { error: "mime_allowlist_failed", message },
      { status: 500 },
    );
  }

  const storagePath = buildChapterMusicUploadPath(projectId, file);
  const contentType = file.type || "audio/mpeg";
  const bytes = Buffer.from(await file.arrayBuffer());
  const admin = getSupabaseAdminClient();

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      cacheControl: STORAGE_CACHE_CONTROL,
      upsert: false,
      contentType,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "upload_failed", message: uploadError.message },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    storagePath,
    mimeType: contentType,
    fileName: file.name,
    sizeBytes: file.size,
  });
}
