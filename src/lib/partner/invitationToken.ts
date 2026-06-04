import "server-only";

import { createHash, randomBytes } from "node:crypto";

const INVITATION_SECRET_BYTES = 32;

/**
 * Secret fort pour magic link (one-time credential).
 * Ne jamais persister cette valeur — uniquement son hash en base.
 */
export function generateInvitationSecret(): string {
  return randomBytes(INVITATION_SECRET_BYTES).toString("base64url");
}

/** SHA-256 hex — valeur stockée dans `partner_invitations.magic_link_token_hash`. */
export function hashInvitationToken(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}
