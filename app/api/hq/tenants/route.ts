import { NextResponse } from "next/server";

import {
  HqTenantsListResponseSchema,
  loadHqTenantsList,
} from "@/src/lib/hq/hqTenantsList";
import { requireHqOperator } from "@/src/lib/hq/requireHqOperator";

/**
 * GET /api/hq/tenants
 * Liste micro des salons freemium (pilotage + payable). Gate HQ allowlist.
 */
export async function GET() {
  const gate = await requireHqOperator();
  if (!gate.ok) return gate.response;

  try {
    const tenants = await loadHqTenantsList(gate.admin);
    const payload = HqTenantsListResponseSchema.parse({ tenants });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[hq/tenants]", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
