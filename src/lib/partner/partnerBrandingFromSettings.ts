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
      ? logoUrlRaw.trim()
      : null;

  return { brandLabel, logoUrl };
}
