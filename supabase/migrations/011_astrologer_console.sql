-- Migration 011: Astrologer Console Support
--
-- Adds tables and RPCs needed by the astrologer-side dashboard:
--   * astrologer_earnings     — per-consultation earnings + payout tracking
--   * availability_slots      — recurring weekly availability
--   * astrologer_time_off     — one-off vacation / break blocks
--   * reviews                 — normalised user reviews (duplicates consultation.user_review)
--   * astrologer_stats        — cached aggregates for fast profile loads
--   * complete_consultation   — ends session + creates earnings record atomically
--   * set_astrologer_availability — bulk-replace weekly schedule
--   * request_astrologer_payout   — flips pending earnings to processing
--
-- SAFE TO RE-RUN: uses CREATE OR REPLACE / IF NOT EXISTS.

-- ============================================================
-- 0. Ensure 'active' exists in consultation_status enum
--    (Migration 010 already casts 'active'::consultation_status)
-- ============================================================
DO $$ BEGIN
  ALTER TYPE public.consultation_status ADD VALUE 'active';
  -- FIX: the astrologer console (migration 019) and the client write
  -- 'accepted' / 'declined' consultation states, and 019's stats backfill
  -- FILTERs on them at MIGRATION TIME. Without these values a fresh
  -- `supabase db push` failed inside 019's backfill loop with "invalid
  -- input value for enum consultation_status". Added here (before 019)
  -- and re-asserted for already-applied databases in migration 030.
  ALTER TYPE public.consultation_status ADD VALUE 'accepted';
  ALTER TYPE public.consultation_status ADD VALUE 'declined';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 1. Extend astrologers table with per-type pricing + flags
