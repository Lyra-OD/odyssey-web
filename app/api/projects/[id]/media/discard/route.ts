import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveWizardCraftAccess } from "@/src/lib/api/projectAccess";
import { ProjectIdSchema } from "@/src/lib/api/projectIdSchema";
import {
  DISCARD_MAX_PATHS,
  discardUnreferencedStorageObjects,
  isDiscardableOriginalPath,
  normalizeStoragePaths,
} from "@/src/lib/uploads/discardStorageObjects";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "user-assets";

const BodySchema = z
  .object({
    storagePaths: z
      .array(z.string().trim().min(1).max(500))
      .min(1)
      .max(DISCARD_MAX_PATHS),
  })
  .strict();

/**
 * POST /api/projects/[id]/media/discard
 * Supprime les objets d'un upload dont l'enregistrement `media_assets` a échoué.
 * Titulaire ou Co-Créateur (mêmes règles que upload-url / register).
 * Un chemin référencé par `media_assets` n'est jamais supprimé.
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

  const storagePaths = normalizeStoragePaths(parsed.data.storagePaths);
  if (!storagePaths.every((p) => isDiscardableOriginalPath(projectId, p))) {
    return NextResponse.json({ error: "invalid_storage_path" }, { status: 400 });
  }

  const result = await discardUnreferencedStorageObjects({
    admin: getSupabaseAdminClient(),
    bucket: BUCKET,
    projectId,
    storagePaths,
  });

  if (result.failed) {
    return NextResponse.json({ error: "discard_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    removed: result.removed,
    skippedReferenced: result.skippedReferenced,
  });
}
