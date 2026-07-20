-- =====================================================================
-- Odyssey P8 — Freemium V1 : invitation sans jetons + entitlements + purge
-- =====================================================================
-- Canon : docs/FREEMIUM_V1_PIVOT.md · Soft Cap : docs/NARRATIVE_SOFT_CAP.md
-- Prérequis : P5.5 · P6 · P6.1 · P7
--
-- Apporte :
--   1) create_partner_invitation() — sans wallet / débit
--   2) enforce_media_asset_quota() — plafond intendedPackage ?? basePackage
--   3) project_paid_entitlements (écriture webhook Phase 3)
--   4) sanctuary_tokens + claim_sanctuary_token()
--   5) tenants.is_freemium = true (tous)
--   6) DROP partner_token_* (fonctions + tables)
--
-- Idempotent. SQL Editor : [P8] Freemium V1 token purge — 2026-07-20
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Invitation sans débit (Freemium V1)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_partner_invitation(
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
  v_email_norm      text;
  v_invitation_id   uuid;
  v_pending_id      uuid;
  v_pending_expires timestamptz;
  v_pending_package text;
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

  UPDATE public.partner_invitations
  SET status = 'expired',
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND lower(trim(invited_email)) = v_email_norm
    AND status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < now();

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

  INSERT INTO public.partner_invitations (
    tenant_id,
    invited_email,
    granted_package,
    magic_link_token_hash,
    status,
    expires_at,
    invited_by_user_id,
    metadata
  )
  VALUES (
    p_tenant_id,
    v_email_norm,
    p_granted_package,
    trim(p_magic_link_token_hash),
    'pending',
    p_expires_at,
    p_actor_user_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_invitation_id;

  RETURN jsonb_build_object(
    'ok', true,
    'invitation_id', v_invitation_id,
    'status', 'pending',
    'expires_at', p_expires_at,
    'granted_package', p_granted_package
  );
END;
$$;

COMMENT ON FUNCTION public.create_partner_invitation IS
  'Freemium V1 : crée une invitation partenaire SANS débit jetons. service_role only.';

REVOKE ALL ON FUNCTION public.create_partner_invitation(
  uuid, uuid, text, text, text, timestamptz, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_partner_invitation(
  uuid, uuid, text, text, text, timestamptz, jsonb
) TO service_role;

-- Compat : ancienne RPC → délègue sans wallet (évite casse si app pas encore déployée)
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
  v_result jsonb;
BEGIN
  v_result := public.create_partner_invitation(
    p_tenant_id,
    p_actor_user_id,
    p_invited_email,
    p_granted_package,
    p_magic_link_token_hash,
    p_expires_at,
    p_metadata
  );

  IF (v_result->>'ok')::boolean IS TRUE THEN
    RETURN v_result || jsonb_build_object(
      'tokens_debited', 0,
      'balance_after', 0
    );
  END IF;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- 2) Quota médias — intendedPackage Soft Cap
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_media_asset_quota()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_package          text;
  v_max_media_items  integer;
  v_current_count    integer;
  v_state            jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::text));

  SELECT p.wizard_state
    INTO v_state
    FROM public.projects p
    WHERE p.id = NEW.project_id;

  -- Soft Cap Freemium V1 : plafond = intended > basePackage (legacy) > granted
  v_package := coalesce(
    v_state ->> 'intendedPackage',
    v_state ->> 'basePackage',
    v_state ->> 'grantedPackage',
    'signature'
  );

  v_max_media_items := CASE v_package
    WHEN 'essential' THEN 50
    WHEN 'signature' THEN 125
    WHEN 'heritage'  THEN 175
    WHEN 'legendary' THEN 250
    ELSE 125
  END;

  SELECT count(*)
    INTO v_current_count
    FROM public.media_assets
    WHERE project_id = NEW.project_id;

  IF v_current_count >= v_max_media_items THEN
    RAISE EXCEPTION
      'media_quota_exceeded: project % already has % media (limit % for package %)',
      NEW.project_id, v_current_count, v_max_media_items, v_package
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_media_asset_quota() IS
  'Quota médias Soft Cap : intendedPackage ?? basePackage ?? grantedPackage. Sync avec wizardDeliverables.ts.';

-- ---------------------------------------------------------------------
-- 3) Entitlements payés (webhook-only writers en Phase 3)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_paid_entitlements (
  project_id uuid PRIMARY KEY REFERENCES public.projects (id) ON DELETE CASCADE,
  paid_package text
    CHECK (paid_package IS NULL OR paid_package IN (
      'essential', 'signature', 'heritage', 'legendary'
    )),
  music_license boolean NOT NULL DEFAULT false,
  export_resolution text
    CHECK (export_resolution IS NULL OR export_resolution IN ('1080p', '4K')),
  extensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  tribute_checkout_id uuid REFERENCES public.tribute_checkouts (id) ON DELETE SET NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.project_paid_entitlements IS
  'Entitlements post-paiement Stripe — écriture réservée webhook / service_role. Never trust wizard_state client.';

COMMENT ON COLUMN public.project_paid_entitlements.music_license IS
  'true si add-on musicLicense 39 $ payé (ou inclus via paid_package >= signature côté app).';

ALTER TABLE public.project_paid_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_paid_entitlements_select_owner ON public.project_paid_entitlements;
CREATE POLICY project_paid_entitlements_select_owner
  ON public.project_paid_entitlements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.user_id = auth.uid()
    )
  );

