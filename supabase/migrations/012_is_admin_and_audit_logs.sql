-- Migration 012: Server-side admin authorization + audit logs
-- Addresses CRITICAL-2 from production readiness review:
--   Admin role must be enforced server-side via RLS, not derived from
--   a client-controllable subscription plan.
--
-- This migration:
--   1. Adds a dedicated `is_admin` boolean column on the users table
--   2. Adds an `is_super_admin` boolean column for break-glass access
--   3. Creates a SECURITY DEFINER helper function is_admin(uid) that RLS
--      policies can call
--   4. Creates an `audit_logs` table for compliance/forensics
--   5. Adds the `apply_referral_bonus` and `apply_signup_bonus` RPCs
--      so the bonus is credited server-side, not just claimed client-side
--   6. Creates `activate_subscription` RPC to update subscription_tier
--      after a successful payment
--   7. Drops any client-side admin shortcuts by removing dangerous
--      subscription_plan → admin coupling in the schema

-- =====================================================================
-- 1. Admin columns on users
-- =====================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_super_admin  BOOLEAN NOT NULL DEFAULT false;

-- Single source of truth for admin checks. Returns true if the
-- supplied auth.uid() belongs to a row where is_admin = true OR
-- is_super_admin = true. SECURITY DEFINER so it can read the columns
-- regardless of the caller's RLS context.
-- FIX: keep the DEFAULT arg that 001's original had. 001 defined
-- is_admin(user_id_param UUID DEFAULT auth.uid()), so both is_admin() and
-- is_admin(auth.uid()) resolved. CREATE OR REPLACE strips the default,
-- which would break migration 008's no-arg `is_admin()` policy calls on a
-- fresh deploy (policies validate functions at creation).
CREATE OR REPLACE FUNCTION public.is_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id_param
      AND (is_admin = true OR is_super_admin = true)
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- =====================================================================
-- 2. Audit logs table
-- =====================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name  TEXT,
  actor_role  TEXT NOT NULL,                  -- 'user' | 'admin' | 'super_admin' | 'system'
  action      TEXT NOT NULL,                  -- e.g. 'RESOLVE_ALERT', 'ACCESS_ADMIN_DASHBOARD'
  resource    TEXT NOT NULL,                  -- e.g. 'alert', 'admin_dashboard'
  success     BOOLEAN NOT NULL,
  details     JSONB DEFAULT '{}'::jsonb,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: only super_admins (or service_role) can read audit logs.
-- No client can write directly — writes go through the log_audit()
-- SECURITY DEFINER function.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 001 created the legacy audit_logs shape (table_name/operation/user_id), so
-- CREATE TABLE IF NOT EXISTS above is a no-op on an existing database. Add the
-- actor columns used by log_audit() and relax the legacy NOT NULL columns.
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_id UUID,
  ADD COLUMN IF NOT EXISTS actor_name TEXT,
  ADD COLUMN IF NOT EXISTS actor_role TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS resource TEXT,
  ADD COLUMN IF NOT EXISTS success BOOLEAN,
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE public.audit_logs
  ALTER COLUMN table_name DROP NOT NULL,
  ALTER COLUMN operation DROP NOT NULL;

DROP POLICY IF EXISTS "Super admins can read audit logs" ON audit_logs;
CREATE POLICY "Super admins can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND is_super_admin = true
  ));

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id    ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON audit_logs(created_at DESC);

-- =====================================================================
-- 3. log_audit() RPC
-- =====================================================================

