-- Migration 019: Astrologer Dashboard (reviews, earnings, availability, stats)
--
-- BACKFILLED from a never-deployed migration that lived under
-- backend/database/migrations/ (CI deploys only from supabase/migrations/).
-- That legacy tree has since been removed; this file is the only copy.
-- The astrologer console (app/astrologer/) was reading from tables that
-- did not exist in production.
--
-- This migration:
--   1. Creates the 6 tables (reviews, astrologer_earnings, availability_slots,
--      astrologer_time_off, astrologer_stats, payouts)
--   2. Alters consultations + astrologers to add dashboard fields
--   3. Defines the 6 RPCs (accept/decline/complete consultation,
--      set_availability, request_payout, refresh_stats)
--   4. Backfills stats rows for existing astrologers
--
-- Every SECURITY DEFINER function declares SET search_path = public
-- (P1 hardening, see migration 017 for the pattern).
--
-- Run after 018_push_tokens_and_indexes.sql.

-- 010/011 created these RPCs with different return types. PostgreSQL cannot
-- change a return type through CREATE OR REPLACE, so drop the old signatures
-- before defining the dashboard versions below.
DROP FUNCTION IF EXISTS public.accept_consultation(UUID);
DROP FUNCTION IF EXISTS public.decline_consultation(UUID, TEXT);
DROP FUNCTION IF EXISTS public.complete_consultation(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.set_astrologer_availability(JSONB);
DROP FUNCTION IF EXISTS public.request_astrologer_payout();
DROP FUNCTION IF EXISTS public.refresh_astrologer_stats(UUID);

-- Make the policy block re-runnable if an earlier failed push left objects
-- behind.
DROP POLICY IF EXISTS "Astrologers view own reviews" ON reviews;
DROP POLICY IF EXISTS "Users view own reviews" ON reviews;
DROP POLICY IF EXISTS "Users create own reviews" ON reviews;
DROP POLICY IF EXISTS "Astrologers view own earnings" ON astrologer_earnings;
DROP POLICY IF EXISTS "Astrologers manage own availability" ON availability_slots;
DROP POLICY IF EXISTS "Anyone reads availability" ON availability_slots;
DROP POLICY IF EXISTS "Astrologers manage own time off" ON astrologer_time_off;
DROP POLICY IF EXISTS "Anyone reads time off" ON astrologer_time_off;
DROP POLICY IF EXISTS "Astrologers view own stats" ON astrologer_stats;
DROP POLICY IF EXISTS "Anyone views astrologer stats" ON astrologer_stats;

-- ============================================================================
-- 1) REVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_astrologer ON reviews(astrologer_id, created_at DESC);

-- 011 created this table WITHOUT consultation_id; on a fresh chain this file
-- used to abort at the index/policy below (undefined column). Reconcile the
-- two shapes idempotently BEFORE any dependent DDL.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reviews_consultation ON reviews(consultation_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- FIX: astrologer_id references astrologers.id (the profile id), which is
-- NOT auth.uid() (the users.id). The old `astrologer_id = auth.uid()`
-- comparison could never match, so astrologers saw an empty reviews list.
CREATE POLICY "Astrologers view own reviews" ON reviews
  FOR SELECT USING (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()));

CREATE POLICY "Users view own reviews" ON reviews
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users create own reviews" ON reviews
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND astrologer_id = (
      SELECT astrologer_id FROM consultations WHERE id = consultation_id
    )
  );

-- ============================================================================
-- 2) ASTROLOGER EARNINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS astrologer_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,                          -- denormalized for display
  gross_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  payout_id UUID,                          -- FK to payouts table when paid
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 011 created astrologer_earnings without user_id/payout_id. Add them and
-- backfill user_id from the linked consultation where possible.
ALTER TABLE astrologer_earnings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS payout_id UUID;

UPDATE astrologer_earnings e
SET user_id = c.user_id
FROM consultations c
WHERE e.consultation_id = c.id
  AND e.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_earnings_astrologer ON astrologer_earnings(astrologer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON astrologer_earnings(status);
CREATE INDEX IF NOT EXISTS idx_earnings_consultation ON astrologer_earnings(consultation_id);

ALTER TABLE astrologer_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Astrologers view own earnings" ON astrologer_earnings
  FOR SELECT USING (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()));

