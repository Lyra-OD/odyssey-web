import "server-only";

import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  hasLegacyTokenPricing,
  packagePartnerTokens,
  type WizardPartnerGrantedPackage,
} from "@/src/lib/wizard/pricingConfig";

export type PartnerTokenDebitResult =
  | {
      ok: true;
      tokensDebited: number;
      balanceAfter: number;
    }
  | {
      ok: false;
      error:
        | "invalid_package"
        | "wallet_not_found"
        | "insufficient_tokens"
        | "debit_failed"
        | "wallet_table_missing";
      message: string;
    };

/**
 * Débite le wallet jetons du tenant partenaire (atomique).
 * Table : `public.partner_token_wallets` (voir docs/sql/odyssey_p4_partner_token_wallets.sql).
 */
export async function debitPartnerTokens(params: {
  tenantId: string;
  packageId: WizardPartnerGrantedPackage;
  projectId: string;
  userId: string;
}): Promise<PartnerTokenDebitResult> {
  if (!hasLegacyTokenPricing(params.packageId)) {
    return {
      ok: false,
      error: "invalid_package",
      message:
        "Forfait invalide pour un débit jetons partenaire. `legendary` est réservé au B2C direct.",
    };
  }

  const tokensRequired = packagePartnerTokens(params.packageId);
  const admin = getSupabaseAdminClient();

  const { data: wallet, error: fetchError } = await admin
    .from("partner_token_wallets")
    .select("balance")
    .eq("tenant_id", params.tenantId)
    .maybeSingle();

  if (fetchError) {
    const missingTable =
      fetchError.message.includes("partner_token_wallets") ||
      fetchError.code === "42P01";
    if (missingTable) {
      return {
        ok: false,
        error: "wallet_table_missing",
        message:
          "Table partner_token_wallets absente — exécuter odyssey_p4_partner_token_wallets.sql",
      };
    }
    return {
      ok: false,
      error: "debit_failed",
      message: fetchError.message,
    };
  }

  if (!wallet) {
    return {
      ok: false,
      error: "wallet_not_found",
      message: "Aucun portefeuille jetons pour ce partenaire.",
    };
  }

  const balance = wallet.balance as number;
  if (balance < tokensRequired) {
    return {
      ok: false,
      error: "insufficient_tokens",
      message: `Solde insuffisant (${balance} jeton(s), requis ${tokensRequired}).`,
    };
  }

  const { data: updated, error: updateError } = await admin
    .from("partner_token_wallets")
    .update({
      balance: balance - tokensRequired,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", params.tenantId)
    .eq("balance", balance)
    .select("balance")
    .maybeSingle();

  if (updateError || !updated) {
    return {
      ok: false,
      error: "debit_failed",
      message: updateError?.message ?? "Échec de la mise à jour du solde.",
    };
  }

  const { error: ledgerError } = await admin.from("partner_token_ledger").insert({
    tenant_id: params.tenantId,
    project_id: params.projectId,
    user_id: params.userId,
    delta: -tokensRequired,
    balance_after: updated.balance as number,
    reason: "wizard_checkout",
    package_id: params.packageId,
  });

  if (ledgerError) {
    console.warn(
      "[partnerCheckout] ledger insert failed (debit applied):",
      ledgerError.message,
    );
  }

  return {
    ok: true,
    tokensDebited: tokensRequired,
    balanceAfter: updated.balance as number,
  };
}
