-- =====================================================================
-- Odyssey P2b — Nettoyage du doublon `user_id` dans media_assets
-- =====================================================================
-- Contexte :
--   Le script P2 (odyssey_p2_media_assets_schema_sync.sql) a créé par
--   erreur une colonne `user_id` (nullable) alors que la table utilise
--   la convention historique `owner_user_id` (NOT NULL).
--
--   Résultat : 2 colonnes propriétaire dans la même table.
--   - `owner_user_id` (vraie colonne, NOT NULL)  ← celle qu'on garde
--   - `user_id`       (doublon nullable, jamais peuplé)  ← à supprimer
--
-- Ce script :
--   1) Supprime la colonne `user_id` (et son éventuel index orphelin).
--   2) Force PostgREST à recharger son cache.
--   3) Vérifie l'état final.
--
-- Idempotent.
-- =====================================================================

BEGIN;

-- Drop la colonne en doublon. Les index dépendants sont supprimés en cascade.
ALTER TABLE public.media_assets DROP COLUMN IF EXISTS user_id;

-- Ajoute un index sur owner_user_id si manquant (utile pour les requêtes
-- "tous les médias uploadés par tel user" en back-office).
CREATE INDEX IF NOT EXISTS idx_media_assets_owner_user_id
  ON public.media_assets (owner_user_id);

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Vérification finale du schéma
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'media_assets'
ORDER BY ordinal_position;
