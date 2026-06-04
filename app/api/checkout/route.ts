import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripe } from "@/lib/stripe";
import { requireProjectOwner } from "@/src/lib/api/projectAccess";
import {
  CHECKOUT_LINE_LABELS,
  computeWizardCart,
  type ExtensionLineItem,
} from "@/src/lib/wizard/wizardPricing";
import { coerceWizardState } from "@/src/lib/wizard/wizardState";

const BodySchema = z
  .object({
    projectId: z.string().uuid(),
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

function toStripeLineItem(line: ExtensionLineItem) {
  return {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: line.cents,
      product_data: {
        name: CHECKOUT_LINE_LABELS[line.key],
        metadata: {
          odyssey_line: line.key,
        },
      },
    },
  };
}

/**
 * POST /api/checkout
 * Crée une session Stripe Checkout à partir du wizard_state du projet.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
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

  const { projectId, locale = "fr" } = parsed.data;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const { supabase, user } = access;

  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("id, wizard_state")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { error: "project_fetch_failed", message: fetchError.message },
      { status: 400 },
    );
  }

  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const wizardState = coerceWizardState(project.wizard_state);
  const extensions = wizardState.extensions ?? {};
  const actTracks = wizardState.musicalAmbiance?.tracks ?? {};
  const cart = computeWizardCart(extensions);

  if (cart.totalCents <= 0) {
    return NextResponse.json({ error: "invalid_total" }, { status: 400 });
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

  const origin = resolveSiteOrigin(request);
  const dashboardPath = `/${locale}/dashboard`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: cart.lineItems.map(toStripeLineItem),
      success_url: `${origin}${dashboardPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${dashboardPath}?checkout=cancel`,
      client_reference_id: projectId,
      metadata: {
        project_id: projectId,
        user_id: user.id,
        total_cents: String(cart.totalCents),
        options_cents: String(cart.optionsCents),
        ai_retouch: String(Boolean(extensions.aiRetouch)),
        extended_license: String(Boolean(extensions.extendedLicense)),
        collector_usb: String(Boolean(extensions.collectorUsb)),
        digital_vault: String(Boolean(extensions.digitalVault)),
        heritage_pack: String(Boolean(extensions.heritagePack)),
        extensions: JSON.stringify(extensions),
        act_tracks: JSON.stringify(actTracks),
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "checkout_session_missing_url" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
      totalCents: cart.totalCents,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "checkout_session_failed",
        message: error instanceof Error ? error.message : "stripe_error",
      },
      { status: 400 },
    );
  }
}
