-- =====================================================================
-- 028: users.subscription_tier column (CRITICAL schema fix)
-- =====================================================================
-- The users table has referenced subscription_tier throughout the app
-- (activate_subscription RPC, mark_payment_completed_v2, the
-- enforce_user_update_restrictions trigger, the subscriptions API, and the
-- TypeScript types) but the column was NEVER created by any migration.
--
-- Timeline that caused the bug:
--   • Migration 001 created `subscription_plan` (singular) instead.
--   • Migrations 008/009/012/017 UPDATE users SET subscription_tier = ...
--     inside FUNCTION BODIES, so they never failed at migration time, but
--     every runtime call to those functions threw
--     'column users.subscription_tier does not exist'.
--   • Migration 022 dropped `subscription_plan`, leaving users with NO
--     tier column at all.
--
-- Net effect before this fix: every paid subscription activation and the
-- subscription API crashed.
--
-- Idempotent / safe to re-run: uses ADD COLUMN IF NOT EXISTS.
-- =====================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free'
    CONSTRAINT users_subscription_tier_check
    CHECK (subscription_tier IN ('free', 'basic', 'premium', 'gold'));

-- subscription_ends_at was created in 001 and never dropped, but re-affirm
-- it defensively for any environment where it may be missing.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE;
