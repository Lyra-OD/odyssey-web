-- =============================================================================
-- Odyssey — P0 Complete (MVP orders + RLS + Storage + Grants)
-- Fichier : odyssey_p0_complete.sql
--
-- Prérequis : tables public.projects et public.media_assets existent déjà
--   avec colonnes attendues (projects.id, projects.user_id ; media_assets.project_id).
-- Si public.orders existait déjà (schéma partiel), CREATE IF NOT EXISTS ne change
--   rien : le bloc 1bis ajoute les colonnes MVP manquantes avant COMMENT / index.
--
-- Après exécution : nettoyer les policies Storage résiduelles trop larges
--   sur le bucket user-assets (RLS permissif = OR entre policies).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) MVP — public.orders (si absent)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE RESTRICT,
  stripe_session_id text UNIQUE,
  amount_total integer,
  currency text NOT NULL DEFAULT 'CAD',
  status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 1bis) orders pré-existant sans colonnes MVP — alignement sans écraser les données
-- ---------------------------------------------------------------------------

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_total integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_session_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS project_id uuid;

UPDATE public.orders SET currency = COALESCE(currency, 'CAD') WHERE currency IS NULL;
UPDATE public.orders SET created_at = COALESCE(created_at, now()) WHERE created_at IS NULL;

ALTER TABLE public.orders ALTER COLUMN currency SET DEFAULT 'CAD';

-- Index unique partiel (idempotent) si la contrainte UNIQUE de CREATE TABLE n’existe pas
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_session_id_unique
  ON public.orders (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

COMMENT ON COLUMN public.orders.amount_total IS 'Montant en minor units (ex. cents), aligné Stripe.';
COMMENT ON COLUMN public.orders.stripe_session_id IS 'Stripe Checkout Session id (cs_...), unique si présent.';

-- ---------------------------------------------------------------------------
-- 2) Index performance (sans CONCURRENTLY)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_projects_user_id
  ON public.projects (user_id);

CREATE INDEX IF NOT EXISTS idx_orders_project_id
  ON public.orders (project_id);

CREATE INDEX IF NOT EXISTS idx_media_assets_project_id
  ON public.media_assets (project_id);

-- ---------------------------------------------------------------------------
-- 3) RLS — activation
-- ---------------------------------------------------------------------------

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4) RLS — idempotence (drop policies nommées)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS projects_select_owner ON public.projects;
DROP POLICY IF EXISTS projects_insert_owner ON public.projects;
DROP POLICY IF EXISTS projects_update_owner ON public.projects;

DROP POLICY IF EXISTS orders_select_owner_project ON public.orders;

DROP POLICY IF EXISTS media_assets_select_owner_project ON public.media_assets;
DROP POLICY IF EXISTS media_assets_insert_owner_project ON public.media_assets;
DROP POLICY IF EXISTS media_assets_update_owner_project ON public.media_assets;

DROP POLICY IF EXISTS user_assets_objects_select_owner ON storage.objects;
DROP POLICY IF EXISTS user_assets_objects_insert_owner ON storage.objects;

-- ---------------------------------------------------------------------------
-- 5) RLS — public.projects (auth.uid() direct)
--     SELECT / INSERT / UPDATE propriétaire — pas de DELETE
-- ---------------------------------------------------------------------------

CREATE POLICY projects_select_owner
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY projects_insert_owner
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY projects_update_owner
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6) RLS — public.orders : SELECT uniquement si projet appartient à l’utilisateur
--     Aucune policy INSERT/UPDATE/DELETE pour authenticated (service_role + grants)
-- ---------------------------------------------------------------------------

CREATE POLICY orders_select_owner_project
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = orders.project_id
        AND p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 7) RLS — public.media_assets (auth.uid() via ownership projet)
--     Pas de DELETE
-- ---------------------------------------------------------------------------

CREATE POLICY media_assets_select_owner_project
  ON public.media_assets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = media_assets.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY media_assets_insert_owner_project
  ON public.media_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = media_assets.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY media_assets_update_owner_project
  ON public.media_assets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = media_assets.project_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = media_assets.project_id
        AND p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 8) Storage — bucket user-assets, chemin projects/{project_id}/...
-- ---------------------------------------------------------------------------

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_assets_objects_select_owner
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-assets'
    AND (storage.foldername(name))[1] = 'projects'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.user_id = auth.uid()
        AND p.id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY user_assets_objects_insert_owner
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-assets'
    AND (storage.foldername(name))[1] = 'projects'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.user_id = auth.uid()
        AND p.id::text = (storage.foldername(name))[2]
    )
  );

-- ---------------------------------------------------------------------------
-- 9) Grants — anon / authenticated (strict)
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE public.projects FROM anon;
REVOKE ALL ON TABLE public.orders FROM anon;
REVOKE ALL ON TABLE public.media_assets FROM anon;

REVOKE ALL ON TABLE public.projects FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.projects TO authenticated;

REVOKE ALL ON TABLE public.orders FROM authenticated;
GRANT SELECT ON TABLE public.orders TO authenticated;

REVOKE ALL ON TABLE public.media_assets FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.media_assets TO authenticated;

-- Storage : ne pas exécuter GRANT sur storage.objects depuis le SQL Editor Supabase
--   (erreur 42501 « must be owner of table objects » : la table appartient au
--   sous-système Storage). Les rôles authenticated/anon ont déjà les privilèges
--   nécessaires côté plateforme ; l’accès effectif est contrôlé par les policies
--   ci-dessus sur storage.objects. Si un upload échoue encore, vérifier le
--   Dashboard → Storage → Policies (pas de GRANT manuel requis ici).

-- ---------------------------------------------------------------------------
-- 10) service_role — tables public (webhooks / jobs ; ne pas être bloqué par REVOKE ciblés)
--      Élargit les privilèges sur TOUTES les tables existantes du schéma public.
--      Les nouvelles tables créées après ce script : re-exécuter ce GRANT ou
--      utiliser ALTER DEFAULT PRIVILEGES (hors scope MVP).
-- ---------------------------------------------------------------------------

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- =============================================================================
-- Fin — Tests : upload projects/{own_project_id}/... ; 2 comptes ; webhook.
-- =============================================================================
