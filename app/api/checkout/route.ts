import { NextResponse } from "next/server";
import { z } from "zod";

import { appRoutes } from "@/src/lib/appRoutes";
import { getStripe } from "@/lib/stripe";
import {
  assertStripeMetadataWithinLimit,
  serializeActTracksForStripeMetadata,
} from "@/src/lib/stripe/actTracksMetadata";
import { requireProjectOwner, rejectEditorForOwnerOnlyRoute } from "@/src/lib/api/projectAccess";
import { resolveUserIsPartner } from "@/src/lib/partner/resolvePartnerAccess";
import {
  packageMaxMediaForEntitlement,
  upsertProjectPaidEntitlements,
} from "@/src/lib/wizard/paidEntitlements";
import {
  CHECKOUT_LINE_LABELS,
  computeWizardCart,
  computeWizardCartWithGrant,
  normalizeExtensionsState,
  sumCartLineItemsCents,
  type ExtensionLineItem,
} from "@/src/lib/wizard/wizardPricing";
import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import { parseTenantViralSettings } from "@/src/lib/wizard/tenantViralSettings";
import { normalizeBasePackageId } from "@/src/lib/wizard/pricingConfig";
import { coerceWizardState } from "@/src/lib/wizard/wizardState";
import {
  loadInvitationGrantedPackage,
  resolveB2b2cIntendedPackage,
} from "@/src/lib/wizard/b2b2cPackageAuthority";
import { resolveTributeCheckoutForRetry } from "@/src/lib/checkout/resolveTributeCheckout";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { resolveSiteOrigin } from "@/src/lib/http/siteOrigin";

