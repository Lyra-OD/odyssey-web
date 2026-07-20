import "server-only";

import { z } from "zod";

import {
  LegacyGrantedPackageSchema,
  type InvitationLocale,
  type LegacyGrantedPackage,
} from "@/src/lib/partner/invitationSchemas";
import type { PackageId } from "@/src/lib/wizard/wizardDeliverables";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

const PACKAGE_ID_MAP: Record<LegacyGrantedPackage, PackageId> = {
  essential: "SOUVENIR",
  signature: "HERITAGE",
  heritage: "ETERNITE",
};

const RpcInvitationSuccessSchema = z
  .object({
    ok: z.literal(true),
    invitation_id: z.string().uuid(),
    status: z.string(),
    expires_at: z.string(),
    granted_package: LegacyGrantedPackageSchema,
  })
  .strict();

const RpcInvitationErrorSchema = z
  .object({
    ok: z.literal(false),
    error: z.string(),
    message: z.string().optional(),
    invitation_id: z.string().uuid().optional(),
    expires_at: z.string().nullable().optional(),
    granted_package: LegacyGrantedPackageSchema.optional(),
  })
  .passthrough();

const RpcInvitationResponseSchema = z.union([
  RpcInvitationSuccessSchema,
  RpcInvitationErrorSchema,
]);

export type CreatePartnerInvitationParams = {
  tenantId: string;
  actorUserId: string;
  familyEmail: string;
  grantedPackage: LegacyGrantedPackage;
  magicLinkTokenHash: string;
  expiresAt: string;
  locale: InvitationLocale;
};

export type CreatePartnerInvitationSuccess = {
  ok: true;
  invitationId: string;
  status: string;
  expiresAt: string;
  grantedPackage: LegacyGrantedPackage;
};

export type CreatePartnerInvitationFailure = {
  ok: false;
  error: string;
  invitationId?: string;
  expiresAt?: string | null;
  grantedPackage?: LegacyGrantedPackage;
};

export type CreatePartnerInvitationResult =
  | CreatePartnerInvitationSuccess
  | CreatePartnerInvitationFailure;

/**
 * Freemium V1 — RPC `create_partner_invitation` (sans débit jetons).
 * Fallback : `create_partner_invitation_with_debit` (wrapper P8 → même comportement).
 */
export async function createPartnerInvitation(
  params: CreatePartnerInvitationParams,
): Promise<CreatePartnerInvitationResult> {
  const admin = getSupabaseAdminClient();

  const rpcArgs = {
    p_tenant_id: params.tenantId,
    p_actor_user_id: params.actorUserId,
    p_invited_email: params.familyEmail,
    p_granted_package: params.grantedPackage,
    p_magic_link_token_hash: params.magicLinkTokenHash,
    p_expires_at: params.expiresAt,
    p_metadata: {
      packageId: PACKAGE_ID_MAP[params.grantedPackage],
      createdBy: params.actorUserId,
      locale: params.locale,
    },
  };

  let data: unknown;
  let error: { message: string; code?: string } | null = null;

  {
    const primary = await admin.rpc("create_partner_invitation", rpcArgs);
    data = primary.data;
    error = primary.error;

    if (error) {
      const missingPrimary =
        error.message.includes("create_partner_invitation") ||
        error.code === "42883";

      if (missingPrimary) {
        const fallback = await admin.rpc(
          "create_partner_invitation_with_debit",
          rpcArgs,
        );
        data = fallback.data;
        error = fallback.error;
      }
    }
  }

  if (error) {
    const missingRpc =
      error.message.includes("create_partner_invitation") ||
      error.code === "42883";

    if (missingRpc) {
      return { ok: false, error: "schema_not_ready" };
    }

    console.error("[createPartnerInvitation] RPC failed:", error.message);
    return { ok: false, error: "invitation_create_failed" };
  }

  const parsed = RpcInvitationResponseSchema.safeParse(data);
  if (!parsed.success) {
    // Wrapper P8 may still return tokens_debited — strip via passthrough success
    const loose = z
      .object({
        ok: z.literal(true),
        invitation_id: z.string().uuid(),
        status: z.string(),
        expires_at: z.string(),
        granted_package: LegacyGrantedPackageSchema,
      })
      .passthrough()
      .safeParse(data);

    if (loose.success && loose.data.ok) {
      return {
        ok: true,
        invitationId: loose.data.invitation_id,
        status: loose.data.status,
        expiresAt: loose.data.expires_at,
        grantedPackage: loose.data.granted_package,
      };
    }

    const errLoose = RpcInvitationErrorSchema.safeParse(data);
    if (errLoose.success && !errLoose.data.ok) {
      return {
        ok: false,
        error: errLoose.data.error,
        ...(errLoose.data.invitation_id
          ? { invitationId: errLoose.data.invitation_id }
          : {}),
        ...(errLoose.data.expires_at !== undefined
          ? { expiresAt: errLoose.data.expires_at }
          : {}),
        ...(errLoose.data.granted_package
          ? { grantedPackage: errLoose.data.granted_package }
          : {}),
      };
    }

    console.error(
      "[createPartnerInvitation] unexpected RPC payload:",
      parsed.error.flatten(),
    );
    return { ok: false, error: "invitation_create_failed" };
  }

  const payload = parsed.data;
  if (!payload.ok) {
    return {
      ok: false,
      error: payload.error,
      ...(payload.invitation_id
        ? { invitationId: payload.invitation_id }
        : {}),
      ...(payload.expires_at !== undefined
        ? { expiresAt: payload.expires_at }
        : {}),
      ...(payload.granted_package
        ? { grantedPackage: payload.granted_package }
        : {}),
    };
  }

  return {
    ok: true,
    invitationId: payload.invitation_id,
    status: payload.status,
    expiresAt: payload.expires_at,
    grantedPackage: payload.granted_package,
  };
}
