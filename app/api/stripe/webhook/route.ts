import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

type ItemType = "base" | "upsell" | "bundle";
type WebhookStatus = "processing" | "processed" | "ignored" | "failed";
type SupabaseAdmin = SupabaseClient;
let supabaseAdminSingleton: SupabaseAdmin | null = null;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: typeof error.stack === "string" ? error.stack.slice(0, 1000) : undefined,
      cause: error.cause ? String(error.cause) : undefined,
    };
  }
  return {
    message: String(error),
  };
}

function logWebhook(payload: Record<string, unknown>) {
  console.log(JSON.stringify(payload));
}

function logWebhookError(context: string, error: unknown, extra?: Record<string, unknown>) {
  console.error(
    "ERREUR WEBHOOK:",
    JSON.stringify({
      context,
      error: serializeError(error),
      ...extra,
    }),
  );
}

function getSupabaseAdminClient() {
  if (supabaseAdminSingleton) return supabaseAdminSingleton;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  supabaseAdminSingleton = createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminSingleton;
}

function normalizeItemType(raw: string | undefined): ItemType {
  if (raw === "base" || raw === "upsell" || raw === "bundle") {
    return raw;
  }
  return "upsell";
}

function toLowerCurrency(currency: string): string {
  return currency.trim().toLowerCase();
}

function isSupportedCurrency(currency: string): boolean {
  return currency === "usd" || currency === "cad";
}

function parseTtlSeconds(): number {
  const raw = Number.parseInt(process.env.WEBHOOK_PROCESSING_TTL_SECONDS ?? "", 10);
  if (!Number.isFinite(raw)) return 300;
  return Math.max(30, Math.min(raw, 3600));
}

function makeErrorLog(event: Stripe.Event, error: unknown) {
  const serialized = serializeError(error);
  return {
    event_id: event.id,
    provider: "stripe",
    occurred_at: new Date().toISOString(),
    ...serialized,
  };
}

async function transitionWebhookStatus(
  supabase: SupabaseAdmin,
  params: {
    eventId: string;
    lockToken: string;
    statusAfter: WebhookStatus;
    errorLog?: Record<string, unknown>;
  },
): Promise<boolean> {
  const { data, error } = await supabase
    .from("webhook_events")
    .update({
      status: params.statusAfter,
      processed_at: new Date().toISOString(),
      ...(params.errorLog ? { error_log: params.errorLog } : {}),
    })
    .eq("provider", "stripe")
    .eq("event_id", params.eventId)
    .eq("status", "processing")
    .eq("lock_token", params.lockToken)
    .select("id");

  if (error) {
    logWebhookError("webhook_transition_update_failed", error, {
      event_id: params.eventId,
      status_after: params.statusAfter,
    });
    return false;
  }

  const rowsAffected = data?.length ?? 0;
  if (rowsAffected !== 1) {
    logWebhookError("state_transition_conflict", "rows_affected_mismatch", {
      event_id: params.eventId,
      status_after: params.statusAfter,
      rows_affected: rowsAffected,
    });
    return false;
  }

  return true;
}

async function resolvePrimaryPriceForProduct(
  stripe: Stripe,
  productId: string,
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 1,
  });
  return prices.data[0] ?? null;
}

async function syncCatalogRowFromProduct(
  stripe: Stripe,
  product: Stripe.Product,
  supabase: SupabaseAdmin,
  event: Stripe.Event,
): Promise<"processed" | "ignored"> {
  const odysseyCode = product.metadata?.odyssey_code?.trim();
  if (!odysseyCode) {
    logWebhook({
      level: "warn",
      context: "missing_odyssey_code_on_product",
      event_id: event.id,
      event_type: event.type,
      stripe_product_id: product.id,
      odyssey_code: null,
      status_before: "processing",
      status_after: "ignored",
    });
    return "ignored";
  }

  const price = await resolvePrimaryPriceForProduct(stripe, product.id);
  if (!price) {
    // Business case valide: produit sans prix actif -> ignore sans erreur.
    logWebhook({
      level: "warn",
      context: "missing_active_price_on_product",
      event_id: event.id,
      event_type: event.type,
      stripe_product_id: product.id,
      odyssey_code: odysseyCode,
      status_before: "processing",
      status_after: "ignored",
    });
    return "ignored";
  }

  const rawItemType = product.metadata?.item_type;
  const itemType = normalizeItemType(rawItemType);
  if (rawItemType && rawItemType !== itemType) {
    logWebhook({
      level: "warn",
      context: "item_type_fallback_to_upsell",
      event_id: event.id,
      event_type: event.type,
      stripe_product_id: product.id,
      odyssey_code: odysseyCode,
      status_before: "processing",
      status_after: "processing",
    });
  }

  const currency = toLowerCurrency(price.currency);
  if (!isSupportedCurrency(currency)) {
    logWebhook({
      level: "warn",
      context: "unsupported_currency_ignored",
      event_id: event.id,
      event_type: event.type,
      stripe_product_id: product.id,
      odyssey_code: odysseyCode,
      status_before: "processing",
      status_after: "ignored",
    });
    return "ignored";
  }

  const { error } = await supabase.from("billing_catalog").upsert(
    {
      stripe_product_id: product.id,
      stripe_price_id: price.id,
      odyssey_code: odysseyCode,
      name: product.name,
      description: product.description,
      amount: price.unit_amount ?? 0,
      currency,
      item_type: itemType,
      is_active: product.active,
      is_sellable:
        product.metadata?.is_sellable === "false" ? false : true,
      metadata: product.metadata ?? {},
    },
    {
      onConflict: "odyssey_code",
    },
  );

  if (error) {
    throw new Error(`billing_catalog upsert from product failed: ${error.message}`);
  }

  return "processed";
}

