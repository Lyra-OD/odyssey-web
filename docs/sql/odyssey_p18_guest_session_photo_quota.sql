-- =====================================================================
-- Odyssey P18 — Plafond photos Sanctuaire : 5 / session invité
-- =====================================================================
-- La porte famille reste un seul lien. Le trigger P10.3 comptait 5 photos
-- par token — tous les destinataires WhatsApp se bloquaient entre eux.
-- P18 scope le COUNT au 2ᵉ UUID du chemin
--   projects/{project}/contribute/{tokenId}/{sessionId}/…
-- Chemins legacy (un seul UUID) : comportement P10.3 inchangé.
-- Soft Cap famille inchangé. Idempotent. Prérequis : P10.3.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_guest_photo_quota()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_parts      text[];
  v_token_id   text;
  v_session_id text;
  v_count      integer;
  v_max_photos integer := 5;
  v_path_like  text;
BEGIN
  IF NEW.contributor_type IS DISTINCT FROM 'guest' THEN
    RETURN NEW;
  END IF;

  IF NEW.source IS DISTINCT FROM 'guest_photo' THEN
    RETURN NEW;
  END IF;

  v_parts := regexp_match(
    NEW.storage_path,
    '/contribute/([0-9a-fA-F-]{36})/([0-9a-fA-F-]{36})/'
  );

  IF v_parts IS NOT NULL THEN
    v_token_id := v_parts[1];
    v_session_id := v_parts[2];
    v_path_like := '%/contribute/' || v_token_id || '/' || v_session_id || '/%';
  ELSE
    v_token_id := (regexp_match(
      NEW.storage_path,
      '/contribute/([0-9a-fA-F-]{36})/'
    ))[1];
    v_session_id := NULL;
    IF v_token_id IS NULL THEN
      RAISE EXCEPTION
        'guest_photo_limit_reached: contribute token id missing from storage_path'
        USING ERRCODE = 'P0001';
    END IF;
    v_path_like := '%/contribute/' || v_token_id || '/%';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(NEW.project_id::text),
    hashtext(v_token_id || ':' || coalesce(v_session_id, ''))
  );

  SELECT count(*)::integer
    INTO v_count
    FROM public.media_assets
    WHERE project_id = NEW.project_id
      AND contributor_type = 'guest'
      AND source = 'guest_photo'
      AND storage_path LIKE v_path_like;

  IF v_count >= v_max_photos THEN
    RAISE EXCEPTION
      'guest_photo_limit_reached: token % session % already has % guest photos (max %)',
      v_token_id, coalesce(v_session_id, 'legacy'), v_count, v_max_photos
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_guest_photo_quota() IS
  'P18 — max 5 guest_photo / session invité (token+session dans storage_path). Legacy 1-UUID = P10.3. Soft Cap famille inchangé.';

COMMIT;
