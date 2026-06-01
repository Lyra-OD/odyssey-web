-- =====================================================================
-- Odyssey P1 — User bootstrap (multi-tenant + profiles)
-- =====================================================================
-- Objectif :
--   1) Enrichir public.tenants (colonnes vertical + settings).
--   2) Renommer les 2 tenants existants (labels internes "Verticale X").
--   3) Créer public.tenant_members (jointure M:N user ↔ tenant).
--   4) Activer RLS + Grants stricts sur tenant_members.
--   5) Installer UN SEUL trigger on_auth_user_created qui peuple à la
--      fois public.profiles (FK projects.user_id) ET public.tenant_members.
--   6) Backfill : créer profiles + tenant_members pour TOUS les users
--      auth.users qui n'en ont pas (débloque les comptes existants).
--   7) Forcer reload du cache schéma PostgREST.
--   8) Vérifier le résultat.
--
-- Idempotent : peut être ré-exécuté sans dégâts.
--
-- Supersède : odyssey_p1_tenant_members.sql (supprimé du repo).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Tenants : enrichir le schéma
-- ---------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS vertical text,
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tenants_vertical ON public.tenants (vertical);
CREATE INDEX IF NOT EXISTS idx_tenants_slug     ON public.tenants (slug);

-- ---------------------------------------------------------------------
-- 2) Tenants existants — labels internes techniques (Direction 2 :
--    les marques commerciales iront plus tard dans settings.brand_label)
-- ---------------------------------------------------------------------
UPDATE public.tenants
SET name = 'Verticale Humains', slug = 'humans', vertical = 'human'
WHERE id = '1724979c-e1ee-439a-b53d-ed214e9a687f';

UPDATE public.tenants
SET name = 'Verticale Animaux', slug = 'pets', vertical = 'pet'
WHERE id = 'a03bc583-705a-4b83-b4b3-e2a6ce259ce0';

-- ---------------------------------------------------------------------
-- 3) Table de jointure tenant_members
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_members_user_tenant_unique UNIQUE (user_id, tenant_id)
);

COMMENT ON TABLE public.tenant_members IS
  'Lien M:N entre auth.users et public.tenants. Pivot du multi-tenant Odyssey.';

CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id   ON public.tenant_members (user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON public.tenant_members (tenant_id);

-- ---------------------------------------------------------------------
-- 4) RLS sur tenant_members : un user voit uniquement ses appartenances
-- ---------------------------------------------------------------------
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_members_select_own ON public.tenant_members;
CREATE POLICY tenant_members_select_own
  ON public.tenant_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5) Grants stricts sur tenant_members
-- ---------------------------------------------------------------------
REVOKE ALL ON TABLE public.tenant_members FROM anon;
REVOKE ALL ON TABLE public.tenant_members FROM authenticated;
GRANT SELECT ON TABLE public.tenant_members TO authenticated;
GRANT ALL    ON TABLE public.tenant_members TO service_role;

-- ---------------------------------------------------------------------
-- 6) Fonction unifiée handle_new_user
--    - Insère profiles (id seul ; pattern Supabase minimal).
--      Si profiles a d'autres colonnes NOT NULL sans default, ce bloc
--      lèvera une erreur explicite à l'inscription → enrichir l'INSERT.
--    - Insère tenant_members avec le tenant par défaut (slug 'humans').
--    SECURITY DEFINER pour outrepasser les RLS depuis le contexte
--    d'INSERT auth.users (rôle supabase_auth_admin).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  default_tenant_id uuid;
BEGIN
  -- 6a) Profile (FK cible de projects.user_id)
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  -- 6b) Tenant membership par défaut
  SELECT id INTO default_tenant_id
  FROM public.tenants
  WHERE slug = 'humans'
  LIMIT 1;

  IF default_tenant_id IS NULL THEN
    RAISE WARNING
      'Default tenant (slug=humans) not found; skipping tenant_members insert for user %',
      NEW.id;
  ELSE
    INSERT INTO public.tenant_members (user_id, tenant_id, role)
    VALUES (NEW.id, default_tenant_id, 'member')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 7) Trigger unifié : remplace tout trigger Odyssey précédent sur auth.users
--    (on_auth_user_created_tenant_member, on_auth_user_created ...)
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created_tenant_member ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created               ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7b) Cleanup de l'ancienne fonction spécifique tenant_member
DROP FUNCTION IF EXISTS public.handle_new_user_tenant_member();

-- ---------------------------------------------------------------------
-- 8) Backfill profiles : tous les users existants sans profile
-- ---------------------------------------------------------------------
INSERT INTO public.profiles (id)
SELECT u.id
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 9) Backfill tenant_members : tous les users existants sans rattachement
-- ---------------------------------------------------------------------
INSERT INTO public.tenant_members (user_id, tenant_id, role)
SELECT
  u.id,
  (SELECT id FROM public.tenants WHERE slug = 'humans' LIMIT 1),
  'member'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = u.id
)
ON CONFLICT (user_id, tenant_id) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------
-- 10) PostgREST schema reload (hors transaction)
-- ---------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 11) Vérifications
-- ---------------------------------------------------------------------
SELECT id, name, slug, vertical
FROM public.tenants
ORDER BY created_at;

SELECT
  u.id   AS user_id,
  u.email,
  p.id   AS profile_id,
  t.slug AS tenant_slug,
  t.vertical,
  tm.role,
  tm.created_at
FROM auth.users u
LEFT JOIN public.profiles p       ON p.id = u.id
LEFT JOIN public.tenant_members tm ON tm.user_id = u.id
LEFT JOIN public.tenants t        ON t.id = tm.tenant_id
ORDER BY u.created_at;
