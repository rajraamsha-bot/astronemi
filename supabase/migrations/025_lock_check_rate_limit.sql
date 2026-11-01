-- Migration 025: lock check_rate_limit to service_role
-- =====================================================================
--
-- check_rate_limit was defined in migration 008 as a SECURITY DEFINER
-- function, but unlike the other server-only RPCs it was NOT listed in
-- migration 023's GRANT/REVOKE block. As a result it remained
-- world-callable (PUBLIC / anon / authenticated) until now.
--
-- Any client could call check_rate_limit(action, identifier, max, window)
-- directly, which allowed:
--   * probing whether an identifier was active,
--   * artificially inflating counters (DoS against OTP/payment flows),
--   * resetting one's own limits by picking fresh identifiers.
--
-- This migration closes the gap by applying the same lock used for the
-- other server-only RPCs in 023.
--
-- Target list intentionally kept tiny so this migration is safe to run
-- even if check_rate_limit is missing from an older schema.

DO $$
DECLARE
  v_fn    TEXT;
  v_proc  RECORD;
BEGIN
  v_fn := 'check_rate_limit';

  FOR v_proc IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = v_fn
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_proc.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_proc.sig);
    RAISE NOTICE 'Locked check_rate_limit (%s) to service_role', v_proc.sig;
  END LOOP;

  IF NOT FOUND THEN
    RAISE NOTICE 'check_rate_limit not found in public schema — nothing to lock';
  END IF;
END $$;
