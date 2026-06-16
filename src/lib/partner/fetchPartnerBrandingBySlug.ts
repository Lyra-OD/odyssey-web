import "server-only";

import { z } from "zod";

import type { PartnerPublicBranding } from "@/src/lib/partner/partnerBrandingTypes";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

const TenantSettingsSchema = z
  .object({
    brand_label: z.string().optional(),
    brand_logo_url: z.string().url().optional(),
  })
  .passthrough();

type TenantBrandingRow = {
  slug: string | null;
  name: string | null;
  settings: unknown;
};

/**
 * Résout le branding public d'un partenaire via son slug (lien personnalisé).
 * Ne retourne que des champs sûrs à exposer sans authentification.
 */
export async function fetchPartnerBrandingBySlug(
  slug: string,
): Promise<PartnerPublicBranding | null> {
  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return null;
  }

  const { data, error } = await admin
    .from("tenants")
    .select("slug, name, settings")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data?.slug) return null;

  const row = data as TenantBrandingRow & { slug: string };
  const settings = TenantSettingsSchema.safeParse(row.settings ?? {});

  const brandLabel =
    settings.success && settings.data.brand_label?.trim()
      ? settings.data.brand_label.trim()
      : row.name?.trim() || row.slug;

  const logoUrl =
    settings.success && settings.data.brand_logo_url?.trim()
      ? settings.data.brand_logo_url.trim()
      : null;

  return {
    slug: row.slug,
    brandLabel,
    logoUrl,
  };
}
