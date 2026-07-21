-- =====================================================================
-- [P6 | QA] — RevShare accrual E2E (balance +30% net, zéro jeton)
-- =====================================================================
-- Scénario 4 (Phase 6) — validation VIVANTE de la chaîne d'accrual :
--   webhook checkout.session.completed (149 $) →
--   accrue_partner_commission_for_checkout →
--   partner_commission_balances += 30 % du Net Distribuable (= 4023 cents).
--
-- Prérequis :
--   - odyssey_p6_1_bulletproof_waterfall.sql appliqué
--   - Au moins 1 tenant is_freemium=true et 1 projet existants (staging)
--
-- Sûreté : TOUT s'exécute dans une transaction terminée par ROLLBACK.
--   Aucune donnée n'est persistée. Le checkout jetable + le ledger +
--   l'incrément de solde disparaissent en fin de script.
--
-- Usage (Supabase SQL Editor / psql) :
--   Exécuter le bloc entier. Attendu : NOTICE « P6 REVSHARE QA ALL_PASS ».
--   Toute divergence lève une EXCEPTION (et annule la transaction).
-- =====================================================================

BEGIN;

DO $$
DECLARE
  v_tenant_id       uuid;
  v_project_id      uuid;
  v_checkout_id     uuid;
  v_event_id        text := 'evt_qa_p6_' || replace(gen_random_uuid()::text, '-', '');
  v_gross           integer := 14900;   -- 149 $ (Héritage)
  v_exp_fee         integer := 1490;    -- 10 % platform fee
  v_exp_net         integer := 13410;   -- net distribuable
  v_exp_commission  integer := 4023;    -- 30 % du net
  v_result          jsonb;
  v_result2         jsonb;
  v_balance_before  integer;
  v_balance_after   integer;
  v_ledger_delta    integer;
  v_token_tables    integer;
BEGIN
  -- 0) Dépendances FK : un tenant freemium + un projet quelconque
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE is_freemium IS TRUE
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'P6 REVSHARE QA SKIP — aucun tenant is_freemium=true (seed staging requis)';
  END IF;

  SELECT id INTO v_project_id FROM public.projects LIMIT 1;
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'P6 REVSHARE QA SKIP — aucun projet existant (FK tribute_checkouts.project_id)';
  END IF;

  -- 1) Checkout jetable B2B2C famille (rollback en fin de script)
  INSERT INTO public.tribute_checkouts (
    project_id, tenant_id, checkout_mode,
    granted_package, selected_package,
    family_total_cents, status
  )
  VALUES (
    v_project_id, v_tenant_id, 'b2b2c_family',
    'essential', 'signature',
    v_gross, 'completed'
  )
  RETURNING id INTO v_checkout_id;

  -- 2) Solde avant (crée la ligne à 0 si absente)
  INSERT INTO public.partner_commission_balances (tenant_id)
  VALUES (v_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  SELECT accrued_cents INTO v_balance_before
  FROM public.partner_commission_balances
  WHERE tenant_id = v_tenant_id;

  -- 3) Accrual — platform_fee 10 %, commission 30 % (déterministe)
  v_result := public.accrue_partner_commission_for_checkout(
    v_checkout_id,
    v_gross,
    v_event_id,
    NULL,
    1000,
    3000
  );

  IF (v_result->>'ok')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P6 REVSHARE QA FAIL — accrual rejeté : %', v_result;
  END IF;

  -- 4) Waterfall exact
  IF (v_result->>'platform_fee_cents')::integer <> v_exp_fee THEN
    RAISE EXCEPTION 'P6 REVSHARE QA FAIL — platform_fee % attendu %',
      v_result->>'platform_fee_cents', v_exp_fee;
  END IF;

  IF (v_result->>'net_distributable_cents')::integer <> v_exp_net THEN
    RAISE EXCEPTION 'P6 REVSHARE QA FAIL — net % attendu %',
      v_result->>'net_distributable_cents', v_exp_net;
  END IF;

  IF (v_result->>'commission_cents')::integer <> v_exp_commission THEN
    RAISE EXCEPTION 'P6 REVSHARE QA FAIL — commission % attendu % (30%% du net)',
      v_result->>'commission_cents', v_exp_commission;
  END IF;

  -- 5) Le solde partenaire s'incrémente EXACTEMENT de la commission
  SELECT accrued_cents INTO v_balance_after
  FROM public.partner_commission_balances
  WHERE tenant_id = v_tenant_id;

  IF (v_balance_after - v_balance_before) <> v_exp_commission THEN
    RAISE EXCEPTION 'P6 REVSHARE QA FAIL — delta solde % attendu %',
      (v_balance_after - v_balance_before), v_exp_commission;
  END IF;

  -- 6) Ligne ledger append-only cohérente
  SELECT delta_cents INTO v_ledger_delta
  FROM public.partner_commission_ledger
  WHERE tribute_checkout_id = v_checkout_id
    AND reason = 'commission_accrual';

  IF v_ledger_delta <> v_exp_commission THEN
    RAISE EXCEPTION 'P6 REVSHARE QA FAIL — ledger delta % attendu %',
      v_ledger_delta, v_exp_commission;
  END IF;

  -- 7) Idempotence webhook : même event_id → aucun double-crédit
  v_result2 := public.accrue_partner_commission_for_checkout(
    v_checkout_id, v_gross, v_event_id, NULL, 1000, 3000
  );

  IF (v_result2->>'already_processed')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P6 REVSHARE QA FAIL — idempotence event_id non respectée : %', v_result2;
  END IF;

  SELECT accrued_cents INTO v_balance_after
  FROM public.partner_commission_balances
  WHERE tenant_id = v_tenant_id;

  IF (v_balance_after - v_balance_before) <> v_exp_commission THEN
    RAISE EXCEPTION 'P6 REVSHARE QA FAIL — double-crédit détecté après rejeu event_id';
  END IF;

  -- 8) ZÉRO jeton : les tables wallet ont été purgées (P8) → débit impossible
  SELECT count(*) INTO v_token_tables
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'partner_token_%';

  IF v_token_tables <> 0 THEN
    RAISE EXCEPTION 'P6 REVSHARE QA FAIL — % table(s) partner_token_* subsistent (purge P8 incomplète)',
      v_token_tables;
  END IF;

  RAISE NOTICE 'P6 REVSHARE QA ALL_PASS — 149 $ → commission % cents (30%% du net %), solde +%, idempotent, 0 jeton',
    v_exp_commission, v_exp_net, v_exp_commission;
END $$;

-- Rien n'est conservé : on annule tout (checkout jetable + ledger + solde).
ROLLBACK;
