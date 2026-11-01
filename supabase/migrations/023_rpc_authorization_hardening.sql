-- =====================================================================
-- 023: RPC Authorization Hardening
--
-- Closes the remaining privilege-escalation gaps found by
-- `node scripts/audit-rpc-auth.js`.
--
-- ROOT CAUSE
-- PostgreSQL grants EXECUTE on a newly created function to PUBLIC by
-- default. Every SECURITY DEFINER function in migrations 008-022 is
-- therefore callable by `anon` and `authenticated` unless it was
-- explicitly revoked — regardless of which roles a later GRANT names.
-- Migration 001 additionally issued a blanket
-- `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated`.
--
-- This migration:
--   1. Enforces caller identity inside the two bonus RPCs that the client
--      calls with a caller-supplied user id.
--   2. Revokes PUBLIC/anon/authenticated EXECUTE on the server-only RPCs
--      (payment settlement, refunds, cron sweeps, stats recompute) and
--      grants them to service_role alone.
--   3. Stops future functions in `public` from being world-executable.
--
-- Internal callers are unaffected: inside a SECURITY DEFINER function the
-- effective user is the function owner, which retains EXECUTE.
-- =====================================================================

-- =====================================================================
-- 1. apply_signup_bonus — enforce that the caller owns the wallet
--
-- Previously: any authenticated user could credit the ₹100 welcome bonus
-- to an arbitrary user id that had not yet received one.
-- The client (services/auth-service.ts) calls this with its own id after
-- verifyOtp, so the `authenticated` grant is retained and the identity is
-- checked in-body instead. service_role is allowed through for
-- server-side backfills.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.apply_signup_bonus(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bonus      NUMERIC := 100;
  v_existing   BOOLEAN;
BEGIN
  -- SECURITY FIX (023): callers may only credit their own account.
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: signup bonus can only be applied to your own account';
  END IF;

  -- Idempotency: only apply once per user.
  SELECT EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE user_id = p_user_id
      AND reference_type = 'signup_bonus'
  ) INTO v_existing;

  IF v_existing THEN
    RETURN (SELECT wallet_balance FROM users WHERE id = p_user_id);
  END IF;

  PERFORM public.credit_wallet(
    p_user_id     => p_user_id,
    p_amount      => v_bonus,
    p_source      => 'signup_bonus',
    p_description => 'Welcome bonus for new account',
    p_reference_id => NULL
  );

  PERFORM public.log_audit(
    'SIGNUP_BONUS_CREDITED',
    'wallet',
    true,
    jsonb_build_object('user_id', p_user_id, 'amount', v_bonus)
  );

  RETURN v_bonus;
END;
$$;

-- =====================================================================
-- 2. apply_referral_bonus — enforce that the caller owns the wallet
--
-- Previously exploitable for direct financial gain: an attacker could
-- call this with a victim's user id and the attacker's own referral code,
-- burning the victim's one-time referral slot and crediting ₹100 to the
-- attacker (the referrer) for every victim id they knew.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.apply_referral_bonus(
  p_user_id      UUID,
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
  v_existing      BOOLEAN;
  v_user_balance  NUMERIC;
BEGIN
  -- SECURITY FIX (023): callers may only redeem a code for themselves.
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RETURN QUERY SELECT
      false,
      'Unauthorized: you can only apply a referral code to your own account'::TEXT,
      NULL::NUMERIC;
    RETURN;
  END IF;

  -- Idempotency: the user can only apply one referral code, ever.
  SELECT referred_by IS NOT NULL
  INTO v_existing
  FROM users
  WHERE id = p_user_id;

  IF v_existing THEN
    SELECT wallet_balance INTO v_user_balance FROM users WHERE id = p_user_id;
    RETURN QUERY SELECT false, 'Referral code already applied'::TEXT, v_user_balance;
    RETURN;
  END IF;

  -- Resolve referral code -> referrer user id.
  SELECT id INTO v_referrer_id
  FROM users
  WHERE referral_code = p_referral_code
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid referral code'::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_referrer_id = p_user_id THEN
    RETURN QUERY SELECT false, 'Cannot refer yourself'::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  UPDATE users
  SET referred_by = p_referral_code
  WHERE id = p_user_id;

  PERFORM public.credit_wallet(
    p_user_id     => p_user_id,
    p_amount      => v_bonus,
    p_source      => 'referral',
    p_description => 'Referral bonus: ' || p_referral_code,
    p_reference_id => v_referrer_id::TEXT
  );

  PERFORM public.credit_wallet(
    p_user_id     => v_referrer_id,
    p_amount      => v_bonus,
    p_source      => 'referral',
    p_description => 'Referral reward for: ' || p_referral_code,
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

-- Re-assert the intended audience for the two client-callable bonus RPCs.
REVOKE ALL ON FUNCTION public.apply_signup_bonus(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_referral_bonus(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_signup_bonus(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_referral_bonus(UUID, TEXT) TO authenticated, service_role;

-- =====================================================================
-- 3. Lock the server-only RPCs to service_role
--
-- These are invoked exclusively by Edge Functions (Razorpay webhook,
-- verify-payment) or by pg_cron. None are called from the client — see
-- the audit in scripts/audit-rpc-auth.js.
--
-- mark_payment_completed_v2 was the most severe: any authenticated user
-- could pass a pending payment id and have it settled, which credits the
-- wallet for the full amount with no gateway payment.
--
-- Iterating pg_proc covers every overload without hardcoding signatures
-- (migrations 008 and 009 define different argument lists for some of
-- these names).
-- =====================================================================

DO $$
DECLARE
  v_fn      TEXT;
  v_proc    RECORD;
  v_names   TEXT[] := ARRAY[
    'mark_payment_completed_v2',
    'process_payment_refund',
    'cancel_subscription_secure',
    'expire_subscriptions',
    'expire_astrologer_subscriptions',
    'sweep_deleted_accounts',
    'verify_user_flag_protection',
    'refresh_astrologer_stats',
    'activate_subscription',
    'credit_wallet',
    'debit_wallet'
  ];
BEGIN
  FOREACH v_fn IN ARRAY v_names LOOP
    FOR v_proc IN
      SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = v_fn
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_proc.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_proc.sig);
      RAISE NOTICE 'Locked % to service_role', v_proc.sig;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================================
-- 4. Stop future functions from being world-executable by default
--
-- Applies to functions created later by the current role. Existing
-- functions are unaffected, which is why section 3 revokes explicitly.
-- Every new SECURITY DEFINER function must now name its audience.
-- =====================================================================

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- =====================================================================
-- 5. Verification helper
--
-- Returns any SECURITY DEFINER function in `public` that anon or
-- authenticated can still execute, for post-deploy review.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.audit_definer_function_grants()
RETURNS TABLE(function_signature TEXT, grantee TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.oid::regprocedure::TEXT, r.rolname::TEXT
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  CROSS JOIN (SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')) r
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND has_function_privilege(r.rolname, p.oid, 'EXECUTE')
  ORDER BY 1, 2;
$$;

REVOKE ALL ON FUNCTION public.audit_definer_function_grants() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_definer_function_grants() TO service_role;

COMMENT ON FUNCTION public.audit_definer_function_grants() IS
  'Lists SECURITY DEFINER functions still executable by anon/authenticated. Run after migrations to catch new privilege gaps.';
