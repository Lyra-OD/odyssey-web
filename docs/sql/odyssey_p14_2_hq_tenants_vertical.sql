-- =====================================================================
-- Odyssey P14.2 — HQ liste tenants : colonne vertical (tabs C.1)
-- =====================================================================
-- Pourquoi : filtrer le tableau micro par tenants.vertical (human / pet / …).
--            CREATE OR REPLACE ne peut pas changer le RETURNS TABLE → DROP.
-- Prérequis : P14.1 hq_list_freemium_tenants().
-- Ne change PAS is_freemium, RLS Salon, ni les KPI macro.
-- =====================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.hq_list_freemium_tenants();

CREATE FUNCTION public.hq_list_freemium_tenants()
RETURNS TABLE (id uuid, name text, slug text, vertical text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name, t.slug, t.vertical
  FROM public.tenants t
  WHERE t.is_freemium IS NOT FALSE
  ORDER BY t.name ASC;
$$;

COMMENT ON FUNCTION public.hq_list_freemium_tenants() IS
  'Liste tenants freemium + vertical pour Odyssey HQ. SECURITY DEFINER, service_role only.';

REVOKE ALL ON FUNCTION public.hq_list_freemium_tenants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hq_list_freemium_tenants() TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
