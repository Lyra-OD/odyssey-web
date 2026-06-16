import { NextResponse } from "next/server";
import { z } from "zod";

import { appRoutes } from "@/src/lib/appRoutes";
import { getStripe } from "@/lib/stripe";
import { requireProjectOwner } from "@/src/lib/api/projectAccess";
import { debitPartnerTokens } from "@/src/lib/partner/partnerCheckout";
import { resolveUserIsPartner } from "@/src/lib/partner/resolvePartnerAccess";
import {
  CHECKOUT_LINE_LABELS,
  computeWizardCart,
  packagePartnerTokens,
  sumCartLineItemsCents,
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
 * B2C : session Stripe Checkout.
 * B2B (`wizard_state.isPartner`) : débit jetons partenaire (pas de Stripe).
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
    .select("id, tenant_id, wizard_state, status")
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
  const isPartnerFromRole = await resolveUserIsPartner(supabase, user.id);
  const isPartner = isPartnerFromRole;
  const extensions = wizardState.extensions ?? {};
  const actTracks = wizardState.musicalAmbiance?.tracks ?? {};
  const basePackage =
    wizardState.basePackage ?? wizardState.pricing?.basePackage ?? "signature";

  const cart = computeWizardCart(extensions, basePackage);

  /** Total en cents : somme entière forfait + extensions (pas de float $). */
  const totalCents = sumCartLineItemsCents(cart.lineItems);
  if (totalCents !== cart.totalCents) {
    console.error("[checkout] cart total mismatch", {
      fromLines: totalCents,
      fromCart: cart.totalCents,
    });
    return NextResponse.json({ error: "cart_total_invalid" }, { status: 500 });
  }

  if (
    wizardState.pricing?.totalCents &&
    wizardState.pricing.totalCents !== totalCents &&
    !isPartner
  ) {
    console.warn(
      "[checkout] pricing snapshot mismatch — using recalculated cart",
      {
        stored: wizardState.pricing.totalCents,
        computed: totalCents,
      },
    );
  }

  const origin = resolveSiteOrigin(request);
  const studioPath = appRoutes.studio(locale);

  if (isPartner) {
    const tenantId = project.tenant_id as string | null;
    if (!tenantId) {
      return NextResponse.json(
        { error: "missing_tenant", message: "Projet sans tenant partenaire." },
        { status: 400 },
      );
    }

    const tokensRequired = packagePartnerTokens(basePackage);
    const debit = await debitPartnerTokens({
      tenantId,
      packageId: basePackage,
      projectId,
      userId: user.id,
    });

    if (!debit.ok) {
      const status =
        debit.error === "insufficient_tokens"
          ? 402
          : debit.error === "wallet_table_missing"
            ? 503
            : 400;
      return NextResponse.json(
        { error: debit.error, message: debit.message },
        { status },
      );
    }

    const nextWizardState = {
      ...wizardState,
      pricing: {
        basePackage: cart.basePackage,
        baseCents: cart.baseCents,
        optionsCents: cart.optionsCents,
        totalCents,
        partnerTokenCost: tokensRequired,
      },
    };

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        wizard_state: nextWizardState,
        status: "submitted",
      })
      .eq("id", projectId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "project_update_failed", message: updateError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      mode: "partner",
      redirectUrl: `${origin}${studioPath}?checkout=partner_success`,
      tokensDebited: debit.tokensDebited,
      balanceAfter: debit.balanceAfter,
      partnerTokenCost: tokensRequired,
      totalCents,
      metadata: {
        project_id: projectId,
        base_package: cart.basePackage,
        extensions: JSON.stringify(extensions),
        act_tracks: JSON.stringify(actTracks),
      },
    });
  }

  if (totalCents <= 0) {
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

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: cart.lineItems.map(toStripeLineItem),
      success_url: `${origin}${studioPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${studioPath}?checkout=cancel`,
      client_reference_id: projectId,
      metadata: {
        project_id: projectId,
        user_id: user.id,
        checkout_mode: "b2c",
        total_cents: String(totalCents),
        base_cents: String(Math.trunc(cart.baseCents)),
        base_package: cart.basePackage,
        options_cents: String(Math.trunc(cart.optionsCents)),
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
      mode: "stripe",
      url: session.url,
      sessionId: session.id,
      totalCents,
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
