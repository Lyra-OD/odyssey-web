import type { SupabaseClient } from "@supabase/supabase-js";

export type PartnerWalletRow = {
  balance: number;
  creditLimitTokens: number;
};

/**
 * Reads wallet snapshot for a tenant (RLS: `partner_admin` SELECT only).
 */
export async function fetchPartnerWalletRow(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<PartnerWalletRow | null> {
  const { data, error } = await supabase
    .from("partner_token_wallets")
    .select("balance, credit_limit_tokens")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    balance: Number(data.balance),
    creditLimitTokens: Number(data.credit_limit_tokens),
  };
}
