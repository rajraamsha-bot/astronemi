-- Migration 034: Register the recurring maintenance jobs
--
-- The sweepers in 008/013/14 register their pg_cron schedules ONLY IF the
-- pg_cron extension is already enabled — and nothing in this repo ever
-- enabled it, so on a fresh database none of them were scheduled:
--   * users.subscription_tier never downgraded after expiry (gating is
--     tier-only, never expiry-checked)
--   * soft-deleted accounts never hard-deleted
--   * astrologer AstroPro subs never expired
--
-- This migration enables pg_cron (when the platform allows it) and then
-- (re-)registers all three schedules idempotently.
--
-- SAFE TO RE-RUN: exception guards + cron.schedule overwrite by name.

-- 1. Enable pg_cron. On hosted Supabase this is permitted; where it is not
--    (e.g. CI dry-runs against a vanilla Postgres), fall through — the DO
--    block below notices the extension is absent and skips scheduling.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Subscription tier expiry: every 15 minutes.
    PERFORM cron.schedule('expire-subscriptions', '*/15 * * * *',
      $$SELECT public.expire_subscriptions()$$);

    -- Hard-delete soft-deleted accounts after their grace period: hourly.
    PERFORM cron.schedule('sweep-deleted-accounts', '15 * * * *',
      $$SELECT public.sweep_deleted_accounts()$$);

    -- Astrologer AstroPro subscription expiry: hourly.
    IF EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name = 'expire_astrologer_subscriptions'
    ) THEN
      PERFORM cron.schedule('expire-astrologer-subscriptions', '45 * * * *',
        $$SELECT public.expire_astrologer_subscriptions()$$);
    END IF;
  ELSE
    RAISE NOTICE 'pg_cron unavailable; call expire_subscriptions()/sweep_deleted_accounts()/expire_astrologer_subscriptions() from an external scheduler.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END$$;
