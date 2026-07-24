-- =============================================================================
-- P11 — Wizard Co-Créateur (délégation montage) — project_access_tokens
--
-- Canon produit : docs/WIZARD_EDITOR_COLLAB.md
-- Contrat TS     : src/lib/wizard/collabCapabilities.ts
--
-- Ajoute purpose `wizard_editor` + garde « 1 lien actif / projet ».
-- TTL (14 j), redeem→revoke, cookie httpOnly = logique applicative (Phase B).
--
-- Idempotent. Prérequis : P6 (`project_access_tokens` existe).
-- =============================================================================

-- 1) Étendre le CHECK purpose
ALTER TABLE public.project_access_tokens
  DROP CONSTRAINT IF EXISTS project_access_tokens_purpose_check;

ALTER TABLE public.project_access_tokens
  ADD CONSTRAINT project_access_tokens_purpose_check
  CHECK (
    purpose IN (
      'guest_contribute',
      'scan_session',
      'view_only',
      'wizard_editor'
    )
  );

COMMENT ON COLUMN public.project_access_tokens.purpose IS
  'guest_contribute = Sanctuaire invité · scan_session = Scanner · view_only = stub · wizard_editor = Co-Créateur Wizard (Coffre/Musique/Montage).';

COMMENT ON TABLE public.project_access_tokens IS
  'Tokens opaques (hash SHA-256). guest_contribute TTL ~30 j · wizard_editor TTL app 14 j (expires_at). service_role only.';

-- 2) Au plus UN token wizard_editor non révoqué par projet.
--    (expires_at géré en app : à la mint, révoquer les précédents + poser expires_at = now()+14j.
--     Predicate sans now() — partial indexes PG exigent IMMUTABLE.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_access_tokens_one_active_wizard_editor
  ON public.project_access_tokens (project_id)
  WHERE purpose = 'wizard_editor'
    AND revoked_at IS NULL;

COMMENT ON INDEX public.idx_project_access_tokens_one_active_wizard_editor IS
  'V1 : un seul lien Co-Créateur outstanding par projet. Mint = revoke des lignes actives puis INSERT.';

-- 3) Index de lookup mint / liste owner (optionnel, accélère revoke-by-project)
CREATE INDEX IF NOT EXISTS idx_project_access_tokens_wizard_editor_project
  ON public.project_access_tokens (project_id, created_at DESC)
  WHERE purpose = 'wizard_editor';
