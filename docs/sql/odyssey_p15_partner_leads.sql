-- =====================================================================
-- Odyssey P15 — Leads formulaire /partners (slice D)
-- =====================================================================
-- Pourquoi : le formulaire marketing stocke le lead (service_role) et
--            déclenche l’alerte Resend HQ. Pas de CRM, pas de tenant auto.
-- Prérequis : aucun (table neuve).
-- Ne crée PAS de tenant, ni de user Auth, ni d’accès /salon.
-- Lecture ops : SQL Editor (service_role). Anon / authenticated = rien.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.partner_leads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization   text NOT NULL,
  contact_name   text NOT NULL,
  email          text NOT NULL,
  phone          text,
  region         text,
  context        text,
  message        text NOT NULL,
  locale         text NOT NULL DEFAULT 'fr'
                   CHECK (locale IN ('fr', 'en')),
  source         text NOT NULL DEFAULT 'partners_form',
  emailed_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.partner_leads IS
  'Leads formulaire marketing /partners. Pas un tenant. Alerte HQ via Resend.';

CREATE INDEX IF NOT EXISTS partner_leads_created_at_idx
  ON public.partner_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS partner_leads_email_created_at_idx
  ON public.partner_leads (email, created_at DESC);

ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.partner_leads FROM anon;
REVOKE ALL ON TABLE public.partner_leads FROM authenticated;
GRANT ALL ON TABLE public.partner_leads TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- Ops — lire les derniers leads (onglet SQL Editor nommé) :
--   P15 — Partner leads — YYYY-MM-DD
--
-- SELECT organization, contact_name, email, region, created_at, emailed_at
-- FROM public.partner_leads
-- ORDER BY created_at DESC
-- LIMIT 50;
-- ---------------------------------------------------------------------
