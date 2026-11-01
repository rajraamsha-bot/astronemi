-- Migration 024: server-authoritative end_consultation RPC
--
-- Fixes two client-side bugs in services/chat.ts:
--   1. endConsultation computed duration x price on the CLIENT and issued a
--      direct UPDATE -- rejected by the validate_consultation_status_change
--      trigger for anyone but the astrologer/admin, so user-side ends always
--      failed (and the pricing was client-manipulable in principle).
--   2. closeConsultation bypassed complete_consultation, so no
--      astrologer_earnings row was created when a session ended.
--
-- This RPC lets EITHER the booking user OR the assigned astrologer end an
-- active consultation. Duration is derived from the trusted server-side
-- start_time; any amount already accumulated by the per-minute billing meter
-- is kept. The earnings record is created idempotently.
--
-- SAFE TO RE-RUN: CREATE OR REPLACE only.

-- 1. Relax the completion trigger so the booking user may also end their
--    own ACTIVE consultation (the RPC below still performs the authoritative
--    checks; this keeps direct table writes consistent with it).
CREATE OR REPLACE FUNCTION validate_consultation_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    IF NOT EXISTS (SELECT 1 FROM public.astrologers WHERE user_id = auth.uid() AND id = NEW.astrologer_id)
    AND NOT (SELECT public.is_admin(auth.uid()))
    AND NOT (OLD.status = 'active' AND OLD.user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Only the assigned astrologer, the booking user, or admin can mark as completed.';
    END IF;
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status IN ('in_progress', 'completed') THEN
    RAISE EXCEPTION 'Cannot cancel after start.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 2. end_consultation: either participant may end an active consultation.
CREATE OR REPLACE FUNCTION public.end_consultation(
  p_consultation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_con RECORD;
  v_duration INTEGER;
  v_gross NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT c.*, a.user_id AS astro_user_id, a.price_per_minute,
         u.name AS booked_user_name
    INTO v_con
  FROM public.consultations c
  JOIN public.astrologers a ON a.id = c.astrologer_id
  LEFT JOIN public.users u ON u.id = c.user_id
  WHERE c.id = p_consultation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation not found');
  END IF;

  -- Only the booking user or the assigned astrologer may end it.
  IF v_con.user_id IS DISTINCT FROM v_uid AND v_con.astro_user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorised');
  END IF;

  IF v_con.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation is not active');
  END IF;

  -- Server-side duration from the trusted start_time (never the client clock).
  v_duration := GREATEST(
    1,
    CEIL(EXTRACT(EPOCH FROM (now() - COALESCE(v_con.start_time, now()))) / 60)::INTEGER
  );
  -- Keep whatever the per-minute billing meter already accumulated.
  v_gross := COALESCE(v_con.total_amount, v_duration * v_con.price_per_minute, 0);
  v_fee := ROUND(v_gross * 0.30, 2);
  v_net := v_gross - v_fee;

  UPDATE public.consultations
  SET status = 'completed',
      end_time = now(),
      duration_minutes = v_duration,
      total_amount = v_gross,
      updated_at = now()
  WHERE id = p_consultation_id;

  -- Earnings record (idempotent: complete_consultation may have run first).
  IF NOT EXISTS (
    SELECT 1 FROM public.astrologer_earnings WHERE consultation_id = p_consultation_id
  ) THEN
    INSERT INTO public.astrologer_earnings (
      astrologer_id, consultation_id, user_name, gross_amount, platform_fee, net_amount, status
    ) VALUES (
      v_con.astrologer_id, p_consultation_id, v_con.booked_user_name, v_gross, v_fee, v_net, 'pending'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'consultation_id', p_consultation_id,
    'duration_minutes', v_duration,
    'total_amount', v_gross
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.end_consultation(UUID) TO authenticated;

-- 3. Fix complete_consultation (migration 011): it derived the billable
--    duration from COALESCE(p_duration_minutes, duration_minutes, 0), but the
--    client billing meter never writes duration_minutes/total_amount to the
--    consultation row (it only debits the wallet per minute), and the client
--    (services/chat.ts closeConsultation) passes no duration. Result: every
--    astrologer-side completion recorded 0 minutes and ₹0 earnings even
--    though the user was charged. Fall back to the trusted start_time.
--    019 defines this RPC with RETURNS TABLE; 024 returns JSONB, so drop the
--    old signature first.
DROP FUNCTION IF EXISTS public.complete_consultation(UUID, INTEGER);
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

  SELECT c.*, a.user_id AS astro_user_id, a.price_per_minute,
         u.name AS booked_user_name
    INTO v_con
  FROM public.consultations c
  JOIN public.astrologers a ON a.id = c.astrologer_id
  LEFT JOIN public.users u ON u.id = c.user_id
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

  -- Duration: explicit param > recorded value > derived from start_time.
  v_duration := COALESCE(
    p_duration_minutes,
    NULLIF(v_con.duration_minutes, 0),
    GREATEST(1, CEIL(EXTRACT(EPOCH FROM (now() - COALESCE(v_con.start_time, now()))) / 60)::INTEGER)
  );
  v_price := v_con.price_per_minute;
  v_gross := COALESCE(NULLIF(v_con.total_amount, 0), v_duration * v_price, 0);
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

  -- Create earnings record (idempotent: end_consultation may have run first)
  IF NOT EXISTS (
    SELECT 1 FROM public.astrologer_earnings WHERE consultation_id = p_consultation_id
  ) THEN
    INSERT INTO public.astrologer_earnings (
      astrologer_id, consultation_id, user_name, gross_amount, platform_fee, net_amount, status
    ) VALUES (
      v_con.astrologer_id, p_consultation_id, v_con.booked_user_name, v_gross, v_fee, v_net, 'pending'
    );

    -- Upsert stats (only when we actually created the earnings row)
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
  END IF;

  RETURN jsonb_build_object('success', true, 'consultation_id', p_consultation_id, 'net_earnings', v_net);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_consultation(UUID, INTEGER) TO authenticated;
