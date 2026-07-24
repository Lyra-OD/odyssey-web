import "server-only";

import { createHash, randomBytes } from "crypto";

/**
 * Tokens opaques Co-Créateur (`/[lang]/collab/[token]`).
 * Même famille crypto que `contributeToken` — hash SHA-256 only en DB.
 */

export function generateWizardEditorToken(): {
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashWizardEditorToken(token) };
}

export function hashWizardEditorToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}
