import { z } from "zod";

type TenantSettingsSource = {
  name: string;
  settings: unknown;
};

export function partnerBrandingFromSettings(tenant: TenantSettingsSource): {
  brandLabel: string;
  logoUrl: string | null;
} {
  const settings =
    tenant.settings && typeof tenant.settings === "object"
      ? (tenant.settings as Record<string, unknown>)
      : {};

  const brandLabelRaw = settings.brand_label;
  const logoUrlRaw = settings.brand_logo_url;

  const brandLabel =
    typeof brandLabelRaw === "string" && brandLabelRaw.trim().length > 0
      ? brandLabelRaw.trim()
      : tenant.name?.trim() || "Partenaire";

  const logoUrl =
    typeof logoUrlRaw === "string" && logoUrlRaw.trim().length > 0
      ? parsePartnerLogoUrl(logoUrlRaw)
      : null;

  return { brandLabel, logoUrl };
}

/** Accepte les URLs HTTPS publiques Supabase Storage (ne rejette pas tout le tenant). */
export function parsePartnerLogoUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (z.string().url().safeParse(trimmed).success) return trimmed;
  if (/^https?:\/\/.+/i.test(trimmed)) return trimmed;
  return null;
}
