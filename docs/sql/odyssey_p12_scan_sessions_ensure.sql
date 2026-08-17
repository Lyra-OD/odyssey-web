-- =====================================================================
-- Odyssey P12 — Scanner Compagnon Phase A : garantir `scan_sessions`
-- =====================================================================
-- Contexte :
--   La table est définie dans P6 Partie B (stub). Ce script est un
--   filet idempotent si P6 n'a pas été rejoué en entier, pour le MVP
--   QR + upload galerie (docs/SCANNER_COMPANION.md Phase A).
--
-- Ne crée PAS `media_assets.scan_session_id` (Phase B).
-- `source = scanner_companion` utilise la colonne `source` existante (P2).
--
-- Idempotent. Prérequis : `projects`, `tenants`, `project_access_tokens` (P6).
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.scan_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES public.tenants (id) ON DELETE SET NULL,
  token_hash          text NOT NULL,
  status              text NOT NULL DEFAULT 'active',
  expires_at          timestamptz NOT NULL,
  project_access_token_id uuid REFERENCES public.project_access_tokens (id) ON DELETE SET NULL,
  created_by_user_id  uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  last_upload_at      timestamptz,
  upload_count        integer NOT NULL DEFAULT 0 CHECK (upload_count >= 0),
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scan_sessions_status_check
    CHECK (status IN ('active', 'expired', 'revoked', 'completed')),
  CONSTRAINT scan_sessions_token_hash_unique UNIQUE (token_hash)
);

COMMENT ON TABLE public.scan_sessions IS
  'Sessions Scanner web — QR wizard desktop. Phase A : table + API /api/scan/.';

CREATE INDEX IF NOT EXISTS idx_scan_sessions_project
  ON public.scan_sessions (project_id, created_at DESC);

ALTER TABLE public.scan_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.scan_sessions FROM anon, authenticated;
GRANT ALL ON TABLE public.scan_sessions TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
