-- Migration 001c: users.subscription_tier + users_compatible view fix
--
-- WHY THIS RUNS EARLY (right after 001b, before 002):
--   Migration 028 adds users.subscription_tier, but migration 017 performs a
--   TOP-LEVEL column-level REVOKE on subscription_tier long before 028 runs.
--   Column-level REVOKE on a missing column raises "column does not exist",
--   so a fresh `supabase db push` fails at migration 017. Everything between
--   008 and 028 (mark_payment_completed_v2, activate_subscription, the
--   user_security_gate trigger, the column revokes) assumes the column
--   exists. Add it here so the whole chain applies; 028 later becomes a
--   harmless no-op (ADD COLUMN IF NOT EXISTS).
--
--   ALSO FIXES: migration 022 drops users.subscription_plan, but the
--   users_compatible view created in migration 001 SELECTs that column, and
--   Postgres refuses to drop a column that a view depends on. The view is
--   not queried by the app, so recreate it without subscription_plan (and
--   with subscription_tier, matching the post-022 users shape).
--
-- SAFE TO RE-RUN: ADD COLUMN IF NOT EXISTS + DROP/CREATE VIEW IF NOT EXISTS
-- semantics.

-- =====================================================================
-- 1. users.subscription_tier (identical to 028, so 028 is a no-op)
-- =====================================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free'
    CONSTRAINT users_subscription_tier_check
    CHECK (subscription_tier IN ('free', 'basic', 'premium', 'gold'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE;

-- =====================================================================
-- 2. users_compatible — recreate WITHOUT subscription_plan
--    (DROP first: the column list changes, which CREATE OR REPLACE cannot do)
-- =====================================================================
DROP VIEW IF EXISTS public.users_compatible;

CREATE VIEW public.users_compatible
WITH (security_invoker = true) AS
SELECT
    u.id, u.phone, u.email, u.name, u.avatar_url,
    u.birth_date, u.birth_time, u.birth_place,
    u.birth_lat, u.birth_lng, u.zodiac_sign, u.nakshatra,
    u.referral_code, u.referred_by, u.wallet_balance,
    u.subscription_tier, u.subscription_ends_at, u.language,
    u.notifications_enabled, u.referral_earnings, u.updated_at, u.created_at
FROM public.users u;

-- 001 granted SELECT on the view; the grant died with the DROP above.
GRANT SELECT ON public.users_compatible TO authenticated;
