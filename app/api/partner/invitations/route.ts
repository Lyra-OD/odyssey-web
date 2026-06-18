import { NextResponse } from "next/server";

import { createPartnerInvitationWithDebit } from "@/src/lib/partner/createPartnerInvitationWithDebit";
import {
  CreatePartnerInvitationBodySchema,
  INVITATION_TTL_DAYS,
  type InvitationAlreadyPendingError,
  type InvitationLocale,
} from "@/src/lib/partner/invitationSchemas";
import {
  generateInvitationSecret,
  hashInvitationToken,
} from "@/src/lib/partner/invitationToken";
import { resolvePartnerMembership } from "@/src/lib/partner/resolvePartnerMembership";
import { createClient } from "@/utils/supabase/server";

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

function buildMagicLinkUrl(
  origin: string,
  locale: InvitationLocale,
  secret: string,
): string {
  return `${origin}/${locale}/invite/accept?token=${encodeURIComponent(secret)}`;
}

function overdraftLimitMessage(locale: InvitationLocale): string {
  return locale === "en"
    ? "The partner token credit limit has been reached. Please contact your administrator to top up the account."
    : "La limite de découvert jetons du partenaire est atteinte. Veuillez contacter votre administrateur pour recharger le compte.";
}

function invitationAlreadyPendingMessage(locale: InvitationLocale): string {
  return locale === "en"
    ? "An invitation is already pending for this email address."
    : "Une invitation est déjà en attente pour cette adresse.";
}

/**
 * POST /api/partner/invitations
 * Crée une invitation B2B2C + débit jetons atomique (RPC P5.5, service_role).
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

  const membership = await resolvePartnerMembership(
    supabase,
    user.id,
    tenantId,
    { requiredCapability: "canInvite" },
  );
  if (!membership.ok) {
    const status = membership.error === "forbidden" ? 403 : 400;
    return NextResponse.json(
      {
        error: membership.error,
        message: membership.message,
        ...(membership.capability ? { capability: membership.capability } : {}),
      },
      { status },
    );
  }

  const secret = generateInvitationSecret();
  const magicLinkTokenHash = hashInvitationToken(secret);
  const expiresAt = invitationExpiresAt();

  const rpcResult = await createPartnerInvitationWithDebit({
    tenantId,
    actorUserId: user.id,
    familyEmail,
    grantedPackage,
    magicLinkTokenHash,
    expiresAt,
    locale,
  });

  if (!rpcResult.ok) {
    switch (rpcResult.error) {
      case "overdraft_limit_exceeded":
        return NextResponse.json(
          {
            error: "overdraft_limit_exceeded",
            message: overdraftLimitMessage(locale),
            balance: rpcResult.balance,
            creditLimitTokens: rpcResult.creditLimitTokens,
            required: rpcResult.required,
            wouldBeBalance: rpcResult.wouldBeBalance,
          },
          { status: 402 },
        );

      case "invitation_already_pending": {
        const pendingBody: InvitationAlreadyPendingError = {
          error: "invitation_already_pending",
          message: invitationAlreadyPendingMessage(locale),
          ...(rpcResult.invitationId
            ? { invitationId: rpcResult.invitationId }
            : {}),
          ...(rpcResult.expiresAt !== undefined
            ? { expiresAt: rpcResult.expiresAt }
            : {}),
          ...(rpcResult.grantedPackage
            ? { grantedPackage: rpcResult.grantedPackage }
            : {}),
        };
        return NextResponse.json(pendingBody, { status: 409 });
      }

      case "schema_not_ready":
        return NextResponse.json(
          {
            error: "schema_not_ready",
            message:
              "RPC create_partner_invitation_with_debit absente — exécuter odyssey_p5_5_partner_rbac_overdraft.sql",
          },
          { status: 503 },
        );

      case "invalid_granted_package":
      case "invalid_email":
      case "invalid_arguments":
      case "invalid_token_amount":
        return NextResponse.json(
          { error: rpcResult.error, message: "Invalid invitation payload." },
          { status: 400 },
        );

      case "wallet_not_found":
        return NextResponse.json(
          {
            error: "wallet_not_found",
            message:
              locale === "en"
                ? "No token wallet exists for this partner."
                : "Aucun portefeuille jetons pour ce partenaire.",
          },
          { status: 503 },
        );

      default:
        console.error(
          "[partner/invitations] RPC business error:",
          rpcResult.error,
        );
        return NextResponse.json(
          {
            error: "invitation_create_failed",
            message:
              locale === "en"
                ? "Could not create the invitation. Please try again."
                : "Impossible de créer l'invitation. Veuillez réessayer.",
          },
          { status: 400 },
        );
    }
  }

  const origin = resolveSiteOrigin(request);
  const magicLinkUrl = buildMagicLinkUrl(origin, locale, secret);

  return NextResponse.json({
    invitationId: rpcResult.invitationId,
    status: rpcResult.status,
    magicLinkUrl,
    expiresAt: rpcResult.expiresAt,
    grantedPackage: rpcResult.grantedPackage,
  });
}
