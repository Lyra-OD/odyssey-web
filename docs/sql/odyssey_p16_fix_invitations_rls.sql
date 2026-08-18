-- =====================================================================
-- Odyssey P16 — RLS partner_invitations : scope conseiller vs admin salon
-- =====================================================================
-- Pourquoi : P5 autorisait tout partner du tenant à SELECT/UPDATE toutes
--            les invitations → fuite e-mails famille entre conseillers.
-- Prérequis : odyssey_p5_b2b2c_core.sql (table + RLS partner_invitations).
-- Ne modifie PAS INSERT (déjà invited_by_user_id = auth.uid()) ni les
-- policies famille / owner projet. CREATE OR REPLACE interdit sur policy.
-- Ops : jouer sur Supabase SQL Editor — onglet « P16 — Invitations RLS ».
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Helper inline (répété dans USING / WITH CHECK) :
--
--   partner_admin  → toutes les invitations du tenant
--   partner        → invited_by_user_id = auth.uid() uniquement
--
-- Clause membre :
--   EXISTS (
--     SELECT 1 FROM public.tenant_members tm
--     WHERE tm.tenant_id = partner_invitations.tenant_id
--       AND tm.user_id = auth.uid()
--       AND (
--         tm.role = 'partner_admin'
--         OR (
--           tm.role = 'partner'
--           AND partner_invitations.invited_by_user_id = auth.uid()
--         )
--       )
--   )
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS partner_invitations_select_partner ON public.partner_invitations;

CREATE POLICY partner_invitations_select_partner
  ON public.partner_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_invitations.tenant_id
        AND tm.user_id = auth.uid()
        AND (
          tm.role = 'partner_admin'
          OR (
            tm.role = 'partner'
            AND partner_invitations.invited_by_user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS partner_invitations_update_partner ON public.partner_invitations;

CREATE POLICY partner_invitations_update_partner
  ON public.partner_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_invitations.tenant_id
        AND tm.user_id = auth.uid()
        AND (
          tm.role = 'partner_admin'
          OR (
            tm.role = 'partner'
            AND partner_invitations.invited_by_user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = partner_invitations.tenant_id
        AND tm.user_id = auth.uid()
        AND (
          tm.role = 'partner_admin'
          OR (
            tm.role = 'partner'
            AND partner_invitations.invited_by_user_id = auth.uid()
          )
        )
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
