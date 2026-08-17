import { NextResponse } from "next/server";
import { z } from "zod";

import { recordHqTenantPayout } from "@/src/lib/hq/hqTenantsList";
import { requireHqOperator } from "@/src/lib/hq/requireHqOperator";

const TenantIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const PayoutBodySchema = z
  .object({
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/hq/tenants/[id]/payout
 * Versement intégral du payable sous lock SQL. Montant jamais fourni par le client.
 */
export async function POST(request: Request, context: RouteContext) {
  const gate = await requireHqOperator();
  if (!gate.ok) return gate.response;

  const params = await context.params;
  const parsedParams = TenantIdParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "invalid_tenant" }, { status: 400 });
  }

  let notes: string | undefined;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const json: unknown = await request.json();
      const parsedBody = PayoutBodySchema.safeParse(json);
      if (!parsedBody.success) {
        return NextResponse.json({ error: "invalid_body" }, { status: 400 });
      }
      notes = parsedBody.data.notes;
    } catch {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
  }

  try {
    const outcome = await recordHqTenantPayout(
      gate.admin,
      parsedParams.data.id,
      gate.userId,
      notes,
    );

    if (!outcome.ok) {
      return NextResponse.json(
        { error: outcome.reason },
        { status: outcome.status },
      );
    }

    return NextResponse.json(outcome.result);
  } catch (error) {
    console.error("[hq/tenants/payout]", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
