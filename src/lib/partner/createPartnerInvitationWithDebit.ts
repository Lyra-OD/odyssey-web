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
    tokens_debited: z.number().int().nonnegative(),
    balance_after: z.number().int(),
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
    balance: z.number().int().optional(),
    credit_limit_tokens: z.number().int().optional(),
    required: z.number().int().optional(),
    would_be_balance: z.number().int().optional(),
  })
  .passthrough();

const RpcInvitationResponseSchema = z.union([
  RpcInvitationSuccessSchema,
  RpcInvitationErrorSchema,
]);

export type CreatePartnerInvitationWithDebitParams = {
  tenantId: string;
  actorUserId: string;
  familyEmail: string;
  grantedPackage: LegacyGrantedPackage;
  magicLinkTokenHash: string;
  expiresAt: string;
  locale: InvitationLocale;
};

export type CreatePartnerInvitationWithDebitSuccess = {
  ok: true;
  invitationId: string;
  status: string;
  expiresAt: string;
  grantedPackage: LegacyGrantedPackage;
  tokensDebited: number;
  balanceAfter: number;
};

export type CreatePartnerInvitationWithDebitFailure = {
  ok: false;
  error: string;
  invitationId?: string;
  expiresAt?: string | null;
  grantedPackage?: LegacyGrantedPackage;
  balance?: number;
  creditLimitTokens?: number;
  required?: number;
  wouldBeBalance?: number;
};

export type CreatePartnerInvitationWithDebitResult =
  | CreatePartnerInvitationWithDebitSuccess
  | CreatePartnerInvitationWithDebitFailure;

function mapRpcError(data: z.infer<typeof RpcInvitationErrorSchema>): CreatePartnerInvitationWithDebitFailure {
  return {
    ok: false,
    error: data.error,
    ...(data.invitation_id !== undefined
      ? { invitationId: data.invitation_id }
      : {}),
    ...(data.expires_at !== undefined ? { expiresAt: data.expires_at } : {}),
    ...(data.granted_package !== undefined
      ? { grantedPackage: data.granted_package }
      : {}),
    ...(data.balance !== undefined ? { balance: data.balance } : {}),
    ...(data.credit_limit_tokens !== undefined
      ? { creditLimitTokens: data.credit_limit_tokens }
      : {}),
    ...(data.required !== undefined ? { required: data.required } : {}),
    ...(data.would_be_balance !== undefined
      ? { wouldBeBalance: data.would_be_balance }
      : {}),
  };
}

/**
 * Appelle `create_partner_invitation_with_debit` (service_role).
 * Débit atomique + insertion invitation — P5.5.
 */
export async function createPartnerInvitationWithDebit(
  params: CreatePartnerInvitationWithDebitParams,
): Promise<CreatePartnerInvitationWithDebitResult> {
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin.rpc("create_partner_invitation_with_debit", {
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
  });

  if (error) {
    const missingRpc =
      error.message.includes("create_partner_invitation_with_debit") ||
      error.code === "42883";

    if (missingRpc) {
      return {
        ok: false,
        error: "schema_not_ready",
      };
    }

    console.error(
      "[createPartnerInvitationWithDebit] RPC failed:",
      error.message,
    );
    return {
      ok: false,
      error: "invitation_create_failed",
    };
  }

  const parsed = RpcInvitationResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.error(
      "[createPartnerInvitationWithDebit] unexpected RPC payload:",
      parsed.error.flatten(),
    );
    return {
      ok: false,
      error: "invitation_create_failed",
    };
  }

  const payload = parsed.data;

  if (!payload.ok) {
    return mapRpcError(payload);
  }

  return {
    ok: true,
    invitationId: payload.invitation_id,
    status: payload.status,
    expiresAt: payload.expires_at,
    grantedPackage: payload.granted_package,
    tokensDebited: payload.tokens_debited,
    balanceAfter: payload.balance_after,
  };
}
