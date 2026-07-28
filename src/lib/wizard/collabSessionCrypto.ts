import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { WIZARD_EDITOR_COOKIE_TTL_DAYS } from "@/src/lib/wizard/collabCapabilities";

export type WizardEditorCookiePayload = {
  v: 1;
  projectId: string;
  tokenId: string;
  role: "editor";
  /** Unix seconds */
  exp: number;
};

function getCookieSecret(): string {
  const explicit = process.env.WIZARD_EDITOR_COOKIE_SECRET?.trim();
  if (explicit) return explicit;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fallback) return fallback;
  throw new Error(
    "Missing WIZARD_EDITOR_COOKIE_SECRET (or SUPABASE_SERVICE_ROLE_KEY fallback).",
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

export function encodeWizardEditorCookie(
  payload: WizardEditorCookiePayload,
): string {
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

export function decodeWizardEditorCookie(
  raw: string,
): WizardEditorCookiePayload | null {
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
    if (obj.role !== "editor") return null;
    if (typeof obj.projectId !== "string" || !obj.projectId) return null;
    if (typeof obj.tokenId !== "string" || !obj.tokenId) return null;
    if (typeof obj.exp !== "number" || !Number.isFinite(obj.exp)) return null;
    if (obj.exp * 1000 <= Date.now()) return null;
    return {
      v: 1,
      projectId: obj.projectId,
      tokenId: obj.tokenId,
      role: "editor",
      exp: obj.exp,
    };
  } catch {
    return null;
  }
}

export function buildWizardEditorCookiePayload(params: {
  projectId: string;
  tokenId: string;
  ttlDays?: number;
}): WizardEditorCookiePayload {
  const ttlDays = params.ttlDays ?? WIZARD_EDITOR_COOKIE_TTL_DAYS;
  return {
    v: 1,
    projectId: params.projectId,
    tokenId: params.tokenId,
    role: "editor",
    exp: Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60,
  };
}

export function wizardEditorCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}
