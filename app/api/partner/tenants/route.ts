import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import {
  PartnerTenantSchema,
  type PartnerTenant,
} from "@/src/lib/partner/partnerTenantTypes";

const PARTNER_ROLES = ["partner", "partner_admin"] as const;

type TenantRow = {
  id: string;
  name: string;
  slug: string | null;
};

function normalizeTenantJoin(
  raw: TenantRow | TenantRow[] | null | undefined,
  fallbackTenantId: string,
): { id: string; name: string; slug: string | null } {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row?.id) {
    return { id: fallbackTenantId, name: "Partenaire", slug: null };
  }
  return row;
}

/**
 * GET /api/partner/tenants
 * Liste les tenants où l'utilisateur a un rôle partenaire (RLS).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role, tenants(id, name, slug)")
    .eq("user_id", user.id)
    .in("role", [...PARTNER_ROLES])
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "tenant_lookup_failed", message: error.message },
      { status: 400 },
    );
  }

  const tenants: PartnerTenant[] = [];

  for (const row of rows ?? []) {
    const tenant = normalizeTenantJoin(
      row.tenants as TenantRow | TenantRow[] | null,
      row.tenant_id as string,
    );
    const parsed = PartnerTenantSchema.safeParse({
      id: tenant.id,
      name: tenant.name,
      ...(tenant.slug ? { slug: tenant.slug } : {}),
    });
    if (parsed.success) {
      tenants.push(parsed.data);
    }
  }

  return NextResponse.json({ tenants });
}
