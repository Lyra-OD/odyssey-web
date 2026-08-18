import { NextResponse } from "next/server";
import { z } from "zod";

import { loadHqFreemiumTenants } from "@/src/lib/hq/hqNetworkOverview";
import { HqTenantDetailResponseSchema } from "@/src/lib/hq/hqTenantsList";
import { requireHqOperator } from "@/src/lib/hq/requireHqOperator";
import { loadPartnerCommissionDashboard } from "@/src/lib/partner/loadPartnerCommissionDashboard";

const TenantIdParamsSchema = z.object({
  id: z.string().uuid(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/hq/tenants/[id]
 * Fiche micro d’un salon freemium — mêmes formules que GET /api/partner/commissions.
 */
export async function GET(request: Request, context: RouteContext) {
  const gate = await requireHqOperator();
  if (!gate.ok) return gate.response;

  const parsedParams = TenantIdParamsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "invalid_tenant" }, { status: 400 });
  }

  const locale =
    new URL(request.url).searchParams.get("lang") === "en" ? "en" : "fr";
  const tenantId = parsedParams.data.id;

  try {
    const listed = await loadHqFreemiumTenants(gate.admin);
    const tenant = listed.find((row) => row.id === tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const dashboard = await loadPartnerCommissionDashboard(
      gate.admin,
      tenantId,
      locale,
    );
    const payload = HqTenantDetailResponseSchema.parse({
      ...dashboard,
      isFreemium: true,
      name: tenant.name,
      slug: tenant.slug,
      vertical: tenant.vertical,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[hq/tenants/id]", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
