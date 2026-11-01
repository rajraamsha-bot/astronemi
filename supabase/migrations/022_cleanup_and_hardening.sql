-- Migration 022: Cleanup and security hardening

-- 1. Drop redundant subscription_plan column
ALTER TABLE public.users DROP COLUMN IF EXISTS subscription_plan;

-- 2. Redefine trigger function to remove subscription_plan check
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

-- 3. Make audit_logs table append-only
-- FIX: this originally read `FROM PUBLIC, authenticated, anonymous`, but
-- `anonymous` is not a role on Supabase (it is `anon`), so the REVOKE raised
-- 42704 and aborted this file — rolling back items 1-2 and blocking every
-- later migration (023-030) from ever applying. Supabase never records a
-- failed run, so the corrected statement simply executes on the next attempt.
REVOKE UPDATE, DELETE ON public.audit_logs FROM PUBLIC, authenticated, anon;
