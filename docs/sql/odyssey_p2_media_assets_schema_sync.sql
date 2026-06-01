-- =====================================================================
-- Odyssey P2 — Alignement du schéma `public.media_assets`
-- =====================================================================
-- Contexte :
--   Le service d'upload (src/lib/uploads/mediaUploadService.ts) écrit
--   un payload avec les colonnes suivantes :
--     project_id, storage_path, mime_type, size_bytes, source,
--     upload_status, order_index, owner_user_id, tenant_id
--   La table `media_assets` utilise la convention `owner_user_id` (NOT
--   NULL) et `tenant_id` (NOT NULL) — ces colonnes existaient déjà.
--   Manquaient en revanche source/upload_status/storage_path/etc.
--
-- Ce script :
--   1) Ajoute (IF NOT EXISTS) toutes les colonnes manquantes attendues
--      par le service. Les NOT NULL ont un DEFAULT pour ne pas casser
--      d'éventuelles lignes existantes.
--   2) Crée les index utiles + la contrainte UNIQUE sur
--      (project_id, storage_path) — exigée par le ON CONFLICT du upsert.
--   3) Force PostgREST à recharger son cache.
--   4) Vérifie le schéma final.
--
-- Note : ne créé PAS de colonne `user_id` parallèle — la convention
-- Odyssey est `owner_user_id` (existe déjà sur la table).
-- Si une `user_id` parasite a été créée par une version antérieure du
-- script, exécuter `odyssey_p2b_media_assets_cleanup.sql` pour la
-- supprimer.
--
-- Idempotent : peut être ré-exécuté sans dégât.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Colonnes attendues par mediaUploadService
--    (owner_user_id et tenant_id sont supposées exister déjà —
--     elles sont la convention historique de la table)
-- ---------------------------------------------------------------------
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS storage_path  text,
  ADD COLUMN IF NOT EXISTS mime_type     text,
  ADD COLUMN IF NOT EXISTS size_bytes    bigint,
  ADD COLUMN IF NOT EXISTS source        text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS upload_status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS order_index   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at    timestamptz NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------
-- 2) Index + contrainte unique pour ON CONFLICT (idempotent)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_media_assets_owner_user_id
  ON public.media_assets (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_media_assets_tenant_id
  ON public.media_assets (tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_media_assets_project_storage
  ON public.media_assets (project_id, storage_path);

COMMIT;

-- ---------------------------------------------------------------------
-- 3) PostgREST schema cache reload
-- ---------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 4) Vérification : schéma final
-- ---------------------------------------------------------------------
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'media_assets'
ORDER BY ordinal_position;
