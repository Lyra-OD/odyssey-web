import { NextResponse } from "next/server";
import { z } from "zod";

import { requireProjectOwner } from "@/src/lib/api/projectAccess";
import { hydrateMediaRowsWithSignedUrls } from "@/src/lib/media/hydrateMediaSignedUrls.server";
import type { HydratedMediaListResponse } from "@/src/lib/media/mediaTypes";

const ProjectIdSchema = z.string().uuid({ message: "invalid_project_id" });

type MediaAssetRow = {
  id: string;
  project_id: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  order_index: number | null;
  upload_status: string;
  source: string;
  owner_user_id: string;
  tenant_id: string;
};

/**
 * GET /api/projects/[id]/media
 *
 * Lists uploaded media_assets for a project owned by the caller.
 * Generates signed Storage URLs server-side (private bucket `user-assets`).
 * Grid `previewUrl` prefers WebP thumb when present; `fullPreviewUrl` is always original.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const projectIdResult = ProjectIdSchema.safeParse(params.id);
  if (!projectIdResult.success) {
    return NextResponse.json({ error: "invalid_project_id" }, { status: 400 });
  }

  const projectId = projectIdResult.data;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const { supabase } = access;

  const { data: rows, error: fetchError } = await supabase
    .from("media_assets")
    .select(
      "id, project_id, storage_path, mime_type, size_bytes, order_index, upload_status, source, owner_user_id, tenant_id",
    )
    .eq("project_id", projectId)
    .eq("upload_status", "uploaded")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (fetchError) {
    return NextResponse.json(
      { error: "media_fetch_failed", message: fetchError.message },
      { status: 400 },
    );
  }

  const assets = (rows ?? []) as MediaAssetRow[];
  const items = await hydrateMediaRowsWithSignedUrls(supabase, assets);

  const body: HydratedMediaListResponse = { items };
  return NextResponse.json(body);
}
