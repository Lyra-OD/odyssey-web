-- =====================================================================
-- Odyssey P6.1 — Bulletproof waterfall (Net Distribuable RevShare)
-- =====================================================================
-- Prérequis :
--   odyssey_p5_b2b2c_core.sql
--   odyssey_p5_5_partner_rbac_overdraft.sql
--   odyssey_p6_freemium_revshare.sql
--
-- Apporte :
--   Colonnes waterfall sur tribute_checkouts + partner_commission_ledger
--   compute_revenue_waterfall() — IMMUTABLE, RETURNS jsonb
--   accrue_partner_commission_for_checkout() — Bulletproof (remplace P6 brut)
--   clawback_partner_commission() — clawback proportionnel snapshot
--
-- Idempotent : peut être ré-exécuté sans dégât.
-- QA post-migration : odyssey_p6_1_waterfall_qa_assert.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) tribute_checkouts — colonnes waterfall Bulletproof
-- ---------------------------------------------------------------------
ALTER TABLE public.tribute_checkouts
  ADD COLUMN IF NOT EXISTS gross_payment_cents integer,
  ADD COLUMN IF NOT EXISTS platform_fee_bps integer,
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer,
  ADD COLUMN IF NOT EXISTS net_distributable_cents integer;

COMMENT ON COLUMN public.tribute_checkouts.gross_payment_cents IS
  'Gross Volume confirmé webhook (= Stripe amount_total, centimes).';

COMMENT ON COLUMN public.tribute_checkouts.platform_fee_bps IS
  'Snapshot Platform Fee au checkout T (ex. 1000 = 10 %). Source : tenants.settings.platform_fee_bps.';

COMMENT ON COLUMN public.tribute_checkouts.platform_fee_cents IS
  'Platform & Processing Fee Odyssey (centimes). floor(gross × platform_fee_bps / 10000).';

COMMENT ON COLUMN public.tribute_checkouts.net_distributable_cents IS
  'Net Distribuable = gross − platform_fee. Assiette RevShare partenaire.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tribute_checkouts_gross_payment_cents_check'
      AND conrelid = 'public.tribute_checkouts'::regclass
  ) THEN
    ALTER TABLE public.tribute_checkouts
      ADD CONSTRAINT tribute_checkouts_gross_payment_cents_check
        CHECK (gross_payment_cents IS NULL OR gross_payment_cents >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tribute_checkouts_platform_fee_bps_check'
      AND conrelid = 'public.tribute_checkouts'::regclass
  ) THEN
    ALTER TABLE public.tribute_checkouts
      ADD CONSTRAINT tribute_checkouts_platform_fee_bps_check
        CHECK (platform_fee_bps IS NULL OR platform_fee_bps >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tribute_checkouts_platform_fee_cents_check'
      AND conrelid = 'public.tribute_checkouts'::regclass
  ) THEN
    ALTER TABLE public.tribute_checkouts
      ADD CONSTRAINT tribute_checkouts_platform_fee_cents_check
        CHECK (platform_fee_cents IS NULL OR platform_fee_cents >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tribute_checkouts_net_distributable_cents_check'
      AND conrelid = 'public.tribute_checkouts'::regclass
  ) THEN
    ALTER TABLE public.tribute_checkouts
      ADD CONSTRAINT tribute_checkouts_net_distributable_cents_check
        CHECK (net_distributable_cents IS NULL OR net_distributable_cents >= 0);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2) partner_commission_ledger — colonnes waterfall audit
-- ---------------------------------------------------------------------
ALTER TABLE public.partner_commission_ledger
  ADD COLUMN IF NOT EXISTS platform_fee_bps integer,
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer,
  ADD COLUMN IF NOT EXISTS net_distributable_cents integer;

COMMENT ON COLUMN public.partner_commission_ledger.platform_fee_bps IS
  'Snapshot Platform Fee (bps) au moment de l''écriture ledger.';

COMMENT ON COLUMN public.partner_commission_ledger.platform_fee_cents IS
  'Platform Fee Odyssey (centimes) — audit waterfall.';

