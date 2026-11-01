-- Migration 042: Production Audit Reconciliation
--
-- 1. Hardens astrologer_earnings_summary() authorization check to prevent IDOR /
--    unauthorized access to astrologer revenue data by other users.
-- 2. Registers activate_due_consultations() in pg_cron to periodically activate
--    due scheduled AI consultations.
--
-- SAFE TO RE-RUN: CREATE OR REPLACE / idempotent policy DDL.

-- =====================================================================
-- 1. astrologer_earnings_summary � enforce caller auth (owner, admin, service_role)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.astrologer_earnings_summary(p_astrologer_id UUID)
RETURNS TABLE(lifetime_net NUMERIC, pending_net NUMERIC)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN := false;
BEGIN
  IF v_caller IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if caller is admin/super_admin if querying another astrologer's earnings
  IF v_caller IS NOT NULL AND v_caller IS DISTINCT FROM p_astrologer_id THEN
    SELECT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = v_caller AND (is_admin = true OR is_super_admin = true)
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      -- Also check if p_astrologer_id is astrologers.id and caller is astrologers.user_id
      IF NOT EXISTS (
        SELECT 1 FROM public.astrologers
        WHERE id = p_astrologer_id AND user_id = v_caller
      ) THEN
        RAISE EXCEPTION 'Unauthorized: cannot view other astrologer earnings';
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(ae.net_amount), 0)::NUMERIC,
    COALESCE(SUM(ae.net_amount) FILTER (WHERE ae.status = 'pending'), 0)::NUMERIC
  FROM public.astrologer_earnings ae
  WHERE ae.astrologer_id = p_astrologer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.astrologer_earnings_summary(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.astrologer_earnings_summary(UUID) TO authenticated, service_role;

-- =====================================================================
-- 2. Register activate_due_consultations in pg_cron (runs every minute)
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name = 'activate_due_consultations'
    ) THEN
      PERFORM cron.schedule('activate-due-consultations', '* * * * *',
        'SELECT public.activate_due_consultations()');
    END IF;
  ELSE
    RAISE NOTICE 'pg_cron unavailable; call activate_due_consultations() from an external scheduler.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'activate-due-consultations scheduling skipped: %', SQLERRM;
END $$;
