import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveWizardCraftAccess } from "@/src/lib/api/projectAccess";
import { ProjectIdSchema } from "@/src/lib/api/projectIdSchema";
import {
  isDiscardableOriginalPath,
  lookupMediaAssetReference,
} from "@/src/lib/uploads/discardStorageObjects";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    storagePath: z.string().trim().min(1).max(500),
  })
  .strict();

/**
 * POST /api/projects/[id]/media/reconcile
 * Dit si `media_assets` référence déjà ce chemin. Ne supprime rien.
 * Titulaire ou Co-Créateur (mêmes règles que discard).
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

  if (!isDiscardableOriginalPath(projectId, parsed.data.storagePath)) {
    return NextResponse.json({ error: "invalid_storage_path" }, { status: 400 });
  }

  const found = await lookupMediaAssetReference({
    admin: getSupabaseAdminClient(),
    projectId,
    storagePath: parsed.data.storagePath,
  });

  if (found.status === "unknown") {
    return NextResponse.json({ error: "reconcile_failed" }, { status: 500 });
  }

  return NextResponse.json(found);
}
