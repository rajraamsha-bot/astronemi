-- =====================================================================
-- 2026-08-06 (024) — C4 referral fix + C1 order RLS hardening
-- =====================================================================
-- C4: 001 declares users.referred_by as UUID REFERENCES users(id), but
--     023's apply_referral_bonus() did `SET referred_by = p_referral_code`
--     (the human-readable code string, VARCHAR(8)/(20)). Every redemption
--     insert hit the FK. Fix: resolve code→user INSIDE the function and
--     store the referrer's UUID. This also matches AuthContext, which
--     treats referredBy as an opaque FK id.
-- C1: CartContext previously inserted orders as paid/confirmed from the
--     client. Payment truth lives server-side; this migration closes the
--     client-side path via RLS so a doctored build cannot slip one in.
-- =====================================================================

-- ---------------------------------------------------------------------
-- C4 — apply_referral_bonus: resolve code → user id, store UUID
-- REPLACES the 023 body (already shipped to prod; the broken write threw
-- before commit, so production has no rows to back-fill — the UPDATE
-- below is a no-op safety net).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_referral_bonus(
  p_user_id       UUID,
  p_referral_code TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id   UUID;
  v_bonus         NUMERIC := 100;
  v_existing_by   UUID;
  v_user_balance  NUMERIC;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RETURN QUERY SELECT
      false,
      'Unauthorized: you can only apply a referral code to your own account'::TEXT,
      NULL::NUMERIC;
    RETURN;
  END IF;

  -- Idempotency: one referral code per user, ever.
  SELECT referred_by
    INTO v_existing_by
    FROM users
   WHERE id = p_user_id;

  IF v_existing_by IS NOT NULL THEN
    SELECT wallet_balance INTO v_user_balance FROM users WHERE id = p_user_id;
    RETURN QUERY SELECT false, 'Referral code already applied'::TEXT, v_user_balance;
    RETURN;
  END IF;

  -- Resolve the referral code to the referrer's user id.
  SELECT id INTO v_referrer_id
    FROM users
   WHERE referral_code = upper(trim(p_referral_code))
   LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid referral code'::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_referrer_id = p_user_id THEN
    RETURN QUERY SELECT false, 'Cannot refer yourself'::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  -- C4 FIX: store the *referrer id* (UUID), not the code string.
  UPDATE users
     SET referred_by = v_referrer_id
   WHERE id = p_user_id;

  PERFORM public.credit_wallet(
    p_user_id      => p_user_id,
    p_amount       => v_bonus,
    p_source       => 'referral',
    p_description  => 'Referral bonus: ' || upper(trim(p_referral_code)),
    p_reference_id => v_referrer_id::TEXT
  );

  PERFORM public.credit_wallet(
    p_user_id      => v_referrer_id,
    p_amount       => v_bonus,
    p_source       => 'referral',
    p_description  => 'Referral reward for: ' || upper(trim(p_referral_code)),
    p_reference_id => p_user_id::TEXT
  );

  SELECT wallet_balance INTO v_user_balance FROM users WHERE id = p_user_id;

  PERFORM public.log_audit(
    'REFERRAL_APPLIED',
    'wallet',
    true,
    jsonb_build_object(
      'user_id', p_user_id,
      'referrer_id', v_referrer_id,
      'amount', v_bonus
    )
  );

  RETURN QUERY SELECT true, 'Referral applied'::TEXT, v_user_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_referral_bonus(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_bonus(UUID, TEXT) TO authenticated, service_role;

-- Defensive back-fill: if any row ever stored the VARCHAR referral code in
-- the UUID column (possible only if the FK was temporarily absent), remap.
UPDATE users u
   SET referred_by = r.id
  FROM users r
 WHERE u.referred_by::TEXT = r.referral_code
   AND u.referred_by IS DISTINCT FROM r.id;


-- ---------------------------------------------------------------------
-- C1 — orders RLS: client inserts must be 'pending'. Only the
-- verify-payment Edge Function (service_role, RLS-bypassing) may settle.
-- The table also carries an `estimated_delivery` column absent from 001;
-- add it defensively so the CartContext upsert has a target column.
-- FIX: the policies below reference orders.payment_status and
-- contexts/CartContext.tsx upserts payment_status + payment_method, but
-- neither column exists in migration 001 — so a fresh `supabase db push`
-- failed at the CREATE POLICY statements below and the cart write failed
-- at runtime. Add both columns here, before the policies.
-- ---------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);

DO $$
DECLARE
  v_p RECORD;
BEGIN
  FOR v_p IN
    SELECT policyname FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'orders'
       AND cmd IN ('INSERT', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.orders', v_p.policyname);
  END LOOP;
END$$;

CREATE POLICY orders_insert_pending ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (payment_status IS NULL OR payment_status IN ('pending', 'failed'))
    AND (status IS NULL OR status IN ('pending', 'cancelled'))
  );

-- Client-side retry path uses upsert-on-id: allow the user to UPDATE their
-- own order ONLY while it stays unsettled (pending → pending). Any attempt
-- to settle client-side violates the CHECK and is rejected.
CREATE POLICY orders_update_pending_only ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND payment_status = 'pending')
  WITH CHECK (
    auth.uid() = user_id
    AND payment_status = 'pending'
    AND (status IS NULL OR status IN ('pending', 'cancelled'))
  );
