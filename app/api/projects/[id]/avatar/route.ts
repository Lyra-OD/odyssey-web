import { NextResponse } from "next/server";
import { z } from "zod";

import { requireProjectOwner } from "@/src/lib/api/projectAccess";
import { SIGNED_URL_TTL_SEC } from "@/src/lib/media/storageEgressPolicy";

const DEFAULT_BUCKET = "user-assets";

const ProjectIdSchema = z.string().uuid({ message: "invalid_project_id" });

/**
 * GET /api/projects/[id]/avatar?path=projects/{id}/avatar/...
 * Returns a signed URL for the project avatar (server-side, same pattern as media list).
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

  const storagePath = new URL(req.url).searchParams.get("path")?.trim();
  const expectedPrefix = `projects/${projectId}/avatar/`;

  if (!storagePath || !storagePath.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "invalid_avatar_path" }, { status: 400 });
  }

  const { supabase } = access;
  const { data, error } = await supabase.storage
    .from(DEFAULT_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "signed_url_failed", message: error?.message ?? "missing_url" },
      { status: 400 },
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}
