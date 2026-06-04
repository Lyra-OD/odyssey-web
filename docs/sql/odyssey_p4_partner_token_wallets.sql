-- Odyssey P4 — Portefeuilles jetons partenaires (B2B)
-- Prérequis : public.tenants, public.projects, auth.users
--
-- Modèle : 1 jeton = 40,00 $ USD (coût gros = 4000 cents)
-- Packages (débit checkout B2B) : essential 1 jeton · signature 2 · heritage 4
-- Voir src/lib/wizard/pricingConfig.ts (priceCents + tokens)

CREATE TABLE IF NOT EXISTS public.partner_token_wallets (
  tenant_id   uuid PRIMARY KEY REFERENCES public.tenants (id) ON DELETE CASCADE,
  balance     integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.partner_token_wallets IS
  'Solde jetons Odyssey par tenant partenaire (funérarium, etc.).';

CREATE TABLE IF NOT EXISTS public.partner_token_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  project_id    uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  user_id       uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  delta         integer NOT NULL,
  balance_after integer NOT NULL,
  reason        text NOT NULL,
  package_id    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_token_ledger_tenant
  ON public.partner_token_ledger (tenant_id, created_at DESC);

ALTER TABLE public.partner_token_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_token_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_wallets_select_member ON public.partner_token_wallets;
CREATE POLICY partner_wallets_select_member
  ON public.partner_token_wallets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_token_wallets.tenant_id
        AND tm.user_id = auth.uid()
    )
  );

REVOKE ALL ON public.partner_token_wallets FROM anon;
GRANT SELECT ON public.partner_token_wallets TO authenticated;
GRANT ALL ON public.partner_token_wallets TO service_role;

REVOKE ALL ON public.partner_token_ledger FROM anon;
GRANT SELECT ON public.partner_token_ledger TO authenticated;
GRANT ALL ON public.partner_token_ledger TO service_role;
