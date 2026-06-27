-- =====================================================================
-- Odyssey P6 — Freemium + RevShare (B2B2C v2) + Phase 2 schema stubs
-- =====================================================================
-- Prérequis :
--   odyssey_p5_b2b2c_core.sql
--   odyssey_p5_5_partner_rbac_overdraft.sql
--
-- Partie A (Phase A sprint T1–T7) — logique commerce active :
--   tenants.is_freemium
--   partner_commission_balances / partner_commission_ledger
--   tribute_checkouts commission columns + package legendary
--   accrue_partner_commission_for_checkout()
--
-- Partie B (stubs Phase 2 — schéma uniquement, pas de RPC métier) :
--   consent_records, project_access_tokens, scan_sessions
--   guest_micro_checkouts, family_tribute_fund_*
--   projects.lifecycle_status, media_assets contributor columns
--   persons / person_faces (LYRA graph — inactive)
--
-- Idempotent : peut être ré-exécuté sans dégât.
-- =====================================================================

BEGIN;

-- ===================================================================
-- PARTIE A — Commerce freemium + RevShare (Phase A)
-- ===================================================================

-- ---------------------------------------------------------------------
-- A1) tenants.is_freemium — modèle commercial par locataire
-- ---------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_freemium boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.is_freemium IS
  'true = canal B2B2C freemium (Souvenir 0 $, RevShare upsell). false = jetons legacy P5.5. Jamais inféré depuis vertical.';

-- ---------------------------------------------------------------------
-- A2) partner_commission_balances — agrégat RevShare par tenant
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_commission_balances (
  tenant_id       uuid PRIMARY KEY REFERENCES public.tenants (id) ON DELETE CASCADE,
  accrued_cents   integer NOT NULL DEFAULT 0 CHECK (accrued_cents >= 0),
  paid_cents      integer NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  pending_cents   integer NOT NULL DEFAULT 0 CHECK (pending_cents >= 0),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.partner_commission_balances IS
  'Solde agrégé RevShare partenaire (centimes USD). Séparé des jetons legacy.';

-- ---------------------------------------------------------------------
-- A3) partner_commission_ledger — journal append-only RevShare
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_commission_ledger (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  tribute_checkout_id       uuid REFERENCES public.tribute_checkouts (id) ON DELETE SET NULL,
  project_id                uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  invitation_id             uuid REFERENCES public.partner_invitations (id) ON DELETE SET NULL,
  reason                    text NOT NULL,
  delta_cents               integer NOT NULL,
  gross_payment_cents       integer CHECK (gross_payment_cents IS NULL OR gross_payment_cents >= 0),
  commission_rate_bps       integer CHECK (commission_rate_bps IS NULL OR commission_rate_bps >= 0),
  commission_cents          integer CHECK (commission_cents IS NULL OR commission_cents >= 0),
  stripe_event_id           text,
  stripe_payment_intent_id  text,
  stripe_charge_id          text,
  status                    text NOT NULL DEFAULT 'confirmed',
  actor_user_id             uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  notes                     text,
  metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_commission_ledger_reason_check
    CHECK (reason IN (
      'commission_accrual',
      'commission_clawback',
      'payout',
      'adjustment'
    )),
  CONSTRAINT partner_commission_ledger_status_check
    CHECK (status IN ('pending', 'confirmed', 'reversed'))
);

COMMENT ON TABLE public.partner_commission_ledger IS
  'Journal RevShare append-only. Idempotence via stripe_event_id. Ne jamais mélanger avec partner_token_ledger.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_ledger_unique_accrual
  ON public.partner_commission_ledger (tribute_checkout_id)
  WHERE reason = 'commission_accrual';

CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_ledger_stripe_event
  ON public.partner_commission_ledger (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commission_ledger_tenant_created
  ON public.partner_commission_ledger (tenant_id, created_at DESC);

-- ---------------------------------------------------------------------
-- A4) tribute_checkouts — commission columns + legendary package
-- ---------------------------------------------------------------------
ALTER TABLE public.tribute_checkouts
  ADD COLUMN IF NOT EXISTS commission_cents integer CHECK (commission_cents IS NULL OR commission_cents >= 0),
  ADD COLUMN IF NOT EXISTS commission_rate_bps integer CHECK (commission_rate_bps IS NULL OR commission_rate_bps >= 0),
  ADD COLUMN IF NOT EXISTS commission_status text NOT NULL DEFAULT 'none';

COMMENT ON COLUMN public.tribute_checkouts.commission_cents IS
  'Snapshot commission RevShare (centimes). Rempli au webhook checkout.session.completed.';

COMMENT ON COLUMN public.tribute_checkouts.commission_rate_bps IS
  'Taux figé au checkout T (ex. 3000 = 30 %). Source : tenants.settings.revshare_bps.';

COMMENT ON COLUMN public.tribute_checkouts.commission_status IS
  'none | accrued | clawed_back | paid';

-- Extend package CHECK to include legendary (B2C Quiet Luxury)
ALTER TABLE public.tribute_checkouts
  DROP CONSTRAINT IF EXISTS tribute_checkouts_package_check;

ALTER TABLE public.tribute_checkouts
  ADD CONSTRAINT tribute_checkouts_package_check
    CHECK (
      selected_package IN ('essential', 'signature', 'heritage', 'legendary')
      AND (granted_package IS NULL OR granted_package IN ('essential', 'signature', 'heritage'))
    );

-- commission_status constraint (add if not exists via drop/recreate pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tribute_checkouts_commission_status_check'
      AND conrelid = 'public.tribute_checkouts'::regclass
  ) THEN
    ALTER TABLE public.tribute_checkouts
      ADD CONSTRAINT tribute_checkouts_commission_status_check
        CHECK (commission_status IN ('none', 'accrued', 'clawed_back', 'paid'));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- A5) RPC — accrue_partner_commission_for_checkout (webhook only)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accrue_partner_commission_for_checkout(
  p_checkout_id uuid,
  p_gross_payment_cents integer,
  p_stripe_event_id text,
  p_stripe_payment_intent_id text DEFAULT NULL,
  p_commission_rate_bps integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkout           public.tribute_checkouts%ROWTYPE;
  v_tenant             public.tenants%ROWTYPE;
  v_rate_bps           integer;
  v_commission_cents   integer;
  v_ledger_id          uuid;
  v_existing           uuid;
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

  v_rate_bps := COALESCE(
    p_commission_rate_bps,
    v_checkout.commission_rate_bps,
    NULLIF((v_tenant.settings->>'revshare_bps')::integer, 0),
    3000
  );

  v_commission_cents := floor(p_gross_payment_cents::numeric * v_rate_bps / 10000)::integer;

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
    p_gross_payment_cents,
    v_rate_bps,
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
  SET commission_cents = v_commission_cents,
      commission_rate_bps = v_rate_bps,
      commission_status = 'accrued',
      updated_at = now()
  WHERE id = p_checkout_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id,
    'commission_cents', v_commission_cents,
    'commission_rate_bps', v_rate_bps
  );
END;
$$;

COMMENT ON FUNCTION public.accrue_partner_commission_for_checkout(uuid, integer, text, text, integer) IS
  'Accrual RevShare idempotent — webhook checkout.session.completed uniquement. service_role only.';

REVOKE ALL ON FUNCTION public.accrue_partner_commission_for_checkout(uuid, integer, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accrue_partner_commission_for_checkout(uuid, integer, text, text, integer) TO service_role;

-- ---------------------------------------------------------------------
-- A6) RLS — commission tables (mirror P5.5 wallet pattern)
-- ---------------------------------------------------------------------
ALTER TABLE public.partner_commission_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commission_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_commission_balances_select_admin ON public.partner_commission_balances;
CREATE POLICY partner_commission_balances_select_admin
  ON public.partner_commission_balances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_commission_balances.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'partner_admin'
    )
  );

