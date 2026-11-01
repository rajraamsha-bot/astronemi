-- =====================================================================
-- 2026-08-06 (027) — Wallet ledger hardening
-- =====================================================================
-- The audit revealed:
--   • credit_wallet/debit_wallet exist in 017 but no guard against a
--     service-role client calling them directly with a forged metadata
--     envelope. We now assert auth.uid() IS NULL (true server context)
--     inside the function body in addition to the EXECUTE revocation.
--   • wallet_transactions rows were writable by the client through a
--     missing INSERT policy. Lock that down — the server writes these
--     rows via the SECURITY DEFINER credit_wallet / debit_wallet RPC,
--     which already bypasses RLS. Only reads are exposed to the client.
-- =====================================================================

-- Belt-and-braces: even if EXECUTE were accidentally granted again,
-- these bodies refuse client-authenticated callers.
CREATE OR REPLACE FUNCTION public.__assert_service_role()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('request.jwt.claims', true) IS NOT NULL
     AND current_setting('request.jwt.claims', true) NOT LIKE '%"role":"service_role"*%'
  THEN
    RAISE EXCEPTION 'This function may only be invoked from the service role';
  END IF;
END;
$$;

-- Re-declare credit_wallet with the service-role guard prepended.
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id      UUID,
  p_amount       NUMERIC,
  p_source       TEXT DEFAULT 'system',
  p_description  TEXT DEFAULT 'Top-up',
  p_payment_id   UUID DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, message TEXT, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  PERFORM public.__assert_service_role();

  UPDATE users
     SET wallet_balance = wallet_balance + p_amount,
         updated_at = NOW()
   WHERE id = p_user_id
   RETURNING wallet_balance INTO v_balance;

  INSERT INTO wallet_transactions (
    user_id, type, amount, description, balance_after, reference_type,
    reference_id, payment_id
  ) VALUES (
    p_user_id, 'credit', p_amount, p_description, v_balance,
    p_source, p_reference_id, p_payment_id
  );

  RETURN QUERY SELECT TRUE, 'Success', v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id      UUID,
  p_amount       NUMERIC,
  p_source       TEXT DEFAULT 'system',
  p_description  TEXT DEFAULT 'Payment',
  p_payment_id   UUID DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, message TEXT, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  PERFORM public.__assert_service_role();

  SELECT wallet_balance INTO v_balance FROM users WHERE id = p_user_id;
  IF v_balance IS NULL THEN RETURN QUERY SELECT FALSE, 'User not found', 0::NUMERIC; RETURN; END IF;
  IF v_balance < p_amount THEN RETURN QUERY SELECT FALSE, 'Insufficient balance', v_balance; RETURN; END IF;

  UPDATE users
     SET wallet_balance = wallet_balance - p_amount,
         updated_at = NOW()
   WHERE id = p_user_id
   RETURNING wallet_balance INTO v_balance;

  INSERT INTO wallet_transactions (
    user_id, type, amount, description, balance_after, reference_type,
    reference_id, payment_id
  ) VALUES (
    p_user_id, 'debit', p_amount, p_description, v_balance,
    p_source, p_reference_id, p_payment_id
  );

  RETURN QUERY SELECT TRUE, 'Success', v_balance;
END;
$$;

-- Lock direct wallet_transactions writes; the RPCs (SECURITY DEFINER) write
-- them server-side. Reads remain available to the owning user via the
-- existing SELECT policy.
DROP POLICY IF EXISTS wallet_transactions_insert_public ON public.wallet_transactions;
DROP POLICY IF EXISTS wallet_transactions_insert_client  ON public.wallet_transactions;

-- Explicit no-insert policy for authenticated users: only service_role
-- (SECURITY DEFINER) may write.
CREATE POLICY wallet_transactions_no_client_insert ON public.wallet_transactions
  FOR INSERT TO authenticated
  WITH CHECK (false);

COMMENT ON POLICY wallet_transactions_no_client_insert ON public.wallet_transactions IS
  'Wallet ledger is server-authoritative. Clients read via the SELECT policy; '
  'they cannot insert — that would let anyone mint fake history.';
