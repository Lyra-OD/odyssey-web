import { NextResponse } from "next/server";
import { z } from "zod";

import {
  fetchStingrayTrackStream,
  StingrayApiError,
} from "@/src/lib/music/stingrayClient";
import { parseStingrayTrackId } from "@/src/lib/music/stingrayTrackId";
import { resolveStingrayStreamUrl } from "@/src/lib/wizard/stingrayCatalog";

const QuerySchema = z.object({
  trackId: z.string().trim().min(1).max(200),
});

/**
 * GET /api/music/stream?trackId=…
 * Retourne l’URL de flux preview (proxy same-origin pour le client).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    trackId: searchParams.get("trackId") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { trackId } = parsed.data;
  const parsedStingray = parseStingrayTrackId(trackId);

  if (parsedStingray) {
    try {
      await fetchStingrayTrackStream(
        parsedStingray.playlistId,
        parsedStingray.songId,
      );
      const streamUrl = `/api/music/preview?trackId=${encodeURIComponent(trackId)}`;
      return NextResponse.json({ ok: true, streamUrl });
    } catch (error) {
      const status =
        error instanceof StingrayApiError ? error.status : 502;
      return NextResponse.json({ error: "track_not_found" }, { status });
    }
  }

  const legacyUrl = resolveStingrayStreamUrl(trackId);
  if (!legacyUrl) {
    return NextResponse.json({ error: "track_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    streamUrl: `/api/music/preview?trackId=${encodeURIComponent(trackId)}`,
  });
}
