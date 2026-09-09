import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { NextResponse } from "next/server";

/**
 * Session invité (porte famille partagée, identité appareil).
 * Même famille crypto que le cookie Co-Créateur : HMAC, httpOnly, jamais le
 * token URL. Pas de table SQL en V1 — l’identité vit dans le cookie + le
 * chemin Storage `contribute/{tokenId}/{sessionId}/`.
 */

export const GUEST_SESSION_COOKIE_NAME = "odyssey_guest";
export const GUEST_SESSION_TTL_DAYS = 30;

export type GuestSessionCookiePayload = {
  v: 1;
  tokenId: string;
  sessionId: string;
  /** Unix seconds */
  exp: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getCookieSecret(): string {
  const explicit = process.env.GUEST_SESSION_COOKIE_SECRET?.trim();
  if (explicit) return explicit;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fallback) return fallback;
  throw new Error(
    "Missing GUEST_SESSION_COOKIE_SECRET (or SUPABASE_SERVICE_ROLE_KEY fallback).",
  );
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function signPayload(payloadB64: string): string {
  return b64url(
    createHmac("sha256", getCookieSecret()).update(payloadB64).digest(),
  );
}

export function encodeGuestSessionCookie(
  payload: GuestSessionCookiePayload,
): string {
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

export function decodeGuestSessionCookie(
  raw: string,
): GuestSessionCookiePayload | null {
  const trimmed = raw.trim();
  const dot = trimmed.indexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  if (!payloadB64 || !sig) return null;

  const expected = signPayload(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const json = JSON.parse(fromB64url(payloadB64).toString("utf8")) as unknown;
    if (!json || typeof json !== "object" || Array.isArray(json)) return null;
    const obj = json as Record<string, unknown>;
    if (obj.v !== 1) return null;
    if (typeof obj.tokenId !== "string" || !UUID_RE.test(obj.tokenId)) {
      return null;
    }
    if (typeof obj.sessionId !== "string" || !UUID_RE.test(obj.sessionId)) {
      return null;
    }
    if (typeof obj.exp !== "number" || !Number.isFinite(obj.exp)) return null;
    if (obj.exp * 1000 <= Date.now()) return null;
    return {
      v: 1,
      tokenId: obj.tokenId,
      sessionId: obj.sessionId,
      exp: obj.exp,
    };
  } catch {
    return null;
  }
}

export function mintGuestSessionPayload(
  tokenId: string,
  ttlDays = GUEST_SESSION_TTL_DAYS,
): GuestSessionCookiePayload {
  return {
    v: 1,
    tokenId,
    sessionId: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60,
  };
}

function cookieValueFromHeader(
  header: string | null | undefined,
  name: string,
): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    return trimmed.slice(eq + 1);
  }
  return null;
}

export function resolveOrMintGuestSession(params: {
  cookieHeader: string | null | undefined;
  tokenId: string;
}): { payload: GuestSessionCookiePayload; minted: boolean } {
  const raw = cookieValueFromHeader(
    params.cookieHeader,
    GUEST_SESSION_COOKIE_NAME,
  );
  if (raw) {
    const decoded = decodeGuestSessionCookie(raw);
    if (decoded && decoded.tokenId === params.tokenId) {
      return { payload: decoded, minted: false };
    }
  }
  return { payload: mintGuestSessionPayload(params.tokenId), minted: true };
}

export function guestSessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/" as const,
    maxAge: maxAgeSec,
  };
}

/** Pose le cookie seulement si on vient de le mint (évite Set-Cookie à chaque GET). */
export function attachGuestSessionCookieIfMinted(
  response: NextResponse,
  session: { payload: GuestSessionCookiePayload; minted: boolean },
): void {
  if (!session.minted) return;
  const maxAge = Math.max(
    0,
    session.payload.exp - Math.floor(Date.now() / 1000),
  );
  response.cookies.set(
    GUEST_SESSION_COOKIE_NAME,
    encodeGuestSessionCookie(session.payload),
    guestSessionCookieOptions(maxAge),
  );
}
