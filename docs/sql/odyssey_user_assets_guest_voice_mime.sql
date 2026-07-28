-- =============================================================================
-- user-assets — MIME voix Sanctuaire (MediaRecorder webm / mp4 / ogg)
--
-- Phase 3b guest_voice. Idempotent. Si allowed_mime_types est NULL = déjà ouvert.
-- =============================================================================

UPDATE storage.buckets
SET allowed_mime_types = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(allowed_mime_types, ARRAY[]::text[])
      || ARRAY[
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav'
      ]
    )
  )
)
WHERE id = 'user-assets'
  AND allowed_mime_types IS NOT NULL;
