import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import {
  GUEST_MASTER_COPY_SKU,
} from "@/src/lib/wizard/guestMasterCopy";
import { resolveSessionStreamToken } from "@/src/lib/wizard/sessionStreamToken";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/**
 * GET /api/stream/[token]/download?session_id=
 * C12 — après Checkout réussi : URL du Master déjà rendu (licence, 0 re-render).
 */
export async function GET(
  req: Request,
  { params }: { params: { token: string } },
) {
  const rawToken = typeof params.token === "string" ? params.token.trim() : "";
  if (!rawToken) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id")?.trim() || "";
  if (!sessionId) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }

  const tokenRow = await resolveSessionStreamToken(rawToken);
  if (!tokenRow) {
    return NextResponse.json({ error: "invalid_or_expired_link" }, { status: 404 });
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

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: "invalid_session" }, { status: 404 });
  }

  if (session.payment_status !== "paid" && session.status !== "complete") {
    return NextResponse.json({ error: "payment_not_complete" }, { status: 402 });
  }

  const meta = session.metadata ?? {};
  if (meta.sku !== GUEST_MASTER_COPY_SKU && meta.product_key !== GUEST_MASTER_COPY_SKU) {
    return NextResponse.json({ error: "wrong_sku" }, { status: 403 });
  }
  if (meta.project_id !== tokenRow.project_id) {
    return NextResponse.json({ error: "project_mismatch" }, { status: 403 });
  }

  const admin = getSupabaseAdminClient();

  // Licence enregistrée (webhook) ou session Stripe payée suffit pour ce MVP.
  const { data: licence } = await admin
    .from("guest_micro_checkouts")
    .select("id, status")
    .eq("project_id", tokenRow.project_id)
    .eq("product_key", GUEST_MASTER_COPY_SKU)
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (
    licence &&
    licence.status !== "completed" &&
    licence.status !== "awaiting_payment"
  ) {
    // awaiting_payment ok si webhook en retard — session Stripe déjà paid.
  }

  const { data: job } = await admin
    .from("project_export_jobs")
    .select("id, status, output_url")
    .eq("project_id", tokenRow.project_id)
    .eq("status", "completed")
    .not("output_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const outputUrl =
    typeof job?.output_url === "string" ? job.output_url.trim() : "";

  if (!outputUrl) {
    return NextResponse.json(
      { error: "archive_pending", ok: false },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    downloadUrl: outputUrl,
    guestCheckoutId: licence?.id ?? meta.guest_checkout_id ?? null,
  });
}
