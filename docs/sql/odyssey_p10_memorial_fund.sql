-- =====================================================================
-- Odyssey P10 — Fonds Commémoratif / Boucle Virale (Cascade V-Final)
-- =====================================================================
-- Prérequis (appliqués) :
--   odyssey_p6_freemium_revshare.sql       (stubs guest/fund/tokens)
--   odyssey_p6_1_bulletproof_waterfall.sql (compute_revenue_waterfall)
--   odyssey_p8_freemium_v1_token_purge.sql (jetons purgés)
--
-- Canon : docs/IMPLEMENTATION_CASCADE_VFINAL.md (prime en cas de conflit).
--
-- Active les stubs Phase 2 en MODÈLE CRÉDIT :
--   - Les micro-transactions invités (guest_micro_checkouts) suivent le
--     waterfall Bulletproof : Platform Fee 10 % -> Net Distribuable ->
--     Commission Athos 30 % (guest_commission_accrual) -> Marge Odyssey.
--   - Le "Fonds Commémoratif" = Net Distribuable x fund_conversion_bps
--     (défaut 100 %) devient un CRÉDIT (remise) sur le paywall famille.
--     Le crédit est PORTÉ PAR ODYSSEY (coût marginal de livraison ~ 0 $) ;
--     il ne réduit JAMAIS la commission cash d'Athos.
--
-- ⚠️ INVERSION garde-fou VISION_PHASE_2 §2.2 #4 : les contributions
--    invités ALIMENTENT désormais partner_commission_ledger.
--
-- Non-cassant : purement additif (IF NOT EXISTS). Feature flag par tenant
--   tenants.settings.viral_loop_enabled (défaut false) => aucun impact
--   sur les flux B2B2C/B2C existants tant qu'il n'est pas activé.
--
-- Schéma uniquement (colonnes, contraintes, RLS, seed config).
-- Les RPC métier (accrue_guest_micro_checkout, consume_family_fund_credit)
-- arrivent en Phase 2 (fichier séparé).
--
-- Idempotent : peut être ré-exécuté sans dégât.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) projects — date commémorative (cron Jour-365, LTV Phase 3)
-- ---------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS commemoration_date date,
  ADD COLUMN IF NOT EXISTS date_of_passing date;

COMMENT ON COLUMN public.projects.commemoration_date IS
  'Date d''anniversaire commémoratif (jour de départ du défunt). Arme le cron Jour-365 (capsule anniversaire IA, relance invités). Phase 3 LTV.';

COMMENT ON COLUMN public.projects.date_of_passing IS
  'Date de décès (peut différer de la date commémorative choisie par la famille). Nullable.';

-- Index partiel : le cron scanne uniquement les projets datés.
CREATE INDEX IF NOT EXISTS idx_projects_commemoration_date
  ON public.projects (commemoration_date)
  WHERE commemoration_date IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2) tenants.settings — config Fonds Commémoratif (jsonb, seed merge)
-- ---------------------------------------------------------------------
-- Archi Option B (configurable) / posture A par défaut (agressive 100 %).
--   fund_conversion_bps : part du Net Distribuable convertie en crédit famille
--                         (10000 = 100 %). Le crédit affiché n'est jamais
--                         inférieur au Net réel (garantie anti-scandale PR).
--   owner_floor_cents   : reste-à-payer minimum imposé au porteur (0 = la
--                         famille peut atteindre 0 $).
--   viral_loop_enabled  : feature flag (false = flux actuels inchangés).
-- Merge non destructif : ne touche pas les clés déjà présentes.
UPDATE public.tenants
SET settings = jsonb_build_object(
      'fund_conversion_bps', 10000,
      'owner_floor_cents', 0,
      'viral_loop_enabled', false
    ) || COALESCE(settings, '{}'::jsonb)
WHERE NOT (COALESCE(settings, '{}'::jsonb) ? 'fund_conversion_bps');

-- ---------------------------------------------------------------------
-- 3) guest_micro_checkouts — snapshot waterfall + contributeur + cap
-- ---------------------------------------------------------------------
ALTER TABLE public.guest_micro_checkouts
  ADD COLUMN IF NOT EXISTS contributor_name        text,
  ADD COLUMN IF NOT EXISTS platform_fee_bps         integer,
  ADD COLUMN IF NOT EXISTS platform_fee_cents       integer,
  ADD COLUMN IF NOT EXISTS net_distributable_cents  integer,
  ADD COLUMN IF NOT EXISTS commission_rate_bps      integer,
  ADD COLUMN IF NOT EXISTS commission_cents         integer,
  ADD COLUMN IF NOT EXISTS fund_credit_cents        integer,
  ADD COLUMN IF NOT EXISTS fund_conversion_bps      integer,
  ADD COLUMN IF NOT EXISTS project_access_token_id  uuid
    REFERENCES public.project_access_tokens (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consent_marketing        boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.guest_micro_checkouts.net_distributable_cents IS
  'Net Distribuable (gross - platform fee). Assiette commission Athos ET base du crédit fonds.';
COMMENT ON COLUMN public.guest_micro_checkouts.commission_cents IS
  'Commission Athos (30 % du Net) — snapshot ; écrite aussi dans partner_commission_ledger (guest_commission_accrual).';
COMMENT ON COLUMN public.guest_micro_checkouts.fund_credit_cents IS
  'Crédit alloué au Fonds Commémoratif = net_distributable_cents x fund_conversion_bps. Porté par Odyssey.';
COMMENT ON COLUMN public.guest_micro_checkouts.consent_marketing IS
  'Opt-in marketing invité (Loi 25) — recontact Jour-365. Séparé du consentement transactionnel.';

-- Snapshots >= 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'guest_micro_checkouts_snapshot_nonneg_check'
      AND conrelid = 'public.guest_micro_checkouts'::regclass
  ) THEN
    ALTER TABLE public.guest_micro_checkouts
      ADD CONSTRAINT guest_micro_checkouts_snapshot_nonneg_check
        CHECK (
          (platform_fee_cents      IS NULL OR platform_fee_cents      >= 0) AND
          (net_distributable_cents IS NULL OR net_distributable_cents >= 0) AND
          (commission_cents        IS NULL OR commission_cents        >= 0) AND
          (fund_credit_cents       IS NULL OR fund_credit_cents       >= 0)
        );
  END IF;

  -- Anti-abus : plafond dur par transaction (1000 $ = 100000 centimes).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'guest_micro_checkouts_gross_cap_check'
      AND conrelid = 'public.guest_micro_checkouts'::regclass
  ) THEN
    ALTER TABLE public.guest_micro_checkouts
      ADD CONSTRAINT guest_micro_checkouts_gross_cap_check
        CHECK (gross_cents <= 100000);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_guest_micro_checkouts_token
  ON public.guest_micro_checkouts (project_access_token_id)
  WHERE project_access_token_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 4) family_tribute_fund_balances — sémantique CRÉDIT (consumed_cents)
