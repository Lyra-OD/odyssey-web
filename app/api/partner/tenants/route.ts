import { NextResponse } from "next/server";

import { fetchPartnerTenantsForUser } from "@/src/lib/partner/fetchPartnerTenantsForUser";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/partner/tenants
 * Liste les espaces partenaire (RPC P5.4 ou jointure RLS P5.3),
 * y compris le mode commercial tenant (`isFreemium`) pour piloter l'UI B2B2C.
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

  const tenants = await fetchPartnerTenantsForUser(supabase, user.id);
  return NextResponse.json({ tenants });
}
