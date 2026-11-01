-- Migration 052: RLS WITH CHECK closure + users column-grant reconciliation
--
-- Two surgical fixes from the 2026-09 production-readiness audit.
--
-- A. consultations/users/astrologers UPDATE policies are USING-only. A
--    client authorized to update a row can re-point foreign keys (user_id,
--    astrologer_id) at any other user without violating USING. This is
--    defense-in-depth over column-level REVOKEs: it stops re-assignment even
--    if a future column is added without an explicit REVOKE.
--
-- B. Migration 048's column-level SELECT GRANT on `users` omitted columns the
--    app actually reads (phone, birth_date, birth_time, birth_place,
--    birth_lat, birth_lng, zodiac_sign, nakshatra, wallet_balance,
--    referral_code, referred_by, notifications_enabled, updated_at,
--    display_name, country, date_of_birth, gender, push_notifications_enabled,
--    sms_notifications_enabled). With 048 applied, profile fetch returned 403.
--    The USING clause on the SELECT policy (001:658) already row-locks to
--    the owner — broadening the column GRANT does not widen exposure to
--    other users' rows. Protected columns (is_admin, is_super_admin) are NOT
--    widened in this migration; their triggers (001, 017, 031) and column
--    REVOKEs (031, 048) continue to guard them.
--    wallet_balance IS added to the SELECT GRANT because the app reads it
--    for the wallet UI; the trigger denies writes from clients.
--
-- SAFE TO RE-RUN: CREATE OR REPLACE + DROP POLICY IF EXISTS + idempotent GRANTs.

-- =====================================================================
-- A. consultations / users / astrologers UPDATE policies gain WITH CHECK
-- =====================================================================

-- A1. consultations: forbid re-assignment to a different user or astrologer.
DROP POLICY IF EXISTS "Users update own consultations" ON public.consultations;
CREATE POLICY "Users update own consultations"
  ON public.consultations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR id IN (
      SELECT c.id FROM public.consultations c
      JOIN public.astrologers a ON c.astrologer_id = a.id
      WHERE a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = (SELECT u.user_id FROM public.consultations u WHERE u.id = consultations.id)
    AND astrologer_id = (SELECT u.astrologer_id FROM public.consultations u WHERE u.id = consultations.id)
  );

-- A2. users: forbid re-assignment to a different id.
-- The original 001 policy is USING-only; this re-creates with WITH CHECK.
DROP POLICY IF EXISTS "Users update own" ON public.users;
CREATE POLICY "Users update own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- A3. astrologers: 048 already added WITH CHECK. Re-assert defensively so a
-- later migration that drops/re-creates the policy does not silently lose it.
DROP POLICY IF EXISTS "Astrologers update own" ON public.astrologers;
CREATE POLICY "Astrologers update own"
  ON public.astrologers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- A4. orders: same defensive closure. Orders may not be re-pointed to a
-- different user mid-flow.
DROP POLICY IF EXISTS "Users update own orders" ON public.orders;
CREATE POLICY "Users update own orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- B. users column-level grants — widen SELECT to what the app actually reads.
-- NOTE (057): every name here must exist on public.users at migration time
-- (GRANT on a missing column aborts `db push` — that was the 048/C3
-- chain-breaker). display_name is added by 057 (057 also re-asserts this
-- whole ACL), so it is NOT listed in this file — 057's ADD COLUMN runs
-- after 052 in migration order.
GRANT SELECT (
  id,
  phone,
  email,
  name,
  avatar_url,
  birth_date,
  birth_time,
  birth_place,
  birth_lat,
  birth_lng,
  zodiac_sign,
  nakshatra,
  role,
  -- READ-ONLY for clients: writes are blocked by 001/017 trigger + 031 REVOKE.
  -- READ is needed by the wallet UI and by services/api.ts:getWalletBalance.
  wallet_balance,
  -- READ-ONLY for clients: tier is server-managed; this column is included
  -- so the profile can render the current tier without a separate RPC.
  subscription_tier,
  subscription_ends_at,
  -- PII-linked; safe because the SELECT policy USING already row-locks.
  referral_code,
  referral_earnings,
  referred_by,
  notifications_enabled,
  language,
  created_at,
  updated_at
) ON public.users TO authenticated;

-- UPDATE: unchanged from 048 — display columns only. Trigger + REVOKE
-- protect the rest.
GRANT UPDATE (
  name,
  avatar_url,
  email,
  language,
  birth_date,
  birth_time,
  birth_place,
  birth_lat,
  birth_lng,
  zodiac_sign,
  nakshatra,
  notifications_enabled
) ON public.users TO authenticated;

-- =====================================================================
-- C. Verification helper
-- =====================================================================

-- Lists the live column ACLs on `users` so a post-deploy run can confirm
-- exactly what an authenticated client sees/can write. service_role only.
CREATE OR REPLACE FUNCTION public.audit_users_column_grants()
RETURNS TABLE(
  privilege_type TEXT,
  column_name   TEXT,
  grantee       TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT privilege_type, column_name::TEXT, grantee::TEXT
  FROM information_schema.column_privileges
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND grantee IN ('authenticated', 'anon')
  ORDER BY privilege_type, column_name, grantee;
$$;

REVOKE ALL ON FUNCTION public.audit_users_column_grants() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_users_column_grants() TO service_role;

COMMENT ON FUNCTION public.audit_users_column_grants() IS
  'Returns the live SELECT/UPDATE column grants on public.users. service_role only. Run after migrations to verify the app query list still works.';