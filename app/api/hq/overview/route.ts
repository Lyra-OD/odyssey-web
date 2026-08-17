import { NextResponse } from "next/server";

import { isListedOnHqAllowlist } from "@/src/lib/hq/isOdysseyOperator";
import {
  HqNetworkOverviewResponseSchema,
  loadHqNetworkOverview,
} from "@/src/lib/hq/hqNetworkOverview";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/hq/overview
 * KPIs réseau macro (tous tenants freemium). Gate `hq_allowlist` + service_role.
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

  if (!(await isListedOnHqAllowlist(supabase, user.id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  try {
    const overview = await loadHqNetworkOverview(admin);
    const payload = HqNetworkOverviewResponseSchema.parse(overview);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[hq/overview]", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