COMMENT ON COLUMN public.partner_commission_ledger.net_distributable_cents IS
  'Net Distribuable (centimes) — assiette commission au moment de l''écriture.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_commission_ledger_platform_fee_bps_check'
      AND conrelid = 'public.partner_commission_ledger'::regclass
  ) THEN
    ALTER TABLE public.partner_commission_ledger
      ADD CONSTRAINT partner_commission_ledger_platform_fee_bps_check
        CHECK (platform_fee_bps IS NULL OR platform_fee_bps >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_commission_ledger_platform_fee_cents_check'
      AND conrelid = 'public.partner_commission_ledger'::regclass
  ) THEN
    ALTER TABLE public.partner_commission_ledger
      ADD CONSTRAINT partner_commission_ledger_platform_fee_cents_check
        CHECK (platform_fee_cents IS NULL OR platform_fee_cents >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_commission_ledger_net_distributable_cents_check'
      AND conrelid = 'public.partner_commission_ledger'::regclass
  ) THEN
    ALTER TABLE public.partner_commission_ledger
      ADD CONSTRAINT partner_commission_ledger_net_distributable_cents_check
        CHECK (net_distributable_cents IS NULL OR net_distributable_cents >= 0);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3) compute_revenue_waterfall — single source of truth (IMMUTABLE)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_revenue_waterfall(
  p_gross_payment_cents integer,
  p_platform_fee_bps integer DEFAULT 1000,
  p_commission_rate_bps integer DEFAULT 3000
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_platform_fee_bps        integer;
  v_commission_rate_bps       integer;
  v_platform_fee_cents      integer;
  v_net_distributable_cents integer;
  v_commission_cents        integer;
  v_odyssey_margin_cents    integer;
BEGIN
  IF p_gross_payment_cents IS NULL OR p_gross_payment_cents < 0 THEN
    RAISE EXCEPTION 'invalid_gross_payment_cents';
  END IF;

  v_platform_fee_bps := COALESCE(NULLIF(p_platform_fee_bps, 0), 1000);
  v_commission_rate_bps := COALESCE(NULLIF(p_commission_rate_bps, 0), 3000);

  v_platform_fee_cents := floor(
    p_gross_payment_cents::numeric * v_platform_fee_bps / 10000
  )::integer;

  v_net_distributable_cents := p_gross_payment_cents - v_platform_fee_cents;

  IF v_net_distributable_cents < 0 THEN
    RAISE EXCEPTION 'negative_net_distributable';
  END IF;

  v_commission_cents := floor(
    v_net_distributable_cents::numeric * v_commission_rate_bps / 10000
  )::integer;

  v_odyssey_margin_cents := v_net_distributable_cents - v_commission_cents;

  RETURN jsonb_build_object(
    'gross_payment_cents', p_gross_payment_cents,
    'platform_fee_bps', v_platform_fee_bps,
    'platform_fee_cents', v_platform_fee_cents,
    'net_distributable_cents', v_net_distributable_cents,
    'commission_rate_bps', v_commission_rate_bps,
    'commission_cents', v_commission_cents,
    'odyssey_margin_cents', v_odyssey_margin_cents
  );
END;
$$;

COMMENT ON FUNCTION public.compute_revenue_waterfall(integer, integer, integer) IS
  'Waterfall Bulletproof : Gross → Platform Fee → Net Distribuable → Commission → Odyssey Margin. IMMUTABLE.';

REVOKE ALL ON FUNCTION public.compute_revenue_waterfall(integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_revenue_waterfall(integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_revenue_waterfall(integer, integer, integer) TO authenticated;

-- ---------------------------------------------------------------------
-- 4) accrue_partner_commission_for_checkout — Bulletproof (P6.1)
-- ---------------------------------------------------------------------
-- Retire la surcharge P6 (5 args) pour éviter ambiguïté d''appel PostgREST.
DROP FUNCTION IF EXISTS public.accrue_partner_commission_for_checkout(
  uuid, integer, text, text, integer
);

CREATE OR REPLACE FUNCTION public.accrue_partner_commission_for_checkout(
  p_checkout_id uuid,
  p_gross_payment_cents integer,
  p_stripe_event_id text,
  p_stripe_payment_intent_id text DEFAULT NULL,
  p_platform_fee_bps integer DEFAULT NULL,
  p_commission_rate_bps integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkout                  public.tribute_checkouts%ROWTYPE;
  v_tenant                    public.tenants%ROWTYPE;
  v_platform_fee_bps          integer;
  v_commission_rate_bps       integer;
  v_waterfall                 jsonb;
  v_gross_payment_cents       integer;
  v_platform_fee_cents        integer;
  v_net_distributable_cents   integer;
  v_commission_cents          integer;
  v_commission_rate_bps_out   integer;
  v_ledger_id                 uuid;
  v_existing                  uuid;
BEGIN
  IF p_checkout_id IS NULL THEN
    RAISE EXCEPTION 'checkout_id_required';
  END IF;

  IF p_gross_payment_cents IS NULL OR p_gross_payment_cents <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'zero_gross_payment');
  END IF;

  IF p_stripe_event_id IS NULL OR length(trim(p_stripe_event_id)) = 0 THEN
    RAISE EXCEPTION 'stripe_event_id_required';
  END IF;

  -- Idempotence webhook event
  SELECT id INTO v_existing
  FROM public.partner_commission_ledger
  WHERE stripe_event_id = p_stripe_event_id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_processed', true,
      'ledger_id', v_existing
    );
  END IF;

  SELECT * INTO v_checkout
  FROM public.tribute_checkouts
  WHERE id = p_checkout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'checkout_not_found';
  END IF;

  IF v_checkout.checkout_mode <> 'b2b2c_family' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_b2b2c_family');
  END IF;

  SELECT * INTO v_tenant
  FROM public.tenants
  WHERE id = v_checkout.tenant_id;

  IF NOT FOUND OR v_tenant.is_freemium IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'tenant_not_freemium');
  END IF;

  -- Idempotence per checkout accrual
  SELECT id INTO v_existing
  FROM public.partner_commission_ledger
  WHERE tribute_checkout_id = p_checkout_id
    AND reason = 'commission_accrual'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_accrued', true,
      'ledger_id', v_existing
    );
  END IF;

  v_platform_fee_bps := COALESCE(
    NULLIF(p_platform_fee_bps, 0),
    NULLIF(v_checkout.platform_fee_bps, 0),
    NULLIF((v_tenant.settings->>'platform_fee_bps')::integer, 0),
    1000
  );

  v_commission_rate_bps := COALESCE(
    NULLIF(p_commission_rate_bps, 0),
    NULLIF(v_checkout.commission_rate_bps, 0),
    NULLIF((v_tenant.settings->>'revshare_bps')::integer, 0),
    3000
  );

  v_waterfall := public.compute_revenue_waterfall(
    p_gross_payment_cents,
    v_platform_fee_bps,
    v_commission_rate_bps
  );

  v_gross_payment_cents := (v_waterfall->>'gross_payment_cents')::integer;
  v_platform_fee_cents := (v_waterfall->>'platform_fee_cents')::integer;
  v_net_distributable_cents := (v_waterfall->>'net_distributable_cents')::integer;
  v_commission_cents := (v_waterfall->>'commission_cents')::integer;
  v_commission_rate_bps_out := (v_waterfall->>'commission_rate_bps')::integer;
  v_platform_fee_bps := (v_waterfall->>'platform_fee_bps')::integer;

  IF v_commission_cents <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'zero_commission');
  END IF;

  INSERT INTO public.partner_commission_balances (tenant_id)
  VALUES (v_checkout.tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  INSERT INTO public.partner_commission_ledger (
    tenant_id,
    tribute_checkout_id,
    project_id,
    invitation_id,
    reason,
    delta_cents,
    gross_payment_cents,
    platform_fee_bps,
    platform_fee_cents,
    net_distributable_cents,
    commission_rate_bps,
    commission_cents,
    stripe_event_id,
    stripe_payment_intent_id,
    status
  )
  VALUES (
    v_checkout.tenant_id,
    v_checkout.id,
    v_checkout.project_id,
    v_checkout.invitation_id,
    'commission_accrual',
    v_commission_cents,
    v_gross_payment_cents,
    v_platform_fee_bps,
    v_platform_fee_cents,
    v_net_distributable_cents,
    v_commission_rate_bps_out,
    v_commission_cents,
    p_stripe_event_id,
    p_stripe_payment_intent_id,
    'confirmed'
  )
  RETURNING id INTO v_ledger_id;

  UPDATE public.partner_commission_balances
  SET accrued_cents = accrued_cents + v_commission_cents,
      updated_at = now()
  WHERE tenant_id = v_checkout.tenant_id;

  UPDATE public.tribute_checkouts
  SET gross_payment_cents = v_gross_payment_cents,
      platform_fee_bps = v_platform_fee_bps,
      platform_fee_cents = v_platform_fee_cents,
      net_distributable_cents = v_net_distributable_cents,
      commission_cents = v_commission_cents,
      commission_rate_bps = v_commission_rate_bps_out,
      commission_status = 'accrued',
      updated_at = now()
  WHERE id = p_checkout_id;

  RETURN v_waterfall || jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id
  );
