-- =====================================================================
-- Odyssey P14 — RPC record_partner_commission_payout (HQ Slice C)
-- =====================================================================
-- Pourquoi : versement ops Odyssey = append-only ledger + paid_cents.
--            Montant = payable intégral (accrued − paid) au moment du lock.
-- Prérequis : P6 partner_commission_balances / partner_commission_ledger.
-- Ne modifie PAS accrued_cents ni pending_cents. service_role only.
-- Idempotence concurrence : SELECT … FOR UPDATE sur la ligne solde.
-- GRANT tenants : P5.3 a activé RLS sans GRANT service_role → HQ GET 500
--   « permission denied for table tenants ».
-- =====================================================================

BEGIN;

GRANT SELECT ON TABLE public.tenants TO service_role;
GRANT SELECT ON TABLE public.partner_invitations TO service_role;
GRANT SELECT, INSERT ON TABLE public.partner_commission_ledger TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_commission_balances TO service_role;

CREATE OR REPLACE FUNCTION public.record_partner_commission_payout(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accrued       integer;
  v_paid          integer;
  v_payable       integer;
  v_ledger_id     uuid;
BEGIN
  IF p_tenant_id IS NULL OR p_actor_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_args');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = p_tenant_id
      AND t.is_freemium IS NOT FALSE
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'tenant_not_freemium');
  END IF;

  INSERT INTO public.partner_commission_balances (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  SELECT b.accrued_cents, b.paid_cents
  INTO v_accrued, v_paid
  FROM public.partner_commission_balances b
  WHERE b.tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'balance_not_found');
  END IF;

  v_payable := GREATEST(0, v_accrued - v_paid);

  IF v_payable <= 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'nothing_payable',
      'payable_cents', 0
    );
  END IF;

  INSERT INTO public.partner_commission_ledger (
    tenant_id,
    reason,
    delta_cents,
    commission_cents,
    status,
    actor_user_id,
    notes
  )
  VALUES (
    p_tenant_id,
    'payout',
    -v_payable,
    v_payable,
    'confirmed',
    p_actor_user_id,
    NULLIF(trim(p_notes), '')
  )
  RETURNING id INTO v_ledger_id;

  UPDATE public.partner_commission_balances
  SET paid_cents = paid_cents + v_payable,
      updated_at = now()
  WHERE tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id,
    'amount_cents', v_payable,
    'paid_cents', v_paid + v_payable,
    'accrued_cents', v_accrued
  );
END;
$$;

COMMENT ON FUNCTION public.record_partner_commission_payout(uuid, uuid, text) IS
  'Versement RevShare HQ : payable intégral sous lock. INSERT payout + paid_cents. service_role only.';

REVOKE ALL ON FUNCTION public.record_partner_commission_payout(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_partner_commission_payout(uuid, uuid, text) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
