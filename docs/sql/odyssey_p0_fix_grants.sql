-- =====================================================================
-- Odyssey P0 — Fix GRANTS (idempotent)
-- =====================================================================
-- Contexte :
--   Le wizard reçoit "permission denied for table projects" quand
--   /api/projects/draft tente INSERT INTO public.projects.
--   Cause : un REVOKE ALL ... FROM authenticated a été appliqué mais
--   les GRANT correspondants n'ont pas (ou plus) été effectifs
--   (probablement abandonné en cours de transaction).
--
-- Ce script :
--   1) Re-grant USAGE sur le schéma public aux rôles client.
--   2) Re-grant les privilèges minimum (SELECT/INSERT/UPDATE) sur
--      projects et media_assets à `authenticated`.
--   3) Re-grant SELECT (lecture seule) sur orders à `authenticated`.
--   4) Garantit que `service_role` a TOUS les privilèges sur ces
--      tables (pour webhooks/back-office).
--   5) Affiche en sortie l'état des GRANT pour vérification.
--
-- Important : RLS reste en place. Ce script ne touche AUCUNE policy.
-- =====================================================================

-- 1) USAGE sur le schéma public
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2) public.projects : owner peut SELECT/INSERT/UPDATE (filtré par RLS)
GRANT SELECT, INSERT, UPDATE ON TABLE public.projects TO authenticated;

-- 3) public.media_assets : owner peut SELECT/INSERT/UPDATE (filtré par RLS)
GRANT SELECT, INSERT, UPDATE ON TABLE public.media_assets TO authenticated;

-- 4) public.orders : owner peut SELECT uniquement (écritures = service_role)
GRANT SELECT ON TABLE public.orders TO authenticated;

-- 5) service_role : pleins privilèges pour les webhooks
GRANT ALL ON TABLE public.projects TO service_role;
GRANT ALL ON TABLE public.media_assets TO service_role;
GRANT ALL ON TABLE public.orders TO service_role;

-- 6) Vérification : liste les privilèges effectifs après le fix
SELECT
  grantee,
  table_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('projects', 'orders', 'media_assets')
  AND grantee IN ('anon', 'authenticated', 'service_role')
GROUP BY grantee, table_name
ORDER BY table_name, grantee;
