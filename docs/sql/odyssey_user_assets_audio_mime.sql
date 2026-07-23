-- =============================================================================
-- user-assets — autoriser MP3 / WAV (musique perso Wizard)
--
-- Symptôme : Storage Error « mime type audio/mpeg is not supported »
-- Cause : allowed_mime_types du bucket limité aux images/vidéos.
--
-- Exécuter dans le SQL Editor Supabase (rôle avec droits sur storage.buckets).
-- Idempotent. Si allowed_mime_types est NULL, le bucket accepte déjà tout.
-- =============================================================================

UPDATE storage.buckets
SET allowed_mime_types = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(allowed_mime_types, ARRAY[]::text[])
      || ARRAY[
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/wave',
        'audio/x-mpeg'
      ]
    )
  )
)
WHERE id = 'user-assets'
  AND allowed_mime_types IS NOT NULL;
