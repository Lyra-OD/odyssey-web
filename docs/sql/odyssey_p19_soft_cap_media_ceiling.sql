-- =====================================================================
-- Odyssey P19 — Soft Cap : le quota médias ne bloque plus à 50 en Souvenir
-- =====================================================================
-- Pourquoi : le front laisse la dropzone ouverte jusqu'au plafond Héritage
--   (125) tant que le forfait accordé est Souvenir (`effectiveMaxMediaItems`,
--   useWizardSoftCap.ts), mais le trigger refusait dès 50 → tuiles en erreur.
--   Canon NARRATIVE_SOFT_CAP : « Upload non bloqué après le seuil ».
--   Le choix Héritage / rester à 50 se fait au checkout (amputation_required).
-- Corrige aussi la régression P10.2 : le plafond suit de nouveau
--   intendedPackage ?? basePackage ?? grantedPackage (logique P8).
-- Conserve : invités Sanctuaire hors quota (P10.2) · advisory lock (P7).
-- Ne change pas : plafonds payés (Héritage 125 · Éternité 175 · Légendaire 250).
-- Idempotent. Prérequis : P7 · P8 · P10.2.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_media_asset_quota()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_state            jsonb;
  v_package          text;
  v_granted          text;
  v_max_media_items  integer;
  v_current_count    integer;
BEGIN
  -- Les dépôts Sanctuaire (invités) n'entrent pas dans le Soft Cap famille.
  IF NEW.contributor_type IS NOT DISTINCT FROM 'guest' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::text));

  SELECT p.wizard_state
    INTO v_state
    FROM public.projects p
    WHERE p.id = NEW.project_id;

  v_package := coalesce(
    v_state ->> 'intendedPackage',
    v_state ->> 'basePackage',
    v_state ->> 'grantedPackage',
    'signature'
  );
  v_granted := coalesce(
    v_state ->> 'grantedPackage',
    v_state ->> 'basePackage',
    v_package
  );

  -- Sync manuel avec PACKAGE_MANIFEST.*.limits.maxMediaItems (wizardDeliverables.ts).
  v_max_media_items := CASE v_package
    WHEN 'essential' THEN 50
    WHEN 'signature' THEN 125
    WHEN 'heritage'  THEN 175
    WHEN 'legendary' THEN 250
    ELSE 125
  END;

  -- Soft Cap freemium : accordé Souvenir → plafond runtime Héritage (125).
  IF v_granted = 'essential' THEN
    v_max_media_items := greatest(v_max_media_items, 125);
  END IF;

  SELECT count(*)
    INTO v_current_count
    FROM public.media_assets
    WHERE project_id = NEW.project_id
      AND coalesce(contributor_type, 'family') <> 'guest';

  IF v_current_count >= v_max_media_items THEN
    RAISE EXCEPTION
      'media_quota_exceeded: project % already has % media (limit % for package %)',
      NEW.project_id, v_current_count, v_max_media_items, v_package
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_media_asset_quota() IS
  'Quota médias famille (P19) : intended ?? base ?? granted ; accordé Souvenir → plafond Héritage (Soft Cap). '
  'Exclut contributor_type=guest. Sync avec wizardDeliverables.ts.';

COMMIT;

-- =====================================================================
-- Vérification post-migration
-- =====================================================================
-- 1) La fonction contient bien la règle P19 :
--
-- SELECT position('greatest(v_max_media_items, 125)' IN prosrc) > 0 AS p19_ok
-- FROM pg_proc WHERE proname = 'enforce_media_asset_quota';
--
-- 2) Projet Souvenir (accordé essential) à 50 médias famille : un upload
--    de plus doit passer ; il doit être refusé à 125.
-- =====================================================================
