-- =====================================================================
-- Odyssey — Schema health check (lecture seule)
-- =====================================================================
-- SQL Editor : ops — Schema health check — 2026-06-16
--
-- Usage : exécuter sur PROD ou staging pour savoir quelles migrations
--         P0–P5.1 sont déjà en place. Ne modifie rien.
-- Référence repo : docs/sql/README.md
-- =====================================================================

-- Tables attendues (post-P5)
SELECT
  t.table_name,
  CASE WHEN c.relname IS NOT NULL THEN 'OK' ELSE 'MANQUANT' END AS statut
FROM (
  VALUES
    ('projects'),
    ('profiles'),
    ('tenants'),
    ('tenant_members'),
    ('media_assets'),
    ('orders'),
    ('partner_token_wallets'),
    ('partner_token_ledger'),
    ('partner_invitations'),
    ('tribute_checkouts')
) AS t(table_name)
LEFT JOIN pg_class c
  ON c.relname = t.table_name
  AND c.relnamespace = 'public'::regnamespace
ORDER BY t.table_name;

-- Colonnes clés P3 / P5 sur projects
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'projects'
  AND column_name IN (
    'wizard_state',
    'wizard_step',
    'last_saved_at',
    'invitation_id'
  )
ORDER BY column_name;

-- Fonctions P5
SELECT
  p.proname AS fonction,
  'OK' AS statut
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'partner_tokens_for_granted_package',
    'debit_partner_tokens_for_checkout',
    'handle_new_user',
    'get_partner_public_branding',
    'get_partner_tenants_for_member'
  )
ORDER BY p.proname;

-- Index P5.1 (invitation pending unique)
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'partner_invitations'
  AND indexname LIKE '%pending%';

-- Trigger auth bootstrap
SELECT
  tgname AS trigger_name,
  'OK' AS statut
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Tenant QA (optionnel — présent si seed exécuté)
SELECT slug, name, settings->>'brand_label' AS brand_label
FROM public.tenants
WHERE slug IN ('partner-qa-demo', 'humans', 'pets')
ORDER BY slug;
