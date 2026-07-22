-- =====================================================================
-- Odyssey P10.2 — Sanctuaire invité (Phase 3a)
-- =====================================================================
-- 1) media_assets.contributor_name — nom affiché dans le Cercle
-- 2) Soft Cap P7 : les médias contributor_type = 'guest' NE COMPTENT PAS
--    dans le quota famille (décision CEO 22/07/2026).
--
-- Idempotent. Prérequis : P6 (contributor_type) · P7 (enforce_media_asset_quota).
-- =====================================================================

BEGIN;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS contributor_name text;

COMMENT ON COLUMN public.media_assets.contributor_name IS
  'Nom affiché du contributeur invité (Sanctuaire). NULL si family/staff.';

-- Remplace la fonction P7 : même plafonds, COUNT hors guest.
CREATE OR REPLACE FUNCTION public.enforce_media_asset_quota()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_package     text;
  v_max_media_items  integer;
  v_current_count    integer;
BEGIN
  -- Les dépôts Sanctuaire (invités) n'entrent pas dans le Soft Cap famille.
  IF NEW.contributor_type IS NOT DISTINCT FROM 'guest' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::text));

  SELECT p.wizard_state ->> 'basePackage'
    INTO v_base_package
    FROM public.projects p
    WHERE p.id = NEW.project_id;

  v_max_media_items := CASE v_base_package
    WHEN 'essential' THEN 50
    WHEN 'signature' THEN 125
    WHEN 'heritage'  THEN 175
    WHEN 'legendary' THEN 250
    ELSE 125
  END;

  SELECT count(*)
    INTO v_current_count
    FROM public.media_assets
    WHERE project_id = NEW.project_id
      AND coalesce(contributor_type, 'family') <> 'guest';

  IF v_current_count >= v_max_media_items THEN
    RAISE EXCEPTION
      'media_quota_exceeded: project % already has % media (limit % for package %)',
      NEW.project_id, v_current_count, v_max_media_items, coalesce(v_base_package, 'signature')
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_media_asset_quota() IS
  'Garde-fou quota médias famille. Exclut contributor_type=guest (Sanctuaire / Boucle Virale).';

COMMIT;
