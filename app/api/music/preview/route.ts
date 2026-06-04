import { NextResponse } from "next/server";
import { z } from "zod";

import {
  fetchStingrayTrackStream,
  StingrayApiError,
} from "@/src/lib/music/stingrayClient";
import { parseStingrayTrackId } from "@/src/lib/music/stingrayTrackId";
import { resolveStingrayStreamUrl } from "@/src/lib/wizard/stingrayCatalog";
import { getStingrayConfig } from "@/src/lib/music/stingrayConfig";

const QuerySchema = z.object({
  trackId: z.string().trim().min(1).max(200),
});

/**
 * GET /api/music/preview?trackId=…
 * Proxy same-origin : Stingray MAPI (sr:playlist:song) ou mock catalogue legacy.
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
      const upstream = await fetchStingrayTrackStream(
        parsedStingray.playlistId,
        parsedStingray.songId,
      );

      const headers = new Headers();
      headers.set(
        "Content-Type",
        upstream.headers.get("Content-Type") ?? "audio/mpeg",
      );
      headers.set("Cache-Control", "private, max-age=300");
      headers.set("Accept-Ranges", "bytes");

      const contentLength = upstream.headers.get("Content-Length");
      if (contentLength) headers.set("Content-Length", contentLength);

      return new Response(upstream.body, { status: 200, headers });
    } catch (error) {
      console.error("[music/preview] Stingray stream failed:", trackId, error);
      const status =
        error instanceof StingrayApiError ? error.status : 502;
      return NextResponse.json(
        { error: "preview_unavailable", trackId },
        { status: status === 404 ? 404 : 502 },
      );
    }
  }

  const config = getStingrayConfig();
  const upstreamUrl = resolveStingrayStreamUrl(trackId);
  if (!upstreamUrl) {
    return NextResponse.json({ error: "track_not_found" }, { status: 404 });
  }

  if (!config.useMock) {
    return NextResponse.json(
      { error: "legacy_mock_track_disabled" },
      { status: 404 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { Range: request.headers.get("range") ?? "" },
      cache: "force-cache",
    });
  } catch (error) {
    console.error("[music/preview] Mock upstream fetch failed:", trackId, error);
    return NextResponse.json({ error: "upstream_fetch_failed" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("Content-Type") ?? "audio/mpeg",
  );
  headers.set("Cache-Control", "public, max-age=86400");
  headers.set("Accept-Ranges", upstream.headers.get("Accept-Ranges") ?? "bytes");

  for (const name of ["Content-Length", "Content-Range"] as const) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
