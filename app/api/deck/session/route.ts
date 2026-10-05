import { NextResponse } from "next/server";

import {
  getDeckAccessPassword,
  isDeckSessionUnlocked,
} from "@/src/lib/deck/deckAccess";

export const runtime = "nodejs";

/**
 * GET /api/deck/session — { ok, configured } pour le client gate.
 */
export async function GET() {
  const configured = Boolean(getDeckAccessPassword());
  const ok = configured ? await isDeckSessionUnlocked() : false;
  return NextResponse.json({ ok, configured });
}