DROP POLICY IF EXISTS partner_commission_ledger_select_admin ON public.partner_commission_ledger;
CREATE POLICY partner_commission_ledger_select_admin
  ON public.partner_commission_ledger
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_commission_ledger.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'partner_admin'
    )
  );

REVOKE ALL ON TABLE public.partner_commission_balances FROM anon;
REVOKE ALL ON TABLE public.partner_commission_ledger FROM anon;
GRANT SELECT ON TABLE public.partner_commission_balances TO authenticated;
GRANT SELECT ON TABLE public.partner_commission_ledger TO authenticated;
GRANT ALL ON TABLE public.partner_commission_balances TO service_role;
GRANT ALL ON TABLE public.partner_commission_ledger TO service_role;

-- ===================================================================
-- PARTIE B — Stubs Phase 2 (schéma only — logique métier semaines 3–4+)
-- Référence : docs/VISION_PHASE_2.md §4
-- ===================================================================

-- ---------------------------------------------------------------------
-- B1) projects.lifecycle_status — Sanctuaire MRR / grace period
-- ---------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active';

COMMENT ON COLUMN public.projects.lifecycle_status IS
  'active | grace_period | subscription_required | archived — Phase 2 Sanctuaire MRR. Stub P6 : toujours active.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_lifecycle_status_check'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_lifecycle_status_check
        CHECK (lifecycle_status IN (
          'active',
          'grace_period',
          'subscription_required',
          'archived'
        ));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- B2) media_assets — contributeur invité (Scanner async / CPL)
-- ---------------------------------------------------------------------
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS contributor_type text NOT NULL DEFAULT 'family',
  ADD COLUMN IF NOT EXISTS contributor_email text,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved';

COMMENT ON COLUMN public.media_assets.contributor_type IS
  'family | guest | partner | staff — distingue uploads invités Scanner async.';

COMMENT ON COLUMN public.media_assets.contributor_email IS
  'Email invité (optionnel à l''upload). Requiert consent_records pour marketing CPL.';

COMMENT ON COLUMN public.media_assets.review_status IS
  'approved | pending_review | archived — modération async invités (Smart Pacing).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'media_assets_contributor_type_check'
      AND conrelid = 'public.media_assets'::regclass
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_contributor_type_check
        CHECK (contributor_type IN ('family', 'guest', 'partner', 'staff'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'media_assets_review_status_check'
      AND conrelid = 'public.media_assets'::regclass
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_review_status_check
        CHECK (review_status IN ('approved', 'pending_review', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_media_assets_contributor_email
  ON public.media_assets (lower(trim(contributor_email)))
  WHERE contributor_email IS NOT NULL;

-- ---------------------------------------------------------------------
-- B3) consent_records — Loi 25 / GDPR (marketing vs transactional)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES public.projects (id) ON DELETE CASCADE,
  tenant_id       uuid REFERENCES public.tenants (id) ON DELETE SET NULL,
  email           text NOT NULL,
  consent_type    text NOT NULL,
  granted         boolean NOT NULL,
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  ip_address      inet,
  user_agent      text,
  source          text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT consent_records_type_check
    CHECK (consent_type IN (
      'transactional',
      'marketing',
      'biometric',
      'guest_upload'
    )),
  CONSTRAINT consent_records_email_nonempty
    CHECK (length(trim(email)) > 0)
);

COMMENT ON TABLE public.consent_records IS
  'Preuve consentement Loi 25 — opt-in marketing séparé du transactionnel. Stub P6 : pas de RPC.';

CREATE INDEX IF NOT EXISTS idx_consent_records_project_email
  ON public.consent_records (project_id, lower(trim(email)));

CREATE INDEX IF NOT EXISTS idx_consent_records_tenant_type
  ON public.consent_records (tenant_id, consent_type, recorded_at DESC);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.consent_records FROM anon, authenticated;
GRANT ALL ON TABLE public.consent_records TO service_role;

-- ---------------------------------------------------------------------
-- B4) project_access_tokens — liens invités longue durée (diaspora)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_access_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  tenant_id       uuid REFERENCES public.tenants (id) ON DELETE SET NULL,
  token_hash      text NOT NULL,
  purpose         text NOT NULL DEFAULT 'guest_contribute',
  expires_at      timestamptz NOT NULL,
  revoked_at      timestamptz,
  max_uploads     integer CHECK (max_uploads IS NULL OR max_uploads > 0),
  upload_count    integer NOT NULL DEFAULT 0 CHECK (upload_count >= 0),
  created_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_access_tokens_purpose_check
    CHECK (purpose IN ('guest_contribute', 'scan_session', 'view_only')),
  CONSTRAINT project_access_tokens_hash_unique UNIQUE (token_hash)
);

