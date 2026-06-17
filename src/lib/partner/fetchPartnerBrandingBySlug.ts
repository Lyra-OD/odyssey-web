import "server-only";

import { z } from "zod";

import type { PartnerPublicBranding } from "@/src/lib/partner/partnerBrandingTypes";
import { parsePartnerLogoUrl } from "@/src/lib/partner/partnerBrandingFromSettings";
import { createClient } from "@/utils/supabase/server";

const BrandingRpcSchema = z.object({
  slug: z.string(),
  brand_label: z.string(),
  brand_logo_url: z.string().url().nullable().optional(),
});

/**
 * Résout le branding public d'un partenaire via son slug (lien personnalisé).
 * Utilise la RPC `get_partner_public_branding` (P5.2) — pas de service_role.
 */
export async function fetchPartnerBrandingBySlug(
  slug: string,
): Promise<PartnerPublicBranding | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_partner_public_branding", {
    p_slug: slug,
  });

  if (error || data == null) {
    if (process.env.NODE_ENV === "development" && error) {
      console.error("[fetchPartnerBrandingBySlug]", error.message);
    }
    return null;
  }

  const parsed = BrandingRpcSchema.safeParse(data);
  if (!parsed.success) return null;

  const logoUrl = parsePartnerLogoUrl(parsed.data.brand_logo_url);

  return {
    slug: parsed.data.slug,
    brandLabel: parsed.data.brand_label,
    logoUrl,
  };
}