-- Only the service role (Edge Functions) inserts/updates earnings
-- so no INSERT/UPDATE policies for regular users.

-- ============================================================================
-- 3) AVAILABILITY SLOTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_availability_astrologer ON availability_slots(astrologer_id, day_of_week);

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Astrologers manage own availability" ON availability_slots
  FOR ALL USING (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()))
  WITH CHECK (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()));

-- Public read: anyone can see astrologer availability for booking purposes
CREATE POLICY "Anyone reads availability" ON availability_slots
  FOR SELECT USING (true);

-- ============================================================================
-- 4) ASTROLOGER TIME OFF
-- ============================================================================
CREATE TABLE IF NOT EXISTS astrologer_time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_off_range CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_time_off_astrologer ON astrologer_time_off(astrologer_id, start_date);

ALTER TABLE astrologer_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Astrologers manage own time off" ON astrologer_time_off
  FOR ALL USING (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()))
  WITH CHECK (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()));

CREATE POLICY "Anyone reads time off" ON astrologer_time_off
  FOR SELECT USING (true);

-- ============================================================================
-- 5) ASTROLOGER STATS (denormalized for fast dashboard reads)
-- ============================================================================
CREATE TABLE IF NOT EXISTS astrologer_stats (
  astrologer_id UUID PRIMARY KEY REFERENCES astrologers(id) ON DELETE CASCADE,
  total_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  pending_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  this_month_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  this_week_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  today_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_consultations INTEGER NOT NULL DEFAULT 0,
  this_month_consultations INTEGER NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  average_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_5_count INTEGER NOT NULL DEFAULT 0,
  rating_4_count INTEGER NOT NULL DEFAULT 0,
  rating_3_count INTEGER NOT NULL DEFAULT 0,
  rating_2_count INTEGER NOT NULL DEFAULT 0,
  rating_1_count INTEGER NOT NULL DEFAULT 0,
  response_time_minutes INTEGER NOT NULL DEFAULT 0,
  completion_rate DECIMAL(4,3) NOT NULL DEFAULT 0,
  repeat_client_rate DECIMAL(4,3) NOT NULL DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 011 created astrologer_stats with a narrower shape. Add the dashboard
-- columns before refresh_astrologer_stats() writes to them.
ALTER TABLE astrologer_stats
  ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_5_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_4_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_3_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_2_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_1_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE astrologer_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Astrologers view own stats" ON astrologer_stats
  FOR SELECT USING (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()));

CREATE POLICY "Anyone views astrologer stats" ON astrologer_stats
  FOR SELECT USING (true);

-- ============================================================================
-- 6) PAYOUTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payment_method VARCHAR(20) NOT NULL,     -- 'upi' or 'bank'
  payment_details JSONB,                  -- UPI ID or bank last 4
  transaction_id TEXT,                    -- Bank/UPI transaction ref
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_payouts_astrologer ON payouts(astrologer_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Astrologers view own payouts" ON payouts;
CREATE POLICY "Astrologers view own payouts" ON payouts
  FOR SELECT USING (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()));

-- ============================================================================
-- 7) ALTER CONSULTATIONS — add fields used by the dashboard
-- ============================================================================
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS declined_reason TEXT,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS astrologer_id UUID REFERENCES astrologers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_consultations_astrologer ON consultations(astrologer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status, created_at DESC);

-- ============================================================================
-- 8) ALTER ASTROLOGERS — add onboarding and pricing fields
-- ============================================================================
ALTER TABLE astrologers
  ADD COLUMN IF NOT EXISTS price_per_minute_chat DECIMAL(10,2) DEFAULT 25,
  ADD COLUMN IF NOT EXISTS price_per_minute_voice DECIMAL(10,2) DEFAULT 30,
  ADD COLUMN IF NOT EXISTS price_per_minute_video DECIMAL(10,2) DEFAULT 35,
  ADD COLUMN IF NOT EXISTS is_available_for_chat BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_available_for_voice BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_available_for_video BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payout_method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payout_details JSONB,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';

