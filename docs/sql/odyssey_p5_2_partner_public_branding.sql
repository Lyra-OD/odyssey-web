-- =====================================================================
-- Odyssey P5.2 — Branding public Salon (RPC lecture par slug)
-- =====================================================================
-- SQL Editor : P5.2 — Partner public branding RPC — 2026-06-16
--
-- Problème : service_role n'a pas SELECT sur public.tenants → page
--   /salon/connexion?partenaire=<slug> affichait le branding générique.
-- Solution : fonction SECURITY DEFINER exposant uniquement brand_label + logo.
--
-- Prérequis : public.tenants (slug, name, settings jsonb)
-- Référence : docs/ROUTES_AND_AUTH.md
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_partner_public_branding(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'slug', t.slug,
    'brand_label', COALESCE(
      NULLIF(trim(t.settings->>'brand_label'), ''),
      NULLIF(trim(t.name), ''),
      t.slug
    ),
    'brand_logo_url', NULLIF(trim(t.settings->>'brand_logo_url'), '')
  )
  FROM public.tenants t
  WHERE t.slug = lower(trim(p_slug))
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_partner_public_branding(text) IS
  'Branding public page connexion Salon (?partenaire=slug). Pas d''auth requise.';

REVOKE ALL ON FUNCTION public.get_partner_public_branding(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_public_branding(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_partner_public_branding(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_public_branding(text) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Vérification
SELECT public.get_partner_public_branding('partner-qa-demo');
