import { NextResponse } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  assertPartnerTenantAccess,
} from "@/src/lib/partner/resolvePartnerTenant";
import {
  CreatePartnerInvitationBodySchema,
  INVITATION_TTL_DAYS,
  type InvitationAlreadyPendingError,
  type InvitationLocale,
  type LegacyGrantedPackage,
} from "@/src/lib/partner/invitationSchemas";
import {
  generateInvitationSecret,
  hashInvitationToken,
} from "@/src/lib/partner/invitationToken";
import type { PackageId } from "@/src/lib/wizard/wizardDeliverables";
import { createClient } from "@/utils/supabase/server";

type PendingInvitationRow = {
  id: string;
  expires_at: string | null;
  granted_package: LegacyGrantedPackage;
};

const PACKAGE_ID_MAP: Record<LegacyGrantedPackage, PackageId> = {
  essential: "SOUVENIR",
  signature: "HERITAGE",
  heritage: "ETERNITE",
};

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

function isInvitationExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

function buildAlreadyPendingResponse(
  row: PendingInvitationRow,
  locale: InvitationLocale,
): NextResponse {
  const message =
    locale === "en"
      ? "An invitation is already pending for this email address."
      : "Une invitation est déjà en attente pour cette adresse.";

  const body: InvitationAlreadyPendingError = {
    error: "invitation_already_pending",
    message,
    invitationId: row.id,
    expiresAt: row.expires_at,
    grantedPackage: row.granted_package,
  };

  return NextResponse.json(body, { status: 409 });
}

async function findPendingInvitation(
  supabase: SupabaseClient,
  tenantId: string,
  familyEmail: string,
): Promise<PendingInvitationRow | null> {
  const { data, error } = await supabase
    .from("partner_invitations")
    .select("id, expires_at, granted_package")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .eq("invited_email", familyEmail)
    .maybeSingle();

  if (error) {
    console.error("[partner/invitations] pending lookup failed:", error.message);
    return null;
  }

  return (data as PendingInvitationRow | null) ?? null;
}

async function expirePendingInvitation(
  supabase: SupabaseClient,
  invitationId: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("partner_invitations")
    .update({
      status: "expired",
      updated_at: now,
    })
    .eq("id", invitationId)
    .eq("status", "pending");

  if (error) {
    console.error("[partner/invitations] expire pending failed:", error.message);
    return false;
  }

  return true;
}

/**
 * Expire les pending périmées ; bloque si une pending valide existe déjà.
 */
async function resolvePendingInvitationGate(
  supabase: SupabaseClient,
  tenantId: string,
  familyEmail: string,
  locale: InvitationLocale,
): Promise<NextResponse | null> {
  const pending = await findPendingInvitation(supabase, tenantId, familyEmail);
  if (!pending) return null;

  if (isInvitationExpired(pending.expires_at)) {
    const expired = await expirePendingInvitation(supabase, pending.id);
    if (!expired) {
      return NextResponse.json(
        {
          error: "invitation_expire_failed",
          message:
            locale === "en"
              ? "Could not expire the previous invitation. Please try again."
              : "Impossible d'expirer l'invitation précédente. Veuillez réessayer.",
        },
        { status: 400 },
      );
    }
    return null;
  }

  return buildAlreadyPendingResponse(pending, locale);
}

function buildMagicLinkUrl(
  origin: string,
  locale: InvitationLocale,
  secret: string,
): string {
  return `${origin}/${locale}/invite/accept?token=${encodeURIComponent(secret)}`;
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

  const { familyEmail, grantedPackage, tenantId, locale } = parsed.data;

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

  const pendingGate = await resolvePendingInvitationGate(
    supabase,
    tenantId,
    familyEmail,
    locale,
  );
  if (pendingGate) return pendingGate;

  const secret = generateInvitationSecret();
  const magicLinkTokenHash = hashInvitationToken(secret);
  const expiresAt = invitationExpiresAt();

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
        packageId: PACKAGE_ID_MAP[grantedPackage],
        createdBy: user.id,
        locale,
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

    if (insertError.code === "23505") {
      const conflicting = await findPendingInvitation(
        supabase,
        tenantId,
        familyEmail,
      );
      if (conflicting) {
        return buildAlreadyPendingResponse(conflicting, locale);
      }
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
  const magicLinkUrl = buildMagicLinkUrl(origin, locale, secret);

  return NextResponse.json({
    invitationId: row.id,
    status: row.status,
    magicLinkUrl,
    expiresAt: row.expires_at ?? expiresAt,
    grantedPackage: grantedPackage,
  });
}