COMMENT ON TABLE public.project_access_tokens IS
  'Tokens opaques pour contribution invité async (/contribute/[token]). TTL long (ex. 30 j). Stub P6.';

CREATE INDEX IF NOT EXISTS idx_project_access_tokens_project
  ON public.project_access_tokens (project_id, expires_at DESC);

ALTER TABLE public.project_access_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.project_access_tokens FROM anon, authenticated;
GRANT ALL ON TABLE public.project_access_tokens TO service_role;

-- ---------------------------------------------------------------------
-- B5) scan_sessions — Scanner Compagnon (wizard QR + async guests)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scan_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES public.tenants (id) ON DELETE SET NULL,
  token_hash          text NOT NULL,
  status              text NOT NULL DEFAULT 'active',
  expires_at          timestamptz NOT NULL,
  project_access_token_id uuid REFERENCES public.project_access_tokens (id) ON DELETE SET NULL,
  created_by_user_id  uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  last_upload_at      timestamptz,
  upload_count        integer NOT NULL DEFAULT 0 CHECK (upload_count >= 0),
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scan_sessions_status_check
    CHECK (status IN ('active', 'expired', 'revoked', 'completed')),
  CONSTRAINT scan_sessions_token_hash_unique UNIQUE (token_hash)
);

COMMENT ON TABLE public.scan_sessions IS
  'Sessions Scanner web — QR wizard desktop + invités async. Stub P6 : table only.';

CREATE INDEX IF NOT EXISTS idx_scan_sessions_project
  ON public.scan_sessions (project_id, created_at DESC);

ALTER TABLE public.scan_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.scan_sessions FROM anon, authenticated;
GRANT ALL ON TABLE public.scan_sessions TO service_role;

-- ---------------------------------------------------------------------
-- B6) guest_micro_checkouts — micro-transactions invités (≠ tribute_checkouts)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guest_micro_checkouts (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                  uuid NOT NULL REFERENCES public.projects (id) ON DELETE RESTRICT,
  tenant_id                   uuid REFERENCES public.tenants (id) ON DELETE SET NULL,
  contributor_email           text,
  product_key                 text NOT NULL,
  gross_cents                 integer NOT NULL CHECK (gross_cents > 0),
  family_fund_allocation_cents integer NOT NULL DEFAULT 0 CHECK (family_fund_allocation_cents >= 0),
  family_fund_rate_bps        integer CHECK (family_fund_rate_bps IS NULL OR family_fund_rate_bps >= 0),
  stripe_session_id           text,
  stripe_payment_intent_id    text,
  stripe_event_id             text,
  status                      text NOT NULL DEFAULT 'pending',
  idempotency_key             text,
  metadata                    jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at                timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guest_micro_checkouts_status_check
    CHECK (status IN ('pending', 'awaiting_payment', 'completed', 'failed', 'refunded'))
);

