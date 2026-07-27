import "server-only";

import {
  generateOpaqueToken,
  hashOpaqueToken,
} from "@/src/lib/crypto/opaqueToken";

/**
 * Tokens opaques Co-Créateur (`/[lang]/collab/[token]`).
 * Même famille crypto que `contributeToken` — hash SHA-256 only en DB.
 */

export function generateWizardEditorToken(): {
  token: string;
  tokenHash: string;
} {
  const token = generateOpaqueToken();
  return { token, tokenHash: hashWizardEditorToken(token) };
}

export function hashWizardEditorToken(token: string): string {
  return hashOpaqueToken(token);
}
