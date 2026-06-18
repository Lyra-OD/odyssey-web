import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getPartnerCapabilities } from "@/src/lib/partner/partnerCapabilities";
import { partnerBrandingFromSettings, parsePartnerLogoUrl } from "@/src/lib/partner/partnerBrandingFromSettings";
import {
  isPartnerMemberRole,
  PARTNER_MEMBER_ROLES,
  type PartnerMemberRole,
} from "@/src/lib/partner/partnerRoles";
import {
  PartnerTenantSchema,
  type PartnerTenant,
} from "@/src/lib/partner/partnerTenantTypes";

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

type TenantBrandingFields = {
  id: string;
  name: string;
  slug?: string;
  brandLabel?: string;
  logoUrl?: string | null;
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

async function fetchPartnerRolesByTenantId(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, PartnerMemberRole>> {
  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", userId)
    .in("role", [...PARTNER_MEMBER_ROLES]);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[fetchPartnerTenantsForUser] roles lookup", error.message);
    }
    return new Map();
  }

  const roleByTenantId = new Map<string, PartnerMemberRole>();
  for (const row of data ?? []) {
    const role = String(row.role);
    if (isPartnerMemberRole(role)) {
      roleByTenantId.set(String(row.tenant_id), role);
    }
  }
  return roleByTenantId;
}

function buildPartnerTenant(
  fields: TenantBrandingFields,
  role: PartnerMemberRole,
): PartnerTenant | null {
  const capabilities = getPartnerCapabilities(role);
  if (!capabilities) return null;

  const parsed = PartnerTenantSchema.safeParse({
    id: fields.id,
    name: fields.name,
    ...(fields.slug ? { slug: fields.slug } : {}),
    ...(fields.brandLabel ? { brandLabel: fields.brandLabel } : {}),
    logoUrl: fields.logoUrl ?? null,
    role,
    capabilities,
  });

  return parsed.success ? parsed.data : null;
}

function rpcItemToBrandingFields(
  item: z.infer<typeof PartnerTenantRpcItemSchema>,
): TenantBrandingFields {
  return {
    id: item.id,
    name: item.name,
    ...(item.slug ? { slug: item.slug } : {}),
    brandLabel: item.brand_label,
    logoUrl: parsePartnerLogoUrl(item.brand_logo_url),
  };
}

async function fetchPartnerTenantsViaRpc(
  supabase: SupabaseClient,
  roleByTenantId: Map<string, PartnerMemberRole>,
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
    const role = roleByTenantId.get(item.id);
    if (!role) continue;

    const tenant = buildPartnerTenant(rpcItemToBrandingFields(item), role);
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
    .in("role", [...PARTNER_MEMBER_ROLES])
    .order("created_at", { ascending: true });

  if (error) return [];

  const tenants: PartnerTenant[] = [];

  for (const row of rows ?? []) {
    const role = String(row.role);
    if (!isPartnerMemberRole(role)) continue;

    const tenant = normalizeTenantJoin(
      row.tenants as TenantRow | TenantRow[] | null,
      row.tenant_id as string,
    );
    if (!tenant) continue;

    const { brandLabel, logoUrl } = partnerBrandingFromSettings(tenant);

    const parsed = buildPartnerTenant(
      {
        id: tenant.id,
        name: tenant.name,
        ...(tenant.slug ? { slug: tenant.slug } : {}),
        brandLabel,
        logoUrl,
      },
      role,
    );
    if (parsed) tenants.push(parsed);
  }

  return tenants;
}

/** Partner tenants + branding + per-tenant role and RBAC capabilities. */
export async function fetchPartnerTenantsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<PartnerTenant[]> {
  const roleByTenantId = await fetchPartnerRolesByTenantId(supabase, userId);
  if (roleByTenantId.size === 0) return [];

  const viaRpc = await fetchPartnerTenantsViaRpc(supabase, roleByTenantId);
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
