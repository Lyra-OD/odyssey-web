-- =====================================================================
-- Odyssey — Branding tenant partenaire (Salon connexion)
-- =====================================================================
-- SQL Editor : nommer l'onglet ex.
--   QA — Branding tenant Urgel Bourgie — 2026-06-16
--
-- Prérequis :
--   - Tenant existant (slug stable, ex. partner-qa-demo)
--   - Logo public dans Storage bucket partner-branding (ou URL HTTPS externe)
--
-- Page cible :
--   /[lang]/salon/connexion?partenaire=<slug>
--
-- Champs lus par l'app : tenants.settings.brand_label, brand_logo_url
-- Pages : /[lang]/salon/connexion?partenaire=<slug> ET header /[lang]/salon
-- =====================================================================

-- 1) Mise à jour branding
UPDATE public.tenants
SET settings = settings || jsonb_build_object(
  'brand_label', 'Urgel Bourgie',
  'brand_logo_url', 'https://bwdvynruvptmtlbaautj.supabase.co/storage/v1/object/public/partner-branding/UB_FR_2026_coul_FR-1-scaled_CORRECTED.png'
)
WHERE slug = 'partner-qa-demo';

-- 2) Vérification
SELECT
  slug,
  settings->>'brand_label' AS nom,
  settings->>'brand_logo_url' AS logo
FROM public.tenants
WHERE slug = 'partner-qa-demo';
