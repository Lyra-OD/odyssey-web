import { NextResponse } from "next/server";
import { z } from "zod";

import { requireProjectOwner } from "@/src/lib/api/projectAccess";

const ProjectIdSchema = z.string().uuid({ message: "invalid_project_id" });

const ReorderItemSchema = z.object({
  id: z.string().uuid(),
  order_index: z.number().int().min(0).max(9999),
});

const ReorderBodySchema = z
  .object({
    items: z.array(ReorderItemSchema).min(1).max(150),
  })
  .strict();

/**
 * PATCH /api/projects/[id]/media/reorder
 *
 * Updates order_index for media_assets belonging to the caller's project.
 * Each item is updated individually with project_id guard (RLS + explicit filter).
 */
export async function PATCH(
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

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ReorderBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { supabase } = access;
  const updates = parsed.data.items;

  const results = await Promise.all(
    updates.map(async ({ id, order_index }) => {
      const { data, error } = await supabase
        .from("media_assets")
        .update({ order_index })
        .eq("id", id)
        .eq("project_id", projectId)
        .select("id")
        .maybeSingle();

      return { id, ok: !error && Boolean(data), error: error?.message };
    }),
  );

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    return NextResponse.json(
      {
        error: "media_reorder_failed",
        failed,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    updated: results.length,
  });
}
