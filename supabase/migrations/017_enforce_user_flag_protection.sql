-- Migration 017: Enforce user flag protection (P0 privilege escalation fix)
--
-- CANONICAL SOURCE. `supabase db push` deploys this file. The former mirror
-- under backend/database/migrations/ has been removed; do not recreate it.
--
-- =============================================================================
-- CONTEXT
-- =============================================================================
-- Migration 012_is_admin_and_audit_logs.sql claimed to make is_admin /
-- is_super_admin "immutable from the client side", but the protection was
-- only described in a comment — never implemented. The `users` FOR UPDATE
-- RLS policy (001:541) was `USING (auth.uid() = id)` with NO `WITH CHECK`,
-- so any authenticated user could self-promote:
--
--     supabase.from('users').update({ is_super_admin: true }).eq('id', me)
--
-- and also extend subscription_ends_at / change subscription_tier (revenue
-- bypass).
--
-- =============================================================================
-- PRE-EXISTING TRIGGER (must be understood before changing it)
-- =============================================================================
-- 001_initial_schema.sql:504 already created trigger `user_security_gate`
-- BEFORE UPDATE ON users EXECUTE FUNCTION enforce_user_update_restrictions().
-- That function guarded wallet_balance, subscription_plan, and role='admin'.
--
-- CRITICAL: it ALSO guards wallet_balance, yet debit_wallet/credit_wallet
-- (001:469/486) do `UPDATE users SET wallet_balance = ...`. A BEFORE UPDATE
-- trigger fires regardless of SECURITY DEFINER/INVOKER, so those RPCs would
-- raise. This migration resolves that contradiction by introducing a
-- transaction-local escape hatch (GUC app.bypass_user_protection) that the
-- privileged RPCs set and the trigger honors.
--
-- =============================================================================
-- DESIGN: GUC escape hatch
-- =============================================================================
-- Trigger checks: current_setting('app.bypass_user_protection', true) = 'on'
--   - authenticated clients CANNOT exploit this: even if they ran
--     `SET app.bypass_user_protection='on'`, the column revokes below still
--     block the write. The GUC is only meaningful inside a SECURITY DEFINER
--     function that has already bypassed RLS.
--   - debit_wallet / credit_wallet / activate_subscription / set_admin_status
--     set it via set_config(..., true) == SET LOCAL at the top of their body.
--     SET LOCAL scopes the value to the current transaction, so it cannot
--     leak across requests.
--
-- `IS DISTINCT FROM` is used so harmless profile updates (name, avatar,
-- language) still succeed even if the payload round-trips protected columns
-- unchanged (see services/sync-manager.ts:311).

-- =============================================================================
-- 1. Redefine the trigger function (extends the 001 version)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_user_update_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypass BOOLEAN;
BEGIN
  -- Privileged RPCs set this GUC (transaction-scoped) to mark their own
  -- writes as authorized. Absent/unset => strict enforcement.
  v_bypass := current_setting('app.bypass_user_protection', true) = 'on';
  IF v_bypass THEN
    RETURN NEW;
  END IF;

  -- Wallet balance: only debit_wallet / credit_wallet may change this.
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'wallet_balance cannot be modified directly. Use wallet RPC functions.';
  END IF;

  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan THEN
    RAISE EXCEPTION 'subscription_plan cannot be modified directly.';
  END IF;

  -- Privileged flags: only set_admin_status() / activate_subscription().
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'is_admin cannot be modified directly. Use set_admin_status().';
  END IF;
  IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
    RAISE EXCEPTION 'is_super_admin cannot be modified directly. Use set_admin_status().';
  END IF;
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
    RAISE EXCEPTION 'subscription_tier cannot be modified directly. Use activate_subscription().';
  END IF;
  IF NEW.subscription_ends_at IS DISTINCT FROM OLD.subscription_ends_at THEN
    RAISE EXCEPTION 'subscription_ends_at cannot be modified directly. Use activate_subscription().';
  END IF;

  -- Role elevation guard (kept from original).
  IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role = 'admin' THEN
    RAISE EXCEPTION 'Cannot elevate role to admin.';
  END IF;

  RETURN NEW;
END;
$$;

-- The trigger `user_security_gate` already exists (001:504) and is attached
-- BEFORE UPDATE FOR EACH ROW. Recreate it defensively to guarantee it is
-- present and bound to the redefined function. Drops by the REAL name.
DROP TRIGGER IF EXISTS user_security_gate ON public.users;
CREATE TRIGGER user_security_gate
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_update_restrictions();

-- Remove any stray trigger left by an earlier draft of this migration.
DROP TRIGGER IF EXISTS trigger_enforce_user_update_restrictions ON public.users;

-- =============================================================================
-- 2. Add the escape hatch to the privileged RPCs
--    Each function is redefined verbatim from its source (001 / 012) with
--    only `PERFORM set_config('app.bypass_user_protection','on',true);`
--    added at the top. set_config(..., true) == SET LOCAL semantics.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id UUID, p_amount DECIMAL, p_source TEXT DEFAULT 'system',
  p_description TEXT DEFAULT 'Payment', p_payment_id UUID DEFAULT NULL, p_reference_id UUID DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, message TEXT, new_balance DECIMAL) AS $$