-- ============================================================
ALTER TABLE public.astrologers
  ADD COLUMN IF NOT EXISTS price_per_minute_chat DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS price_per_minute_voice DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS price_per_minute_video DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS is_available_for_chat BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_available_for_voice BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_available_for_video BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- 2. Astrologer stats (cached aggregates)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.astrologer_stats (
    astrologer_id UUID PRIMARY KEY REFERENCES public.astrologers(id) ON DELETE CASCADE,
    total_earnings DECIMAL(12, 2) DEFAULT 0,
    this_month_earnings DECIMAL(12, 2) DEFAULT 0,
    this_week_earnings DECIMAL(12, 2) DEFAULT 0,
    today_earnings DECIMAL(12, 2) DEFAULT 0,
    total_consultations INTEGER DEFAULT 0,
    this_month_consultations INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    response_time_minutes INTEGER DEFAULT 0,
    completion_rate DECIMAL(5, 4) DEFAULT 0,
    repeat_client_rate DECIMAL(5, 4) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. Astrologer earnings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.astrologer_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    astrologer_id UUID REFERENCES public.astrologers(id) ON DELETE CASCADE NOT NULL,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
    user_name VARCHAR(100),
    gross_amount DECIMAL(12, 2) NOT NULL,
    platform_fee DECIMAL(12, 2) NOT NULL,
    net_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_astrologer_earnings_astrologer ON public.astrologer_earnings(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_astrologer_earnings_status ON public.astrologer_earnings(status);
CREATE INDEX IF NOT EXISTS idx_astrologer_earnings_created ON public.astrologer_earnings(created_at);

-- ============================================================
-- 4. Availability slots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.availability_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    astrologer_id UUID REFERENCES public.astrologers(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_recurring BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_availability_slots_astrologer ON public.availability_slots(astrologer_id);

-- ============================================================
-- 5. Time off blocks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.astrologer_time_off (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    astrologer_id UUID REFERENCES public.astrologers(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_astrologer_time_off_astrologer ON public.astrologer_time_off(astrologer_id);

-- ============================================================
-- 6. Reviews (normalised, searchable)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    astrologer_id UUID REFERENCES public.astrologers(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    user_name VARCHAR(100),
    user_avatar TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    consultation_type VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_astrologer ON public.reviews(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at);

-- ============================================================
-- 7. RPC: complete_consultation
--    Ends an active consultation, creates the earnings record,
--    and bumps the astrologer's cached stats.
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_consultation(
  p_consultation_id UUID,
  p_duration_minutes INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_con RECORD;
  v_price NUMERIC;
  v_gross NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_duration INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT c.*, a.user_id AS astro_user_id, a.price_per_minute
    INTO v_con
  FROM public.consultations c
  JOIN public.astrologers a ON a.id = c.astrologer_id
  WHERE c.id = p_consultation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation not found');
  END IF;

  IF v_con.astro_user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorised');
  END IF;

  IF v_con.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation is not active');
  END IF;

  v_duration := COALESCE(p_duration_minutes, v_con.duration_minutes, 0);
  v_gross := COALESCE(v_con.total_amount, v_duration * v_con.price_per_minute, 0);
  v_fee := ROUND(v_gross * 0.30, 2);
  v_net := v_gross - v_fee;

  -- Close consultation
  UPDATE public.consultations
  SET status = 'completed',
      end_time = now(),
      duration_minutes = v_duration,
      total_amount = v_gross,
      updated_at = now()
  WHERE id = p_consultation_id;

  -- Create earnings record
  INSERT INTO public.astrologer_earnings (
    astrologer_id, consultation_id, user_name, gross_amount, platform_fee, net_amount, status
  ) VALUES (
    v_con.astrologer_id, p_consultation_id, v_con.user_name, v_gross, v_fee, v_net, 'pending'
  );

  -- Upsert stats
  INSERT INTO public.astrologer_stats (
    astrologer_id, total_earnings, today_earnings, total_consultations, completion_rate
  ) VALUES (
    v_con.astrologer_id, v_net, v_net, 1, 1.0
  )
  ON CONFLICT (astrologer_id)
  DO UPDATE SET
    total_earnings = public.astrologer_stats.total_earnings + v_net,
    today_earnings = public.astrologer_stats.today_earnings + v_net,
    total_consultations = public.astrologer_stats.total_consultations + 1,
    completion_rate = LEAST(
      (public.astrologer_stats.completion_rate * public.astrologer_stats.total_consultations + 1.0)
      / NULLIF(public.astrologer_stats.total_consultations + 1, 0),
      1.0
    ),
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'consultation_id', p_consultation_id, 'net_earnings', v_net);
END;
$$;

-- ============================================================
-- 8. RPC: set_astrologer_availability
--    Atomically replaces all slots for the calling astrologer.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_astrologer_availability(
  p_slots JSONB DEFAULT '[]'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_astro_id UUID;
  v_slot JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT id INTO v_astro_id FROM public.astrologers WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Astrologer not found');
  END IF;

  -- Wipe existing slots
  DELETE FROM public.availability_slots WHERE astrologer_id = v_astro_id;

  -- Insert new ones
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO public.availability_slots (
      astrologer_id, day_of_week, start_time, end_time, is_recurring
    ) VALUES (
      v_astro_id,
      (v_slot->>'day_of_week')::INTEGER,
      (v_slot->>'start_time')::TIME,
      (v_slot->>'end_time')::TIME,
      COALESCE((v_slot->>'is_recurring')::BOOLEAN, true)
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'slot_count', COALESCE(jsonb_array_length(p_slots), 0));
END;
$$;

-- ============================================================
-- 9. RPC: request_astrologer_payout
--    Moves all pending earnings for the caller to 'processing'.
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_astrologer_payout()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_astro_id UUID;
  v_total_pending NUMERIC;
  v_payout_id UUID := uuid_generate_v4();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT id INTO v_astro_id FROM public.astrologers WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Astrologer not found');
  END IF;

  SELECT COALESCE(SUM(net_amount), 0) INTO v_total_pending
  FROM public.astrologer_earnings
  WHERE astrologer_id = v_astro_id AND status = 'pending';

  IF v_total_pending <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'No pending earnings to payout');
  END IF;

  UPDATE public.astrologer_earnings
  SET status = 'processing'
  WHERE astrologer_id = v_astro_id AND status = 'pending';

  RETURN jsonb_build_object('success', true, 'payout_id', v_payout_id, 'amount', v_total_pending);
END;
$$;

-- ============================================================
-- 10. Row Level Security
-- ============================================================
ALTER TABLE public.astrologer_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astrologer_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astrologer_stats ENABLE ROW LEVEL SECURITY;

-- Earnings: astrologer sees own only
DROP POLICY IF EXISTS "Astrologer sees own earnings" ON public.astrologer_earnings;
CREATE POLICY "Astrologer sees own earnings" ON public.astrologer_earnings
  FOR ALL USING (
    astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid())
  );

-- Availability slots: astrologer manages own
DROP POLICY IF EXISTS "Astrologer manages own slots" ON public.availability_slots;
CREATE POLICY "Astrologer manages own slots" ON public.availability_slots
  FOR ALL USING (
    astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid())
  );

-- Time off: astrologer manages own
DROP POLICY IF EXISTS "Astrologer manages own time off" ON public.astrologer_time_off;
CREATE POLICY "Astrologer manages own time off" ON public.astrologer_time_off
  FOR ALL USING (
    astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid())
  );

-- Stats: astrologer sees own
DROP POLICY IF EXISTS "Astrologer sees own stats" ON public.astrologer_stats;
CREATE POLICY "Astrologer sees own stats" ON public.astrologer_stats
  FOR ALL USING (
    astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid())
  );

-- Reviews: public read, users insert own
DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own reviews" ON public.reviews;
CREATE POLICY "Users insert own reviews" ON public.reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 11. Grants
-- ============================================================
GRANT EXECUTE ON FUNCTION public.complete_consultation(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_astrologer_availability(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_astrologer_payout() TO authenticated;
