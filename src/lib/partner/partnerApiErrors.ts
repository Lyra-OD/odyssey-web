import { NextResponse } from "next/server";

/** Stable API error codes — translate in UI via `dictionary.salon.apiErrors`. */
export const PARTNER_API_ERROR = {
  UNAUTHENTICATED: "ERR_UNAUTHENTICATED",
  FORBIDDEN: "ERR_FORBIDDEN",
  INVALID_TENANT: "ERR_INVALID_TENANT",
  WALLET_NOT_FOUND: "ERR_WALLET_NOT_FOUND",
  INTERNAL: "ERR_INTERNAL",
} as const;

export type PartnerApiErrorCode =
  (typeof PARTNER_API_ERROR)[keyof typeof PARTNER_API_ERROR];

export function partnerApiErrorResponse(
  code: PartnerApiErrorCode,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: code, ...extra }, { status });
}
