-- =====================================================================
-- Odyssey P14.1 — HQ lecture tenants : RPC hq_list_freemium_tenants
-- =====================================================================
-- Pourquoi : GET /api/hq/* fait .from("tenants") via PostgREST.
--            service_role n’a pas le privilège table → 500
--            « permission denied for table tenants ».
--            Même modèle que P14 payout : SECURITY DEFINER (owner).
-- Prérequis : table public.tenants (P1 / P5.3). P14 payout optionnel.
-- Ne change PAS la RLS Salon. EXECUTE = service_role only.
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

GRANT SELECT ON TABLE public.tenants TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
