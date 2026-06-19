/** Branding public affiché sur la page connexion Salon (gant blanc). */
export type PartnerPublicBranding = {
  slug: string;
  brandLabel: string;
  logoUrl: string | null;
};

/** Preset d’animation co-branding (connexion lente vs header salon). */
export type SalonBrandAnimationPreset = "connexion" | "dashboard";
export const PARTNER_CONNEXION_SLUG_KEY = "odyssey_partner_connexion_slug";

/** @deprecated Prefer `persistPartnerConnexionSlug` (localStorage + cookie). */
export function storePartnerConnexionSlug(slug: string): void {
  persistPartnerConnexionSlug(slug);
}

/** Mémorise le slug partenaire (Option B) — localStorage + cookie navigateur. */
export function persistPartnerConnexionSlug(slug: string): void {
  const normalized = normalizePartnerSlugParam(slug);
  if (!normalized) return;

  try {
    localStorage.setItem(PARTNER_CONNEXION_SLUG_KEY, normalized);
  } catch {
    /* ignore */
  }

  try {
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${PARTNER_CONNEXION_SLUG_KEY}=${encodeURIComponent(normalized)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
  } catch {
    /* ignore */
  }
}

export function readPartnerConnexionSlug(): string | null {
  try {
    return localStorage.getItem(PARTNER_CONNEXION_SLUG_KEY);
  } catch {
    return null;
  }
}

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
