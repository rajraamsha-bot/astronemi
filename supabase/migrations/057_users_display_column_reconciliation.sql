-- Migration 057: Users display-column reconciliation (C2/C3 from 2026-09 audit)
--
-- PROBLEM (verified on fresh `supabase db push` reading):
--   * Migration 049's update_user_profile() RPC writes full_name,
--     display_name, country, timezone, date_of_birth, gender,
--     push_notifications_enabled, sms_notifications_enabled,
--     email_notifications_enabled, marketing_emails_enabled — none of which
--     exist on public.users (001 creates `name`, birth_date/time/place/lat/
--     lng, notifications_enabled, language; 001c adds subscription_tier/
--     subscription_ends_at; 012 adds is_admin/is_super_admin; 014 adds
--     deletion_scheduled_at). Every call touching those columns raises
--     `undefined column`, so client profile updates fail by construction.
--   * Migrations 048 and 052 GRANT SELECT/UPDATE on the same non-existent
--     columns, which aborts `db push` at GRANT time ("column does not
--     exist").
--
-- FIX (safe default, explicit product decision):
--   Keep the canonical 001 column names (`name`, birth_*, notifications_
--   enabled) as the server truth — the app, the types
--   (lib/database.types.ts), and every client SELECT already use them.
--   The 049 RPC keeps ACCEPTING the new-style keys (full_name,
--   display_name, date_of_birth, gender, push_notifications_enabled, ...)
--   as aliases and maps them onto the real columns, so old clients keep
--   working. Truly-new columns the app never reads (country, timezone,
--   sms/email/marketing flags) are accepted-and-ignored with success, not
--   rejected — rejecting them would break clients that already send them.
--
-- SAFE TO RE-RUN: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE + idempotent
-- GRANTs. The new `display_name` column is nullable with no backfill
-- requirement, so deploying never locks out existing users.

-- 1. Add the one genuinely-new display column the app references.
--    (Everything else 049 accepted already exists under its canonical name.)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. update_user_profile: accept both canonical and alias keys, write only
--    real columns. Unknown-but-harmless keys (country, timezone,
--    sms/email/marketing flags) are accepted and ignored so older clients
--    that already send them do not break.
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id UUID,
  p_updates JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_allowed TEXT[] := ARRAY[
    -- canonical columns (written through)
    'name','display_name','avatar_url','email','language',
    'birth_date','birth_time','birth_place','birth_lat','birth_lng',
    'zodiac_sign','nakshatra','notifications_enabled',
    -- aliases mapped onto canonical columns below
    'full_name','date_of_birth','gender',
    'push_notifications_enabled','sms_notifications_enabled',
    'email_notifications_enabled','marketing_emails_enabled',
    -- accepted-but-ignored (no such column; kept for client compat)
    'country','timezone'
  ];
  v_key TEXT;
  v_value JSONB;
  v_name TEXT := NULL;
BEGIN
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_updates)
  LOOP
    IF NOT (v_key = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'Column % is not user-settable', v_key;
    END IF;
  END LOOP;

  -- Resolve display name: explicit display_name wins, full_name is an
  -- alias for the canonical `name` column.
  IF p_updates ? 'full_name' THEN
    v_name := p_updates->>'full_name';
  END IF;
  IF p_updates ? 'name' THEN
    v_name := p_updates->>'name';
  END IF;

  UPDATE public.users
  SET
    name = COALESCE(v_name, name),
    display_name = CASE WHEN p_updates ? 'display_name'
      THEN NULLIF(p_updates->>'display_name', '') ELSE display_name END,
    avatar_url = CASE WHEN p_updates ? 'avatar_url'
      THEN NULLIF(p_updates->>'avatar_url', '') ELSE avatar_url END,
    email = CASE WHEN p_updates ? 'email'
      THEN NULLIF(p_updates->>'email', '') ELSE email END,
    language = CASE WHEN p_updates ? 'language'
      THEN NULLIF(p_updates->>'language', '') ELSE language END,
    birth_date = CASE WHEN p_updates ? 'birth_date'
      THEN NULLIF(p_updates->>'birth_date', '')::DATE
      WHEN p_updates ? 'date_of_birth'
      THEN NULLIF(p_updates->>'date_of_birth', '')::DATE
      ELSE birth_date END,
    birth_time = CASE WHEN p_updates ? 'birth_time'
      THEN NULLIF(p_updates->>'birth_time', '')::TIME
      ELSE birth_time END,
    birth_place = CASE WHEN p_updates ? 'birth_place'
      THEN NULLIF(p_updates->>'birth_place', '') ELSE birth_place END,
    birth_lat = CASE WHEN p_updates ? 'birth_lat'
      THEN NULLIF(p_updates->>'birth_lat', '')::DECIMAL ELSE birth_lat END,
    birth_lng = CASE WHEN p_updates ? 'birth_lng'
      THEN NULLIF(p_updates->>'birth_lng', '')::DECIMAL ELSE birth_lng END,
    zodiac_sign = CASE WHEN p_updates ? 'zodiac_sign'
      THEN NULLIF(p_updates->>'zodiac_sign', '') ELSE zodiac_sign END,
    nakshatra = CASE WHEN p_updates ? 'nakshatra'
      THEN NULLIF(p_updates->>'nakshatra', '') ELSE nakshatra END,
    notifications_enabled = CASE
      WHEN p_updates ? 'notifications_enabled'
      THEN (p_updates->>'notifications_enabled')::BOOLEAN
      WHEN p_updates ? 'push_notifications_enabled'
      THEN (p_updates->>'push_notifications_enabled')::BOOLEAN
      ELSE notifications_enabled END,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.update_user_profile(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, JSONB) TO authenticated;

-- 3. Re-assert the users column ACLs against columns that actually exist.
--    (Supersedes the 048/052 GRANT lists, which referenced missing columns
--    and would abort `db push`. Protected columns stay excluded; the 017
--    trigger + 017/031 REVOKEs continue to guard them.)
REVOKE ALL ON public.users FROM authenticated, anon;

GRANT SELECT (
  id,
  phone,
  email,
  name,
  display_name,
  avatar_url,
  birth_date,
  birth_time,
  birth_place,
  birth_lat,
  birth_lng,
  zodiac_sign,
  nakshatra,
  role,
  wallet_balance,
  subscription_tier,
  subscription_ends_at,
  referral_code,
  referral_earnings,
  referred_by,
  notifications_enabled,
  language,
  created_at,
  updated_at
) ON public.users TO authenticated;

-- UPDATE: display columns only. The trigger (017) + REVOKEs (017/031)
-- protect wallet_balance / subscription_* / is_admin / is_super_admin /
-- role. update_user_profile (above) is the supported write path; this
-- direct-UPDATE grant covers only what that RPC can write.
GRANT UPDATE (
  name,
  display_name,
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
