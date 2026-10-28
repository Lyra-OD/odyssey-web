-- =====================================================================
-- Odyssey P20 — Empreinte SHA-256 des souvenirs du Coffre
-- =====================================================================
-- Ajoute media_assets.content_sha256 (empreinte du fichier original).
-- Index par projet, sans contrainte d’unicité : deux copies volontaires
-- restent possibles. Ne change pas le quota, ni le chemin Storage.
-- À jouer dans le SQL Editor avant que le dépôt n’écrive la colonne.
-- =====================================================================

BEGIN;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS content_sha256 text;

ALTER TABLE public.media_assets
  DROP CONSTRAINT IF EXISTS media_assets_content_sha256_hex;

ALTER TABLE public.media_assets
  ADD CONSTRAINT media_assets_content_sha256_hex
  CHECK (
    content_sha256 IS NULL
    OR content_sha256 ~ '^[0-9a-f]{64}$'
  );

CREATE INDEX IF NOT EXISTS idx_media_assets_project_content_sha256
  ON public.media_assets (project_id, content_sha256);

COMMIT;

NOTIFY pgrst, 'reload schema';