async function syncCatalogRowFromPrice(
  stripe: Stripe,
  price: Stripe.Price,
  supabase: SupabaseAdmin,
  event: Stripe.Event,
): Promise<"processed" | "ignored"> {
  const productId =
    typeof price.product === "string" ? price.product : price.product.id;
  const product = await stripe.products.retrieve(productId);
  if (product.deleted) {
    logWebhook({
      level: "warn",
      context: "price_parent_product_deleted",
      event_id: event.id,
      event_type: event.type,
      stripe_product_id: productId,
      odyssey_code: null,
      status_before: "processing",
      status_after: "ignored",
    });
    return "ignored";
  }

  const odysseyCode = product.metadata?.odyssey_code?.trim();
  if (!odysseyCode) {
    // Le code métier doit vivre sur le Product parent.
    logWebhook({
      level: "warn",
      context: "missing_odyssey_code_on_parent_product",
      event_id: event.id,
      event_type: event.type,
      stripe_product_id: product.id,
      odyssey_code: null,
      status_before: "processing",
      status_after: "ignored",
    });
    return "ignored";
  }

  const rawItemType = product.metadata?.item_type;
  const itemType = normalizeItemType(rawItemType);
  if (rawItemType && rawItemType !== itemType) {
    logWebhook({
      level: "warn",
      context: "item_type_fallback_to_upsell",
      event_id: event.id,
      event_type: event.type,
      stripe_product_id: product.id,
      odyssey_code: odysseyCode,
      status_before: "processing",
      status_after: "processing",
    });
  }

  const currency = toLowerCurrency(price.currency);
  if (!isSupportedCurrency(currency)) {
    logWebhook({
      level: "warn",
      context: "unsupported_currency_ignored",
      event_id: event.id,
      event_type: event.type,
      stripe_product_id: product.id,
      odyssey_code: odysseyCode,
      status_before: "processing",
      status_after: "ignored",
    });
    return "ignored";
  }

  const { error } = await supabase.from("billing_catalog").upsert(
    {
      stripe_product_id: product.id,
      stripe_price_id: price.id,
      odyssey_code: odysseyCode,
      name: product.name,
      description: product.description,
      amount: price.unit_amount ?? 0,
      currency,
      item_type: itemType,
      is_active: product.active,
      is_sellable:
        product.metadata?.is_sellable === "false" ? false : true,
      metadata: product.metadata ?? {},
    },
    {
      onConflict: "odyssey_code",
    },
  );

  if (error) {
    throw new Error(`billing_catalog upsert from price failed: ${error.message}`);
  }

  return "processed";
}

