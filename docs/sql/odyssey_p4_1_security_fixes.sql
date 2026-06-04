-- Odyssey P4.1 — RLS partenaires (rôles) + index ledger project_id
-- Prérequis : odyssey_p4_partner_token_wallets.sql

-- ---------------------------------------------------------------------
-- 1) partner_token_wallets — SELECT restreint partner / partner_admin
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS partner_wallets_select_member ON public.partner_token_wallets;

CREATE POLICY partner_wallets_select_partner_roles
  ON public.partner_token_wallets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_token_wallets.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('partner', 'partner_admin')
    )
  );

-- ---------------------------------------------------------------------
-- 2) partner_token_ledger — SELECT historique du tenant (mêmes rôles)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS partner_ledger_select_member ON public.partner_token_ledger;
DROP POLICY IF EXISTS partner_ledger_select_partner_roles ON public.partner_token_ledger;

CREATE POLICY partner_ledger_select_partner_roles
  ON public.partner_token_ledger
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_token_ledger.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('partner', 'partner_admin')
    )
  );

-- ---------------------------------------------------------------------
-- 3) Index — requêtes par projet (support / checkout)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_partner_token_ledger_project
  ON public.partner_token_ledger (project_id)
  WHERE project_id IS NOT NULL;
