-- =====================================================================
-- Odyssey P13 — HQ allowlist : table hq_allowlist (opérateurs plateforme)
-- =====================================================================
-- Pourquoi : porte /hq hors tenant_members. Ajouter un admin = INSERT,
--            pas de redeploy Vercel, pas d’env ODYSSEY_OPERATORS.
-- Prérequis : auth.users.
-- Ne crée PAS de rôle salon. RLS : un user ne voit que SA ligne.
-- Ajout / retrait : SQL Editor (service_role). Authenticated = SELECT own.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.hq_allowlist (
  user_id     uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.hq_allowlist IS
  'Opérateurs Odyssey HQ (tour de contrôle). Identité plateforme, pas un rôle tenant.';

ALTER TABLE public.hq_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hq_allowlist_select_own ON public.hq_allowlist;
CREATE POLICY hq_allowlist_select_own
  ON public.hq_allowlist
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.hq_allowlist FROM anon;
REVOKE ALL ON TABLE public.hq_allowlist FROM authenticated;
GRANT SELECT ON TABLE public.hq_allowlist TO authenticated;
GRANT ALL ON TABLE public.hq_allowlist TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- Ops — ajouter un opérateur (coller dans un onglet SQL nommé) :
--   HQ — Add operator — YYYY-MM-DD
--
-- INSERT INTO public.hq_allowlist (user_id, note)
-- SELECT id, 'Erik'
-- FROM auth.users
-- WHERE lower(email) = 'erik@exemple.com'
-- ON CONFLICT (user_id) DO NOTHING;
-- ---------------------------------------------------------------------