-- ============================================================================
-- 9) RPC: refresh_astrologer_stats
-- Recomputes all aggregate fields on astrologer_stats for a given astrologer.
-- Idempotent; safe to call after any consultation/earning/review change.
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_astrologer_stats(p_astrologer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_earnings DECIMAL(12,2) := 0;
  v_pending_earnings DECIMAL(12,2) := 0;
  v_month_earnings DECIMAL(12,2) := 0;
  v_week_earnings DECIMAL(12,2) := 0;
  v_today_earnings DECIMAL(12,2) := 0;
  v_total_consultations INTEGER := 0;
  v_month_consultations INTEGER := 0;
  v_total_reviews INTEGER := 0;
  v_avg_rating DECIMAL(3,2) := 0;
  v_r5 INTEGER := 0;
  v_r4 INTEGER := 0;
  v_r3 INTEGER := 0;
  v_r2 INTEGER := 0;
  v_r1 INTEGER := 0;
  v_completion_rate DECIMAL(4,3) := 0;
  v_repeat_rate DECIMAL(4,3) := 0;
BEGIN
  -- Earnings aggregates (only pending + processing + paid, not failed)
  SELECT
    COALESCE(SUM(net_amount), 0),
    COALESCE(SUM(CASE WHEN status = 'pending' THEN net_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN net_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= date_trunc('week', NOW()) THEN net_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= date_trunc('day', NOW()) THEN net_amount ELSE 0 END), 0)
  INTO v_total_earnings, v_pending_earnings, v_month_earnings, v_week_earnings, v_today_earnings
  FROM astrologer_earnings
  WHERE astrologer_id = p_astrologer_id AND status IN ('pending', 'processing', 'paid');

  -- Consultation counts
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))
  INTO v_total_consultations, v_month_consultations
  FROM consultations
  WHERE astrologer_id = p_astrologer_id AND status = 'completed';

  -- Review aggregates
  SELECT
    COUNT(*),
    COALESCE(AVG(rating), 0),
    COUNT(*) FILTER (WHERE rating = 5),
    COUNT(*) FILTER (WHERE rating = 4),
    COUNT(*) FILTER (WHERE rating = 3),
    COUNT(*) FILTER (WHERE rating = 2),
    COUNT(*) FILTER (WHERE rating = 1)
  INTO v_total_reviews, v_avg_rating, v_r5, v_r4, v_r3, v_r2, v_r1
  FROM reviews
  WHERE astrologer_id = p_astrologer_id;

  -- Completion rate: completed / accepted
  SELECT
    CASE WHEN COUNT(*) FILTER (WHERE status = 'accepted') > 0
      THEN COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL
         / COUNT(*) FILTER (WHERE status = 'accepted')::DECIMAL
      ELSE 0
    END
  INTO v_completion_rate
  FROM consultations
  WHERE astrologer_id = p_astrologer_id;

  -- Repeat client rate
  WITH user_counts AS (
    SELECT user_id, COUNT(*) AS c
    FROM consultations
    WHERE astrologer_id = p_astrologer_id AND status = 'completed'
    GROUP BY user_id
  )
  SELECT CASE WHEN COUNT(*) > 0
    THEN COUNT(*) FILTER (WHERE c > 1)::DECIMAL / COUNT(*)::DECIMAL
    ELSE 0
  END INTO v_repeat_rate
  FROM user_counts;

  INSERT INTO astrologer_stats (
    astrologer_id,
    total_earnings, pending_earnings,
    this_month_earnings, this_week_earnings, today_earnings,
    total_consultations, this_month_consultations,
    total_reviews, average_rating,
    rating_5_count, rating_4_count, rating_3_count, rating_2_count, rating_1_count,
    completion_rate, repeat_client_rate,
    last_active_at, updated_at
  ) VALUES (
    p_astrologer_id,
    v_total_earnings, v_pending_earnings,
    v_month_earnings, v_week_earnings, v_today_earnings,
    v_total_consultations, v_month_consultations,
    v_total_reviews, v_avg_rating,
    v_r5, v_r4, v_r3, v_r2, v_r1,
    v_completion_rate, v_repeat_rate,
    NOW(), NOW()
  )
  ON CONFLICT (astrologer_id) DO UPDATE SET
    total_earnings = EXCLUDED.total_earnings,
    pending_earnings = EXCLUDED.pending_earnings,
    this_month_earnings = EXCLUDED.this_month_earnings,
    this_week_earnings = EXCLUDED.this_week_earnings,
    today_earnings = EXCLUDED.today_earnings,
    total_consultations = EXCLUDED.total_consultations,
    this_month_consultations = EXCLUDED.this_month_consultations,
    total_reviews = EXCLUDED.total_reviews,
    average_rating = EXCLUDED.average_rating,
    rating_5_count = EXCLUDED.rating_5_count,
    rating_4_count = EXCLUDED.rating_4_count,
    rating_3_count = EXCLUDED.rating_3_count,
    rating_2_count = EXCLUDED.rating_2_count,
    rating_1_count = EXCLUDED.rating_1_count,
    completion_rate = EXCLUDED.completion_rate,
    repeat_client_rate = EXCLUDED.repeat_client_rate,
    last_active_at = NOW(),
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- 10) RPC: accept_consultation (atomic transition pending -> accepted)
-- ============================================================================
CREATE OR REPLACE FUNCTION accept_consultation(p_consultation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_astrologer_id UUID;
BEGIN
  -- FIX: consultations.astrologer_id references astrologers.id (the profile
  -- id), NOT auth.uid() (the users.id). Resolve the caller's profile id via
  -- the user_id link; the old `astrologer_id = auth.uid()` comparison could
  -- never match, so accept never transitioned the consultation.
  SELECT id INTO v_astrologer_id
  FROM public.astrologers
  WHERE user_id = auth.uid();

  IF v_astrologer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE consultations
    SET status = 'accepted', accepted_at = NOW()
  WHERE id = p_consultation_id
    AND astrologer_id = v_astrologer_id
    AND status = 'pending';
  RETURN FOUND;
END;
$$;

-- ============================================================================
-- 11) RPC: decline_consultation
-- ============================================================================
CREATE OR REPLACE FUNCTION decline_consultation(
  p_consultation_id UUID, p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_astrologer_id UUID;
BEGIN
  -- FIX: resolve the caller's astrologer profile id (see accept_consultation).
  SELECT id INTO v_astrologer_id
  FROM public.astrologers
  WHERE user_id = auth.uid();

  IF v_astrologer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE consultations
    SET status = 'declined', declined_reason = p_reason
  WHERE id = p_consultation_id
    AND astrologer_id = v_astrologer_id
    AND status = 'pending';
  RETURN FOUND;
END;
$$;

-- ============================================================================
-- 12) RPC: complete_consultation
-- Atomically: transition active -> completed, capture pricing, insert earning.
-- Wallet debit is delegated to debit_wallet (which uses FOR UPDATE row lock
-- and throws on insufficient balance — preventing race conditions).
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_consultation(
  p_consultation_id UUID, p_duration_minutes INTEGER
)
RETURNS TABLE(success BOOLEAN, new_balance DECIMAL, net_earned DECIMAL)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_astrologer_id UUID;
  v_user_id UUID;
  v_price_per_minute DECIMAL(10,2);
  v_gross DECIMAL(10,2);
  v_fee DECIMAL(10,2);
  v_net DECIMAL(10,2);
  v_new_balance DECIMAL(10,2);
