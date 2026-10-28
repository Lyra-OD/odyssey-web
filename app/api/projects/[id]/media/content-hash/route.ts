import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveWizardCraftAccess } from "@/src/lib/api/projectAccess";
import { ProjectIdSchema } from "@/src/lib/api/projectIdSchema";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    sha256: z.string().trim().toLowerCase().regex(/^[0-9a-f]{64}$/),
  })
  .strict();

/**
 * POST /api/projects/[id]/media/content-hash
 * Présence d’une empreinte exacte parmi les souvenirs déjà envoyés du projet.
 * Une erreur de lecture n’est pas une absence.
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

  const { data, error } = await access.supabase
    .from("media_assets")
    .select("id")
    .eq("project_id", projectId)
    .eq("content_sha256", parsed.data.sha256)
    .eq("upload_status", "uploaded")
    .limit(1);

  if (error) {
    return NextResponse.json(
      { error: "content_hash_lookup_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: data && data.length > 0 ? "present" : "absent",
  });
}
