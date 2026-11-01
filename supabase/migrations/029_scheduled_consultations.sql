-- Migration 029: Scheduled consultations
--
-- The booking screen offers "Schedule for later" but secure_create_consultation
-- never stored the chosen time: consultations.scheduled_at stayed NULL, no
-- reminder was scheduled, and the confirmation the user saw was purely
-- cosmetic — the session was indistinguishable from an instant booking.
--
-- This migration:
--   1. Adds an optional p_scheduled_at param to secure_create_consultation,
--      stored on the existing consultations.scheduled_at column.
--   2. Allows booking an offline human astrologer WHEN the booking is
--      scheduled (they will be online at the slot); instant bookings still
--      require online + available.
--   3. Keeps scheduled bookings 'pending' (billing must not start before the
--      slot, even for the AI astrologer).
--
-- SAFE TO RE-RUN: DROP + CREATE OR REPLACE + GRANT.

-- Drop the old 2-arg version from migration 010. CREATE OR REPLACE only
-- replaces an IDENTICAL signature, so without this drop the old
-- secure_create_consultation(UUID, TEXT) survives alongside the new 3-arg
-- one — still granted to authenticated, still callable, and still creating
-- consultations with a NULL scheduled_at.
DROP FUNCTION IF EXISTS public.secure_create_consultation(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.secure_create_consultation(
  p_astrologer_id UUID,
  p_type TEXT DEFAULT 'chat',
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_astro RECORD;
  v_balance NUMERIC;
  v_id UUID;
  v_status TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT id, price_per_minute, is_ai, is_online, is_available
    INTO v_astro
  FROM public.astrologers
  WHERE id = p_astrologer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Astrologer not found');
  END IF;

  -- Scheduled bookings are appointments: the astrologer does not need to be
  -- online at booking time (they will be at the slot). Instant bookings still
  -- require an online, available human astrologer.
  IF p_scheduled_at IS NULL
     AND NOT v_astro.is_ai
     AND (NOT v_astro.is_online OR NOT v_astro.is_available) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Astrologer is currently unavailable');
  END IF;

  SELECT wallet_balance INTO v_balance FROM public.users WHERE id = v_uid;
  IF v_balance IS NULL OR v_balance < v_astro.price_per_minute THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient balance. Please add at least ₹' || v_astro.price_per_minute || ' to start.'
    );
  END IF;

  -- AI starts active immediately ONLY for instant bookings. A scheduled
  -- booking stays pending so billing never starts before the slot.
  v_status := CASE
    WHEN v_astro.is_ai AND p_scheduled_at IS NULL THEN 'active'
    ELSE 'pending'
  END;

  INSERT INTO public.consultations (user_id, astrologer_id, type, status, start_time, scheduled_at)
  VALUES (
    v_uid,
    p_astrologer_id,
    p_type::consultation_type,
    v_status::consultation_status,
    CASE WHEN v_astro.is_ai AND p_scheduled_at IS NULL THEN now() ELSE NULL END,
    p_scheduled_at
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id, 'status', v_status, 'is_ai', v_astro.is_ai);
END;
$$;

GRANT EXECUTE ON FUNCTION public.secure_create_consultation(UUID, TEXT, TIMESTAMPTZ) TO authenticated;
