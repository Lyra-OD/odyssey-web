import "server-only";

import {
  generateOpaqueToken,
  hashOpaqueToken,
} from "@/src/lib/crypto/opaqueToken";

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
  const token = generateOpaqueToken();
  return { token, tokenHash: hashContributeToken(token) };
}

export function hashContributeToken(token: string): string {
  return hashOpaqueToken(token);
}
