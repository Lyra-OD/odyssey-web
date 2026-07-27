import "server-only";

import {
  generateOpaqueToken,
  hashOpaqueToken,
} from "@/src/lib/crypto/opaqueToken";

const INVITATION_SECRET_BYTES = 32;

/**
 * Secret fort pour magic link (one-time credential).
 * Ne jamais persister cette valeur — uniquement son hash en base.
 */
export function generateInvitationSecret(): string {
  return generateOpaqueToken(INVITATION_SECRET_BYTES);
}

/** SHA-256 hex — valeur stockée dans `partner_invitations.magic_link_token_hash`. */
export function hashInvitationToken(secret: string): string {
  return hashOpaqueToken(secret, { trim: false });
}
