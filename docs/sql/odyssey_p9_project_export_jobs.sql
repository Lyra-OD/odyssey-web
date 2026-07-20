-- Odyssey P9 — Phase 5 export jobs (Creatomate gate stub)
-- Canon : docs/FREEMIUM_V1_PIVOT.md · Never trust client for master / 4K
-- Idempotent. Appliquer après P8.

CREATE TABLE IF NOT EXISTS public.project_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'blocked', 'processing', 'completed', 'failed')),
  provider text NOT NULL DEFAULT 'creatomate_stub',
  allow_4k boolean NOT NULL DEFAULT false,
  allow_stingray_master boolean NOT NULL DEFAULT false,
  denial_code text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_export_jobs_project_created_idx
  ON public.project_export_jobs (project_id, created_at DESC);

COMMENT ON TABLE public.project_export_jobs IS
  'Phase 5 — file d''attente export. Stub Creatomate ; gate via project_paid_entitlements.';

ALTER TABLE public.project_export_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_export_jobs_select_owner ON public.project_export_jobs;
CREATE POLICY project_export_jobs_select_owner
  ON public.project_export_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

GRANT SELECT ON public.project_export_jobs TO authenticated;
GRANT ALL ON public.project_export_jobs TO service_role;
