import "server-only";

import {
  generateOpaqueToken,
  hashOpaqueToken,
} from "@/src/lib/crypto/opaqueToken";

/**
 * Token QR Scanner — 128 bits, hash SHA-256 en DB uniquement.
 * Canon : docs/SCANNER_COMPANION.md
 */
export function generateScanSessionToken(): {
  token: string;
  tokenHash: string;
} {
  const token = generateOpaqueToken(16);
  return { token, tokenHash: hashScanSessionToken(token) };
}

export function hashScanSessionToken(token: string): string {
  return hashOpaqueToken(token);
}
