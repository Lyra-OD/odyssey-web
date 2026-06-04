import "server-only";

import { hashInvitationToken } from "@/src/lib/partner/invitationToken";
import type { LegacyGrantedPackage } from "@/src/lib/wizard/wizardDeliverables";
import { coerceExtensionsState } from "@/src/lib/wizard/wizardExtensions";
import { WIZARD_STATE_VERSION } from "@/src/lib/wizard/wizardState";
import { buildPricingSnapshot } from "@/src/lib/wizard/wizardPricing";
import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import { normalizeBasePackageId } from "@/src/lib/wizard/pricingConfig";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type RedeemInvitationErrorCode =
  | "invalid_token"
  | "not_found"
  | "already_used"
  | "expired"
  | "email_mismatch"
  | "project_create_failed"
  | "invitation_update_failed";

export type RedeemInvitationResult =
  | { ok: true; projectId: string; invitationId: string }
  | {
      ok: false;
      code: RedeemInvitationErrorCode;
      message: string;
    };

type PartnerInvitationRow = {
  id: string;
  tenant_id: string;
  invited_email: string;
  granted_package: LegacyGrantedPackage;
  status: string;
  project_id: string | null;
  accepted_user_id: string | null;
  expires_at: string | null;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

function grantedPackageToBasePackage(
  granted: LegacyGrantedPackage,
): WizardBasePackage {
  return normalizeBasePackageId(granted) ?? "signature";
}

function buildInvitationWizardState(
  grantedPackage: LegacyGrantedPackage,
  invitationId: string,
): Record<string, unknown> {
  const basePackage = grantedPackageToBasePackage(grantedPackage);
  const extensions = coerceExtensionsState({});
  return {
    version: WIZARD_STATE_VERSION,
    isPartner: false,
    basePackage,
    pricing: buildPricingSnapshot(extensions, basePackage, false),
    b2b2c: {
      invitationId,
      grantedPackage,
    },
  };
}

const FR_MESSAGES: Record<RedeemInvitationErrorCode, string> = {
  invalid_token: "Lien d'invitation invalide ou manquant.",
  not_found: "Cette invitation a déjà été utilisée ou n'existe pas.",
  already_used: "Cette invitation a déjà été utilisée ou n'existe pas.",
  expired: "Ce lien a expiré. Veuillez contacter votre salon funéraire.",
  email_mismatch:
    "Connectez-vous avec l'adresse courriel qui a reçu l'invitation.",
  project_create_failed:
    "Impossible de créer votre hommage pour le moment. Réessayez ou contactez votre salon.",
  invitation_update_failed:
    "Impossible de finaliser l'acceptation de l'invitation. Réessayez.",
};

const EN_MESSAGES: Record<RedeemInvitationErrorCode, string> = {
  invalid_token: "Invalid or missing invitation link.",
  not_found: "This invitation has already been used or does not exist.",
  already_used: "This invitation has already been used or does not exist.",
  expired: "This link has expired. Please contact your funeral home.",
  email_mismatch: "Sign in with the email address that received the invitation.",
  project_create_failed:
    "We could not create your tribute right now. Please try again or contact your funeral home.",
  invitation_update_failed:
    "We could not complete accepting this invitation. Please try again.",
};

export function redeemInvitationErrorMessage(
  code: RedeemInvitationErrorCode,
  locale: "fr" | "en",
): string {
  return locale === "en" ? EN_MESSAGES[code] : FR_MESSAGES[code];
}

async function findInvitationByTokenHash(
  tokenHash: string,
): Promise<PartnerInvitationRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("partner_invitations")
    .select(
      "id, tenant_id, invited_email, granted_package, status, project_id, accepted_user_id, expires_at",
    )
    .eq("magic_link_token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    console.error("[redeemPartnerInvitation] lookup failed:", error.message);
    return null;
  }

  return (data as PartnerInvitationRow | null) ?? null;
}

/**
 * Valide le secret magic link, crée le projet `public.projects` (P5) et
 * passe l'invitation en `accepted`. Nécessite un utilisateur authentifié.
 */
export async function redeemPartnerInvitation(params: {
  token: string;
  userId: string;
  userEmail: string;
  locale?: "fr" | "en";
}): Promise<RedeemInvitationResult> {
  const locale = params.locale ?? "fr";
  const fail = (code: RedeemInvitationErrorCode): RedeemInvitationResult => ({
    ok: false,
    code,
    message: redeemInvitationErrorMessage(code, locale),
  });

  const trimmed = params.token.trim();
  if (!trimmed) {
    return fail("invalid_token");
  }

  const tokenHash = hashInvitationToken(trimmed);
  const invitation = await findInvitationByTokenHash(tokenHash);
  if (!invitation) {
    return fail("not_found");
  }

  if (isExpired(invitation.expires_at)) {
    return fail("expired");
  }

  if (
    invitation.status === "accepted" &&
    invitation.project_id &&
    invitation.accepted_user_id === params.userId
  ) {
    return {
      ok: true,
      projectId: invitation.project_id,
      invitationId: invitation.id,
    };
  }

  if (invitation.status !== "pending") {
    return fail("already_used");
  }

  const invitedNorm = normalizeEmail(invitation.invited_email);
  const userNorm = normalizeEmail(params.userEmail);
  if (!userNorm || userNorm !== invitedNorm) {
    return fail("email_mismatch");
  }

  const supabase = await createClient();
  const wizardState = buildInvitationWizardState(
    invitation.granted_package,
    invitation.id,
  );

  const projectPayload: Record<string, unknown> = {
    user_id: params.userId,
    tenant_id: invitation.tenant_id,
    invitation_id: invitation.id,
    status: "draft",
    wizard_state: wizardState,
    wizard_step: 1,
  };

  const { data: project, error: insertError } = await supabase
    .from("projects")
    .insert(projectPayload)
    .select("id")
    .single();

  if (insertError || !project?.id) {
    console.error(
      "[redeemPartnerInvitation] project insert failed:",
      insertError?.message,
    );
    return fail("project_create_failed");
  }

  const admin = getSupabaseAdminClient();
  const acceptedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("partner_invitations")
    .update({
      status: "accepted",
      project_id: project.id,
      accepted_user_id: params.userId,
      accepted_at: acceptedAt,
      updated_at: acceptedAt,
    })
    .eq("id", invitation.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    console.error(
      "[redeemPartnerInvitation] invitation update failed:",
      updateError?.message,
    );
    await admin.from("projects").delete().eq("id", project.id);
    return fail("invitation_update_failed");
  }

  return {
    ok: true,
    projectId: project.id as string,
    invitationId: invitation.id,
  };
}
