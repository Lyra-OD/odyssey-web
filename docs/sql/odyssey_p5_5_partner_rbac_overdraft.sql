-- =====================================================================
-- Odyssey P5.5 — RBAC Salon, overdraft limité & débit atomique invitation
-- =====================================================================
-- Prérequis :
--   odyssey_p4_partner_token_wallets.sql
--   odyssey_p4_1_security_fixes.sql
--   odyssey_p5_b2b2c_core.sql
--   odyssey_p5_1_invitation_unique_pending.sql
--
-- Règles métier :
--   • Débit jetons à la création d'invitation (granted_package → 1/2/4 jetons).
--   • Overdraft limité : balance >= -credit_limit_tokens (default 20).
--   • partner (Directeur) : invite sans voir wallet/ledger (RLS).
--   • partner_admin (Admin) : SELECT wallet + ledger.
--   • RPC sensibles : service_role uniquement (API Next.js).
--   • b2b2c_family checkout : pas de second débit si invitation déjà débitée.
--
-- SQL Editor : P5.5 — RBAC overdraft invitation debit — 2026-06-17
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Wallet — overdraft contrôlé
-- ---------------------------------------------------------------------
ALTER TABLE public.partner_token_wallets
  ADD COLUMN IF NOT EXISTS credit_limit_tokens integer;

UPDATE public.partner_token_wallets
SET credit_limit_tokens = 20
WHERE credit_limit_tokens IS NULL;

ALTER TABLE public.partner_token_wallets
  ALTER COLUMN credit_limit_tokens SET DEFAULT 20;

ALTER TABLE public.partner_token_wallets
  ALTER COLUMN credit_limit_tokens SET NOT NULL;

ALTER TABLE public.partner_token_wallets
  DROP CONSTRAINT IF EXISTS partner_token_wallets_balance_check;

ALTER TABLE public.partner_token_wallets
  DROP CONSTRAINT IF EXISTS partner_token_wallets_credit_limit_nonneg;

ALTER TABLE public.partner_token_wallets
  ADD CONSTRAINT partner_token_wallets_credit_limit_nonneg
  CHECK (credit_limit_tokens >= 0);

ALTER TABLE public.partner_token_wallets
  DROP CONSTRAINT IF EXISTS partner_token_wallets_balance_overdraft;

ALTER TABLE public.partner_token_wallets
  ADD CONSTRAINT partner_token_wallets_balance_overdraft
  CHECK (balance >= -credit_limit_tokens);

COMMENT ON COLUMN public.partner_token_wallets.credit_limit_tokens IS
  'Découvert maximum en jetons (souffrance). Défaut 20 ; modifiable par Super Admin Odyssey par tenant.';

COMMENT ON COLUMN public.partner_token_wallets.balance IS
  'Solde jetons du tenant ; peut être négatif jusqu''à -credit_limit_tokens.';

-- ---------------------------------------------------------------------
-- 2) Ledger — traçabilité Directeur + invitation
-- ---------------------------------------------------------------------
ALTER TABLE public.partner_token_ledger
  ADD COLUMN IF NOT EXISTS actor_user_id uuid
  REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.partner_token_ledger
  ADD COLUMN IF NOT EXISTS invitation_id uuid
  REFERENCES public.partner_invitations (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.partner_token_ledger.actor_user_id IS
  'Utilisateur partenaire ayant déclenché le mouvement (Directeur ou Admin).';

COMMENT ON COLUMN public.partner_token_ledger.invitation_id IS
  'Invitation source lorsque reason = invitation_debit.';

COMMENT ON COLUMN public.partner_token_ledger.user_id IS
  'Legacy / bénéficiaire famille sur certains débits checkout ; NULL pour invitation_debit.';

CREATE INDEX IF NOT EXISTS idx_partner_token_ledger_actor_user
  ON public.partner_token_ledger (actor_user_id)
  WHERE actor_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_token_ledger_invitation
  ON public.partner_token_ledger (invitation_id)
  WHERE invitation_id IS NOT NULL;

-- Idempotence : une invitation ne génère qu''un seul débit salon
DROP INDEX IF EXISTS public.idx_partner_token_ledger_unique_invitation_debit;

CREATE UNIQUE INDEX idx_partner_token_ledger_unique_invitation_debit
  ON public.partner_token_ledger (invitation_id)
  WHERE invitation_id IS NOT NULL
    AND reason = 'invitation_debit';

-- ---------------------------------------------------------------------
-- 3) RLS — wallet & ledger réservés à partner_admin
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS partner_wallets_select_member ON public.partner_token_wallets;
DROP POLICY IF EXISTS partner_wallets_select_partner_roles ON public.partner_token_wallets;

