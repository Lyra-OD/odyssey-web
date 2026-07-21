-- =====================================================================
-- Odyssey P10.1 — RPC Fonds Commémoratif (Cascade V-Final)
-- =====================================================================
-- Prérequis (appliqués) :
--   odyssey_p6_1_bulletproof_waterfall.sql (compute_revenue_waterfall)
--   odyssey_p10_memorial_fund.sql          (schéma crédit + colonnes)
--
-- Canon : docs/IMPLEMENTATION_CASCADE_VFINAL.md
--
-- Apporte 2 RPC (service_role only, idempotentes) :
--   accrue_guest_micro_checkout()  — waterfall d'une contribution invité :
--       Platform Fee 10 % -> Net Distribuable -> Commission Athos 30 %
--       (partner_commission_ledger, UNIQUEMENT si tenant freemium)
--       -> Crédit Fonds = Net x fund_conversion_bps (défaut 100 %).
--       Le crédit est PORTÉ PAR ODYSSEY, ne réduit jamais la commission cash
--       d'Athos.
--   consume_family_fund_credit() — applique le crédit au paywall famille à
--       l'export : applied = min(disponible, prix - owner_floor).
--
-- ⚠️ compute_revenue_waterfall et accrue_partner_commission_for_checkout
--    NE SONT PAS modifiées (isolation).
--
-- Idempotent : CREATE OR REPLACE. Peut être ré-exécuté sans dégât.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) accrue_guest_micro_checkout — waterfall contribution invité
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accrue_guest_micro_checkout(
  p_guest_checkout_id        uuid,
  p_gross_cents              integer,
  p_stripe_event_id          text,
  p_stripe_payment_intent_id text    DEFAULT NULL,
  p_platform_fee_bps         integer DEFAULT NULL,
  p_commission_rate_bps      integer DEFAULT NULL,
  p_fund_conversion_bps      integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest               public.guest_micro_checkouts%ROWTYPE;
  v_tenant              public.tenants%ROWTYPE;
  v_tenant_id           uuid;
  v_is_freemium         boolean := false;
  v_platform_fee_bps    integer;
  v_commission_rate_bps integer;
  v_fund_conversion_bps integer;
  v_waterfall           jsonb;
  v_platform_fee_cents  integer;
  v_net_cents           integer;
  v_commission_cents    integer;
  v_fund_credit_cents   integer;
  v_commission_accrued  boolean := false;
  v_commission_ledger_id uuid;
  v_fund_ledger_id       uuid;
  v_existing            uuid;
BEGIN
  IF p_guest_checkout_id IS NULL THEN
    RAISE EXCEPTION 'guest_checkout_id_required';
  END IF;
  IF p_gross_cents IS NULL OR p_gross_cents <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'zero_gross');
  END IF;
  IF p_stripe_event_id IS NULL OR length(trim(p_stripe_event_id)) = 0 THEN
    RAISE EXCEPTION 'stripe_event_id_required';
  END IF;

  -- Idempotence webhook event (allocation fonds déjà écrite pour cet event).
  SELECT id INTO v_existing
  FROM public.family_tribute_fund_ledger
  WHERE stripe_event_id = p_stripe_event_id
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_processed', true, 'fund_ledger_id', v_existing);
  END IF;

  SELECT * INTO v_guest
  FROM public.guest_micro_checkouts
  WHERE id = p_guest_checkout_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'guest_checkout_not_found';
  END IF;

  -- Idempotence par micro-checkout (allocation déjà faite).
  SELECT id INTO v_existing
  FROM public.family_tribute_fund_ledger
  WHERE guest_micro_checkout_id = p_guest_checkout_id
    AND reason = 'allocation'
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_accrued', true, 'fund_ledger_id', v_existing);
  END IF;

  v_tenant_id := v_guest.tenant_id;
  IF v_tenant_id IS NOT NULL THEN
    SELECT * INTO v_tenant FROM public.tenants WHERE id = v_tenant_id;
    IF FOUND THEN
      v_is_freemium := COALESCE(v_tenant.is_freemium, false);
    END IF;
  END IF;

  v_platform_fee_bps := COALESCE(
    NULLIF(p_platform_fee_bps, 0),
    NULLIF((v_tenant.settings->>'platform_fee_bps')::integer, 0),
    1000
  );
  v_commission_rate_bps := COALESCE(
    NULLIF(p_commission_rate_bps, 0),
    NULLIF((v_tenant.settings->>'revshare_bps')::integer, 0),
    3000
  );
  v_fund_conversion_bps := COALESCE(
    NULLIF(p_fund_conversion_bps, 0),
    NULLIF((v_tenant.settings->>'fund_conversion_bps')::integer, 0),
    10000
  );

  -- Waterfall Bulletproof (source de vérité unique, non modifiée).
  v_waterfall := public.compute_revenue_waterfall(
    p_gross_cents,
    v_platform_fee_bps,
    v_commission_rate_bps
  );
  v_platform_fee_cents := (v_waterfall->>'platform_fee_cents')::integer;
  v_net_cents          := (v_waterfall->>'net_distributable_cents')::integer;
  v_commission_cents   := (v_waterfall->>'commission_cents')::integer;

  -- Crédit famille = Net x taux de conversion (défaut 100 %).
  v_fund_credit_cents := floor(v_net_cents::numeric * v_fund_conversion_bps / 10000)::integer;

  -- Commission Athos : UNIQUEMENT si tenant partenaire freemium (sinon B2C
  -- direct : pas de partenaire, pas de commission — mais crédit fonds quand même).
  IF v_is_freemium AND v_commission_cents > 0 THEN
    INSERT INTO public.partner_commission_balances (tenant_id)
    VALUES (v_tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;

    INSERT INTO public.partner_commission_ledger (
      tenant_id, guest_micro_checkout_id, project_id, reason, delta_cents,
      gross_payment_cents, platform_fee_bps, platform_fee_cents, net_distributable_cents,
      commission_rate_bps, commission_cents, stripe_event_id, stripe_payment_intent_id, status
    ) VALUES (
      v_tenant_id, v_guest.id, v_guest.project_id, 'guest_commission_accrual', v_commission_cents,
      p_gross_cents, v_platform_fee_bps, v_platform_fee_cents, v_net_cents,
      v_commission_rate_bps, v_commission_cents, p_stripe_event_id, p_stripe_payment_intent_id, 'confirmed'
    )
    RETURNING id INTO v_commission_ledger_id;

    UPDATE public.partner_commission_balances
    SET accrued_cents = accrued_cents + v_commission_cents, updated_at = now()
    WHERE tenant_id = v_tenant_id;

    v_commission_accrued := true;
  END IF;

  -- Allocation du crédit au Fonds Commémoratif (toujours).
  INSERT INTO public.family_tribute_fund_balances (project_id)
  VALUES (v_guest.project_id)
  ON CONFLICT (project_id) DO NOTHING;

  INSERT INTO public.family_tribute_fund_ledger (
    project_id, guest_micro_checkout_id, reason, delta_cents, gross_cents,
    stripe_event_id, status, metadata
  ) VALUES (
    v_guest.project_id, v_guest.id, 'allocation', v_fund_credit_cents, p_gross_cents,
    p_stripe_event_id, 'confirmed',
    jsonb_build_object(
      'fund_conversion_bps', v_fund_conversion_bps,
      'net_distributable_cents', v_net_cents,
      'commission_accrued', v_commission_accrued
    )
  )
  RETURNING id INTO v_fund_ledger_id;

  UPDATE public.family_tribute_fund_balances
  SET accrued_cents = accrued_cents + v_fund_credit_cents, updated_at = now()
  WHERE project_id = v_guest.project_id;

  -- Snapshot waterfall + clôture sur la micro-transaction.
  UPDATE public.guest_micro_checkouts SET
    platform_fee_bps            = v_platform_fee_bps,
    platform_fee_cents          = v_platform_fee_cents,
    net_distributable_cents     = v_net_cents,
    commission_rate_bps         = v_commission_rate_bps,
    commission_cents            = CASE WHEN v_commission_accrued THEN v_commission_cents ELSE 0 END,
    fund_credit_cents           = v_fund_credit_cents,
    fund_conversion_bps         = v_fund_conversion_bps,
    family_fund_allocation_cents = v_fund_credit_cents,
    family_fund_rate_bps        = v_fund_conversion_bps,
    stripe_event_id             = p_stripe_event_id,
    stripe_payment_intent_id    = COALESCE(p_stripe_payment_intent_id, stripe_payment_intent_id),
    status                      = 'completed',
    completed_at                = now(),
    updated_at                  = now()
  WHERE id = p_guest_checkout_id;

  RETURN v_waterfall || jsonb_build_object(
    'ok', true,
    'fund_credit_cents', v_fund_credit_cents,
    'fund_conversion_bps', v_fund_conversion_bps,
    'commission_accrued', v_commission_accrued,
    'commission_ledger_id', v_commission_ledger_id,
    'fund_ledger_id', v_fund_ledger_id
  );
END;
$$;

COMMENT ON FUNCTION public.accrue_guest_micro_checkout(uuid, integer, text, text, integer, integer, integer) IS
  'Waterfall contribution invité : commission Athos (si freemium) + crédit Fonds Commémoratif (Net x conversion). Idempotent stripe_event_id. service_role only.';

REVOKE ALL ON FUNCTION public.accrue_guest_micro_checkout(uuid, integer, text, text, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accrue_guest_micro_checkout(uuid, integer, text, text, integer, integer, integer) TO service_role;

-- ---------------------------------------------------------------------
-- 2) consume_family_fund_credit — application du crédit au paywall
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_family_fund_credit(
  p_project_id          uuid,
  p_package_price_cents integer,
  p_owner_floor_cents   integer DEFAULT 0,
  p_tribute_checkout_id uuid    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal              public.family_tribute_fund_balances%ROWTYPE;
  v_available        integer;
  v_max_applicable   integer;
  v_applied          integer;
  v_existing_applied integer := 0;
  v_ledger_id        uuid;
  v_floor            integer;
BEGIN
  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'project_id_required';
  END IF;
  IF p_package_price_cents IS NULL OR p_package_price_cents < 0 THEN
    RAISE EXCEPTION 'invalid_package_price';
  END IF;

  v_floor := GREATEST(COALESCE(p_owner_floor_cents, 0), 0);

  SELECT * INTO v_bal
  FROM public.family_tribute_fund_balances
  WHERE project_id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true, 'applied_cents', 0,
      'remaining_due_cents', p_package_price_cents, 'available_cents', 0
    );
  END IF;

  -- Idempotence : ce checkout a-t-il déjà consommé du crédit ?
  IF p_tribute_checkout_id IS NOT NULL THEN
    SELECT COALESCE(SUM(-delta_cents), 0) INTO v_existing_applied
    FROM public.family_tribute_fund_ledger
    WHERE tribute_checkout_id = p_tribute_checkout_id
      AND reason = 'credit_applied';

    IF v_existing_applied > 0 THEN
      RETURN jsonb_build_object(
        'ok', true, 'already_applied', true,
        'applied_cents', v_existing_applied,
        'remaining_due_cents', GREATEST(p_package_price_cents - v_existing_applied, 0),
        'available_cents', GREATEST(v_bal.accrued_cents - v_bal.consumed_cents, 0)
      );
    END IF;
  END IF;

  v_available      := GREATEST(v_bal.accrued_cents - v_bal.consumed_cents, 0);
  v_max_applicable := GREATEST(p_package_price_cents - v_floor, 0);
  v_applied        := LEAST(v_available, v_max_applicable);

  IF v_applied <= 0 THEN
    RETURN jsonb_build_object(
      'ok', true, 'applied_cents', 0,
      'remaining_due_cents', p_package_price_cents, 'available_cents', v_available
    );
  END IF;

  INSERT INTO public.family_tribute_fund_ledger (
    project_id, tribute_checkout_id, reason, delta_cents, status, metadata
  ) VALUES (
    p_project_id, p_tribute_checkout_id, 'credit_applied', -v_applied, 'confirmed',
    jsonb_build_object(
      'package_price_cents', p_package_price_cents,
      'owner_floor_cents', v_floor
    )
  )
  RETURNING id INTO v_ledger_id;

  UPDATE public.family_tribute_fund_balances
  SET consumed_cents = consumed_cents + v_applied, updated_at = now()
  WHERE project_id = p_project_id;

  RETURN jsonb_build_object(
    'ok', true,
    'applied_cents', v_applied,
    'remaining_due_cents', GREATEST(p_package_price_cents - v_applied, 0),
    'available_cents', v_available - v_applied,
    'ledger_id', v_ledger_id
  );
END;
$$;

COMMENT ON FUNCTION public.consume_family_fund_credit(uuid, integer, integer, uuid) IS
  'Applique le crédit Fonds Commémoratif au paywall famille : min(disponible, prix - owner_floor). Idempotent par tribute_checkout_id. service_role only.';

REVOKE ALL ON FUNCTION public.consume_family_fund_credit(uuid, integer, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_family_fund_credit(uuid, integer, integer, uuid) TO service_role;

COMMIT;

-- ---------------------------------------------------------------------
-- PostgREST schema cache reload
-- ---------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- QA rapide (staging, transactionnel — ROLLBACK conseillé)
-- ---------------------------------------------------------------------
-- SELECT public.compute_revenue_waterfall(4900, 1000, 3000);
--   -> net 4410 · commission 1323 · fund credit @100% = 4410
--   -> famille : Héritage 149 $ (14900) − 4410 = reste 10490 (104,90 $)
