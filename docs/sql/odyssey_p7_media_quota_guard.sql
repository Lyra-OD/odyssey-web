-- =====================================================================
-- Odyssey P7 — Garde-fou serveur : quota de médias package-aware
-- =====================================================================
-- Contexte (Storyboard refactor — ticket S3) :
--   L'upload de médias (src/lib/uploads/mediaUploadService.ts) écrit
--   DIRECTEMENT depuis le navigateur vers Supabase Storage puis fait un
--   upsert direct dans `media_assets`, protégé uniquement par RLS —
--   il n'existe AUCUNE route Next.js `POST /api/projects/[id]/media`
--   qui pourrait servir de garde-fou applicatif. L'UI (TributeWizard.tsx
--   + MediaDropzoneAdapter.tsx) bloque déjà l'utilisateur avant l'envoi
--   via `packageMaxMediaItems(basePackage)`, mais un client malveillant
--   qui appellerait l'API Supabase REST directement avec son propre
--   token pourrait contourner ce garde-fou UI.
--
--   Ce script ajoute donc le dernier rempart, au niveau base de données :
--   un trigger BEFORE INSERT sur `media_assets` qui compte les médias
--   déjà présents pour le projet et rejette l'insert si la limite du
--   forfait (`basePackage`, lu dans `projects.wizard_state`) est atteinte.
--
-- Pourquoi BEFORE INSERT (pas UPDATE) :
--   Les ré-uploads sur un `storage_path` déjà existant passent par
--   `ON CONFLICT (project_id, storage_path)` → chemin UPDATE, donc ils
--   ne sont jamais comptés une seconde fois dans le quota (comportement
--   voulu : remplacer un média existant ne doit pas consommer un slot
--   supplémentaire).
--
-- IMPORTANT — Duplication volontaire des plafonds :
--   Les valeurs ci-dessous DOIVENT rester synchronisées manuellement avec
--   `PACKAGE_MANIFEST.*.limits.maxMediaItems` dans
--   `src/lib/wizard/wizardDeliverables.ts`. Il n'existe pas (encore) de
--   pont automatique TS -> SQL ; ce script porte le même risque de dérive
--   que celui déjà documenté et accepté pour les prix
--   (`assertManifestPricingAlignedWithLegacyConfig()` côté TS).
--
-- Prérequis : odyssey_p3_wizard_autosave.sql (projects.wizard_state),
--             odyssey_p2_media_assets_schema_sync.sql (media_assets.project_id).
--
-- Idempotent : peut être ré-exécuté sans dégât.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Fonction trigger — enforce_media_asset_quota()
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_media_asset_quota()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_package     text;
  v_max_media_items  integer;
  v_current_count    integer;
BEGIN
  -- Sérialise les inserts concurrents pour CE projet uniquement.
  -- L'upload tourne avec maxConcurrency = 4 (mediaUploadService.ts) :
  -- sans ce verrou, plusieurs INSERT en vol pourraient lire le même
  -- COUNT(*) avant que l'un d'eux ne commite, et laisser passer un
  -- dépassement de quelques unités au-delà du plafond.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::text));

  SELECT p.wizard_state ->> 'basePackage'
    INTO v_base_package
    FROM public.projects p
    WHERE p.id = NEW.project_id;

  -- Mapping wizard_state.basePackage -> plafond (cf. WIZARD_BASE_PACKAGE_TO_MANIFEST
  -- + PACKAGE_MANIFEST dans src/lib/wizard/wizardDeliverables.ts).
  --   essential (SOUVENIR)   -> 50
  --   signature (HERITAGE)   -> 125
  --   heritage  (ETERNITE)   -> 175
  --   legendary (LEGENDAIRE) -> 250
  -- ELSE = défaut wizard "signature" (cf. TributeWizard.tsx : useState(() => hydrated.basePackage ?? "signature")).
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
    WHERE project_id = NEW.project_id;

  IF v_current_count >= v_max_media_items THEN
    -- Message stable, détecté côté client par
    -- src/lib/uploads/mediaUploadService.ts (MEDIA_QUOTA_EXCEEDED_ERROR)
    -- pour afficher un message convivial plutôt que ce texte brut.
    RAISE EXCEPTION
      'media_quota_exceeded: project % already has % media (limit % for package %)',
      NEW.project_id, v_current_count, v_max_media_items, coalesce(v_base_package, 'signature')
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_media_asset_quota() IS
  'Garde-fou serveur (dernier rempart) : rejette un INSERT media_assets si '
  'le projet a déjà atteint packageMaxMediaItems(basePackage). Plafonds '
  'dupliqués depuis src/lib/wizard/wizardDeliverables.ts — garder synchronisé.';

-- ---------------------------------------------------------------------
-- 2) Trigger — BEFORE INSERT ON media_assets
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_media_assets_quota_guard ON public.media_assets;

CREATE TRIGGER trg_media_assets_quota_guard
  BEFORE INSERT ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_media_asset_quota();

COMMIT;

-- =====================================================================
-- Vérification post-migration
-- =====================================================================
-- 1) Le trigger existe bien sur media_assets :
--
-- SELECT tgname, tgenabled
-- FROM pg_trigger
-- WHERE tgrelid = 'public.media_assets'::regclass
--   AND tgname = 'trg_media_assets_quota_guard';
--
-- 2) Test manuel (remplacer <project_id> par un vrai projet SOUVENIR à 50/50) :
--
-- INSERT INTO public.media_assets (project_id, storage_path, source, upload_status, order_index)
-- VALUES ('<project_id>', 'projects/<project_id>/test-quota-guard.jpg', 'local', 'uploaded', 999);
-- -- Doit lever : ERROR: media_quota_exceeded: project <project_id> already has 50 media (limit 50 for package essential)
-- =====================================================================
