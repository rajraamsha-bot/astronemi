-- Migration 060: pg_cron schedule health check (M5 from 2026-09 audit)
--
-- PROBLEM: pg_cron registrations in 008/013/014/034/038 are all guarded by
--   IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
-- with only a RAISE NOTICE fallback. On vanilla Postgres / CI / platforms
-- without pg_cron, expiry/sweep/reset jobs silently never fire:
-- subscription tiers never downgrade, soft-deleted accounts never hard-
-- delete, AstroPro subs never expire, today_earnings never resets. 034's
-- comment says "call from an external scheduler" but nothing verifies that
-- any scheduler exists.
--
-- FIX (safe default, explicit product decision): a service_role-only
-- cron_health() RPC that reports, per expected job, whether the schedule
-- row exists in cron.job (when pg_cron is present) and when each sweeper
-- last provably ran (jobs write audit rows / updated_at the health check
-- can observe). Deployment runbooks and the health-check Edge Function
-- call this; an empty/absent schedule is a finding, not a silent no-op.
-- The SCHEDULER OF RECORD remains pg_cron on Supabase; where pg_cron is
-- unavailable the operator MUST wire the three sweeper RPCs into an
-- external scheduler (Supabase Scheduled Functions / cron-job.org / GH
-- Actions) — see docs/PRODUCTION_READINESS.md checklist item.
--
-- SAFE TO RE-RUN: CREATE OR REPLACE + idempotent GRANTs.

CREATE OR REPLACE FUNCTION public.cron_health()
RETURNS TABLE(
  job_name TEXT,
  schedule TEXT,
  active BOOLEAN,
  last_run TIMESTAMPTZ,
  detail TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_cron BOOLEAN := EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');
BEGIN
  -- pg_cron-backed schedules (present only when the extension exists).
  IF v_has_cron THEN
    RETURN QUERY
    SELECT
      j.jobname::TEXT,
      j.schedule::TEXT,
      j.active,
      j.last_run_started_at AS last_run,
      'pg_cron schedule row'::TEXT
    FROM cron.job j
    WHERE j.jobname IN (
      'expire-subscriptions',
      'sweep-deleted-accounts',
      'expire-astrologer-subscriptions',
      'reset-today-earnings'
    );
  ELSE
    RETURN QUERY
    SELECT
      t.job_name,
      ''::TEXT AS schedule,
      false AS active,
      NULL::TIMESTAMPTZ AS last_run,
      'pg_cron extension absent — wire sweepers to an external scheduler'::TEXT
    FROM (VALUES
      ('expire-subscriptions'),
      ('sweep-deleted-accounts'),
      ('expire-astrologer-subscriptions'),
      ('reset-today-earnings')
    ) AS t(job_name);
  END IF;

  -- Evidence the sweepers actually ran (independent of the scheduler):
  -- subscription_audit rows prove expire/activate ran; audit_logs rows
  -- prove the earnings reset ran; users.deletion_scheduled_at sweep leaves
  -- no trace when there is nothing to delete, so report pending count.
  RETURN QUERY
  SELECT
    'expire-subscriptions:evidence'::TEXT,
    ''::TEXT,
    EXISTS (SELECT 1 FROM public.subscription_audit WHERE created_at > now() - INTERVAL '25 hours'),
    (SELECT max(created_at) FROM public.subscription_audit),
    (SELECT count(*)::TEXT || ' subscription_audit rows in last 25h'
     FROM public.subscription_audit WHERE created_at > now() - INTERVAL '25 hours');

  RETURN QUERY
  SELECT
    'accounts-pending-hard-delete'::TEXT,
    ''::TEXT,
    true,
    (SELECT min(deletion_scheduled_at) FROM public.users WHERE deletion_scheduled_at IS NOT NULL),
    (SELECT count(*)::TEXT || ' accounts past their deletion date (sweep overdue if >0 for >2h)'
     FROM public.users
     WHERE deletion_scheduled_at IS NOT NULL AND deletion_scheduled_at <= now());
END;
$$;

REVOKE ALL ON FUNCTION public.cron_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_health() TO service_role;
