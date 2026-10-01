import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripe } from "@/lib/stripe";
import { resolveSiteOrigin } from "@/src/lib/http/siteOrigin";
import {
  GUEST_MASTER_COPY_CENTS,
  GUEST_MASTER_COPY_SKU,
  guestMasterCopyLabel,
} from "@/src/lib/wizard/guestMasterCopy";
import { hasCinemaMasterExportEntitlement } from "@/src/lib/wizard/exportGate";
import { getProjectPaidEntitlements } from "@/src/lib/wizard/paidEntitlements";
import { resolveSessionStreamToken } from "@/src/lib/wizard/sessionStreamToken";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    locale: z.enum(["fr", "en"]).optional(),
  })
  .strict();

/**
 * POST /api/stream/[token]/checkout
 * C12 — Stripe Checkout `guestMasterCopy` 15 $ (invité, token view_only).
 * Gate : Master cinéma déjà débloqué (entitlements) — sinon 422.
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
    /* optional body */
  }

  const parsed = BodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const locale = parsed.data.locale ?? "fr";

  const tokenRow = await resolveSessionStreamToken(rawToken);
  if (!tokenRow) {
    return NextResponse.json({ error: "invalid_or_expired_link" }, { status: 404 });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (error) {
    console.error("[stream-guest-copy]", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const entitlements = await getProjectPaidEntitlements(admin, tokenRow.project_id);
  if (!entitlements || !hasCinemaMasterExportEntitlement(entitlements)) {
    return NextResponse.json(
      { error: "master_not_unlocked" },
      { status: 422 },
    );
  }

  const { data: guestCheckout, error: insertError } = await admin
    .from("guest_micro_checkouts")
    .insert({
      project_id: tokenRow.project_id,
      tenant_id: tokenRow.tenant_id,
      project_access_token_id: tokenRow.id,
      product_key: GUEST_MASTER_COPY_SKU,
      gross_cents: GUEST_MASTER_COPY_CENTS,
      status: "pending",
      metadata: {
        sku: GUEST_MASTER_COPY_SKU,
        role: "guest",
        stream_token_purpose: "view_only",
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
            unit_amount: GUEST_MASTER_COPY_CENTS,
            product_data: {
              name: guestMasterCopyLabel(locale),
              metadata: { odyssey_line: GUEST_MASTER_COPY_SKU },
            },
          },
        },
      ],
      success_url: `${origin}${streamPath}?checkout=guest_success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${streamPath}?checkout=guest_cancel`,
      client_reference_id: tokenRow.project_id,
      metadata: {
        checkout_mode: "guest_support",
        guest_checkout_id: guestCheckoutId,
        project_id: tokenRow.project_id,
        tenant_id: tokenRow.tenant_id ?? "",
        product_key: GUEST_MASTER_COPY_SKU,
        sku: GUEST_MASTER_COPY_SKU,
        role: "guest",
        gross_cents: String(GUEST_MASTER_COPY_CENTS),
        stream_token_id: tokenRow.id,
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
