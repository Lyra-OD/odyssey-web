-- =====================================================================
-- Odyssey P3 — Wizard Autosave (Tribute Wizard)
-- =====================================================================
-- Contexte :
--   Le Tribute Wizard est multi-étapes (4 actuellement). Sans autosave,
--   tout reload de la page perd l'état UI (firstName, mood, trackOrder…).
--
--   Pour permettre la reprise du parcours, on ajoute sur `projects` :
--     - wizard_state  (jsonb) : snapshot UI sérialisable, ex.
--         {
--           "version": 1,
--           "essentials": { "firstName": "...", "lastName": "...", "avatarPath": "..." },
--           "socialSources": { "selected": "instagram", "url": "..." },
--           "musicalAmbiance": { "mood": "tender", "trackOrder": ["b","a","c"] }
--         }
--     - wizard_step   (smallint) : étape actuelle (1..N), pour rouvrir
--         le wizard exactement où l'utilisateur l'a laissé.
--     - last_saved_at (timestamptz) : dernier commit serveur ; sert à
--         (a) afficher "Enregistré il y a Xs" côté UI,
--         (b) arbitrer entre une copie locale (localStorage) éventuelle
--             plus récente et le serveur.
--
-- Pourquoi JSONB plutôt que des colonnes typées :
--   - Le wizard évolue vite (upsells, nouvelles étapes). JSONB évite
--     une migration à chaque itération.
--   - Les vraies données métier (first_name, last_name, etc.) restent
--     dans des colonnes typées dédiées une fois le projet soumis.
--   - wizard_state est de la donnée d'UI, pas de la donnée métier.
--
-- Sécurité :
--   - Aucune nouvelle policy n'est nécessaire : `wizard_state`,
--     `wizard_step` et `last_saved_at` sont écrits via la route serveur
--     PATCH `/api/projects/[id]/autosave` qui vérifie déjà l'ownership
--     (`projects.user_id = auth.uid()`).
--   - Le RLS existant sur `projects` (P0) couvre ces colonnes par
--     défaut (policy ligne-niveau, pas colonne-niveau).
--
-- Idempotent : peut être ré-exécuté sans dégât.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Colonnes Autosave
-- ---------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS wizard_state  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS wizard_step   smallint    NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_saved_at timestamptz NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------
-- 2) Garde-fou : wizard_step doit rester dans une plage raisonnable
--    On laisse de la marge (jusqu'à 10) pour anticiper de futures
--    étapes upsell sans refaire de migration.
--    Idempotent via pg_constraint (pas de DROP/ADD dans le même script).
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname  = 'projects_wizard_step_check'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_wizard_step_check
      CHECK (wizard_step BETWEEN 1 AND 10);
  END IF;
END
$$;

-- ---------------------------------------------------------------------
-- 3) Index composite pour la reprise rapide du brouillon
--    Requête cible (dans le dashboard) :
--      SELECT id, wizard_state, wizard_step, last_saved_at
--      FROM public.projects
--      WHERE user_id = auth.uid()
--        AND status  = 'draft'
--      ORDER BY last_saved_at DESC
--      LIMIT 1;
--
--    L'index couvre tri-clé (user_id, status, last_saved_at DESC) sans
--    clause WHERE partielle pour rester insensible au type effectif de
--    `status` (ENUM ou TEXT) et éviter toute dépendance à une valeur
--    précise de l'ENUM lors de la création de l'index.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_projects_user_status_saved
  ON public.projects (user_id, status, last_saved_at DESC);

COMMIT;

-- ---------------------------------------------------------------------
-- 4) PostgREST schema cache reload (sinon la route PATCH renverra une
--    erreur "Could not find the 'wizard_state' column in the schema cache").
-- ---------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 5) Vérification : les 3 colonnes sont bien présentes, NOT NULL avec
--    leur default. À copier dans le SQL Editor après exécution.
-- ---------------------------------------------------------------------
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'projects'
  AND column_name IN ('wizard_state', 'wizard_step', 'last_saved_at')
ORDER BY ordinal_position;

-- Bonus : vérifier la contrainte CHECK
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.projects'::regclass
  AND conname  = 'projects_wizard_step_check';

-- Bonus : vérifier l'index
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename  = 'projects'
  AND indexname  = 'idx_projects_user_status_saved';
