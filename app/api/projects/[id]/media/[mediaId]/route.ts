import { NextResponse } from "next/server";
import { z } from "zod";

import { requireProjectOwner } from "@/src/lib/api/projectAccess";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

const DEFAULT_BUCKET = "user-assets";

const ProjectIdSchema = z.string().uuid({ message: "invalid_project_id" });
const MediaIdSchema = z.string().uuid({ message: "invalid_media_id" });

type MediaAssetRow = {
  id: string;
  project_id: string;
  storage_path: string;
  owner_user_id: string;
  tenant_id: string;
};

function isStoragePathOwnedByProject(
  storagePath: string,
  projectId: string,
): boolean {
  const expectedPrefix = `projects/${projectId}/`;
  return (
    storagePath.startsWith(expectedPrefix) &&
    !storagePath.includes("..") &&
    storagePath.length > expectedPrefix.length
  );
}

/**
 * DELETE /api/projects/[id]/media/[mediaId]
 *
 * Privacy-critical: removes DB row AND physical Storage object.
 * Storage delete uses service_role after session ownership verification.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; mediaId: string } },
) {
  const projectIdResult = ProjectIdSchema.safeParse(params.id);
  if (!projectIdResult.success) {
    return NextResponse.json({ error: "invalid_project_id" }, { status: 400 });
  }

  const mediaIdResult = MediaIdSchema.safeParse(params.mediaId);
  if (!mediaIdResult.success) {
    return NextResponse.json({ error: "invalid_media_id" }, { status: 400 });
  }

  const projectId = projectIdResult.data;
  const mediaId = mediaIdResult.data;

  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const { supabase } = access;

  const { data: asset, error: fetchError } = await supabase
    .from("media_assets")
    .select("id, project_id, storage_path, owner_user_id, tenant_id")
    .eq("id", mediaId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { error: "media_lookup_failed", message: fetchError.message },
      { status: 400 },
    );
  }

  if (!asset) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = asset as MediaAssetRow;

  if (row.project_id !== projectId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!row.storage_path?.trim()) {
    return NextResponse.json(
      { error: "invalid_storage_path", message: "Asset has no storage_path" },
      { status: 400 },
    );
  }

  if (!isStoragePathOwnedByProject(row.storage_path, projectId)) {
    return NextResponse.json(
      {
        error: "invalid_storage_path",
        message: "Storage path does not match project",
      },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdminClient();

  const { error: storageError } = await admin.storage
    .from(DEFAULT_BUCKET)
    .remove([row.storage_path]);

  if (storageError) {
    const message = storageError.message.toLowerCase();
    const notFound =
      message.includes("not found") || message.includes("object not found");
    if (!notFound) {
      return NextResponse.json(
        {
          error: "storage_delete_failed",
          message: storageError.message,
        },
        { status: 400 },
      );
    }
  }

  const { error: deleteError, count } = await admin
    .from("media_assets")
    .delete({ count: "exact" })
    .eq("id", mediaId)
    .eq("project_id", projectId);

  if (deleteError) {
    return NextResponse.json(
      { error: "media_delete_failed", message: deleteError.message },
      { status: 400 },
    );
  }

  if (!count) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    id: mediaId,
    storagePath: row.storage_path,
  });
}