BEGIN
  v_astrologer_id := auth.uid();
  IF v_astrologer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE consultations c
    SET status = 'completed',
        ended_at = NOW(),
        duration_minutes = p_duration_minutes
  FROM astrologers a
  WHERE c.id = p_consultation_id
    AND c.astrologer_id = v_astrologer_id
    AND a.id = c.astrologer_id
    AND c.status = 'active'
  RETURNING c.user_id,
            CASE c.type WHEN 'chat' THEN a.price_per_minute_chat
                        WHEN 'voice' THEN a.price_per_minute_voice
                        ELSE a.price_per_minute_video END
  INTO v_user_id, v_price_per_minute;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 0::DECIMAL;
    RETURN;
  END IF;

  v_gross := v_price_per_minute * p_duration_minutes;
  v_fee := ROUND(v_gross * 0.30, 2);
  v_net := v_gross - v_fee;

  -- Debit the user. debit_wallet uses FOR UPDATE row lock and throws on
  -- insufficient balance (see migration 017 for the GUC escape hatch).
  v_new_balance := debit_wallet(
    v_user_id, v_gross, 'consultation', 'consultation debit', p_consultation_id
  );

  INSERT INTO astrologer_earnings (
    consultation_id, astrologer_id, user_id, user_name,
    gross_amount, platform_fee, net_amount, status
  ) VALUES (
    p_consultation_id, v_astrologer_id, v_user_id,
    (SELECT name FROM users WHERE id = v_user_id),
    v_gross, v_fee, v_net, 'pending'
  );

  RETURN QUERY SELECT true, v_new_balance, v_net;
