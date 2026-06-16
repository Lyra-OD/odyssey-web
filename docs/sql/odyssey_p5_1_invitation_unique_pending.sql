-- =====================================================================
-- Odyssey P5.1 — Index unique invitation pending par tenant + email
-- =====================================================================
-- Prérequis : odyssey_p5_b2b2c_core.sql
--
-- Empêche deux invitations `pending` pour le même couple
-- (tenant_id, invited_email). Aligné avec POST /api/partner/invitations.
-- =====================================================================

BEGIN;

-- 1. Dédoublonnage pending (garde la plus récente ; tie-break sur id)
DELETE FROM public.partner_invitations
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY tenant_id, lower(trim(invited_email))
        ORDER BY created_at DESC, id DESC
      ) AS rn
    FROM public.partner_invitations
    WHERE status = 'pending'
  ) ranked
  WHERE rn > 1
);

-- 2. Index partiel unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_invitations_unique_pending_per_tenant_email
  ON public.partner_invitations (tenant_id, lower(trim(invited_email)))
  WHERE status = 'pending';

COMMIT;

NOTIFY pgrst, 'reload schema';