CREATE POLICY partner_wallets_select_admin_only
  ON public.partner_token_wallets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_token_wallets.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'partner_admin'
    )
  );

DROP POLICY IF EXISTS partner_ledger_select_member ON public.partner_token_ledger;
DROP POLICY IF EXISTS partner_ledger_select_partner_roles ON public.partner_token_ledger;

CREATE POLICY partner_ledger_select_admin_only
  ON public.partner_token_ledger
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_token_ledger.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'partner_admin'
    )
  );

-- ---------------------------------------------------------------------
-- 4) Helpers internes
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_partner_token_wallet(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id_required';
  END IF;

  INSERT INTO public.partner_token_wallets (tenant_id, balance, credit_limit_tokens)
  VALUES (p_tenant_id, 0, 20)
  ON CONFLICT (tenant_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.ensure_partner_token_wallet(uuid) IS
  'Crée le wallet tenant s''il n''existe pas (balance 0, credit_limit_tokens 20).';

REVOKE ALL ON FUNCTION public.ensure_partner_token_wallet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_partner_token_wallet(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.assert_partner_actor_for_tenant(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_allow_admin_only boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF p_tenant_id IS NULL OR p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id_and_actor_required';
  END IF;

  SELECT tm.role INTO v_role
  FROM public.tenant_members tm
  WHERE tm.tenant_id = p_tenant_id
    AND tm.user_id = p_actor_user_id
  LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'forbidden_not_a_tenant_member';
  END IF;

  IF p_allow_admin_only THEN
    IF v_role <> 'partner_admin' THEN
      RAISE EXCEPTION 'forbidden_admin_required';
    END IF;
  ELSIF v_role NOT IN ('partner', 'partner_admin') THEN
    RAISE EXCEPTION 'forbidden_partner_role_required';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_partner_actor_for_tenant(uuid, uuid, boolean) IS
  'Valide l''appartenance partenaire au tenant ; option admin-only pour crédits manuels.';

REVOKE ALL ON FUNCTION public.assert_partner_actor_for_tenant(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_partner_actor_for_tenant(uuid, uuid, boolean) TO service_role;

-- ---------------------------------------------------------------------
-- 5) RPC A — create_partner_invitation_with_debit (atomique)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_partner_invitation_with_debit(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_invited_email text,
  p_granted_package text,
  p_magic_link_token_hash text,
  p_expires_at timestamptz,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_norm         text;
  v_tokens_required    integer;
  v_balance            integer;
  v_credit_limit       integer;
  v_new_balance        integer;
  v_invitation_id      uuid;
  v_pending_id         uuid;
  v_pending_expires    timestamptz;
  v_pending_package    text;
BEGIN
  IF p_tenant_id IS NULL OR p_actor_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  END IF;

  v_email_norm := lower(trim(p_invited_email));

  IF length(v_email_norm) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_email');
  END IF;

  IF p_granted_package NOT IN ('essential', 'signature', 'heritage') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_granted_package');
  END IF;

  IF p_magic_link_token_hash IS NULL OR length(trim(p_magic_link_token_hash)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'magic_link_token_hash_required');
  END IF;

  PERFORM public.assert_partner_actor_for_tenant(
    p_tenant_id,
    p_actor_user_id,
    false
  );

  v_tokens_required := public.partner_tokens_for_granted_package(p_granted_package);

  IF v_tokens_required IS NULL OR v_tokens_required <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token_amount');
  END IF;

  -- Expirer les pending périmées pour ce couple tenant + email
  UPDATE public.partner_invitations
  SET status = 'expired',
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND lower(trim(invited_email)) = v_email_norm
    AND status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  -- Bloquer si une pending valide existe déjà
  SELECT id, expires_at, granted_package
  INTO v_pending_id, v_pending_expires, v_pending_package
  FROM public.partner_invitations
  WHERE tenant_id = p_tenant_id
    AND lower(trim(invited_email)) = v_email_norm
    AND status = 'pending'
  LIMIT 1;

  IF v_pending_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'invitation_already_pending',
      'invitation_id', v_pending_id,
      'expires_at', v_pending_expires,
      'granted_package', v_pending_package
    );
  END IF;

  PERFORM public.ensure_partner_token_wallet(p_tenant_id);

  SELECT w.balance, w.credit_limit_tokens
  INTO v_balance, v_credit_limit
  FROM public.partner_token_wallets w
  WHERE w.tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'wallet_not_found',
      'tenant_id', p_tenant_id
    );
  END IF;

  v_new_balance := v_balance - v_tokens_required;

  IF v_new_balance < -v_credit_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'overdraft_limit_exceeded',
      'balance', v_balance,
      'credit_limit_tokens', v_credit_limit,
      'required', v_tokens_required,
      'would_be_balance', v_new_balance
    );
  END IF;

  INSERT INTO public.partner_invitations (
    tenant_id,
    invited_email,
    granted_package,
    status,
    invited_by_user_id,
    magic_link_token_hash,
    expires_at,
    metadata
  )
  VALUES (
    p_tenant_id,
    trim(p_invited_email),
    p_granted_package,
    'pending',
    p_actor_user_id,
    p_magic_link_token_hash,
    p_expires_at,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_invitation_id;

  UPDATE public.partner_token_wallets
  SET balance = v_new_balance,
      updated_at = now()
  WHERE tenant_id = p_tenant_id;

  INSERT INTO public.partner_token_ledger (
    tenant_id,
    actor_user_id,
    invitation_id,
    user_id,
    delta,
    balance_after,
    reason,
    package_id
  )
  VALUES (
    p_tenant_id,
    p_actor_user_id,
    v_invitation_id,
    NULL,
    -v_tokens_required,
    v_new_balance,
    'invitation_debit',
    p_granted_package
  );

  RETURN jsonb_build_object(
    'ok', true,
    'invitation_id', v_invitation_id,
    'status', 'pending',
    'expires_at', p_expires_at,
    'granted_package', p_granted_package,
    'tokens_debited', v_tokens_required,
    'balance_after', v_new_balance
  );
EXCEPTION
  WHEN unique_violation THEN
    -- idx_partner_invitations_unique_pending_per_tenant_email ou ledger invitation_debit
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'invitation_already_pending'
    );
END;
$$;

COMMENT ON FUNCTION public.create_partner_invitation_with_debit(
  uuid, uuid, text, text, text, timestamptz, jsonb
) IS
  'Atomique : vérifie overdraft, insère invitation pending + débit ledger (invitation_debit). Appel API service_role uniquement.';

REVOKE ALL ON FUNCTION public.create_partner_invitation_with_debit(
  uuid, uuid, text, text, text, timestamptz, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_partner_invitation_with_debit(
  uuid, uuid, text, text, text, timestamptz, jsonb
) TO service_role;

-- ---------------------------------------------------------------------
-- 6) RPC B — credit_partner_tokens_manual (Option A+ Stripe manuel)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credit_partner_tokens_manual(
  p_tenant_id uuid,
  p_admin_user_id uuid,
  p_tokens_to_add integer,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance      integer;
  v_credit_limit integer;
  v_new_balance  integer;
  v_ledger_id    uuid;
BEGIN
  IF p_tenant_id IS NULL OR p_admin_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  END IF;

  IF p_tokens_to_add IS NULL OR p_tokens_to_add <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token_amount');
  END IF;

  PERFORM public.assert_partner_actor_for_tenant(
    p_tenant_id,
    p_admin_user_id,
    true
  );

  PERFORM public.ensure_partner_token_wallet(p_tenant_id);

  SELECT w.balance, w.credit_limit_tokens
  INTO v_balance, v_credit_limit
  FROM public.partner_token_wallets w
  WHERE w.tenant_id = p_tenant_id
  FOR UPDATE;

  v_new_balance := v_balance + p_tokens_to_add;

  UPDATE public.partner_token_wallets
  SET balance = v_new_balance,
      updated_at = now()
  WHERE tenant_id = p_tenant_id;

  INSERT INTO public.partner_token_ledger (
    tenant_id,
    actor_user_id,
    user_id,
    delta,
    balance_after,
    reason,
    package_id
  )
  VALUES (
    p_tenant_id,
    p_admin_user_id,
    NULL,
    p_tokens_to_add,
    v_new_balance,
    'manual_topup',
    NULL
  )
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id,
    'tokens_credited', p_tokens_to_add,
    'balance_after', v_new_balance,
    'credit_limit_tokens', v_credit_limit,
    'note', p_note
  );
END;
$$;

COMMENT ON FUNCTION public.credit_partner_tokens_manual(uuid, uuid, integer, text) IS
  'Crédit manuel wallet (Payment Link / ops). partner_admin requis. service_role uniquement.';

REVOKE ALL ON FUNCTION public.credit_partner_tokens_manual(uuid, uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_partner_tokens_manual(uuid, uuid, integer, text) TO service_role;

-- ---------------------------------------------------------------------
-- 7) RPC C — debit_partner_tokens_for_checkout (anti double-débit B2B2C)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.debit_partner_tokens_for_checkout(p_checkout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkout              public.tribute_checkouts%ROWTYPE;
  v_tokens_required       integer;
  v_tokens_already_debited integer;
  v_balance               integer;
  v_credit_limit          integer;
  v_new_balance           integer;
  v_granted               text;
  v_invitation_id         uuid;
  v_balance_after         integer;
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

  -- Idempotence : déjà débité via checkout
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

  -- -------------------------------------------------------------------
  -- Prévention double-débit B2B2C :
  -- si le salon a déjà payé à l''invitation (ledger invitation_debit),
  -- avancer le checkout sans second débit wallet.
  -- -------------------------------------------------------------------
  IF v_checkout.checkout_mode = 'b2b2c_family' THEN
    v_invitation_id := COALESCE(
      v_checkout.invitation_id,
      (
        SELECT p.invitation_id
        FROM public.projects p
        WHERE p.id = v_checkout.project_id
      )
    );

    IF v_invitation_id IS NOT NULL THEN
      SELECT ABS(l.delta) INTO v_tokens_already_debited
      FROM public.partner_token_ledger l
      WHERE l.invitation_id = v_invitation_id
        AND l.reason = 'invitation_debit'
      LIMIT 1;

      IF v_tokens_already_debited IS NOT NULL THEN
        SELECT w.balance INTO v_balance_after
        FROM public.partner_token_wallets w
        WHERE w.tenant_id = v_checkout.tenant_id;

        UPDATE public.tribute_checkouts
        SET status = 'partner_debited',
            partner_tokens_debited = v_tokens_already_debited,
            granted_package = COALESCE(granted_package, v_granted),
            updated_at = now()
        WHERE id = v_checkout.id;

        RETURN jsonb_build_object(
          'ok', true,
          'already_debited', true,
          'debited_at_invitation', true,
          'checkout_id', v_checkout.id,
          'status', 'partner_debited',
          'invitation_id', v_invitation_id,
          'tokens_debited', v_tokens_already_debited,
          'balance_after', v_balance_after,
          'granted_package', v_granted,
          'family_total_cents', v_checkout.family_total_cents
        );
      END IF;
    END IF;
  END IF;

  -- Débit checkout classique (B2B direct ou B2B2C sans débit invitation préalable)
  PERFORM public.ensure_partner_token_wallet(v_checkout.tenant_id);

  SELECT w.balance, w.credit_limit_tokens
  INTO v_balance, v_credit_limit
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

  v_new_balance := v_balance - v_tokens_required;

  IF v_new_balance < -v_credit_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'overdraft_limit_exceeded',
      'balance', v_balance,
      'credit_limit_tokens', v_credit_limit,
      'required', v_tokens_required,
      'would_be_balance', v_new_balance
    );
  END IF;

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
    tribute_checkout_id,
    invitation_id
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
    v_checkout.id,
    COALESCE(v_checkout.invitation_id, p.invitation_id)
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
  'Débit checkout atomique. B2B2C : skip si invitation_debit déjà présent sur invitation_id. Overdraft limité via credit_limit_tokens.';

REVOKE ALL ON FUNCTION public.debit_partner_tokens_for_checkout(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.debit_partner_tokens_for_checkout(uuid) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
