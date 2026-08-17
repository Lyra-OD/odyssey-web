import { NextResponse } from "next/server";

import { sendPartnerFollowUpEmail } from "@/src/lib/email/sendPartnerFollowUpEmail";
import { resolveSiteOrigin } from "@/src/lib/http/siteOrigin";
import { INVITATION_TTL_DAYS } from "@/src/lib/partner/invitationSchemas";
import {
  buildInvitationMagicLinkUrl,
  hasInvitationFollowUpBeenSent,
  invitationLocaleFromMetadata,
  mergeInvitationFollowUpMetadata,
} from "@/src/lib/partner/invitationMagicLink";
import {
  generateInvitationSecret,
  hashInvitationToken,
} from "@/src/lib/partner/invitationToken";
import {
  FOLLOW_UP_AFTER_DAYS,
  isPendingDueForFollowUp,
} from "@/src/lib/partner/partnerPerformance";
import {
  PARTNER_API_ERROR,
  partnerApiErrorResponse,
} from "@/src/lib/partner/partnerApiErrors";
import { resolvePartnerMembership } from "@/src/lib/partner/resolvePartnerMembership";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type InvitationRow = {
  id: string;
  tenant_id: string;
  invited_email: string;
  status: string;
  created_at: string;
  invited_by_user_id: string | null;
  metadata: unknown;
};

/**
 * POST /api/partner/invitations/[id]/follow-up
 * Un rappel e-mail, déclenché par le conseiller. Régénère le magic link (hash only).
 */
export async function POST(request: Request, context: RouteContext) {
  const { id: invitationId } = await context.params;
  if (
    typeof invitationId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(invitationId)
  ) {
    return NextResponse.json({ error: "invalid_invitation" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return partnerApiErrorResponse(PARTNER_API_ERROR.UNAUTHENTICATED, 401);
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return partnerApiErrorResponse(PARTNER_API_ERROR.INTERNAL, 500);
  }

  const { data: invitationRaw } = await admin
    .from("partner_invitations")
    .select(
      "id, tenant_id, invited_email, status, created_at, invited_by_user_id, metadata",
    )
    .eq("id", invitationId)
    .maybeSingle();

  const invitation = invitationRaw as InvitationRow | null;
  if (!invitation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const membership = await resolvePartnerMembership(
    supabase,
    user.id,
    invitation.tenant_id,
    { requiredCapability: "canInvite" },
  );
  if (!membership.ok) {
    return partnerApiErrorResponse(PARTNER_API_ERROR.FORBIDDEN, 403);
  }

  if (invitation.invited_by_user_id !== user.id) {
    return partnerApiErrorResponse(PARTNER_API_ERROR.FORBIDDEN, 403);
  }

  if (hasInvitationFollowUpBeenSent(invitation.metadata)) {
    return NextResponse.json({ error: "follow_up_already_sent" }, { status: 409 });
  }

  if (
    !isPendingDueForFollowUp(
      {
        id: invitation.id,
        invited_email: invitation.invited_email,
        status: invitation.status,
        created_at: invitation.created_at,
        metadata: invitation.metadata,
      },
      Date.now(),
    )
  ) {
    return NextResponse.json({ error: "follow_up_not_due" }, { status: 409 });
  }

  const { data: tenant } = await admin
    .from("tenants")
    .select("name")
    .eq("id", invitation.tenant_id)
    .maybeSingle();

  const locale = invitationLocaleFromMetadata(invitation.metadata);
  const secret = generateInvitationSecret();
  const magicLinkTokenHash = hashInvitationToken(secret);
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const origin = resolveSiteOrigin(request);
  const magicLinkUrl = buildInvitationMagicLinkUrl(origin, locale, secret);
  const salonName =
    typeof tenant?.name === "string" && tenant.name.trim()
      ? tenant.name.trim()
      : "Odyssey";

  const sent = await sendPartnerFollowUpEmail({
    to: invitation.invited_email,
    locale,
    salonName,
    magicLinkUrl,
  });

  if (!sent.ok) {
    const status = sent.error === "email_not_configured" ? 503 : 502;
    return NextResponse.json({ error: sent.error }, { status });
  }

  const sentAt = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("partner_invitations")
    .update({
      magic_link_token_hash: magicLinkTokenHash,
      expires_at: expiresAt,
      metadata: mergeInvitationFollowUpMetadata(invitation.metadata, sentAt),
      updated_at: sentAt,
    })
    .eq("id", invitation.id)
    .eq("status", "pending")
    .filter("metadata->>follow_up_sent_at", "is", null)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[invitations/follow-up] persist failed:", updateError.message);
    return partnerApiErrorResponse(PARTNER_API_ERROR.INTERNAL, 500);
  }

  if (!updated) {
    return NextResponse.json({ error: "follow_up_already_sent" }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    invitationId: invitation.id,
    expiresAt,
    followUpAfterDays: FOLLOW_UP_AFTER_DAYS,
  });
}
