import { NextResponse } from "next/server";
import { z } from "zod";

import { attachProjectIdToTrackPreviews } from "@/src/lib/music/musicPreviewUrls";
import { resolveMusicRouteAccess } from "@/src/lib/music/resolveMusicRouteAccess";
import {
  searchMusicCatalog,
  StingrayApiError,
} from "@/src/lib/music/stingrayClient";
import { ProjectIdSchema } from "@/src/lib/api/projectIdSchema";

const QuerySchema = z.object({
  projectId: ProjectIdSchema,
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(24).optional(),
});

const SERVICE_UNAVAILABLE_MESSAGE =
  "Service musical temporairement indisponible, veuillez réessayer.";

/**
 * GET /api/music/search?projectId=…&q=Charles+Aznavour
 * Proxy serveur vers Stingray — auth Wizard + tier catalogue serveur.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    projectId: searchParams.get("projectId") ?? "",
    q: searchParams.get("q") ?? "",
    limit: searchParams.get("limit") ?? 12,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { projectId, q = "", limit = 12 } = parsed.data;
  const access = await resolveMusicRouteAccess(projectId);
  if (!access.ok) return access.response;

  try {
    const { tracks, source } = await searchMusicCatalog(
      q,
      limit,
      access.catalogTier,
    );
    return NextResponse.json({
      ok: true,
      source,
      catalogTier: access.catalogTier,
      tracks: attachProjectIdToTrackPreviews(tracks, projectId),
    });
  } catch (error) {
    console.error("[music/search] Stingray error:", error);

    if (error instanceof StingrayApiError && error.status === 503) {
      return NextResponse.json(
        {
          ok: false,
          error: "service_unavailable",
          message: SERVICE_UNAVAILABLE_MESSAGE,
          tracks: [],
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "upstream_error",
        message: SERVICE_UNAVAILABLE_MESSAGE,
        tracks: [],
      },
      { status: 502 },
    );
  }
}
