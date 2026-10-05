import { NextResponse } from "next/server";
import { z } from "zod";

import {
  clearDeckUnlockFailures,
  clientIpFromRequest,
  DECK_COOKIE_NAME,
  deckCookieOptions,
  deckUnlockAllowed,
  getDeckAccessPassword,
  recordDeckUnlockFailure,
  safeEqualPassword,
} from "@/src/lib/deck/deckAccess";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    password: z.string().min(1).max(200),
  })
  .strict();

/**
 * POST /api/deck/unlock — vérifie DECK_ACCESS_PASSWORD, pose cookie httpOnly.
 */
export async function POST(req: Request) {
  const expected = getDeckAccessPassword();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 503 },
    );
  }

  const ip = clientIpFromRequest(req);
  const limit = deckUnlockAllowed(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: limit.retryAfterSec
          ? { "Retry-After": String(limit.retryAfterSec) }
          : undefined,
      },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  if (!safeEqualPassword(body.password, expected)) {
    recordDeckUnlockFailure(ip);
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  clearDeckUnlockFailures(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DECK_COOKIE_NAME, "1", deckCookieOptions());
  return res;
}
