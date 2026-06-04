import { NextResponse } from "next/server";
import { z } from "zod";

import {
  searchMusicCatalog,
  StingrayApiError,
} from "@/src/lib/music/stingrayClient";

const QuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(24).optional(),
});

const SERVICE_UNAVAILABLE_MESSAGE =
  "Service musical temporairement indisponible, veuillez réessayer.";

/**
 * GET /api/music/search?q=Charles+Aznavour
 * Proxy serveur vers Stingray Music API (MAPI) — CORS désactivé côté Stingray.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
    limit: searchParams.get("limit") ?? 12,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { q = "", limit = 12 } = parsed.data;

  try {
    const { tracks, source } = await searchMusicCatalog(q, limit);
    return NextResponse.json({
      ok: true,
      source,
      tracks,
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
