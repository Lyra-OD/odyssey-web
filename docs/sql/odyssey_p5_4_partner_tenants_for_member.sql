-- =====================================================================
-- Odyssey P5.4 — Tenants partenaire pour membre connecté (RPC)
-- =====================================================================
-- SQL Editor : P5.4 — Partner tenants for member RPC — 2026-06-16
--
-- Problème : sans P5.3, la jointure tenant_members → tenants renvoie null
--   (RLS) → logo « Partenaire », dropdown vide, « Espace partenaire introuvable ».
-- Solution : RPC SECURITY DEFINER — liste id, slug, brand_label, brand_logo_url
--   pour auth.uid() avec rôle partner / partner_admin.
--
-- Prérequis : P5.2 (optionnel), tenant_members, seed partenaire QA
-- Complète P5.3 (RLS directe) — exécuter P5.3 OU P5.4 (P5.4 suffit pour l'app).
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_partner_tenants_for_member()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'slug', t.slug,
        'brand_label', COALESCE(
          NULLIF(trim(t.settings->>'brand_label'), ''),
          NULLIF(trim(t.name), ''),
          t.slug
        ),
        'brand_logo_url', NULLIF(trim(t.settings->>'brand_logo_url'), '')
      )
      ORDER BY tm.created_at ASC
    ),
    '[]'::jsonb
  )
  FROM public.tenant_members tm
  INNER JOIN public.tenants t ON t.id = tm.tenant_id
  WHERE tm.user_id = auth.uid()
    AND tm.role IN ('partner', 'partner_admin');
$$;

COMMENT ON FUNCTION public.get_partner_tenants_for_member() IS
  'Liste les espaces partenaire (branding inclus) pour l''utilisateur connecté.';

REVOKE ALL ON FUNCTION public.get_partner_tenants_for_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_tenants_for_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_tenants_for_member() TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Vérification (connecté en tant que partenaire dans SQL Editor — ou via app)
-- SELECT public.get_partner_tenants_for_member();