END;
$$;

-- ============================================================================
-- 13) RPC: set_astrologer_availability (replace all slots in one txn)
-- ============================================================================
CREATE OR REPLACE FUNCTION set_astrologer_availability(p_slots JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_astrologer_id UUID;
  v_slot JSONB;
BEGIN
  -- FIX: resolve the caller's astrologer profile id (see accept_consultation).
  SELECT id INTO v_astrologer_id
  FROM public.astrologers
  WHERE user_id = auth.uid();

  IF v_astrologer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM availability_slots WHERE astrologer_id = v_astrologer_id;

  IF p_slots IS NOT NULL AND jsonb_array_length(p_slots) > 0 THEN
    FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
    LOOP
      INSERT INTO availability_slots (astrologer_id, day_of_week, start_time, end_time, is_recurring)
      VALUES (
        v_astrologer_id,
        (v_slot->>'day_of_week')::SMALLINT,
        (v_slot->>'start_time')::TIME,
        (v_slot->>'end_time')::TIME,
        COALESCE((v_slot->>'is_recurring')::BOOLEAN, true)
      );
    END LOOP;
  END IF;
END;
$$;

-- ============================================================================
-- 14) RPC: request_astrologer_payout
-- ============================================================================
CREATE OR REPLACE FUNCTION request_astrologer_payout()
RETURNS TABLE(payout_id UUID, amount DECIMAL)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_astrologer_id UUID;
  v_total DECIMAL(12,2);
  v_payout_id UUID;
  v_method VARCHAR(20);
  v_details JSONB;
BEGIN
  -- FIX: resolve the caller's astrologer profile id (see accept_consultation).
  SELECT id INTO v_astrologer_id
  FROM public.astrologers
  WHERE user_id = auth.uid();

  IF v_astrologer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(SUM(net_amount), 0)
  INTO v_total
  FROM astrologer_earnings
  WHERE astrologer_id = v_astrologer_id AND status = 'pending';

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'No pending earnings to pay out';
  END IF;

  SELECT payout_method, payout_details
  INTO v_method, v_details
  FROM astrologers WHERE id = v_astrologer_id;

  IF v_method IS NULL THEN
    RAISE EXCEPTION 'No payout method configured. Add a bank account or UPI ID in your profile.';
  END IF;

  INSERT INTO payouts (astrologer_id, amount, status, payment_method, payment_details)
  VALUES (v_astrologer_id, v_total, 'pending', v_method, v_details)
  RETURNING id INTO v_payout_id;

  UPDATE astrologer_earnings
  SET status = 'processing', payout_id = v_payout_id
  WHERE astrologer_id = v_astrologer_id AND status = 'pending';

  RETURN QUERY SELECT v_payout_id, v_total;
END;
$$;

-- ============================================================================
-- 15) Backfill: create stats rows for existing astrologers
-- ============================================================================
INSERT INTO astrologer_stats (astrologer_id)
SELECT id FROM astrologers
ON CONFLICT (astrologer_id) DO NOTHING;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM astrologers LOOP
    PERFORM refresh_astrologer_stats(r.id);
  END LOOP;
END;
$$;
