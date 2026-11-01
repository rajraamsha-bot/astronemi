-- Migration 014: Account soft-delete + scheduled hard-delete sweep
-- Users can request deletion (30-day grace period with undo).
-- A pg_cron job sweeps accounts past their deletion_scheduled_at.

-- ============================================================
-- 1. Add deletion_scheduled_at to users
-- ============================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.users.deletion_scheduled_at
IS 'When set, this account will be hard-deleted after this timestamp. NULL = not slated for deletion.';

-- ============================================================
-- 2. RPC: request account deletion (30-day grace period)
-- ============================================================

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS TABLE(success BOOLEAN, message TEXT, deletion_scheduled_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.users
  SET deletion_scheduled_at = NOW() + INTERVAL '30 days',
      updated_at = NOW()
  WHERE id = v_uid;

  RETURN QUERY
  SELECT true,
         'Account deletion scheduled. You can undo this within 30 days.'::TEXT,
         users.deletion_scheduled_at
  FROM public.users
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

-- ============================================================
-- 3. RPC: cancel account deletion
-- ============================================================

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.users
  SET deletion_scheduled_at = NULL,
      updated_at = NOW()
  WHERE id = v_uid
    AND deletion_scheduled_at IS NOT NULL;

  RETURN QUERY
  SELECT true,
         'Account deletion cancelled.'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;

-- ============================================================
-- 4. RPC: hard-delete accounts past their deletion date
--    Called by pg_cron every hour. CASCADE removes all
--    user-owned rows (consultations, payments, messages, etc.)
-- ============================================================

CREATE OR REPLACE FUNCTION public.sweep_deleted_accounts()
RETURNS TABLE(success BOOLEAN, deleted_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM auth.users
    WHERE id IN (
      SELECT id FROM public.users
      WHERE deletion_scheduled_at IS NOT NULL
        AND deletion_scheduled_at <= NOW()
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deleted;

  RETURN QUERY
  SELECT true,
         v_count,
         CASE
           WHEN v_count = 0 THEN 'No accounts to sweep.'::TEXT
           ELSE 'Hard-deleted ' || v_count::TEXT || ' accounts.'::TEXT
         END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sweep_deleted_accounts() TO service_role;

-- ============================================================
-- 5. pg_cron schedule: sweep every hour at minute 15
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'sweep-deleted-accounts',
      '15 * * * *',
      'SELECT public.sweep_deleted_accounts()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available. Call sweep_deleted_accounts() via Edge Function or manual trigger.';
END $$;