type AccrueRpcResult = {
  ok?: boolean;
  reason?: string;
  already_processed?: boolean;
  already_accrued?: boolean;
  ledger_id?: string;
  commission_cents?: number;
  net_distributable_cents?: number;
};

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  event: Stripe.Event,
  supabase: SupabaseAdmin,
): Promise<"processed" | "ignored"> {
  const metadata = session.metadata ?? {};
  const checkoutIdRaw = metadata.checkout_id?.trim() || "";
  const projectId = metadata.project_id?.trim() || "";
  const metadataMode = metadata.checkout_mode?.trim() || "";

  // Filtre rapide metadata : hors Odyssey / hors canal famille → ignore
  if (!projectId && !checkoutIdRaw) {
    logWebhook({
      level: "info",
      context: "checkout_session_missing_odyssey_metadata",
      event_id: event.id,
      stripe_session_id: session.id,
      status_after: "ignored",
    });
    return "ignored";
  }

  if (metadataMode && metadataMode !== "b2b2c_family") {
    logWebhook({
      level: "info",
      context: "checkout_session_not_b2b2c_family_metadata",
      event_id: event.id,
      checkout_mode: metadataMode,
      status_after: "ignored",
    });
    return "ignored";
  }

  // Résoudre tribute_checkouts : checkout_id metadata → sinon stripe_session_id
  let checkoutQuery = supabase
    .from("tribute_checkouts")
    .select(
      "id, checkout_mode, status, tenant_id, project_id, family_total_cents, commission_status, platform_fee_bps, commission_rate_bps",
    );

  if (checkoutIdRaw) {
    checkoutQuery = checkoutQuery.eq("id", checkoutIdRaw);
  } else {
    checkoutQuery = checkoutQuery.eq("stripe_session_id", session.id);
  }

  const { data: checkout, error: checkoutError } = await checkoutQuery.maybeSingle();

  if (checkoutError) {
    throw new Error(`tribute_checkout_lookup_failed: ${checkoutError.message}`);
  }

  if (!checkout) {
    // Saga absente ou session legacy : ignore (pas 500)
    logWebhook({
      level: "warn",
      context: "tribute_checkout_not_found",
      event_id: event.id,
      checkout_id: checkoutIdRaw || null,
      stripe_session_id: session.id,
      project_id: projectId || null,
      status_after: "ignored",
    });
    return "ignored";
  }

  if (checkout.checkout_mode !== "b2b2c_family") {
    return "ignored";
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, is_freemium")
    .eq("id", checkout.tenant_id)
    .maybeSingle();

  if (tenantError) {
    throw new Error(`tenant_lookup_failed: ${tenantError.message}`);
  }

  if (!tenant?.is_freemium) {
    logWebhook({
      level: "info",
      context: "checkout_tenant_not_freemium",
      event_id: event.id,
      checkout_id: checkout.id,
      tenant_id: checkout.tenant_id,
      status_after: "ignored",
    });
    return "ignored";
  }

  const grossPaymentCents = session.amount_total;
  if (grossPaymentCents == null || grossPaymentCents <= 0) {
    // Souvenir 0 $ / session gratuite : pas d'accrual
    logWebhook({
      level: "info",
      context: "checkout_session_zero_gross",
      event_id: event.id,
      checkout_id: checkout.id,
      status_after: "ignored",
    });
    return "ignored";
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  // Snapshot session + statut saga (idempotent si déjà completed)
  const { error: updateCheckoutError } = await supabase
    .from("tribute_checkouts")
    .update({
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", checkout.id)
    .in("status", ["pending", "awaiting_payment", "completed"]);

  if (updateCheckoutError) {
    throw new Error(`tribute_checkout_complete_failed: ${updateCheckoutError.message}`);
  }

  const resolvedProjectId =
    (typeof checkout.project_id === "string" && checkout.project_id) ||
    projectId ||
    null;

  if (resolvedProjectId) {
    const { error: updateProjectError } = await supabase
      .from("projects")
      .update({ status: "submitted" })
      .eq("id", resolvedProjectId);

    if (updateProjectError) {
      throw new Error(`project_submit_failed: ${updateProjectError.message}`);
    }
  }

  // Accrual Bulletproof — Gross Volume = amount_total ; idempotence = event.id
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "accrue_partner_commission_for_checkout",
    {
      p_checkout_id: checkout.id,
      p_gross_payment_cents: grossPaymentCents,
      p_stripe_event_id: event.id,
      p_stripe_payment_intent_id: paymentIntentId,
      p_platform_fee_bps: checkout.platform_fee_bps ?? null,
      p_commission_rate_bps: checkout.commission_rate_bps ?? null,
    },
  );

  if (rpcError) {
    throw new Error(`accrue_partner_commission_failed: ${rpcError.message}`);
  }

  const result = (rpcData ?? {}) as AccrueRpcResult;

  if (result.ok === true) {
    logWebhook({
      level: "info",
      context: "commission_accrual_ok",
      event_id: event.id,
      checkout_id: checkout.id,
      project_id: resolvedProjectId,
      gross_payment_cents: grossPaymentCents,
      commission_cents: result.commission_cents ?? null,
      net_distributable_cents: result.net_distributable_cents ?? null,
      already_processed: Boolean(result.already_processed),
      already_accrued: Boolean(result.already_accrued),
      ledger_id: result.ledger_id ?? null,
      status_after: "processed",
    });
    return "processed";
  }

  // Raisons métier RPC → ignore (200), pas retry
  logWebhook({
    level: "warn",
    context: "commission_accrual_skipped",
    event_id: event.id,
    checkout_id: checkout.id,
    reason: result.reason ?? "unknown",
    status_after: "ignored",
  });
  return "ignored";
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    // Client admin explicite: utilise IMPERATIVEMENT SUPABASE_SERVICE_ROLE_KEY
    // pour bypass RLS dans le webhook backend.
    const supabase = getSupabaseAdminClient();
    const signature = request.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing stripe-signature header or STRIPE_WEBHOOK_SECRET." },
        { status: 400 },
      );
    }

    const body = await request.text();
    let event: Stripe.Event;
    const ttlSeconds = parseTtlSeconds();
    const lockToken = crypto.randomUUID();

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      logWebhookError("stripe_signature_verification", error);
      const message =
        error instanceof Error ? error.message : "Invalid Stripe signature";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Idempotence / lock: ne jamais ecraser un evenement deja finalise.
    const { data: beforeLock, error: beforeLockError } = await supabase
      .from("webhook_events")
      .select("id,status,processing_started_at,lock_token")
      .eq("provider", "stripe")
      .eq("event_id", event.id)
      .maybeSingle();

    if (beforeLockError) {
      logWebhookError("supabase_webhook_prelock_check", beforeLockError);
      return NextResponse.json(
        { error: `Webhook pre-lock check failed: ${beforeLockError.message}` },
        { status: 500 },
      );
    }

    if (beforeLock?.status === "processed") {
      return NextResponse.json({ ok: true, idempotent: true }, { status: 200 });
    }

    if (
      beforeLock?.status === "processing" &&
      beforeLock.processing_started_at &&
      Date.now() - new Date(beforeLock.processing_started_at).getTime() < ttlSeconds * 1000
    ) {
      return NextResponse.json({ ok: true, in_progress: true }, { status: 200 });
    }

    const processingStartedAt = new Date().toISOString();
    const { error: upsertLockError } = await supabase.from("webhook_events").upsert(
      {
        provider: "stripe",
        event_id: event.id,
        status: "processing",
        processing_started_at: processingStartedAt,
        lock_token: lockToken,
        payload: event,
        received_at: beforeLock ? undefined : new Date().toISOString(),
        error_log: {},
      },
      { onConflict: "provider,event_id" },
    );

    if (upsertLockError) {
      logWebhookError("supabase_webhook_upsert_lock", upsertLockError, {
        event_id: event.id,
      });
      return NextResponse.json(
        { error: `Webhook lock upsert failed: ${upsertLockError.message}` },
        { status: 500 },
      );
    }

    const { data: afterLock, error: afterLockError } = await supabase
      .from("webhook_events")
      .select("status,lock_token")
      .eq("provider", "stripe")
      .eq("event_id", event.id)
      .maybeSingle();

    if (afterLockError) {
      logWebhookError("supabase_webhook_recheck_lock", afterLockError, {
        event_id: event.id,
      });
      return NextResponse.json(
        { error: `Webhook lock re-check failed: ${afterLockError.message}` },
        { status: 500 },
      );
    }

    if (afterLock?.status === "processed") {
      return NextResponse.json({ ok: true, idempotent: true }, { status: 200 });
    }

    if (!afterLock || afterLock.status !== "processing" || afterLock.lock_token !== lockToken) {
      return NextResponse.json({ ok: true, lock_owned: false }, { status: 200 });
    }

    const statusBefore = "processing";

    try {
      let processingStatus: WebhookStatus = "ignored";

      if (event.type === "product.created" || event.type === "product.updated") {
        const product = event.data.object as Stripe.Product;
        processingStatus = await syncCatalogRowFromProduct(stripe, product, supabase, event);
      } else if (event.type === "price.created" || event.type === "price.updated") {
        const price = event.data.object as Stripe.Price;
        processingStatus = await syncCatalogRowFromPrice(stripe, price, supabase, event);
      } else if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        processingStatus = await handleCheckoutSessionCompleted(
          session,
          event,
          supabase,
        );
      } else {
        processingStatus = "ignored";
      }

      const transitioned = await transitionWebhookStatus(supabase, {
        eventId: event.id,
        lockToken,
        statusAfter: processingStatus,
      });

      logWebhook({
        event_id: event.id,
        event_type: event.type,
        ttl_seconds: ttlSeconds,
        status_before: statusBefore,
        status_after: processingStatus,
        lock_token: lockToken,
        rows_affected: transitioned ? 1 : 0,
      });

      if (!transitioned) {
        return NextResponse.json(
          { error: "state_transition_conflict" },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { ok: true, eventType: event.type, status: processingStatus },
        { status: 200 },
      );
    } catch (error) {
      const errorLog = makeErrorLog(event, error);
      const transitioned = await transitionWebhookStatus(supabase, {
        eventId: event.id,
        lockToken,
        statusAfter: "failed",
        errorLog,
      });

      logWebhookError("webhook_processing_failed", error, {
        event_id: event.id,
        event_type: event.type,
        ttl_seconds: ttlSeconds,
        status_before: statusBefore,
        status_after: "failed",
        lock_token: lockToken,
        rows_affected: transitioned ? 1 : 0,
      });

      if (!transitioned) {
        return NextResponse.json(
          { error: "state_transition_conflict" },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: errorLog.message },
        { status: 500 },
      );
    }
  } catch (error) {
    logWebhookError("webhook_unhandled_exception", error);
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

