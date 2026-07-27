-- Odyssey P9.1 — Creatomate spike columns on project_export_jobs
-- Canon : spike worker réel (DB → Creatomate → webhook → DB)
-- Prérequis : odyssey_p9_project_export_jobs.sql appliqué.
-- Idempotent.

ALTER TABLE public.project_export_jobs
  ADD COLUMN IF NOT EXISTS external_render_id text,
  ADD COLUMN IF NOT EXISTS output_url text;

CREATE UNIQUE INDEX IF NOT EXISTS project_export_jobs_external_render_id_uidx
  ON public.project_export_jobs (external_render_id)
  WHERE external_render_id IS NOT NULL;

COMMENT ON COLUMN public.project_export_jobs.external_render_id IS
  'Creatomate render id (webhook correlation). Null for mock_staging.';

COMMENT ON COLUMN public.project_export_jobs.output_url IS
  'URL MP4 (ou image) renvoyée par Creatomate au webhook succeeded.';