-- Pas d'INSERT/UPDATE pour authenticated — service_role bypass RLS

GRANT SELECT ON public.project_paid_entitlements TO authenticated;
GRANT ALL ON public.project_paid_entitlements TO service_role;

-- ---------------------------------------------------------------------
-- 4) Jeton du Sanctuaire NFC
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sanctuary_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_batch text,
  status text NOT NULL DEFAULT 'inventory'
    CHECK (status IN ('inventory', 'shipped', 'claimed', 'locked')),
  claim_secret_hash text,
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  tribute_checkout_id uuid REFERENCES public.tribute_checkouts (id) ON DELETE SET NULL,
  shipped_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sanctuary_tokens_claimed_project_unique
    UNIQUE (project_id)
);

-- Un seul claim actif par jeton quand project lié
CREATE UNIQUE INDEX IF NOT EXISTS sanctuary_tokens_one_claimed_per_id
  ON public.sanctuary_tokens (id)
  WHERE status IN ('claimed', 'locked') AND project_id IS NOT NULL;

COMMENT ON TABLE public.sanctuary_tokens IS
  'Stock NFC/QR Sanctuaire — claim atomique post-paiement. Voir docs/SANCTUARY_TOKEN_NFC.md.';

ALTER TABLE public.sanctuary_tokens ENABLE ROW LEVEL SECURITY;

-- Lecture : propriétaire du projet associé uniquement
DROP POLICY IF EXISTS sanctuary_tokens_select_owner ON public.sanctuary_tokens;
CREATE POLICY sanctuary_tokens_select_owner
  ON public.sanctuary_tokens
  FOR SELECT
  USING (
    project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

GRANT SELECT ON public.sanctuary_tokens TO authenticated;
GRANT ALL ON public.sanctuary_tokens TO service_role;

CREATE OR REPLACE FUNCTION public.claim_sanctuary_token(
  p_token_id uuid,
  p_claim_secret_hash text,
  p_project_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated uuid;
BEGIN
  IF p_token_id IS NULL OR p_project_id IS NULL
     OR p_claim_secret_hash IS NULL OR length(trim(p_claim_secret_hash)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  END IF;

  UPDATE public.sanctuary_tokens t
  SET
    status = 'claimed',
    project_id = p_project_id,
    claimed_at = now(),
    updated_at = now()
  WHERE t.id = p_token_id
    AND t.status = 'shipped'
    AND t.project_id IS NULL
    AND t.claim_secret_hash = trim(p_claim_secret_hash)
  RETURNING t.id INTO v_updated;

  IF v_updated IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'claim_failed');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'token_id', v_updated,
    'project_id', p_project_id,
    'status', 'claimed'
  );
END;
$$;

COMMENT ON FUNCTION public.claim_sanctuary_token IS
  'Claim atomique Jeton Sanctuaire (shipped → claimed). service_role or controlled API.';

REVOKE ALL ON FUNCTION public.claim_sanctuary_token(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_sanctuary_token(uuid, text, uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 5) Tous les tenants en freemium
-- ---------------------------------------------------------------------
UPDATE public.tenants
SET is_freemium = true
WHERE is_freemium IS DISTINCT FROM true;

-- ---------------------------------------------------------------------
-- 6) Purge jetons — fonctions puis tables
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.debit_partner_tokens_for_checkout(uuid);
DROP FUNCTION IF EXISTS public.credit_partner_tokens_manual(uuid, uuid, integer, text);
DROP FUNCTION IF EXISTS public.ensure_partner_token_wallet(uuid);
DROP FUNCTION IF EXISTS public.partner_tokens_for_granted_package(text);

-- create_partner_invitation_with_debit conservée comme wrapper (ci-dessus)

DROP TABLE IF EXISTS public.partner_token_ledger CASCADE;
DROP TABLE IF EXISTS public.partner_token_wallets CASCADE;

COMMENT ON COLUMN public.tribute_checkouts.partner_tokens_debited IS
  'DEPRECATED Freemium V1 — toujours 0. Colonne conservée pour compat inserts existants ; DROP ultérieur possible.';

COMMIT;

-- =====================================================================
-- Post-check
-- =====================================================================
-- SELECT proname FROM pg_proc WHERE proname IN (
--   'create_partner_invitation', 'claim_sanctuary_token', 'enforce_media_asset_quota'
-- );
-- SELECT to_regclass('public.partner_token_wallets');  -- NULL
-- SELECT to_regclass('public.project_paid_entitlements');
-- SELECT to_regclass('public.sanctuary_tokens');
-- SELECT count(*) FILTER (WHERE NOT is_freemium) FROM public.tenants;  -- 0
-- =====================================================================
