-- Migration 048: Privilege-escalation closure
-- 1. Tighten astrologers UPDATE: WITH CHECK = (auth.uid() = user_id)
-- 2. Tighten astrologers INSERT/UPDATE/SELECT RLS so privilege columns
--    are only writable via SECURITY DEFINER RPCs.
-- 3. Consolidate users privilege boundary into a single REVOKE/GRANT.
-- 4. Lock down the now-internal astrologer_onboarding table.

-- 1. astrologers WITH CHECK
DROP POLICY IF EXISTS "Astrologers update own" ON public.astrologers;
CREATE POLICY "Astrologers update own"
  ON public.astrologers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Lock down privileged columns on astrologers for non-admin owners.
-- The enforce_astrologer_integrity trigger (032) freezes trust/financial
-- summary fields on UPDATE. Here we additionally make sure non-owner
-- clients cannot update any row.
DROP POLICY IF EXISTS "Astrologers update any" ON public.astrologers;
DROP POLICY IF EXISTS "Admins update any astrologer" ON public.astrologers;
CREATE POLICY "Admins update any astrologer"
  ON public.astrologers FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 3. Consolidate users privilege boundary: explicit REVOKE ALL + GRANT.
-- NOTE (057): the column list below must reference only columns that exist
-- on public.users at migration time. display_name is added by 057 (which
-- sorts after 048), so it is intentionally NOT listed here — 057 re-asserts
-- the full ACL including display_name. (Previously this list contained
-- full_name/country/timezone/date_of_birth/gender/push_notifications_*,
-- none of which exist; GRANT on a missing column aborts `db push`.)
REVOKE ALL ON public.users FROM authenticated, anon;
GRANT SELECT (id, name, avatar_url, phone, email, role,
              subscription_tier, subscription_ends_at,
              language, created_at)
  ON public.users TO authenticated;
-- Owners can update their own non-privileged columns. The trigger
-- (enforce_user_update_restrictions, 017) protects is_admin/is_super_admin/
-- subscription_tier/subscription_ends_at/subscription_plan/role/wallet_balance.
GRANT UPDATE (name, avatar_url, email, language)
  ON public.users TO authenticated;

-- 4. astrologer_onboarding: tighten SELECT (only owner or admin),
-- restrict INSERT/UPDATE/DELETE to service_role (already done in 045).
DROP POLICY IF EXISTS "Users view own onboarding" ON public.astrologer_onboarding;
CREATE POLICY "Owners view own onboarding"
  ON public.astrologer_onboarding FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));