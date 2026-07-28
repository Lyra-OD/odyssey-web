-- =============================================================================
-- user-assets : MIME témoignage Sanctuaire (MediaRecorder video/webm|mp4)
--
-- Phase 3b guest_video. Idempotent. Si allowed_mime_types est NULL = déjà ouvert.
-- =============================================================================

UPDATE storage.buckets
SET allowed_mime_types = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(allowed_mime_types, ARRAY[]::text[])
      || ARRAY[
        'video/webm',
        'video/mp4',
        'video/quicktime'
      ]
    )
  )
)
WHERE id = 'user-assets'
  AND allowed_mime_types IS NOT NULL;