DECLARE v_balance DECIMAL(12, 2);
BEGIN
  PERFORM set_config('app.bypass_user_protection', 'on', true);
  SELECT wallet_balance INTO v_balance FROM users WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN RETURN QUERY SELECT FALSE, 'User not found', 0::DECIMAL; RETURN; END IF;
  IF v_balance < p_amount THEN RETURN QUERY SELECT FALSE, 'Insufficient balance', v_balance; RETURN; END IF;
  UPDATE users SET wallet_balance = wallet_balance - p_amount, updated_at = NOW() WHERE id = p_user_id RETURNING wallet_balance INTO v_balance;
  INSERT INTO wallet_transactions (user_id, type, amount, description, balance_after, reference_type, reference_id, payment_id)
  VALUES (p_user_id, 'debit', p_amount, p_description, v_balance, p_source, p_reference_id, p_payment_id);
  RETURN QUERY SELECT TRUE, 'Success', v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id UUID, p_amount DECIMAL, p_source TEXT DEFAULT 'system',
  p_description TEXT DEFAULT 'Top-up', p_payment_id UUID DEFAULT NULL, p_reference_id UUID DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, message TEXT, new_balance DECIMAL) AS $$
DECLARE v_balance DECIMAL(12, 2);
BEGIN
  PERFORM set_config('app.bypass_user_protection', 'on', true);
  UPDATE users SET wallet_balance = wallet_balance + p_amount, updated_at = NOW() WHERE id = p_user_id RETURNING wallet_balance INTO v_balance;
  INSERT INTO wallet_transactions (user_id, type, amount, description, balance_after, reference_type, reference_id, payment_id)
  VALUES (p_user_id, 'credit', p_amount, p_description, v_balance, p_source, p_reference_id, p_payment_id);
  RETURN QUERY SELECT TRUE, 'Success', v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
BEGIN
  PERFORM set_config('app.bypass_user_protection', 'on', true);

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

-- set_admin_status (012:383) also writes privileged columns; give it the
-- same escape hatch. Body unchanged otherwise.
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
  PERFORM set_config('app.bypass_user_protection', 'on', true);

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

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

-- =============================================================================
-- 3. Defense in depth — revoke column-level UPDATE privilege
-- =============================================================================
-- Even if the trigger were dropped, authenticated cannot UPDATE these columns.
-- service_role retains all privileges.
REVOKE UPDATE (
    is_admin,
    is_super_admin,
    subscription_tier,
    subscription_ends_at,
    subscription_plan,
    role,
    wallet_balance
  ) ON public.users FROM authenticated;

REVOKE UPDATE (
    is_admin,
    is_super_admin,
    subscription_tier,
    subscription_ends_at,
    subscription_plan,
    role,
    wallet_balance
  ) ON public.users FROM anon;

-- =============================================================================
-- 4. Tighten the RLS policy with WITH CHECK
-- =============================================================================
-- Original `Users update own` had only USING(...) (evaluates against OLD row)
-- so it did not constrain the NEW row's contents. Recreate with WITH CHECK.
DROP POLICY IF EXISTS "Users update own" ON public.users;
CREATE POLICY "Users update own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMENT ON POLICY "Users update own" ON public.users IS
  'Owners may update their own row. Privileged columns (is_admin, is_super_admin, subscription_tier, subscription_ends_at, wallet_balance) are protected by the enforce_user_update_restrictions() trigger + column-level revokes.';

-- =============================================================================
-- 5. Verification helper (CI smoke test)
-- =============================================================================
-- Returns one row per protection check. Called from ci-cd.yml
-- database-migration job; fails the build if any is_ok = false.
CREATE OR REPLACE FUNCTION public.verify_user_flag_protection()
RETURNS TABLE(check_name TEXT, is_ok BOOLEAN, detail TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'trigger_attached'::TEXT, COUNT(*) = 1,
         'user_security_gate BEFORE UPDATE on users'::TEXT
  FROM pg_trigger
  WHERE tgname = 'user_security_gate'
    AND tgrelid = 'public.users'::regclass
  UNION ALL
  SELECT 'no_stray_trigger',
         NOT EXISTS (
           SELECT 1 FROM pg_trigger
           WHERE tgname = 'trigger_enforce_user_update_restrictions'
         ),
         'draft trigger name not lingering'
  UNION ALL
  SELECT 'rls_has_with_check',
         EXISTS (
           SELECT 1 FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename = 'users'
             AND policyname = 'Users update own'
             AND with_check IS NOT NULL
         ),
         'Users update own policy has WITH CHECK'
  UNION ALL
  SELECT 'revoke_' || col,
         NOT has_column_privilege('authenticated', 'public.users', col, 'UPDATE'),
         'authenticated has no UPDATE on users.' || col
  FROM (VALUES ('is_admin'), ('is_super_admin'),
               ('subscription_tier'), ('subscription_ends_at'),
               ('subscription_plan'), ('role'), ('wallet_balance')
       ) AS t(col);
$$;

GRANT EXECUTE ON FUNCTION public.verify_user_flag_protection() TO service_role;
