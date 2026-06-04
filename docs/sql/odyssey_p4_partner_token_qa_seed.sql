-- =====================================================================
-- Odyssey P4 — Seed QA : partenaire fictif + 100 jetons
-- =====================================================================
-- À exécuter APRÈS odyssey_p4_partner_token_wallets.sql
-- Contexte : SQL Editor Supabase (rôle postgres / service_role) — pas via le client anon.
--
-- 1) Remplacez la variable email ci-dessous par un compte auth de test.
-- 2) Exécutez le script en entier.
-- 3) Vérifiez les SELECT en fin de fichier.
-- 4) Créez un projet wizard avec tenant_id = tenant QA (voir note checkout).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- CONFIG — modifier uniquement cette ligne
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_user_email   text := 'votre-email-qa@example.com';  -- ← email Supabase Auth
  v_user_id      uuid;
  v_tenant_id    uuid;
  v_slug         text := 'partner-qa-demo';
  v_start_balance integer := 100;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur introuvable pour email=%', v_user_email;
  END IF;

  -- Tenant partenaire dédié QA (évite de polluer slug=humans)
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = v_slug LIMIT 1;

  IF v_tenant_id IS NULL THEN
    INSERT INTO public.tenants (id, name, slug, vertical, settings)
    VALUES (
      gen_random_uuid(),
      'QA Partenaire Funéraire (demo)',
      v_slug,
      'human',
      '{"qa": true, "brand_label": "Odyssey QA Partner"}'::jsonb
    )
    RETURNING id INTO v_tenant_id;
  ELSE
    UPDATE public.tenants
    SET name = 'QA Partenaire Funéraire (demo)',
        settings = '{"qa": true, "brand_label": "Odyssey QA Partner"}'::jsonb
    WHERE id = v_tenant_id;
  END IF;

  -- Rôle partenaire (aligné resolveUserIsPartner / checkout B2B)
  INSERT INTO public.tenant_members (user_id, tenant_id, role)
  VALUES (v_user_id, v_tenant_id, 'partner_admin')
  ON CONFLICT (user_id, tenant_id) DO UPDATE
    SET role = EXCLUDED.role;

  -- Portefeuille : solde initial 100 jetons
  INSERT INTO public.partner_token_wallets (tenant_id, balance, updated_at)
  VALUES (v_tenant_id, v_start_balance, now())
  ON CONFLICT (tenant_id) DO UPDATE
    SET balance = v_start_balance,
        updated_at = now();

  -- Écriture ledger (crédit manuel QA)
  INSERT INTO public.partner_token_ledger (
    tenant_id,
    project_id,
    user_id,
    delta,
    balance_after,
    reason,
    package_id
  )
  VALUES (
    v_tenant_id,
    NULL,
    v_user_id,
    v_start_balance,
    v_start_balance,
    'qa_manual_credit',
    NULL
  );

  RAISE NOTICE 'QA partner ready: user_id=% tenant_id=% slug=% balance=%',
    v_user_id, v_tenant_id, v_slug, v_start_balance;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- Vérifications (à lire après exécution)
-- ---------------------------------------------------------------------
-- SELECT t.slug, t.name, tm.role, u.email
-- FROM public.tenants t
-- JOIN public.tenant_members tm ON tm.tenant_id = t.id
-- JOIN auth.users u ON u.id = tm.user_id
-- WHERE t.slug = 'partner-qa-demo';

-- SELECT tenant_id, balance, updated_at
-- FROM public.partner_token_wallets w
-- JOIN public.tenants t ON t.id = w.tenant_id
-- WHERE t.slug = 'partner-qa-demo';

-- SELECT id, delta, balance_after, reason, created_at
-- FROM public.partner_token_ledger l
-- JOIN public.tenants t ON t.id = l.tenant_id
-- WHERE t.slug = 'partner-qa-demo'
-- ORDER BY created_at DESC
-- LIMIT 5;

-- CHECKOUT B2B : le projet doit avoir projects.tenant_id = tenant QA.
-- Si le draft est créé sous tenant "humans", débitera le mauvais wallet (ou wallet_not_found).
