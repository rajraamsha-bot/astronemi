-- Migration 038: Signup-bonus race fix, earnings-day reset, credit_wallet hardening
--
-- Fixes verified during the 2026-08 production-readiness engagement:
--   A. apply_signup_bonus was check-then-insert: two concurrent calls both
--      passed the EXISTS probe and double-credited the ₹100 welcome bonus.
--      debit/refund paths all serialize on a row lock or a unique anchor;
--      this was the last unguarded credit.
--   B. astrologer_stats.today_earnings was incremented by every completion
--      (011/024/032) but NOTHING ever reset it — "today's earnings" grew
--      forever. The 019 dashboard RPC recomputes from source and disagrees
--      with any reader of this column. Register an IST-midnight sweeper.
--   C. credit_wallet accepted any amount including NULL/negative (debit_wallet
--      validates; credit did not). A negative credit is an unledgered debit.
--
-- SAFE TO RE-RUN: CREATE OR REPLACE / IF NOT EXISTS / exception-guarded DDL.

-- =====================================================================
-- A1. Hard anchor: one signup_bonus ledger row per user. Created inside an
--     exception handler so databases that ALREADY contain duplicates (from
--     the pre-fix race) still migrate — ops reconcile those manually instead
--     of a deploy locking everyone out.
-- =====================================================================
DO $$
BEGIN
  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS ux_wallet_tx_signup_bonus
      ON public.wallet_transactions (user_id)
      WHERE reference_type = 'signup_bonus';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE
      'ux_wallet_tx_signup_bonus NOT created: duplicate signup_bonus rows exist. Reconcile duplicates, then re-run this migration.';
  END;
END $$;

-- =====================================================================
-- A2. apply_signup_bonus — take the redeemer's row lock BEFORE the EXISTS
--     probe so concurrent applications serialize (same pattern as
--     apply_referral_code in 031). The unique index above is the second,
--     independent guarantee.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.apply_signup_bonus(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bonus    NUMERIC := 100;
  v_existing BOOLEAN;
  v_balance  NUMERIC;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: signup bonus can only be applied to your own account';
  END IF;

  -- Serialize concurrent bonus calls for the same user: both used to read
  -- "no signup_bonus txn yet" and both credited.
  SELECT wallet_balance INTO v_balance
  FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signup bonus target user not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE user_id = p_user_id
      AND reference_type = 'signup_bonus'
  ) INTO v_existing;

  IF v_existing THEN
    RETURN (SELECT wallet_balance FROM users WHERE id = p_user_id);
  END IF;

  PERFORM set_config('app.bypass_wallet_guard', 'on', true);
  PERFORM public.credit_wallet(
    p_user_id      => p_user_id,
    p_amount       => v_bonus,
    p_source       => 'signup_bonus',
    p_description  => 'Welcome bonus for new account',
    p_reference_id => NULL
  );

  PERFORM public.log_audit(
    'SIGNUP_BONUS_CREDITED', 'wallet', true,
    jsonb_build_object('user_id', p_user_id, 'amount', v_bonus)
  );

  RETURN v_bonus;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_signup_bonus(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_signup_bonus(UUID) TO authenticated, service_role;

-- =====================================================================
-- B. Daily reset of today_earnings at IST midnight (18:30 UTC), mirroring
--    the pg_cron registration pattern of 034.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.reset_today_earnings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reset INTEGER;
BEGIN
  UPDATE public.astrologer_stats
     SET today_earnings = 0,
         updated_at = now()
   WHERE today_earnings <> 0;
  GET DIAGNOSTICS v_reset = ROW_COUNT;

  PERFORM public.log_audit(
    'TODAY_EARNINGS_RESET', 'astrologer_stats', true,
    jsonb_build_object('rows_reset', v_reset)
  );
  RETURN v_reset;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_today_earnings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_today_earnings() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('reset-today-earnings', '30 18 * * *',
      $$SELECT public.reset_today_earnings()$$);
  ELSE
    RAISE NOTICE 'pg_cron unavailable; call reset_today_earnings() from an external scheduler at 18:30 UTC.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'reset-today-earnings scheduling skipped: %', SQLERRM;
END $$;

-- =====================================================================
-- C. credit_wallet — mirror debit_wallet's amount validation. A NULL or
--     negative "credit" would move money backwards without a matching
--     debit-shaped ledger row.
-- =====================================================================
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

  IF p_amount IS NULL OR p_amount <= 0 THEN
    SELECT wallet_balance INTO v_balance FROM users WHERE id = p_user_id;
    RETURN QUERY SELECT FALSE, 'Invalid amount', COALESCE(v_balance, 0::NUMERIC);
    RETURN;
  END IF;

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
