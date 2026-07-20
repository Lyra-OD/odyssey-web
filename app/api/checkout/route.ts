import { NextResponse } from "next/server";
import { z } from "zod";

import { appRoutes } from "@/src/lib/appRoutes";
import { getStripe } from "@/lib/stripe";
import { requireProjectOwner } from "@/src/lib/api/projectAccess";
import { resolveUserIsPartner } from "@/src/lib/partner/resolvePartnerAccess";
import {
  CHECKOUT_LINE_LABELS,
  computeWizardCart,
  sumCartLineItemsCents,
  type ExtensionLineItem,
} from "@/src/lib/wizard/wizardPricing";
import { coerceWizardState } from "@/src/lib/wizard/wizardState";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

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
    .select("id, tenant_id, invitation_id, wizard_state, status")
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
  const tenantId = project.tenant_id as string | null;
  const invitationId = project.invitation_id as string | null;
  const hasPartnerInvitation = Boolean(invitationId);
  const extensions = wizardState.extensions ?? {};
  const actTracks = wizardState.musicalAmbiance?.tracks ?? {};
  const basePackage =
    wizardState.basePackage ?? wizardState.pricing?.basePackage ?? "signature";

  let isFreemiumTenant = false;
  if (tenantId) {
    // Lecture tenants via service_role : la RLS P5.3 n'autorise que partner/partner_admin.
    // Une famille invitée n'a pas ce droit — SELECT session user → "permission denied for table tenants".
    const admin = getSupabaseAdminClient();
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .select("is_freemium")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantError) {
      return NextResponse.json(
        { error: "tenant_fetch_failed", message: tenantError.message },
        { status: 400 },
      );
    }

    isFreemiumTenant = tenant?.is_freemium === true;
  }

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

  // Freemium V1 : plus de débit jetons. Parcours conseiller = soumission sans wallet.
  if (isPartner && !hasPartnerInvitation) {
    if (!tenantId) {
      return NextResponse.json(
        { error: "missing_tenant", message: "Projet sans tenant partenaire." },
        { status: 400 },
      );
    }

    const nextWizardState = {
      ...wizardState,
      pricing: {
        basePackage: cart.basePackage,
        baseCents: cart.baseCents,
        optionsCents: cart.optionsCents,
        totalCents,
        partnerTokenCost: 0,
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
      tokensDebited: 0,
      balanceAfter: 0,
      partnerTokenCost: 0,
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
    if (hasPartnerInvitation && isFreemiumTenant) {
      const nextWizardState = {
        ...wizardState,
        pricing: {
          basePackage: cart.basePackage,
          baseCents: cart.baseCents,
          optionsCents: cart.optionsCents,
          totalCents,
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
        mode: "freemium_free",
        url: `${origin}${studioPath}?checkout=freemium_success`,
        totalCents,
        metadata: {
          project_id: projectId,
          base_package: cart.basePackage,
          invitation_id: invitationId,
          checkout_mode: "b2b2c_family",
          is_freemium: "true",
          extensions: JSON.stringify(extensions),
          act_tracks: JSON.stringify(actTracks),
        },
      });
    }

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

  /** Saga Bulletproof : freemium B2B2C payant uniquement (pas B2C pur). */
  const isB2B2CFreemiumPaid =
    hasPartnerInvitation && isFreemiumTenant && totalCents > 0;

  let tributeCheckoutId: string | null = null;

  if (isB2B2CFreemiumPaid) {
    if (!tenantId || !invitationId) {
      return NextResponse.json(
        {
          error: "missing_b2b2c_context",
          message: "tenant_id et invitation_id requis.",
        },
        { status: 400 },
      );
    }

    const { data: invitation, error: invitationError } = await supabase
      .from("partner_invitations")
      .select("id, granted_package, tenant_id")
      .eq("id", invitationId)
      .maybeSingle();

    if (invitationError || !invitation?.granted_package) {
      return NextResponse.json(
        {
          error: "invitation_lookup_failed",
          message: invitationError?.message ?? "granted_package manquant",
        },
        { status: 400 },
      );
    }

    const { data: tenantRow } = await getSupabaseAdminClient()
      .from("tenants")
      .select("settings")
      .eq("id", tenantId)
      .maybeSingle();

    const settings = (tenantRow?.settings ?? {}) as Record<string, unknown>;
    const platformFeeBps =
      typeof settings.platform_fee_bps === "number" &&
      settings.platform_fee_bps > 0
        ? settings.platform_fee_bps
        : 1000;
    const commissionRateBps =
      typeof settings.revshare_bps === "number" && settings.revshare_bps > 0
        ? settings.revshare_bps
        : 3000;

    const admin = getSupabaseAdminClient();
    const idempotencyKey = `b2b2c:${projectId}:${cart.basePackage}:${totalCents}`;

    // INSERT avant Stripe — si échec (ex. double-clic idempotency) → stop
    const { data: tributeCheckout, error: insertError } = await admin
      .from("tribute_checkouts")
      .insert({
        project_id: projectId,
        tenant_id: tenantId,
        invitation_id: invitationId,
        checkout_mode: "b2b2c_family",
        granted_package: invitation.granted_package,
        selected_package: cart.basePackage,
        family_total_cents: totalCents,
        partner_tokens_debited: 0,
        status: "pending",
        platform_fee_bps: platformFeeBps,
        commission_rate_bps: commissionRateBps,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (insertError || !tributeCheckout?.id) {
      return NextResponse.json(
        {
          error: "tribute_checkout_insert_failed",
          message: insertError?.message ?? "insert_failed",
        },
        { status: 400 },
      );
    }

    tributeCheckoutId = tributeCheckout.id;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: cart.lineItems.map(toStripeLineItem),
      success_url: `${origin}${studioPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${studioPath}?checkout=cancel`,
      client_reference_id: projectId,
      metadata: {
        ...(tributeCheckoutId
          ? {
              checkout_id: tributeCheckoutId,
              checkout_mode: "b2b2c_family",
            }
          : {
              checkout_mode: hasPartnerInvitation ? "b2b2c_family" : "b2c",
            }),
        project_id: projectId,
        user_id: user.id,
        invitation_id: invitationId ?? "",
        tenant_id: tenantId ?? "",
        is_freemium: String(isFreemiumTenant),
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
      if (tributeCheckoutId) {
        await getSupabaseAdminClient()
          .from("tribute_checkouts")
          .update({
            status: "failed",
            failure_reason: "checkout_session_missing_url",
            updated_at: new Date().toISOString(),
          })
          .eq("id", tributeCheckoutId);
      }
      return NextResponse.json(
        { error: "checkout_session_missing_url" },
        { status: 500 },
      );
    }

    if (tributeCheckoutId) {
      const { error: updateCheckoutError } = await getSupabaseAdminClient()
        .from("tribute_checkouts")
        .update({
          stripe_session_id: session.id,
          status: "awaiting_payment",
          updated_at: new Date().toISOString(),
        })
        .eq("id", tributeCheckoutId);

      if (updateCheckoutError) {
        return NextResponse.json(
          {
            error: "tribute_checkout_update_failed",
            message: updateCheckoutError.message,
            sessionId: session.id,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      mode: "stripe",
      url: session.url,
      sessionId: session.id,
      checkoutId: tributeCheckoutId,
      totalCents,
    });
  } catch (error) {
    if (tributeCheckoutId) {
      await getSupabaseAdminClient()
        .from("tribute_checkouts")
        .update({
          status: "failed",
          failure_reason:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "stripe_error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", tributeCheckoutId);
    }
    return NextResponse.json(
      {
        error: "checkout_session_failed",
        message: error instanceof Error ? error.message : "stripe_error",
      },
      { status: 400 },
    );
  }
}
