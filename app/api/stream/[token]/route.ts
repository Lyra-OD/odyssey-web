import { NextResponse } from "next/server";

import { getDictionary } from "@/lib/dictionaries";
import { loadSessionStreamPayload } from "@/src/lib/wizard/loadSessionStreamPayload";
import { resolveSessionStreamToken } from "@/src/lib/wizard/sessionStreamToken";

export const runtime = "nodejs";

/**
 * GET /api/stream/[token]
 * Séance Quiet Luxury lecture seule (C14 MVP) — token `view_only`.
 */
export async function GET(
  req: Request,
  { params }: { params: { token: string } },
) {
  const token = typeof params.token === "string" ? params.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const tokenRow = await resolveSessionStreamToken(token);
  if (!tokenRow) {
    return NextResponse.json({ error: "invalid_or_expired_link" }, { status: 404 });
  }

  const url = new URL(req.url);
  const locale = url.searchParams.get("lang") === "en" ? "en" : "fr";
  const dictionary = await getDictionary(locale);
  const tw = dictionary.tributeWizard;

  const payload = await loadSessionStreamPayload({
    projectId: tokenRow.project_id,
    locale,
    chapterTitles: {
      chapter1: tw.montageActSparkLabel,
      chapter2: tw.montageActEpicLabel,
      chapter3: tw.montageActLegacyLabel,
      chapter4: tw.montageChapterHorizonsLabel,
      chapter5Plus: tw.montageChapterLegacyMemoryLabel,
      trackCredit: tw.watchSessionTrackCredit,
      trackCreditTitleOnly: tw.watchSessionTrackCreditTitleOnly,
    },
  });

  if (!payload) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...payload });
}