-- ---------------------------------------------------------------------
ALTER TABLE public.family_tribute_fund_balances
  ADD COLUMN IF NOT EXISTS consumed_cents integer NOT NULL DEFAULT 0
    CHECK (consumed_cents >= 0);

COMMENT ON COLUMN public.family_tribute_fund_balances.consumed_cents IS
  'Crédit appliqué au paywall à l''export. accrued = crédit généré ; consumed = crédit consommé ; paid = payout legacy (inutilisé V1 crédit).';

COMMENT ON TABLE public.family_tribute_fund_balances IS
  'Solde Fonds Commémoratif par hommage (modèle CRÉDIT V-Final). Crédit disponible = accrued_cents - consumed_cents.';

-- ---------------------------------------------------------------------
-- 5) partner_commission_ledger — accrual sur contributions invités
--    ⚠️ INVERSION garde-fou : le fonds invité alimente les commissions.
-- ---------------------------------------------------------------------
ALTER TABLE public.partner_commission_ledger
  ADD COLUMN IF NOT EXISTS guest_micro_checkout_id uuid
    REFERENCES public.guest_micro_checkouts (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.partner_commission_ledger.guest_micro_checkout_id IS
  'Lien vers la micro-transaction invité source (reason guest_commission_accrual/clawback). NULL pour les accruals forfait famille.';

-- Étend le CHECK reason (ajoute les motifs invités). Superset des valeurs
-- existantes -> recréation sûre.
ALTER TABLE public.partner_commission_ledger
  DROP CONSTRAINT IF EXISTS partner_commission_ledger_reason_check;

ALTER TABLE public.partner_commission_ledger
  ADD CONSTRAINT partner_commission_ledger_reason_check
    CHECK (reason IN (
      'commission_accrual',
      'commission_clawback',
      'guest_commission_accrual',
      'guest_commission_clawback',
      'payout',
      'adjustment'
    ));

-- Idempotence accrual invité : une seule accrual confirmée par micro-checkout.
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_ledger_unique_guest_accrual
  ON public.partner_commission_ledger (guest_micro_checkout_id)
  WHERE reason = 'guest_commission_accrual';

CREATE INDEX IF NOT EXISTS idx_commission_ledger_guest_checkout
  ON public.partner_commission_ledger (guest_micro_checkout_id)
  WHERE guest_micro_checkout_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 6) family_tribute_fund_ledger — motifs consommation crédit
-- ---------------------------------------------------------------------
ALTER TABLE public.family_tribute_fund_ledger
  ADD COLUMN IF NOT EXISTS tribute_checkout_id uuid
    REFERENCES public.tribute_checkouts (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.family_tribute_fund_ledger.tribute_checkout_id IS
  'Checkout famille ayant consommé le crédit (reason credit_applied). NULL pour les allocations.';

ALTER TABLE public.family_tribute_fund_ledger
  DROP CONSTRAINT IF EXISTS family_tribute_fund_ledger_reason_check;

ALTER TABLE public.family_tribute_fund_ledger
  ADD CONSTRAINT family_tribute_fund_ledger_reason_check
    CHECK (reason IN (
      'allocation',        -- crédit généré par une contribution invité
      'credit_applied',    -- crédit consommé au paywall famille (export)
      'credit_reversal',   -- annulation de consommation (remboursement)
      'payout',            -- legacy versement comptant (inutilisé V1)
      'adjustment',
      'clawback'
    ));

-- ---------------------------------------------------------------------
-- 7) RLS — la famille (propriétaire) lit SON solde (thermomètre UI)
-- ---------------------------------------------------------------------
-- Écriture reste service_role only (webhook / RPC). Lecture owner seule.
GRANT SELECT ON TABLE public.family_tribute_fund_balances TO authenticated;

DROP POLICY IF EXISTS family_fund_balances_select_owner
  ON public.family_tribute_fund_balances;

CREATE POLICY family_fund_balances_select_owner
  ON public.family_tribute_fund_balances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = family_tribute_fund_balances.project_id
        AND p.user_id = auth.uid()
    )
  );

COMMIT;

-- ---------------------------------------------------------------------
-- PostgREST schema cache reload
-- ---------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- Activation feature flag (exécuter manuellement, par tenant)
-- ---------------------------------------------------------------------
-- UPDATE public.tenants
-- SET settings = settings || jsonb_build_object('viral_loop_enabled', true)
-- WHERE slug = 'partner-qa-demo';
