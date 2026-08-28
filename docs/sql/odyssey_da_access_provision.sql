-- =====================================================================
-- Odyssey — Provisioning accès DA (HQ + Salon partner_admin)
-- =====================================================================
-- Pourquoi : un compte review (DA) doit voir HQ Odyssey + Salon commissions.
-- Prérequis : user déjà créé dans Supabase Auth (Dashboard ou signup Studio).
-- Compte : info@jeanpaullabelle.com — exécuter après création Auth.
-- Ne crée pas le mot de passe — reset Auth si besoin après coup.
-- =====================================================================

BEGIN;

DO $$
DECLARE
  v_email  text := 'info@jeanpaullabelle.com';
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur introuvable : %. Crée-le d''abord dans Auth.', v_email;
  END IF;

  INSERT INTO public.hq_allowlist (user_id, note)
  VALUES (v_user_id, 'DA — accès review Vague 1')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.tenant_members (user_id, tenant_id, role)
  SELECT v_user_id, t.id, 'partner_admin'
  FROM public.tenants t
  WHERE t.slug = 'partner-qa-demo'
  ON CONFLICT (user_id, tenant_id) DO UPDATE
    SET role = EXCLUDED.role;

  RAISE NOTICE 'OK — user_id=% email=% hq_allowlist + partner_admin (partner-qa-demo)', v_user_id, v_email;
END $$;

COMMIT;

-- Vérification (lecture seule)
SELECT u.email,
       EXISTS (SELECT 1 FROM public.hq_allowlist h WHERE h.user_id = u.id) AS hq_ok,
       tm.role AS salon_role,
       t.slug AS tenant_slug
FROM auth.users u
LEFT JOIN public.tenant_members tm ON tm.user_id = u.id
LEFT JOIN public.tenants t ON t.id = tm.tenant_id AND t.slug = 'partner-qa-demo'
WHERE lower(u.email) = lower('info@jeanpaullabelle.com');
