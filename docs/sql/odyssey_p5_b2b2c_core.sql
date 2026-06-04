-- =====================================================================
-- Odyssey P5 — B2B2C core (invitations, checkouts, débit atomique)
-- =====================================================================
-- Prérequis :
--   odyssey_p1_user_bootstrap.sql (tenant_members)
--   odyssey_p4_partner_token_wallets.sql
--   odyssey_p4_1_security_fixes.sql (recommandé)
--
-- Règles métier (alignées pricingConfig.ts) :
--   essential  → 1 jeton · signature → 2 · heritage → 4
--   B2B2C : débit partenaire = jetons(granted_package) uniquement ;
--           delta famille = Stripe (hors scope SQL).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Helpers — mapping forfait offert → jetons (miroir pricingConfig)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.partner_tokens_for_granted_package(p_package text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT CASE p_package
    WHEN 'essential'  THEN 1
    WHEN 'signature'  THEN 2
    WHEN 'heritage'   THEN 4
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.partner_tokens_for_granted_package(text) IS
  'Jetons débités au partenaire selon le forfait OFFERT (granted_package), pas le forfait choisi par la famille.';

-- ---------------------------------------------------------------------
-- 1) partner_invitations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_invitations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  invited_email         text NOT NULL,
  granted_package       text NOT NULL,
  status                text NOT NULL DEFAULT 'pending',
  invited_by_user_id    uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  project_id            uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  accepted_user_id      uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  magic_link_token_hash text,
  expires_at            timestamptz,
  accepted_at           timestamptz,
  revoked_at            timestamptz,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_invitations_granted_package_check
    CHECK (granted_package IN ('essential', 'signature', 'heritage')),
  CONSTRAINT partner_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  CONSTRAINT partner_invitations_email_nonempty
    CHECK (length(trim(invited_email)) > 0)
);

COMMENT ON TABLE public.partner_invitations IS
  'Invitation funérarium → famille (gant blanc). Source de vérité du forfait offert (granted_package).';

COMMENT ON COLUMN public.partner_invitations.granted_package IS
  'Forfait offert par le partenaire ; détermine le débit jetons en B2B2C (1/2/4).';

COMMENT ON COLUMN public.partner_invitations.magic_link_token_hash IS
  'Hash du token magic link (jamais stocker le token en clair).';