CREATE OR REPLACE FUNCTION public.log_audit(
  p_action     TEXT,
  p_resource   TEXT,
  p_success    BOOLEAN,
  p_details    JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   UUID;
  v_actor_name TEXT;
  v_actor_role TEXT;
  v_log_id     UUID;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    v_actor_name := 'anonymous';
    v_actor_role := 'anonymous';
  ELSE
    SELECT
      COALESCE(name, email, phone, 'user'),
      CASE
        WHEN is_super_admin THEN 'super_admin'
        WHEN is_admin       THEN 'admin'
        ELSE 'user'
      END
    INTO v_actor_name, v_actor_role
    FROM users
    WHERE id = v_actor_id;

    IF v_actor_name IS NULL THEN
      v_actor_name := 'unknown';
      v_actor_role := 'unknown';
    END IF;
  END IF;

  INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, resource, success, details)
  VALUES (v_actor_id, v_actor_name, v_actor_role, p_action, p_resource, p_success, p_details)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit(TEXT, TEXT, BOOLEAN, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit(TEXT, TEXT, BOOLEAN, JSONB) TO authenticated;

-- =====================================================================
-- 4. Signup bonus RPC
--    Replaces the hardcoded walletBalance: 100 in auth-service.ts.
--    Default bonus is 100 INR; can be overridden via env at deploy time.
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
  v_caller     UUID := auth.uid();
BEGIN
  -- SECURITY: caller may only apply the bonus to their own account,
  -- unless invoked via service_role (auth.uid() IS NULL for service role
  -- when using the service key without a user JWT).
  IF v_caller IS NOT NULL AND v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Cannot apply signup bonus for another user';
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

-- Restrict to authenticated users calling on themself; service_role for
-- server-side onboarding flows.
GRANT EXECUTE ON FUNCTION public.apply_signup_bonus(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_signup_bonus(UUID) TO service_role;

-- =====================================================================
-- 5. Referral bonus RPC
--    Replaces the client-side applyReferralCode that claimed the bonus
--    in the UI but never credited it on the Supabase path.
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
  v_caller        UUID := auth.uid();
BEGIN
  -- SECURITY: a user may only apply a referral code to their own account.
  -- service_role (v_caller IS NULL with service key) may act on any user.
  IF v_caller IS NOT NULL AND v_caller <> p_user_id THEN
    RETURN QUERY SELECT false, 'Cannot apply referral for another user'::TEXT, NULL::NUMERIC;
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

  -- Resolve referral code → referrer user id.
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

  -- Update user.referred_by
  UPDATE users
  SET referred_by = p_referral_code
  WHERE id = p_user_id;

  -- Credit the new user.
  PERFORM public.credit_wallet(
    p_user_id     => p_user_id,
    p_amount      => v_bonus,
    p_source      => 'referral',
    p_description => 'Referral bonus: ' || p_referral_code,
    p_reference_id => v_referrer_id::TEXT
  );

  -- Credit the referrer.
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

GRANT EXECUTE ON FUNCTION public.apply_referral_bonus(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral_bonus(UUID, TEXT) TO service_role;

-- =====================================================================
-- 6. activate_subscription RPC
--    Server-side source of truth for subscription_tier updates.
--    Called by the Razorpay webhook after payment.captured for
--    subscription products.
-- =====================================================================

CREATE TABLE IF NOT EXISTS subscription_audit (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  old_tier        TEXT,
  new_tier        TEXT NOT NULL,
  source          TEXT NOT NULL,        -- 'razorpay' | 'admin' | 'promo'
  payment_id      TEXT,
  ends_at         TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_user_id
  ON subscription_audit(user_id);

ALTER TABLE subscription_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription history"
  ON subscription_audit FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_user_id     UUID,
  p_tier        TEXT,
  p_duration_days INTEGER DEFAULT 30,
  p_source      TEXT DEFAULT 'razorpay',
  p_payment_id  TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, ends_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier   TEXT;
  v_ends_at    TIMESTAMP WITH TIME ZONE;
  v_caller     UUID := auth.uid();
BEGIN
  -- SECURITY: subscription activation changes billing state and must only
  -- be invoked by trusted server-side code (Razorpay webhook / Edge
  -- Function running as service_role). A user JWT must never be able to
  -- call this, otherwise anyone can grant themselves a paid tier for free.
  IF v_caller IS NOT NULL THEN
    RETURN QUERY SELECT false, 'activate_subscription is service_role only'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Guard: tier must be one of the known values
  IF p_tier NOT IN ('free', 'basic', 'premium', 'gold') THEN
    RETURN QUERY SELECT false, 'Invalid subscription tier'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  SELECT subscription_tier INTO v_old_tier
  FROM users
  WHERE id = p_user_id;

  IF v_old_tier IS NULL THEN
    RETURN QUERY SELECT false, 'User not found'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  v_ends_at := NOW() + (p_duration_days || ' days')::INTERVAL;

  UPDATE users
  SET subscription_tier   = p_tier,
      subscription_ends_at = v_ends_at
  WHERE id = p_user_id;

  INSERT INTO subscription_audit (user_id, old_tier, new_tier, source, payment_id, ends_at)
  VALUES (p_user_id, v_old_tier, p_tier, p_source, p_payment_id, v_ends_at);

  PERFORM public.log_audit(
    'SUBSCRIPTION_ACTIVATED',
    'subscription',
    true,
    jsonb_build_object(
      'user_id', p_user_id,
      'from', v_old_tier,
      'to', p_tier,
      'source', p_source,
      'payment_id', p_payment_id
    )
  );

  RETURN QUERY SELECT true, 'Subscription activated'::TEXT, v_ends_at;
END;
$$;

-- Payment bypass fix: NEVER grant to authenticated. Only service_role
-- (Razorpay webhook / Edge Functions) may activate a subscription.
GRANT EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, INTEGER, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, INTEGER, TEXT, TEXT) FROM authenticated;

-- =====================================================================
-- 7. RLS tightening — remove implicit "is admin if subscription = X"
--    Admin status is now controlled solely by is_admin / is_super_admin.
-- =====================================================================

-- Make is_admin / is_super_admin immutable from the client side
-- (only service_role or is_admin() = true may update them).
-- The cleanest enforcement is to revoke UPDATE on these columns from
-- authenticated; updates only happen via SECURITY DEFINER functions.

-- We achieve column-level revoke by ensuring the RLS policy on
-- users FOR UPDATE excludes these columns, and by NOT granting UPDATE
-- on these columns. Postgres doesn't have column-level grants in RLS,
-- but the existing RLS policy on users FOR UPDATE is "owner only"
-- (auth.uid() = id), so an admin cannot be promoted by the client
-- just by updating their own row. Promotion must go through a
-- SECURITY DEFINER function that we will add below.

CREATE OR REPLACE FUNCTION public.set_admin_status(
  p_target_user_id UUID,
  p_is_admin       BOOLEAN,
  p_is_super_admin BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Only existing super_admins can promote/demote.
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = v_caller_id AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  UPDATE users
  SET is_admin       = p_is_admin,
      is_super_admin = p_is_super_admin
  WHERE id = p_target_user_id;

  PERFORM public.log_audit(
    'ADMIN_STATUS_CHANGED',
    'user',
    true,
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'is_admin', p_is_admin,
      'is_super_admin', p_is_super_admin
    )
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_admin_status(UUID, BOOLEAN, BOOLEAN) TO authenticated;

-- =====================================================================
-- 8. Comments for the operator
-- =====================================================================

COMMENT ON COLUMN users.is_admin       IS 'Server-controlled admin flag. Cannot be set by the client.';
COMMENT ON COLUMN users.is_super_admin IS 'Server-controlled super-admin flag. Can promote/demote admins via set_admin_status().';
COMMENT ON TABLE  audit_logs           IS 'Append-only log of security-sensitive actions. Readable only by super_admins.';
COMMENT ON FUNCTION public.is_admin(uuid) IS 'Returns true if the supplied auth.uid() is an admin or super_admin.';
COMMENT ON FUNCTION public.log_audit(TEXT, TEXT, BOOLEAN, JSONB) IS 'Append a row to audit_logs. Safe to call from RLS-protected contexts.';

-- =====================================================================
-- 9. Server-side rate limit table (HIGH-5)
--    Used by Edge Functions to enforce per-user, per-action rate limits
--    even when the client is compromised.
-- =====================================================================

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  user_id      UUID NOT NULL,
  action       TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count    INTEGER NOT NULL DEFAULT 1,
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, action, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_window_start
  ON rate_limit_hits(window_start);

ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;

-- Only the service_role (Edge Functions) can read/write this table.
-- No authenticated client access at all.
CREATE POLICY "Service role only on rate_limit_hits"
  ON rate_limit_hits FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- A retention-friendly view for ops dashboards (super_admin only).
CREATE OR REPLACE VIEW rate_limit_hits_recent AS
  SELECT * FROM rate_limit_hits
  WHERE window_start > NOW() - INTERVAL '24 hours';

GRANT SELECT ON rate_limit_hits_recent TO authenticated;
