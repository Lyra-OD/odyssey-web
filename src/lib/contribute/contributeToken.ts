import "server-only";

import { createHash, randomBytes } from "crypto";

/**
 * Tokens opaques pour la contribution invité async (`/[lang]/contribute/[token]`).
 * On ne stocke JAMAIS le token en clair : seul son hash SHA-256 vit dans
 * `project_access_tokens.token_hash`.
 *
 * Canon : docs/IMPLEMENTATION_CASCADE_VFINAL.md · docs/SCANNER_COMPANION.md
 */

export function generateContributeToken(): {
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashContributeToken(token) };
}

export function hashContributeToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}
