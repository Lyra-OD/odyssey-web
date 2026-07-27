-- =====================================================================
-- Odyssey P10.3 — Plafond photos Sanctuaire (5 / invité · token)
-- =====================================================================
-- Quiet Luxury anti-dump : max 5 guest_photo par access_token contribute.
-- Soft Cap famille (enforce_media_asset_quota) INCHANGÉ — les guests
-- restent exclus du quota 50/125.
--
-- Anti-race : pg_advisory_xact_lock(project_id, token_id) avant COUNT.
-- Idempotent. Prérequis : P10.2 (contributor_type guest).
-- Canon : src/lib/contribute/sanctuaryLimits.ts (SANCTUARY_GUEST_PHOTO_MAX=5)
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_guest_photo_quota()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_token_id   text;
  v_count      integer;
  v_max_photos integer := 5;
BEGIN
  IF NEW.contributor_type IS DISTINCT FROM 'guest' THEN
    RETURN NEW;
  END IF;

  -- Messages texte / autres sources : hors plafond photos.
  IF NEW.source IS DISTINCT FROM 'guest_photo' THEN
    RETURN NEW;
  END IF;

  -- storage_path = projects/{project_id}/contribute/{access_token_id}/...
  v_token_id := (regexp_match(
    NEW.storage_path,
    '/contribute/([0-9a-fA-F-]{36})/'
  ))[1];

  IF v_token_id IS NULL THEN
    RAISE EXCEPTION
      'guest_photo_limit_reached: contribute token id missing from storage_path'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(NEW.project_id::text),
    hashtext(v_token_id)
  );

  SELECT count(*)::integer
    INTO v_count
    FROM public.media_assets
    WHERE project_id = NEW.project_id
      AND contributor_type = 'guest'
      AND source = 'guest_photo'
      AND storage_path LIKE '%/contribute/' || v_token_id || '/%';

  IF v_count >= v_max_photos THEN
    RAISE EXCEPTION
      'guest_photo_limit_reached: token % already has % guest photos (max %)',
      v_token_id, v_count, v_max_photos
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_guest_photo_quota() IS
  'P10.3 — max 5 guest_photo / access_token contribute. N''affecte pas Soft Cap famille.';

DROP TRIGGER IF EXISTS trg_media_assets_guest_photo_quota ON public.media_assets;
CREATE TRIGGER trg_media_assets_guest_photo_quota
  BEFORE INSERT ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_guest_photo_quota();

COMMIT;
