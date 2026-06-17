import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { partnerBrandingFromSettings, parsePartnerLogoUrl } from "@/src/lib/partner/partnerBrandingFromSettings";
import {
  PartnerTenantSchema,
  type PartnerTenant,
} from "@/src/lib/partner/partnerTenantTypes";

const PARTNER_ROLES = ["partner", "partner_admin"] as const;

const PartnerTenantRpcItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string().nullable().optional(),
  brand_label: z.string(),
  brand_logo_url: z.string().nullable().optional(),
});

const PartnerTenantsRpcSchema = z.array(PartnerTenantRpcItemSchema);

type TenantRow = {
  id: string;
  name: string;
  slug: string | null;
  settings: unknown;
};

function normalizeTenantJoin(
  raw: TenantRow | TenantRow[] | null | undefined,
  fallbackTenantId: string,
): TenantRow | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row?.id) {
    return {
      id: fallbackTenantId,
      name: "Partenaire",
      slug: null,
      settings: {},
    };
  }
  return row;
}

function rpcItemToPartnerTenant(
  item: z.infer<typeof PartnerTenantRpcItemSchema>,
): PartnerTenant | null {
  const logoUrl = parsePartnerLogoUrl(item.brand_logo_url);

  const parsed = PartnerTenantSchema.safeParse({
    id: item.id,
    name: item.name,
    ...(item.slug ? { slug: item.slug } : {}),
    brandLabel: item.brand_label,
    logoUrl,
  });
  return parsed.success ? parsed.data : null;
}

async function fetchPartnerTenantsViaRpc(
  supabase: SupabaseClient,
): Promise<PartnerTenant[] | null> {
  const { data, error } = await supabase.rpc("get_partner_tenants_for_member");

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[fetchPartnerTenantsForUser] RPC", error.message);
    }
    return null;
  }

  const parsed = PartnerTenantsRpcSchema.safeParse(data ?? []);
  if (!parsed.success) return null;

  const tenants: PartnerTenant[] = [];
  for (const item of parsed.data) {
    const tenant = rpcItemToPartnerTenant(item);
    if (tenant) tenants.push(tenant);
  }
  return tenants;
}

async function fetchPartnerTenantsViaJoin(
  supabase: SupabaseClient,
  userId: string,
): Promise<PartnerTenant[]> {
  const { data: rows, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role, tenants(id, name, slug, settings)")
    .eq("user_id", userId)
    .in("role", [...PARTNER_ROLES])
    .order("created_at", { ascending: true });

  if (error) return [];

  const tenants: PartnerTenant[] = [];

  for (const row of rows ?? []) {
    const tenant = normalizeTenantJoin(
      row.tenants as TenantRow | TenantRow[] | null,
      row.tenant_id as string,
    );
    if (!tenant) continue;

    const { brandLabel, logoUrl } = partnerBrandingFromSettings(tenant);

    const parsed = PartnerTenantSchema.safeParse({
      id: tenant.id,
      name: tenant.name,
      ...(tenant.slug ? { slug: tenant.slug } : {}),
      brandLabel,
      logoUrl,
    });
    if (parsed.success) tenants.push(parsed.data);
  }

  return tenants;
}

/** Tenants partenaire + branding (`brand_logo_url` = même PNG que la connexion). */
export async function fetchPartnerTenantsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<PartnerTenant[]> {
  const viaRpc = await fetchPartnerTenantsViaRpc(supabase);
  if (viaRpc !== null) return viaRpc;

  return fetchPartnerTenantsViaJoin(supabase, userId);
}

export type PartnerInitialBrand = {
  brandLabel: string;
  logoUrl: string | null;
};

export function primaryPartnerBrand(
  tenants: PartnerTenant[],
): PartnerInitialBrand | null {
  const first = tenants[0];
  if (!first) return null;
  return {
    brandLabel: first.brandLabel ?? first.name,
    logoUrl: first.logoUrl ?? null,
  };
}

/** Enrichit le branding serveur via RPC publique si le tenant n'a pas de logo en settings. */
export async function resolvePartnerInitialBrand(
  tenants: PartnerTenant[],
  fetchBySlug: (slug: string) => Promise<{ brandLabel: string; logoUrl: string | null } | null>,
): Promise<PartnerInitialBrand | null> {
  const base = primaryPartnerBrand(tenants);
  if (!base || base.logoUrl) return base;

  const slug = tenants.find((t) => t.slug?.trim())?.slug?.trim();
  if (!slug) return base;

  const publicBrand = await fetchBySlug(slug);
  if (!publicBrand?.logoUrl) return base;

  return {
    brandLabel: publicBrand.brandLabel || base.brandLabel,
    logoUrl: publicBrand.logoUrl,
  };
}