const BodySchema = z
  .object({
    projectId: z.string().uuid(),
    locale: z.enum(["fr", "en"]).optional(),
  })
  .strict();

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
 * Freemium V1 Soft Cap : panier = delta (intended − granted) + add-ons.
 * Entitlements payés écrits au webhook (ou freemium_free immédiat).
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

  const editorBlocked = await rejectEditorForOwnerOnlyRoute(
    projectId,
    "canCheckout",
  );
  if (editorBlocked) return editorBlocked;

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
  const extensions = normalizeExtensionsState(wizardState.extensions ?? {});
  const actTracks = wizardState.musicalAmbiance?.tracks ?? {};
  const actTracksMetadata = serializeActTracksForStripeMetadata(actTracks);

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  let grantedPackage: WizardBasePackage;
  let intendedPackage: WizardBasePackage;

  if (hasPartnerInvitation && invitationId) {
    const invitationGrant = await loadInvitationGrantedPackage(
      admin,
      invitationId,
    );
    if (!invitationGrant.ok) {
      return NextResponse.json(
        {
          error: "invitation_lookup_failed",
          reason: invitationGrant.reason,
        },
        { status: 400 },
      );
    }

    grantedPackage = invitationGrant.grantedPackage;
    intendedPackage = resolveB2b2cIntendedPackage({
      grantedPackage,
      persistedIntended:
        wizardState.intendedPackage ??
        wizardState.basePackage ??
        wizardState.pricing?.basePackage,
    });
  } else {
    intendedPackage = normalizeBasePackageId(
      wizardState.intendedPackage ??
        wizardState.basePackage ??
        wizardState.pricing?.basePackage,
    );
    grantedPackage = intendedPackage;
  }

  let isFreemiumTenant = false;
  // Cascade V-Final : feature flag + plancher configurables par tenant.
  let viralLoopEnabled = false;
  let ownerFloorCents = 0;
  if (tenantId) {
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .select("is_freemium, settings")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantError) {
      return NextResponse.json(
        { error: "tenant_fetch_failed", message: tenantError.message },
        { status: 400 },
      );
    }

    isFreemiumTenant = tenant?.is_freemium === true;
    const parsed = parseTenantViralSettings(
      (tenant?.settings ?? {}) as Record<string, unknown>,
    );
    viralLoopEnabled = parsed.viralLoopEnabled;
    ownerFloorCents = parsed.ownerFloorCents;
  }

  const { assertCheckoutMusicRights } = await import(
    "@/src/lib/wizard/exportGate"
  );
  const musicRightsGate = assertCheckoutMusicRights({
    storyboard: wizardState.storyboard,
    musicRightsAttestation: wizardState.musicRightsAttestation,
    locale,
  });
  if (!musicRightsGate.ok) {
    return NextResponse.json(
      {
        error: musicRightsGate.code,
        message: musicRightsGate.message,
      },
      { status: 422 },
    );
  }

  const cart = hasPartnerInvitation
    ? computeWizardCartWithGrant(extensions, intendedPackage, grantedPackage)
    : computeWizardCart(extensions, intendedPackage);

  const totalCents = sumCartLineItemsCents(cart.lineItems);
  if (totalCents !== cart.totalCents) {
    console.error("[checkout] cart total mismatch", {
      fromLines: totalCents,
      fromCart: cart.totalCents,
    });
    return NextResponse.json({ error: "cart_total_invalid" }, { status: 500 });
  }

  const origin = resolveSiteOrigin(request);
  const studioPath = appRoutes.studio(locale);

  // Freemium V1 : parcours conseiller = soumission sans wallet.
  if (isPartner && !hasPartnerInvitation) {
    if (!tenantId) {
      return NextResponse.json(
        { error: "missing_tenant", message: "Projet sans tenant partenaire." },
        { status: 400 },
      );
    }

    const nextWizardState = {
      ...wizardState,
      grantedPackage,
      intendedPackage,
      basePackage: intendedPackage,
      pricing: {
        basePackage: cart.basePackage,
        baseCents: cart.baseCents,
        optionsCents: cart.optionsCents,
        totalCents,
        partnerTokenCost: 0,
      },
      extensions: cart.extensions,
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
      totalCents,
      metadata: {
        project_id: projectId,
        granted_package: grantedPackage,
        intended_package: intendedPackage,
        base_package: cart.basePackage,
        extensions: JSON.stringify(cart.extensions),
        act_tracks: actTracksMetadata,
      },
    });
  }

  // Cascade V-Final — crédit Fonds Commémoratif (Boucle Virale).
  // Preview read-only : la consommation est committée à l'export réel
  // (inline si 0 $ ci-dessous, sinon au webhook après paiement Stripe).
  // Gated par viral_loop_enabled => flux B2B2C/B2C inchangés si off.
  let fundAppliedCents = 0;
  if (viralLoopEnabled && totalCents > 0) {
    const { data: fundBal } = await admin
      .from("family_tribute_fund_balances")
      .select("accrued_cents, consumed_cents")
      .eq("project_id", projectId)
      .maybeSingle();
    const available = Math.max(
      Number(fundBal?.accrued_cents ?? 0) - Number(fundBal?.consumed_cents ?? 0),
      0,
    );
    fundAppliedCents = Math.min(
      available,
      Math.max(totalCents - ownerFloorCents, 0),
    );
  }
  const payableCents = Math.max(totalCents - fundAppliedCents, 0);

  // Paywall entièrement couvert par le Fonds : export gratuit immédiat.
  // (Le Rider compte + consentement est déjà satisfait : la famille est
  // authentifiée via requireProjectOwner.)
  if (viralLoopEnabled && fundAppliedCents > 0 && payableCents <= 0) {
    if (project.status === "submitted") {
      return NextResponse.json({
        ok: true,
        mode: "fund_free",
        idempotent: true,
        url: `${origin}${studioPath}?checkout=fund_success`,
        totalCents: 0,
        fundAppliedCents,
        intendedPackage,
      });
    }

    const consume = await admin.rpc("consume_family_fund_credit", {
      p_project_id: projectId,
      p_package_price_cents: totalCents,
      p_owner_floor_cents: ownerFloorCents,
      p_tribute_checkout_id: null,
    });

    if (consume.error) {
      return NextResponse.json(
        { error: "fund_consume_failed", message: consume.error.message },
        { status: 400 },
      );
    }

    const nextWizardState = {
      ...wizardState,
      grantedPackage,
      intendedPackage,
      basePackage: intendedPackage,
      pricing: {
        basePackage: cart.basePackage,
        baseCents: cart.baseCents,
        optionsCents: cart.optionsCents,
        totalCents,
        partnerTokenCost: 0,
      },
      extensions: cart.extensions,
    };

    const { error: updateError } = await supabase
      .from("projects")
      .update({ wizard_state: nextWizardState, status: "submitted" })
      .eq("id", projectId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "project_update_failed", message: updateError.message },
        { status: 400 },
      );
    }

    const entitlements = await upsertProjectPaidEntitlements(admin, {
      projectId,
      paidPackage: intendedPackage,
      musicLicense: Boolean(cart.extensions.musicLicense),
      extensions: cart.extensions,
    });

    if (!entitlements.ok) {
      console.error(
        "[checkout] fund_free entitlements failed:",
        entitlements.message,
      );
    } else {
      const { enqueueQuietLuxuryFulfillment } = await import(
        "@/src/lib/wizard/addonFulfillment"
      );
      await enqueueQuietLuxuryFulfillment(admin, {
        projectId,
        extensions: cart.extensions,
      });
    }

    return NextResponse.json({
      ok: true,
      mode: "fund_free",
      url: `${origin}${studioPath}?checkout=fund_success`,
      totalCents: 0,
      fundAppliedCents,
      intendedPackage,
    });
  }

  if (totalCents <= 0) {
    if (hasPartnerInvitation && isFreemiumTenant) {
      intendedPackage = resolveB2b2cIntendedPackage({
        grantedPackage,
        persistedIntended: intendedPackage,
        forFreemiumFree: true,
      });

      // Amputation : quotas = granted (Souvenir), hors médias invités Sanctuaire
      const { count, error: countError } = await admin
        .from("media_assets")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .or("contributor_type.is.null,contributor_type.neq.guest");

      if (countError) {
        return NextResponse.json(
          { error: "media_count_failed", message: countError.message },
          { status: 400 },
        );
      }

      const maxMedia = packageMaxMediaForEntitlement(grantedPackage);
      if ((count ?? 0) > maxMedia) {
        return NextResponse.json(
          {
            error: "amputation_required",
            message:
              locale === "en"
                ? `Remove media to fit the free package (max ${maxMedia}).`
                : `Retirez des médias pour rester sur le forfait offert (max ${maxMedia}).`,
            maxMedia,
            currentMedia: count ?? 0,
          },
          { status: 422 },
        );
      }

      if (cart.extensions.musicLicense) {
        return NextResponse.json(
          {
            error: "music_license_requires_payment",
            message:
              locale === "en"
                ? "Remove the Stingray Premium license or upgrade to pay."
                : "Retirez la Licence Stingray ou passez à un forfait payant.",
          },
          { status: 422 },
        );
      }

      const nextWizardState = {
        ...wizardState,
        grantedPackage,
        intendedPackage: grantedPackage,
        basePackage: grantedPackage,
        pricing: {
          basePackage: grantedPackage,
          baseCents: 0,
          optionsCents: 0,
          totalCents: 0,
        },
        extensions: cart.extensions,
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

      const entitlements = await upsertProjectPaidEntitlements(admin, {
        projectId,
        paidPackage: grantedPackage,
        musicLicense: false,
        extensions: cart.extensions,
      });

      if (!entitlements.ok) {
        console.error(
          "[checkout] freemium_free entitlements failed:",
          entitlements.message,
        );
      } else {
        const { enqueueQuietLuxuryFulfillment } = await import(
          "@/src/lib/wizard/addonFulfillment"
        );
        await enqueueQuietLuxuryFulfillment(admin, {
          projectId,
          extensions: cart.extensions,
        });
      }

      return NextResponse.json({
        ok: true,
        mode: "freemium_free",
        url: `${origin}${studioPath}?checkout=freemium_success`,
        totalCents: 0,
        metadata: {
          project_id: projectId,
          granted_package: grantedPackage,
          intended_package: grantedPackage,
          base_package: grantedPackage,
          invitation_id: invitationId,
          checkout_mode: "b2b2c_family",
          is_freemium: "true",
          extensions: JSON.stringify(cart.extensions),
          act_tracks: actTracksMetadata,
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

    const invitationGrant = await loadInvitationGrantedPackage(
      admin,
      invitationId,
    );
    if (!invitationGrant.ok) {
      return NextResponse.json(
        {
          error: "invitation_lookup_failed",
          reason: invitationGrant.reason,
        },
        { status: 400 },
      );
    }

    const { data: tenantRow } = await admin
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

    const idempotencyKey = `b2b2c:${projectId}:${intendedPackage}:${totalCents}:${cart.extensions.musicLicense ? "ml" : "n"}`;

    const checkoutRow = await resolveTributeCheckoutForRetry(admin, {
      projectId,
      tenantId,
      invitationId,
      grantedPackage: invitationGrant.grantedPackage,
      selectedPackage: intendedPackage,
      familyTotalCents: totalCents,
      platformFeeBps,
      commissionRateBps,
      idempotencyKey,
    });

    if (!checkoutRow.ok) {
      if (checkoutRow.reason === "already_completed") {
        return NextResponse.json(
          {
            error: "checkout_already_completed",
            message:
              locale === "en"
                ? "This tribute has already been paid."
                : "Cet hommage a déjà été payé.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: "tribute_checkout_insert_failed",
          message: checkoutRow.message,
        },
        { status: 400 },
      );
    }

    tributeCheckoutId = checkoutRow.id;
  }

  const normalizedExt = cart.extensions;

  // Cascade V-Final — crédit partiel : coupon Stripe amount_off. La
  // consommation du crédit est committée au webhook (après paiement),
  // idempotente par tribute_checkout_id (b2b2c) / event (b2c).
  const applyFundCoupon =
    viralLoopEnabled && fundAppliedCents > 0 && payableCents > 0;

  try {
    let discounts: { coupon: string }[] | undefined;
    if (applyFundCoupon) {
      const coupon = await stripe.coupons.create({
        amount_off: fundAppliedCents,
        currency: "usd",
        duration: "once",
        name: locale === "en" ? "Commemorative Fund" : "Fonds Commémoratif",
      });
      discounts = [{ coupon: coupon.id }];
    }

    const stripeMetadata: Record<string, string> = {
      ...(applyFundCoupon
        ? {
            fund_credit_applied_cents: String(fundAppliedCents),
            precredit_total_cents: String(totalCents),
            owner_floor_cents: String(ownerFloorCents),
          }
        : {}),
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
      granted_package: grantedPackage,
      intended_package: intendedPackage,
      base_package: intendedPackage,
      options_cents: String(Math.trunc(cart.optionsCents)),
      music_license: String(Boolean(normalizedExt.musicLicense)),
      ai_retouch: String(Boolean(normalizedExt.aiRetouch)),
      sanctuary_token: String(Boolean(normalizedExt.sanctuaryToken)),
      story_voice: String(Boolean(normalizedExt.storyVoice)),
      memory_book: String(Boolean(normalizedExt.memoryBook)),
      digital_vault: String(Boolean(normalizedExt.digitalVault)),
      heritage_pack: String(Boolean(normalizedExt.heritagePack)),
      extended_license: String(Boolean(normalizedExt.musicLicense)),
      collector_usb: String(Boolean(normalizedExt.sanctuaryToken)),
      extensions: JSON.stringify(normalizedExt),
      act_tracks: actTracksMetadata,
    };

    try {
      assertStripeMetadataWithinLimit(stripeMetadata);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "metadata_limit";
      console.error("[checkout] stripe metadata too long:", detail);
      return NextResponse.json(
        {
          error: "stripe_metadata_too_long",
          message:
            locale === "en"
              ? "Checkout metadata exceeds Stripe limits. Please retry or contact support."
              : "Les métadonnées checkout dépassent la limite Stripe. Réessayez ou contactez le support.",
        },
        { status: 500 },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: cart.lineItems
        .filter((line) => line.cents > 0)
        .map(toStripeLineItem),
      ...(discounts ? { discounts } : {}),
      success_url: `${origin}${studioPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${studioPath}?checkout=cancel`,
      client_reference_id: projectId,
      metadata: stripeMetadata,
    });

    if (!session.url) {
      if (tributeCheckoutId) {
        await admin
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
      const { error: updateCheckoutError } = await admin
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
      payableCents,
      fundAppliedCents,
      grantedPackage,
      intendedPackage,
    });
  } catch (error) {
    if (tributeCheckoutId) {
      await admin
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
