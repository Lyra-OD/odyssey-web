/** Branding public affiché sur la page connexion Salon (gant blanc). */
export type PartnerPublicBranding = {
  slug: string;
  brandLabel: string;
  logoUrl: string | null;
};

/** Slug URL-safe : lettres minuscules, chiffres, tirets. */
const PARTNER_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizePartnerSlugParam(
  raw: string | string[] | undefined | null,
): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  if (!slug || slug.length > 64 || !PARTNER_SLUG_RE.test(slug)) return null;
  return slug;
}
