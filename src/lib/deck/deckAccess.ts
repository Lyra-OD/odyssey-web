import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const DECK_COOKIE_NAME = "odyssey_deck_ok";
export const DECK_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function getDeckAccessPassword(): string | null {
  const value = process.env.DECK_ACCESS_PASSWORD?.trim();
  return value ? value : null;
}

export function safeEqualPassword(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function deckCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DECK_COOKIE_MAX_AGE,
  };
}

/** Server Components / Route Handlers — cookie httpOnly présent. */
export async function isDeckSessionUnlocked(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(DECK_COOKIE_NAME)?.value === "1";
}

/** Rate limit best-effort (mémoire process) — fails / IP. */
const failBuckets = new Map<string, { count: number; resetAt: number }>();
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const FAIL_MAX = 12;

export function deckUnlockAllowed(ip: string): {
  ok: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();
  const bucket = failBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    failBuckets.set(ip, { count: 0, resetAt: now + FAIL_WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= FAIL_MAX) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { ok: true };
}

export function recordDeckUnlockFailure(ip: string) {
  const now = Date.now();
  const bucket = failBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    failBuckets.set(ip, { count: 1, resetAt: now + FAIL_WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

export function clearDeckUnlockFailures(ip: string) {
  failBuckets.delete(ip);
}

export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
