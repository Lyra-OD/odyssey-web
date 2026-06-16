-- =====================================================================
-- Odyssey P5.3 — Lecture tenant pour membres partenaire (RLS)
-- =====================================================================
-- SQL Editor : P5.3 — Tenant SELECT partner roles — 2026-06-16
--
-- Permet à GET /api/partner/tenants de joindre public.tenants (slug, settings)
-- pour les utilisateurs partner / partner_admin.
-- =====================================================================

BEGIN;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_select_partner_member ON public.tenants;
CREATE POLICY tenants_select_partner_member
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('partner', 'partner_admin')
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
