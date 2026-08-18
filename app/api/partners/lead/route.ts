import { NextResponse } from "next/server";

import { sendPartnerLeadEmail } from "@/src/lib/email/sendPartnerLeadEmail";
import {
  PARTNER_LEAD_RATE_MAX,
  PARTNER_LEAD_RATE_WINDOW_MS,
  PartnerLeadBodySchema,
  isPartnerLeadHoneypot,
} from "@/src/lib/partners/partnerLead";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

/**
 * POST /api/partners/lead
 * Formulaire marketing public. Stocke le lead, alerte HQ (Resend).
 * Pas de création de tenant. Accusé auto vers le salon : hors MVP.
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = PartnerLeadBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { website, ...lead } = parsed.data;
  if (isPartnerLeadHoneypot(website)) {
    return NextResponse.json({ ok: true });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const windowStart = new Date(
    Date.now() - PARTNER_LEAD_RATE_WINDOW_MS,
  ).toISOString();

  try {
    const { count, error: countError } = await admin
      .from("partner_leads")
      .select("id", { count: "exact", head: true })
      .eq("email", lead.email)
      .gte("created_at", windowStart);

    if (countError) {
      if (countError.message.includes("partner_leads")) {
        return NextResponse.json(
          { error: "table_not_deployed" },
          { status: 500 },
        );
      }
      throw new Error(countError.message);
    }

    if ((count ?? 0) >= PARTNER_LEAD_RATE_MAX) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const { data: inserted, error: insertError } = await admin
      .from("partner_leads")
      .insert({
        organization: lead.organization,
        contact_name: lead.contactName,
        email: lead.email,
        phone: lead.phone || null,
        region: lead.region || null,
        context: lead.context || null,
        message: lead.message,
        locale: lead.locale,
        source: "partners_form",
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      if (insertError.message.includes("partner_leads")) {
        return NextResponse.json(
          { error: "table_not_deployed" },
          { status: 500 },
        );
      }
      throw new Error(insertError.message);
    }

    const sent = await sendPartnerLeadEmail({
      lead,
      locale: lead.locale,
    });

    if (!sent.ok) {
      const status = sent.error === "email_not_configured" ? 503 : 502;
      return NextResponse.json({ error: sent.error }, { status });
    }

    if (inserted?.id) {
      await admin
        .from("partner_leads")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", inserted.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[partners/lead]", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
