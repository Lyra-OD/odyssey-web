import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripe } from "@/lib/stripe";
import { resolveSiteOrigin } from "@/src/lib/http/siteOrigin";
import {
  CINEMA_MASTER_GIFT_SKU,
  CINEMA_MASTER_PURCHASE_CENTS,
  cinemaMasterPurchaseLabel,
} from "@/src/lib/wizard/cinemaMasterPurchase";
import { resolveSessionStreamToken } from "@/src/lib/wizard/sessionStreamToken";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    locale: z.enum(["fr", "en"]).optional(),
    donorName: z.string().max(120).optional(),
  })
  .strict();

/**
 * POST /api/stream/[token]/master-checkout
 * C11 — Mécénat Master 49 $ (`cinemaMasterGift`) depuis hub invité.
 * CTA jamais bloqué (même si Master déjà unlocked).
 */
export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  const rawToken = typeof params.token === "string" ? params.token.trim() : "";
  if (!rawToken) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

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

  const tokenRow = await resolveSessionStreamToken(rawToken);
  if (!tokenRow) {
    return NextResponse.json({ error: "invalid_or_expired_link" }, { status: 404 });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (error) {
    console.error("[stream-master-checkout]", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const { data: guestCheckout, error: insertError } = await admin
    .from("guest_micro_checkouts")
    .insert({
      project_id: tokenRow.project_id,
      tenant_id: tokenRow.tenant_id,
      project_access_token_id: tokenRow.id,
      product_key: CINEMA_MASTER_GIFT_SKU,
      gross_cents: CINEMA_MASTER_PURCHASE_CENTS,
      status: "pending",
      contributor_name: donorName,
      metadata: {
        sku: CINEMA_MASTER_GIFT_SKU,
        role: "guest",
        checkout_source: "stream_guest",
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
  const streamPath = `/${locale}/stream/${encodeURIComponent(rawToken)}`;

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
              name: cinemaMasterPurchaseLabel(CINEMA_MASTER_GIFT_SKU, locale),
              metadata: { odyssey_line: CINEMA_MASTER_GIFT_SKU },
            },
          },
        },
      ],
      success_url: `${origin}${streamPath}?checkout=master_success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${streamPath}?checkout=master_cancel`,
      client_reference_id: tokenRow.project_id,
      metadata: {
        checkout_mode: "guest_support",
        guest_checkout_id: guestCheckoutId,
        project_id: tokenRow.project_id,
        tenant_id: tokenRow.tenant_id ?? "",
        product_key: CINEMA_MASTER_GIFT_SKU,
        sku: CINEMA_MASTER_GIFT_SKU,
        role: "guest",
        gross_cents: String(CINEMA_MASTER_PURCHASE_CENTS),
        stream_token_id: tokenRow.id,
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
