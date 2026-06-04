import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import {
  assertPartnerTenantAccess,
} from "@/src/lib/partner/resolvePartnerTenant";
import {
  CreatePartnerInvitationBodySchema,
  INVITATION_TTL_DAYS,
} from "@/src/lib/partner/invitationSchemas";
import {
  generateInvitationSecret,
  hashInvitationToken,
} from "@/src/lib/partner/invitationToken";
import type { PackageId } from "@/src/lib/wizard/wizardDeliverables";

const INVITE_ACCEPT_PATH = "/fr/invite/accept";

function resolveSiteOrigin(request: Request): string {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (envOrigin) return envOrigin;
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

function invitationExpiresAt(): string {
  const ms = INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

function isMissingInvitationsTable(
  message: string | undefined,
  code: string | undefined,
): boolean {
  if (code === "42P01") return true;
  if (!message) return false;
  return message.includes("partner_invitations");
}

/**
 * POST /api/partner/invitations
 * Crée une invitation B2B2C (RLS authenticated — secret jamais stocké en clair).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = CreatePartnerInvitationBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { familyEmail, grantedPackage, tenantId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const tenantAccess = await assertPartnerTenantAccess(
    supabase,
    user.id,
    tenantId,
  );
  if (!tenantAccess.ok) {
    const status = tenantAccess.error === "forbidden" ? 403 : 400;
    return NextResponse.json(
      { error: tenantAccess.error, message: tenantAccess.message },
      { status },
    );
  }

  const secret = generateInvitationSecret();
  const magicLinkTokenHash = hashInvitationToken(secret);
  const expiresAt = invitationExpiresAt();

  const packageIdMap: Record<
    (typeof grantedPackage),
    PackageId
  > = {
    essential: "SOUVENIR",
    signature: "HERITAGE",
    heritage: "ETERNITE",
  };

  const { data: row, error: insertError } = await supabase
    .from("partner_invitations")
    .insert({
      tenant_id: tenantId,
      invited_email: familyEmail,
      granted_package: grantedPackage,
      invited_by_user_id: user.id,
      magic_link_token_hash: magicLinkTokenHash,
      expires_at: expiresAt,
      status: "pending",
      metadata: {
        packageId: packageIdMap[grantedPackage],
        createdBy: user.id,
      },
    })
    .select("id, status, expires_at")
    .single();

  if (insertError) {
    if (isMissingInvitationsTable(insertError.message, insertError.code)) {
      return NextResponse.json(
        {
          error: "schema_not_ready",
          message:
            "Table partner_invitations absente — exécuter odyssey_p5_b2b2c_core.sql",
        },
        { status: 503 },
      );
    }

    console.error("[partner/invitations] insert failed:", insertError.message);
    return NextResponse.json(
      {
        error: "invitation_create_failed",
        message: insertError.message,
      },
      { status: 400 },
    );
  }

  if (!row) {
    return NextResponse.json(
      { error: "invitation_create_failed", message: "No row returned." },
      { status: 500 },
    );
  }

  const origin = resolveSiteOrigin(request);
  const magicLinkUrl = `${origin}${INVITE_ACCEPT_PATH}?token=${encodeURIComponent(secret)}`;

  return NextResponse.json({
    invitationId: row.id,
    status: row.status,
    magicLinkUrl,
    expiresAt: row.expires_at ?? expiresAt,
    grantedPackage: grantedPackage,
  });
}