COMMENT ON TABLE public.guest_micro_checkouts IS
  'Micro-transactions invités (livre photo, HD). Séparé de tribute_checkouts. Family Fund stub P6.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_micro_checkouts_idempotency
  ON public.guest_micro_checkouts (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_micro_checkouts_project
  ON public.guest_micro_checkouts (project_id, created_at DESC);

ALTER TABLE public.guest_micro_checkouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.guest_micro_checkouts FROM anon, authenticated;
GRANT ALL ON TABLE public.guest_micro_checkouts TO service_role;

-- ---------------------------------------------------------------------
-- B7) family_tribute_fund — solde famille (allocation % micro-transactions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_tribute_fund_balances (
  project_id      uuid PRIMARY KEY REFERENCES public.projects (id) ON DELETE CASCADE,
  accrued_cents   integer NOT NULL DEFAULT 0 CHECK (accrued_cents >= 0),
  paid_cents      integer NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.family_tribute_fund_balances IS
  'Solde Family Tribute Fund par hommage. Payout manuel ops — stub P6.';

CREATE TABLE IF NOT EXISTS public.family_tribute_fund_ledger (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid NOT NULL REFERENCES public.projects (id) ON DELETE RESTRICT,
  guest_micro_checkout_id uuid REFERENCES public.guest_micro_checkouts (id) ON DELETE SET NULL,
  reason                  text NOT NULL,
  delta_cents             integer NOT NULL,
  gross_cents             integer CHECK (gross_cents IS NULL OR gross_cents >= 0),
  stripe_event_id         text,
  status                  text NOT NULL DEFAULT 'confirmed',
  notes                   text,
  metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT family_tribute_fund_ledger_reason_check
    CHECK (reason IN ('allocation', 'payout', 'adjustment', 'clawback')),
  CONSTRAINT family_tribute_fund_ledger_status_check
    CHECK (status IN ('pending', 'confirmed', 'reversed'))
);

COMMENT ON TABLE public.family_tribute_fund_ledger IS
  'Journal Family Tribute Fund — séparé RevShare partenaire et jetons.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_family_fund_ledger_stripe_event
  ON public.family_tribute_fund_ledger (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_family_fund_ledger_project
  ON public.family_tribute_fund_ledger (project_id, created_at DESC);

ALTER TABLE public.family_tribute_fund_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tribute_fund_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.family_tribute_fund_balances FROM anon, authenticated;
REVOKE ALL ON TABLE public.family_tribute_fund_ledger FROM anon, authenticated;
GRANT ALL ON TABLE public.family_tribute_fund_balances TO service_role;
GRANT ALL ON TABLE public.family_tribute_fund_ledger TO service_role;

-- ---------------------------------------------------------------------
-- B8) persons / person_faces — LYRA Data Graph (inactive stub)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.persons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  display_name    text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.persons IS
  'Stub LYRA — entités personne par hommage. Reconnaissance faciale Phase 2+.';

CREATE TABLE IF NOT EXISTS public.person_faces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       uuid NOT NULL REFERENCES public.persons (id) ON DELETE CASCADE,
  media_asset_id  uuid REFERENCES public.media_assets (id) ON DELETE SET NULL,
  embedding_ref   text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.person_faces IS
  'Stub LYRA — lien personne ↔ média. embedding_ref = ref stockage externe (pas de vecteur en DB P6).';

CREATE INDEX IF NOT EXISTS idx_persons_project
  ON public.persons (project_id);

CREATE INDEX IF NOT EXISTS idx_person_faces_person
  ON public.person_faces (person_id);

ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_faces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.persons FROM anon, authenticated;
REVOKE ALL ON TABLE public.person_faces FROM anon, authenticated;
GRANT ALL ON TABLE public.persons TO service_role;
GRANT ALL ON TABLE public.person_faces TO service_role;

COMMIT;

-- ---------------------------------------------------------------------
-- PostgREST schema cache reload
-- ---------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- Seed QA recommandé (exécuter manuellement après migration)
-- ---------------------------------------------------------------------
-- UPDATE public.tenants SET is_freemium = true WHERE slug = 'partner-qa-demo';
