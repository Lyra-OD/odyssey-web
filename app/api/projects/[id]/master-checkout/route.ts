import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripe } from "@/lib/stripe";
import { requireProjectOwner } from "@/src/lib/api/projectAccess";
import { ProjectIdSchema } from "@/src/lib/api/projectIdSchema";
import { resolveSiteOrigin } from "@/src/lib/http/siteOrigin";
import {
  CINEMA_MASTER_PURCHASE_CENTS,
  CINEMA_MASTER_SKU,
  cinemaMasterPurchaseLabel,
} from "@/src/lib/wizard/cinemaMasterPurchase";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    locale: z.enum(["fr", "en"]).optional(),
    donorName: z.string().max(120).optional(),
  })
  .strict();

/**
 * POST /api/projects/[id]/master-checkout
 * C11 — Master 49 $ toujours achetable (N-buyer). Owner session hub.
 * Micro-checkout → webhook Fonds + unlock/export (#1 only).
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const projectIdResult = ProjectIdSchema.safeParse(params.id);
  if (!projectIdResult.success) {
    return NextResponse.json({ error: "invalid_project_id" }, { status: 400 });
  }
  const projectId = projectIdResult.data;

  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* optional */
  }
  const parsed = BodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const locale = parsed.data.locale ?? "fr";
  const donorName = parsed.data.donorName?.trim() || null;

  const { data: project, error: projectError } = await access.supabase
    .from("projects")
    .select("id, tenant_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (error) {
    console.error("[master-checkout]", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const { data: guestCheckout, error: insertError } = await admin
    .from("guest_micro_checkouts")
    .insert({
      project_id: projectId,
      tenant_id: project.tenant_id ?? null,
      product_key: CINEMA_MASTER_SKU,
      gross_cents: CINEMA_MASTER_PURCHASE_CENTS,
      status: "pending",
      contributor_name: donorName,
      metadata: {
        sku: CINEMA_MASTER_SKU,
        role: "organizer",
        checkout_source: "session_hub",
      },
    })
    .select("id")
    .single();

  if (insertError || !guestCheckout?.id) {
    return NextResponse.json(
      {
        error: "guest_checkout_insert_failed",
        message: insertError?.message,
      },
      { status: 400 },
    );
  }

  const guestCheckoutId = guestCheckout.id as string;

  let stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    return NextResponse.json(
      {
        error: "stripe_not_configured",
        message: error instanceof Error ? error.message : "stripe_error",
      },
      { status: 503 },
    );
  }

  const origin = resolveSiteOrigin(req);
  const returnPath = `/${locale}/studio?checkout=master_success`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: CINEMA_MASTER_PURCHASE_CENTS,
            product_data: {
              name: cinemaMasterPurchaseLabel(CINEMA_MASTER_SKU, locale),
              metadata: { odyssey_line: CINEMA_MASTER_SKU },
            },
          },
        },
      ],
      success_url: `${origin}${returnPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/studio?checkout=master_cancel`,
      client_reference_id: projectId,
      metadata: {
        checkout_mode: "guest_support",
        guest_checkout_id: guestCheckoutId,
        project_id: projectId,
        tenant_id: (project.tenant_id as string | null) ?? "",
        product_key: CINEMA_MASTER_SKU,
        sku: CINEMA_MASTER_SKU,
        role: "organizer",
        gross_cents: String(CINEMA_MASTER_PURCHASE_CENTS),
        ...(donorName ? { donor_name: donorName } : {}),
      },
    });

    if (!session.url) {
      await admin
        .from("guest_micro_checkouts")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", guestCheckoutId);
      return NextResponse.json(
        { error: "checkout_session_missing_url" },
        { status: 500 },
      );
    }

    await admin
      .from("guest_micro_checkouts")
      .update({
        stripe_session_id: session.id,
        status: "awaiting_payment",
        updated_at: new Date().toISOString(),
      })
      .eq("id", guestCheckoutId);

    return NextResponse.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    await admin
      .from("guest_micro_checkouts")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", guestCheckoutId);
    return NextResponse.json(
      {
        error: "stripe_session_failed",
        message: error instanceof Error ? error.message : "stripe_error",
      },
      { status: 500 },
    );
  }
}
