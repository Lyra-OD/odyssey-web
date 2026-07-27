import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Opaque one-time credentials (contribute / collab / partner magic links).
 * Persist SHA-256 hex only — never the raw token.
 */

export function generateOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/**
 * @param trim — default true (contribute/collab). Partner invitation hashes
 *   historically omit trim; pass `{ trim: false }` to preserve that behavior.
 */
export function hashOpaqueToken(
  token: string,
  options?: { trim?: boolean },
): string {
  const value = options?.trim === false ? token : token.trim();
  return createHash("sha256").update(value, "utf8").digest("hex");
}