END;
$$;

COMMENT ON FUNCTION public.accrue_partner_commission_for_checkout(uuid, integer, text, text, integer, integer) IS
  'Accrual RevShare Bulletproof idempotent — webhook checkout.session.completed uniquement. service_role only.';

REVOKE ALL ON FUNCTION public.accrue_partner_commission_for_checkout(uuid, integer, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accrue_partner_commission_for_checkout(uuid, integer, text, text, integer, integer) TO service_role;

-- ---------------------------------------------------------------------
-- 5) clawback_partner_commission — remboursement proportionnel
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clawback_partner_commission(
  p_checkout_id uuid,
  p_refunded_cents integer,
  p_stripe_event_id text,
  p_reason text DEFAULT 'refund'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkout                public.tribute_checkouts%ROWTYPE;
  v_accrual                 public.partner_commission_ledger%ROWTYPE;
  v_clawback_cents          integer;
  v_gross_snapshot          integer;
  v_commission_snapshot     integer;
  v_ledger_id               uuid;
  v_existing                uuid;
  v_is_total_clawback       boolean;
BEGIN
  IF p_checkout_id IS NULL THEN
    RAISE EXCEPTION 'checkout_id_required';
  END IF;

  IF p_refunded_cents IS NULL OR p_refunded_cents <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'zero_refunded_cents');
  END IF;

  IF p_stripe_event_id IS NULL OR length(trim(p_stripe_event_id)) = 0 THEN
    RAISE EXCEPTION 'stripe_event_id_required';
  END IF;

  -- Idempotence webhook event
  SELECT id INTO v_existing
  FROM public.partner_commission_ledger
  WHERE stripe_event_id = p_stripe_event_id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_processed', true,
      'ledger_id', v_existing
    );
  END IF;

  SELECT * INTO v_checkout
  FROM public.tribute_checkouts
  WHERE id = p_checkout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'checkout_not_found';
  END IF;

  SELECT * INTO v_accrual
  FROM public.partner_commission_ledger
  WHERE tribute_checkout_id = p_checkout_id
    AND reason = 'commission_accrual'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_accrual_to_clawback');
  END IF;

  v_gross_snapshot := COALESCE(
    v_accrual.gross_payment_cents,
    v_checkout.gross_payment_cents
  );

  v_commission_snapshot := COALESCE(
    v_accrual.commission_cents,
    v_checkout.commission_cents
  );

  IF v_gross_snapshot IS NULL OR v_gross_snapshot <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_gross_snapshot');
  END IF;

  IF v_commission_snapshot IS NULL OR v_commission_snapshot <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_commission_snapshot');
  END IF;

  v_clawback_cents := floor(
    v_commission_snapshot::numeric * p_refunded_cents / v_gross_snapshot
  )::integer;

  IF v_clawback_cents <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'zero_clawback');
  END IF;

  v_is_total_clawback := p_refunded_cents >= v_gross_snapshot;

  INSERT INTO public.partner_commission_ledger (
    tenant_id,
    tribute_checkout_id,
    project_id,
    invitation_id,
    reason,
    delta_cents,
    gross_payment_cents,
    platform_fee_bps,
    platform_fee_cents,
    net_distributable_cents,
    commission_rate_bps,
    commission_cents,
    stripe_event_id,
    status,
    metadata
  )
  VALUES (
    v_accrual.tenant_id,
    v_checkout.id,
    v_checkout.project_id,
    v_checkout.invitation_id,
    'commission_clawback',
    -v_clawback_cents,
    v_gross_snapshot,
    v_accrual.platform_fee_bps,
    v_accrual.platform_fee_cents,
    v_accrual.net_distributable_cents,
    v_accrual.commission_rate_bps,
    v_clawback_cents,
    p_stripe_event_id,
    'confirmed',
    jsonb_build_object(
      'refunded_cents', p_refunded_cents,
      'clawback_reason', COALESCE(NULLIF(trim(p_reason), ''), 'refund'),
      'commission_snapshot_cents', v_commission_snapshot
    )
  )
  RETURNING id INTO v_ledger_id;

  UPDATE public.partner_commission_balances
  SET accrued_cents = GREATEST(accrued_cents - v_clawback_cents, 0),
      updated_at = now()
  WHERE tenant_id = v_accrual.tenant_id;

  IF v_is_total_clawback THEN
    UPDATE public.tribute_checkouts
    SET commission_status = 'clawed_back',
        updated_at = now()
    WHERE id = p_checkout_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id,
    'clawback_cents', v_clawback_cents,
    'refunded_cents', p_refunded_cents,
    'is_total_clawback', v_is_total_clawback
  );
END;
$$;

COMMENT ON FUNCTION public.clawback_partner_commission(uuid, integer, text, text) IS
  'Clawback RevShare proportionnel à l''accrual snapshot — charge.refunded. service_role only.';

REVOKE ALL ON FUNCTION public.clawback_partner_commission(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clawback_partner_commission(uuid, integer, text, text) TO service_role;

COMMIT;

-- ---------------------------------------------------------------------
-- PostgREST schema cache reload
-- ---------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
