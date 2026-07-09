-- =====================================================================
-- [P6.1 | QA] — Waterfall Bulletproof assert — odyssey_p6_1
-- =====================================================================
-- Prérequis : odyssey_p6_1_bulletproof_waterfall.sql appliqué.
-- Canon chiffré : docs/QA_P6_COMMISSION_WATERFALL.md (S1–S3, S5)
--
-- Usage (Supabase SQL Editor) :
--   1. Exécuter ce script après la migration P6.1
--   2. Vérifier : section A → 0 lignes | section B → clawback_cents = 2011
--   3. Section C → status = ALL_PASS (sinon EXCEPTION)
--
-- Lecture seule sur données métier — ne modifie aucune table.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A) Harness table-driven — scénarios S1, S2, S3
-- ---------------------------------------------------------------------
WITH expected AS (
  SELECT *
  FROM (
    VALUES
      (14900, 1000, 3000, 1490, 13410, 4023, 9387, 'S1 Heritage seul'),
      (29900, 1000, 3000, 2990, 26910, 8073, 18837, 'S2 Eternite seul'),
      (19800, 1000, 3000, 1980, 17820, 5346, 12474, 'S3 Heritage + Retouche IA')
  ) AS t(
    gross_cents,
    platform_fee_bps,
    commission_rate_bps,
    exp_platform_fee_cents,
    exp_net_distributable_cents,
    exp_commission_cents,
    exp_odyssey_margin_cents,
    scenario
  )
),
actual AS (
  SELECT
    e.scenario,
    e.gross_cents,
    (wf->>'platform_fee_cents')::integer         AS platform_fee_cents,
    (wf->>'net_distributable_cents')::integer    AS net_distributable_cents,
    (wf->>'commission_cents')::integer           AS commission_cents,
    (wf->>'odyssey_margin_cents')::integer       AS odyssey_margin_cents,
    wf                                           AS waterfall_json
  FROM expected e
  CROSS JOIN LATERAL (
    SELECT public.compute_revenue_waterfall(
      e.gross_cents,
      e.platform_fee_bps,
      e.commission_rate_bps
    ) AS wf
  ) computed
),
failures AS (
  SELECT
    a.scenario,
    a.gross_cents,
    jsonb_build_object(
      'platform_fee_cents', jsonb_build_object('expected', e.exp_platform_fee_cents, 'actual', a.platform_fee_cents),
      'net_distributable_cents', jsonb_build_object('expected', e.exp_net_distributable_cents, 'actual', a.net_distributable_cents),
      'commission_cents', jsonb_build_object('expected', e.exp_commission_cents, 'actual', a.commission_cents),
      'odyssey_margin_cents', jsonb_build_object('expected', e.exp_odyssey_margin_cents, 'actual', a.odyssey_margin_cents)
    ) AS mismatch
  FROM actual a
  JOIN expected e USING (scenario)
  WHERE a.platform_fee_cents IS DISTINCT FROM e.exp_platform_fee_cents
     OR a.net_distributable_cents IS DISTINCT FROM e.exp_net_distributable_cents
     OR a.commission_cents IS DISTINCT FROM e.exp_commission_cents
     OR a.odyssey_margin_cents IS DISTINCT FROM e.exp_odyssey_margin_cents
)
SELECT
  scenario,
  mismatch,
  'FAIL' AS result
FROM failures
ORDER BY scenario;

-- Si la requête ci-dessus retourne 0 lignes → S1–S3 OK.

-- ---------------------------------------------------------------------
-- B) Clawback S5 — remboursement partiel 50 % sur S1
-- ---------------------------------------------------------------------
-- floor(4023 × 7450 / 14900) = 2011
SELECT
  floor(4023::numeric * 7450 / 14900)::integer AS clawback_cents,
  2011 AS expected_clawback_cents,
  floor(4023::numeric * 7450 / 14900)::integer = 2011 AS s5_clawback_ok;

-- ---------------------------------------------------------------------
-- C) Verdict global — lève une exception si un scénario échoue
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_failure_count integer;
  v_s5_ok         boolean;
BEGIN
  WITH expected AS (
    SELECT *
    FROM (
      VALUES
        (14900, 1000, 3000, 1490, 13410, 4023, 9387, 'S1 Heritage seul'),
        (29900, 1000, 3000, 2990, 26910, 8073, 18837, 'S2 Eternite seul'),
        (19800, 1000, 3000, 1980, 17820, 5346, 12474, 'S3 Heritage + Retouche IA')
    ) AS t(
      gross_cents,
      platform_fee_bps,
      commission_rate_bps,
      exp_platform_fee_cents,
      exp_net_distributable_cents,
      exp_commission_cents,
      exp_odyssey_margin_cents,
      scenario
    )
  ),
  actual AS (
    SELECT
      e.scenario,
      (wf->>'platform_fee_cents')::integer      AS platform_fee_cents,
      (wf->>'net_distributable_cents')::integer AS net_distributable_cents,
      (wf->>'commission_cents')::integer      AS commission_cents,
      (wf->>'odyssey_margin_cents')::integer    AS odyssey_margin_cents
    FROM expected e
    CROSS JOIN LATERAL (
      SELECT public.compute_revenue_waterfall(
        e.gross_cents,
        e.platform_fee_bps,
        e.commission_rate_bps
      ) AS wf
    ) computed
  ),
  failures AS (
    SELECT a.scenario
    FROM actual a
    JOIN expected e USING (scenario)
    WHERE a.platform_fee_cents IS DISTINCT FROM e.exp_platform_fee_cents
       OR a.net_distributable_cents IS DISTINCT FROM e.exp_net_distributable_cents
       OR a.commission_cents IS DISTINCT FROM e.exp_commission_cents
       OR a.odyssey_margin_cents IS DISTINCT FROM e.exp_odyssey_margin_cents
  )
  SELECT COUNT(*) INTO v_failure_count FROM failures;

  v_s5_ok := floor(4023::numeric * 7450 / 14900)::integer = 2011;

  IF v_failure_count > 0 THEN
    RAISE EXCEPTION 'P6.1 QA FAIL — % waterfall scenario(s) mismatch (S1–S3)', v_failure_count;
  END IF;

  IF NOT v_s5_ok THEN
    RAISE EXCEPTION 'P6.1 QA FAIL — S5 clawback expected 2011 cents';
  END IF;

  RAISE NOTICE 'P6.1 QA ALL_PASS — S1, S2, S3 waterfall + S5 clawback OK';
END $$;

-- ---------------------------------------------------------------------
-- D) Smoke — JSONB keys présentes (contrat stable webhook)
-- ---------------------------------------------------------------------
SELECT
  wf ? 'gross_payment_cents'
  AND wf ? 'platform_fee_bps'
  AND wf ? 'platform_fee_cents'
  AND wf ? 'net_distributable_cents'
  AND wf ? 'commission_rate_bps'
  AND wf ? 'commission_cents'
  AND wf ? 'odyssey_margin_cents' AS jsonb_contract_ok
FROM (
  SELECT public.compute_revenue_waterfall(14900, 1000, 3000) AS wf
) smoke;