CREATE INDEX IF NOT EXISTS idx_partner_invitations_tenant_status
  ON public.partner_invitations (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_partner_invitations_email_pending
  ON public.partner_invitations (lower(trim(invited_email)))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_partner_invitations_project_id
  ON public.partner_invitations (project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_invitations_accepted_user
  ON public.partner_invitations (accepted_user_id)
  WHERE accepted_user_id IS NOT NULL;

-- Lien projet → invitation (reprise wizard / checkout)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS invitation_id uuid
  REFERENCES public.partner_invitations (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_invitation_id
  ON public.projects (invitation_id)
  WHERE invitation_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2) tribute_checkouts — machine à états B2C / B2B / B2B2C
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tribute_checkouts (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid NOT NULL REFERENCES public.projects (id) ON DELETE RESTRICT,
  tenant_id               uuid NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  invitation_id           uuid REFERENCES public.partner_invitations (id) ON DELETE SET NULL,
  checkout_mode           text NOT NULL,
  granted_package         text,
  selected_package        text NOT NULL,
  partner_tokens_debited  integer NOT NULL DEFAULT 0 CHECK (partner_tokens_debited >= 0),
  family_total_cents      integer NOT NULL DEFAULT 0 CHECK (family_total_cents >= 0),
  stripe_session_id       text,
  stripe_payment_intent_id text,
  status                  text NOT NULL DEFAULT 'pending',
  idempotency_key         text,
  failure_reason          text,
  compensated_at          timestamptz,
  completed_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tribute_checkouts_mode_check
    CHECK (checkout_mode IN ('b2c', 'b2b_partner', 'b2b2c_family')),
  CONSTRAINT tribute_checkouts_package_check
    CHECK (
      selected_package IN ('essential', 'signature', 'heritage')
      AND (granted_package IS NULL OR granted_package IN ('essential', 'signature', 'heritage'))
    ),
  CONSTRAINT tribute_checkouts_status_check
    CHECK (status IN (
      'pending',
      'partner_debited',
      'awaiting_payment',
      'completed',
      'failed',
      'compensated'
    )),
  CONSTRAINT tribute_checkouts_b2b2c_granted_required
    CHECK (
      checkout_mode <> 'b2b2c_family'
      OR granted_package IS NOT NULL
    )
);

COMMENT ON TABLE public.tribute_checkouts IS
  'Checkout unifié : ledger partenaire d''abord, Stripe ensuite (B2B2C), compensation si échec.';

COMMENT ON COLUMN public.tribute_checkouts.checkout_mode IS
  'b2c | b2b_partner | b2b2c_family';

COMMENT ON COLUMN public.tribute_checkouts.family_total_cents IS
  'Montant Stripe côté famille (0 si forfait offert sans upsell).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tribute_checkouts_idempotency_key
  ON public.tribute_checkouts (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tribute_checkouts_project_id
  ON public.tribute_checkouts (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tribute_checkouts_tenant_status
  ON public.tribute_checkouts (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_tribute_checkouts_stripe_session
  ON public.tribute_checkouts (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tribute_checkouts_invitation_id
  ON public.tribute_checkouts (invitation_id)
  WHERE invitation_id IS NOT NULL;

-- Traçabilité ledger ↔ checkout
ALTER TABLE public.partner_token_ledger
  ADD COLUMN IF NOT EXISTS tribute_checkout_id uuid
  REFERENCES public.tribute_checkouts (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partner_token_ledger_checkout
  ON public.partner_token_ledger (tribute_checkout_id)
  WHERE tribute_checkout_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3) Débit atomique partenaire (FOR UPDATE + ledger + statut checkout)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.debit_partner_tokens_for_checkout(p_checkout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkout         public.tribute_checkouts%ROWTYPE;
  v_tokens_required  integer;
  v_balance          integer;
  v_new_balance      integer;
  v_granted          text;
BEGIN
  IF p_checkout_id IS NULL THEN
    RAISE EXCEPTION 'checkout_id_required';
  END IF;

  SELECT * INTO v_checkout
  FROM public.tribute_checkouts
  WHERE id = p_checkout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'checkout_not_found';
  END IF;

  -- Idempotence : déjà débité
  IF v_checkout.status IN ('partner_debited', 'awaiting_payment', 'completed') THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_debited', true,
      'checkout_id', v_checkout.id,
      'status', v_checkout.status,
      'tokens_debited', v_checkout.partner_tokens_debited,
      'balance_after', (
        SELECT w.balance
        FROM public.partner_token_wallets w
        WHERE w.tenant_id = v_checkout.tenant_id
      )
    );
  END IF;

  IF v_checkout.status NOT IN ('pending') THEN
    RAISE EXCEPTION 'invalid_checkout_status_%', v_checkout.status;
  END IF;

  -- Jetons : granted_package (B2B2C) ou selected (B2B partenaire direct)
  v_granted := COALESCE(
    v_checkout.granted_package,
    v_checkout.selected_package
  );

  v_tokens_required := public.partner_tokens_for_granted_package(v_granted);

  IF v_tokens_required IS NULL THEN
    RAISE EXCEPTION 'invalid_granted_package_%', v_granted;
  END IF;

  IF v_tokens_required = 0 THEN
    RAISE EXCEPTION 'zero_token_debit_not_allowed';
  END IF;

  -- Verrou wallet
  SELECT w.balance INTO v_balance
  FROM public.partner_token_wallets w
  WHERE w.tenant_id = v_checkout.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'wallet_not_found',
      'tenant_id', v_checkout.tenant_id
    );
  END IF;

  IF v_balance < v_tokens_required THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'insufficient_tokens',
      'balance', v_balance,
      'required', v_tokens_required
    );
  END IF;

  v_new_balance := v_balance - v_tokens_required;

  UPDATE public.partner_token_wallets
  SET balance = v_new_balance,
      updated_at = now()
  WHERE tenant_id = v_checkout.tenant_id;

  INSERT INTO public.partner_token_ledger (
    tenant_id,
    project_id,
    user_id,
    delta,
    balance_after,
    reason,
    package_id,
    tribute_checkout_id
  )
  SELECT
    v_checkout.tenant_id,
    v_checkout.project_id,
    p.user_id,
    -v_tokens_required,
    v_new_balance,
    CASE v_checkout.checkout_mode
      WHEN 'b2b2c_family' THEN 'b2b2c_family_checkout'
      WHEN 'b2b_partner'  THEN 'b2b_partner_checkout'
      ELSE 'checkout_debit'
    END,
    v_granted,
    v_checkout.id
  FROM public.projects p
  WHERE p.id = v_checkout.project_id;

  UPDATE public.tribute_checkouts
  SET status = 'partner_debited',
      partner_tokens_debited = v_tokens_required,
      granted_package = COALESCE(granted_package, v_granted),
      updated_at = now()
  WHERE id = v_checkout.id;

  RETURN jsonb_build_object(
    'ok', true,
    'checkout_id', v_checkout.id,
    'status', 'partner_debited',
    'tokens_debited', v_tokens_required,
    'balance_after', v_new_balance,
    'granted_package', v_granted,
    'family_total_cents', v_checkout.family_total_cents
  );
END;
$$;

COMMENT ON FUNCTION public.debit_partner_tokens_for_checkout(uuid) IS
  'Débit atomique wallet + ledger + passage checkout → partner_debited. Jetons = granted_package (B2B2C) ou selected_package (B2B).';

REVOKE ALL ON FUNCTION public.debit_partner_tokens_for_checkout(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.debit_partner_tokens_for_checkout(uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 4) RLS — partner_invitations
-- ---------------------------------------------------------------------
ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_invitations_select_partner ON public.partner_invitations;
CREATE POLICY partner_invitations_select_partner
  ON public.partner_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_invitations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('partner', 'partner_admin')
    )
  );

DROP POLICY IF EXISTS partner_invitations_select_accepted_family ON public.partner_invitations;
CREATE POLICY partner_invitations_select_accepted_family
  ON public.partner_invitations
  FOR SELECT
  TO authenticated
  USING (accepted_user_id = auth.uid());

DROP POLICY IF EXISTS partner_invitations_select_via_project_owner ON public.partner_invitations;
CREATE POLICY partner_invitations_select_via_project_owner
  ON public.partner_invitations
  FOR SELECT
  TO authenticated
  USING (
    project_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = partner_invitations.project_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS partner_invitations_insert_partner ON public.partner_invitations;
CREATE POLICY partner_invitations_insert_partner
  ON public.partner_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_invitations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('partner', 'partner_admin')
    )
  );

DROP POLICY IF EXISTS partner_invitations_update_partner ON public.partner_invitations;
CREATE POLICY partner_invitations_update_partner
  ON public.partner_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_invitations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('partner', 'partner_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_invitations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('partner', 'partner_admin')
    )
  );

REVOKE ALL ON TABLE public.partner_invitations FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_invitations TO authenticated;
GRANT ALL ON TABLE public.partner_invitations TO service_role;

-- ---------------------------------------------------------------------
-- 5) RLS — tribute_checkouts
-- ---------------------------------------------------------------------
ALTER TABLE public.tribute_checkouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tribute_checkouts_select_project_owner ON public.tribute_checkouts;
CREATE POLICY tribute_checkouts_select_project_owner
  ON public.tribute_checkouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = tribute_checkouts.project_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tribute_checkouts_select_partner ON public.tribute_checkouts;
CREATE POLICY tribute_checkouts_select_partner
  ON public.tribute_checkouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = tribute_checkouts.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('partner', 'partner_admin')
    )
  );

-- Écritures checkout : API (service_role) uniquement
REVOKE ALL ON TABLE public.tribute_checkouts FROM anon;
GRANT SELECT ON TABLE public.tribute_checkouts TO authenticated;
GRANT ALL ON TABLE public.tribute_checkouts TO service_role;

COMMIT;

-- PostgREST : NOTIFY pgrst, 'reload schema';
