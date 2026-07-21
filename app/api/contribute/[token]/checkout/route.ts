import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { resolveContributeToken } from "@/src/lib/contribute/accessToken";
import {
  getGuestSupportPack,
  guestSupportPackLabel,
  GUEST_TXN_MAX_CENTS,
} from "@/src/lib/wizard/guestSupportPacks";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    productKey: z.string().min(1),
    contributorEmail: z.string().email().optional(),
    contributorName: z.string().max(200).optional(),
    consentMarketing: z.boolean().optional(),
    locale: z.enum(["fr", "en"]).optional(),
  })
  .strict();

function resolveSiteOrigin(request: Request): string {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (envOrigin) return envOrigin;
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/**
 * POST /api/contribute/[token]/checkout
 * Achat d'un Support Pack invité (Boucle Virale). Public (anonyme).
 * Crée guest_micro_checkouts (pending) + session Stripe checkout_mode guest_support.
 * L'accrual (waterfall → commission + crédit fonds) se fait au webhook.
 */
export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const {
    productKey,
    contributorEmail,
    contributorName,
    consentMarketing = false,
    locale = "fr",
  } = parsed.data;

  const tokenRow = await resolveContributeToken(params.token);
  if (!tokenRow) {
    return NextResponse.json({ error: "invalid_or_expired_link" }, { status: 404 });
  }

  const pack = getGuestSupportPack(productKey);
  if (!pack) {
    return NextResponse.json({ error: "unknown_product" }, { status: 400 });
  }
  // Anti-abus : plafond dur par transaction (miroir CHECK SQL).
  if (pack.priceCents <= 0 || pack.priceCents > GUEST_TXN_MAX_CENTS) {
    return NextResponse.json({ error: "amount_out_of_range" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data: guestCheckout, error: insertError } = await admin
    .from("guest_micro_checkouts")
    .insert({
      project_id: tokenRow.project_id,
      tenant_id: tokenRow.tenant_id,
      project_access_token_id: tokenRow.id,
      contributor_email: contributorEmail ?? null,
      contributor_name: contributorName ?? null,
      consent_marketing: consentMarketing,
      product_key: pack.key,
      gross_cents: pack.priceCents,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !guestCheckout?.id) {
    return NextResponse.json(
      { error: "guest_checkout_insert_failed", message: insertError?.message },
      { status: 400 },
    );
  }

  const guestCheckoutId = guestCheckout.id as string;

  // Consentement Loi 25 (transactionnel + marketing séparés).
  if (contributorEmail) {
    const consentRows: Record<string, unknown>[] = [
      {
        project_id: tokenRow.project_id,
        tenant_id: tokenRow.tenant_id,
        email: contributorEmail,
        consent_type: "transactional",
        granted: true,
        source: "contribute_checkout",
      },
    ];
    if (consentMarketing) {
      consentRows.push({
        project_id: tokenRow.project_id,
        tenant_id: tokenRow.tenant_id,
        email: contributorEmail,
        consent_type: "marketing",
        granted: true,
        source: "contribute_checkout",
      });
    }
    await admin.from("consent_records").insert(consentRows);
  }

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
  const contributePath = `/${locale}/contribute/${params.token}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pack.priceCents,
            product_data: {
              name: guestSupportPackLabel(pack, locale),
              metadata: { odyssey_line: pack.key },
            },
          },
        },
      ],
      success_url: `${origin}${contributePath}?contrib=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${contributePath}?contrib=cancel`,
      client_reference_id: tokenRow.project_id,
      ...(contributorEmail ? { customer_email: contributorEmail } : {}),
      metadata: {
        checkout_mode: "guest_support",
        guest_checkout_id: guestCheckoutId,
        project_id: tokenRow.project_id,
        tenant_id: tokenRow.tenant_id ?? "",
        product_key: pack.key,
        gross_cents: String(pack.priceCents),
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

    return NextResponse.json({ ok: true, url: session.url, sessionId: session.id });
  } catch (error) {
    await admin
      .from("guest_micro_checkouts")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", guestCheckoutId);
    return NextResponse.json(
      {
        error: "checkout_session_failed",
        message: error instanceof Error ? error.message : "stripe_error",
      },
      { status: 400 },
    );
  }
}
