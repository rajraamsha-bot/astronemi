-- ============================================================================
-- 041: canonical consultation state, scheduled booking validation, wallet
-- billing idempotency, and participant-scoped chat writes.
--
-- This migration converges the return types left divergent by 010/019/030 and
-- moves the remaining client-controlled money/message decisions behind RPCs.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Consultation state transitions
-- ---------------------------------------------------------------------------
-- PostgreSQL cannot replace a function when only its return type changes.
DROP FUNCTION IF EXISTS public.accept_consultation(UUID);
CREATE OR REPLACE FUNCTION public.accept_consultation(p_consultation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_con RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT c.*, a.user_id AS astrologer_user_id
    INTO v_con
  FROM public.consultations c
  JOIN public.astrologers a ON a.id = c.astrologer_id
  WHERE c.id = p_consultation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation not found');
  END IF;
  IF v_con.astrologer_user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorised for this consultation');
  END IF;
  IF v_con.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation is not pending');
  END IF;
  IF v_con.scheduled_at IS NOT NULL AND v_con.scheduled_at > now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Scheduled consultation cannot start before its slot');
  END IF;

  UPDATE public.consultations
  SET status = 'active',
      start_time = COALESCE(start_time, now()),
      accepted_at = COALESCE(accepted_at, now()),
      updated_at = now()
  WHERE id = p_consultation_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', p_consultation_id,
    'status', 'active',
    'started_at', now()
  );
END;
$$;

DROP FUNCTION IF EXISTS public.decline_consultation(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.decline_consultation(
  p_consultation_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_con RECORD;
  v_reason TEXT := NULLIF(left(COALESCE(p_reason, ''), 500), '');
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT c.*, a.user_id AS astrologer_user_id
    INTO v_con
  FROM public.consultations c
  JOIN public.astrologers a ON a.id = c.astrologer_id
  WHERE c.id = p_consultation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation not found');
  END IF;
  IF v_con.astrologer_user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorised for this consultation');
  END IF;
  IF v_con.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation is not pending');
  END IF;

  UPDATE public.consultations
  SET status = 'declined', declined_reason = v_reason, updated_at = now()
  WHERE id = p_consultation_id;

  RETURN jsonb_build_object('success', true, 'id', p_consultation_id, 'status', 'declined');
END;
$$;

REVOKE ALL ON FUNCTION public.accept_consultation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_consultation(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_consultation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_consultation(UUID, TEXT) TO authenticated;

-- Direct status writes bypass the participant state machine. Keep only the
-- harmless note/rating columns writable by authenticated clients.
REVOKE UPDATE(status) ON public.consultations FROM anon, authenticated;
REVOKE UPDATE(accepted_at, declined_reason, price, total_amount, duration_minutes,
              start_time, end_time, started_at, ended_at, astrologer_id, user_id)
  ON public.consultations FROM anon, authenticated;
GRANT UPDATE(notes, user_rating, user_review, updated_at)
  ON public.consultations TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Scheduled booking validation and due activation
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.secure_create_consultation(UUID, TEXT, TIMESTAMPTZ);
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
  v_slot_taken BOOLEAN;
  v_has_schedule BOOLEAN;
  v_slot_available BOOLEAN;
  v_local_time TIME;
  v_day_of_week INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;
  IF p_type NOT IN ('chat', 'call', 'video') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid consultation type');
  END IF;
  IF p_scheduled_at IS NOT NULL AND p_scheduled_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Scheduled time must be in the future');
  END IF;

  SELECT id, price_per_minute, is_ai, is_online, is_available
    INTO v_astro
  FROM public.astrologers
  WHERE id = p_astrologer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Astrologer not found');
  END IF;

  IF p_scheduled_at IS NULL
     AND NOT v_astro.is_ai
     AND (NOT v_astro.is_online OR NOT v_astro.is_available) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Astrologer is currently unavailable');
  END IF;

  IF p_scheduled_at IS NOT NULL THEN
    -- A configured weekly schedule is authoritative. If no slots have been
    -- configured yet, retain the existing product behavior and rely on the
    -- astrologer's availability flag plus the time-off check below.
    SELECT EXISTS (
      SELECT 1 FROM public.availability_slots
      WHERE astrologer_id = p_astrologer_id
    ) INTO v_has_schedule;

    v_local_time := (p_scheduled_at AT TIME ZONE 'Asia/Kolkata')::TIME;
    v_day_of_week := EXTRACT(DOW FROM (p_scheduled_at AT TIME ZONE 'Asia/Kolkata'))::INTEGER;

    IF v_has_schedule THEN
      SELECT EXISTS (
        SELECT 1 FROM public.availability_slots
        WHERE astrologer_id = p_astrologer_id
          AND is_recurring = true
          AND day_of_week = v_day_of_week
          AND start_time <= v_local_time
          AND end_time > v_local_time
      ) INTO v_slot_available;
      IF NOT v_slot_available THEN
        RETURN jsonb_build_object('success', false, 'message', 'Astrologer is not available at that time');
      END IF;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.astrologer_time_off
      WHERE astrologer_id = p_astrologer_id
        AND p_scheduled_at >= start_date
        AND p_scheduled_at < end_date
    ) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Astrologer is unavailable during that time');
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.consultations
      WHERE astrologer_id = p_astrologer_id
        AND scheduled_at = p_scheduled_at
        AND status IN ('pending', 'confirmed', 'accepted', 'active', 'in_progress')
    ) INTO v_slot_taken;
    IF v_slot_taken THEN
      RETURN jsonb_build_object('success', false, 'message', 'This time slot has just been booked. Please choose another.');
    END IF;
  END IF;

  -- Lock the wallet row while checking the entry requirement. This does not
  -- reserve funds; debit is still revalidated by the billing RPC at start.
  SELECT wallet_balance INTO v_balance
  FROM public.users
  WHERE id = v_uid
  FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_astro.price_per_minute THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient balance. Please add at least ₹' || v_astro.price_per_minute || ' to start.'
    );
  END IF;

  v_status := CASE WHEN v_astro.is_ai AND p_scheduled_at IS NULL THEN 'active' ELSE 'pending' END;
  INSERT INTO public.consultations (
    user_id, astrologer_id, type, status, price, total_amount, start_time, scheduled_at
  ) VALUES (
    v_uid,
    p_astrologer_id,
    p_type::public.consultation_type,
    v_status::public.consultation_status,
    v_astro.price_per_minute,
    0,
    CASE WHEN v_status = 'active' THEN now() ELSE NULL END,
    p_scheduled_at
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id, 'status', v_status, 'is_ai', v_astro.is_ai);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'This time slot has just been booked. Please choose another.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.secure_create_consultation(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_due_consultations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Scheduled AI sessions can start automatically. Human sessions remain
  -- pending until the assigned astrologer accepts at/after the slot.
  UPDATE public.consultations c
  SET status = 'active',
      start_time = COALESCE(c.start_time, now()),
      updated_at = now()
  FROM public.astrologers a
  WHERE c.astrologer_id = a.id
    AND a.is_ai = true
    AND c.status = 'pending'
    AND c.scheduled_at IS NOT NULL
    AND c.scheduled_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_due_consultations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_due_consultations() TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Server-owned, idempotent consultation minute billing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consultation_billing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  billing_minute INTEGER NOT NULL CHECK (billing_minute > 0),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  wallet_transaction_id UUID REFERENCES public.wallet_transactions(id),
  new_balance NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (consultation_id, billing_minute)
);

REVOKE ALL ON public.consultation_billing FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.debit_consultation_minute(
  p_consultation_id UUID,
  p_billing_minute INTEGER,
  p_source TEXT DEFAULT 'consultation'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_con RECORD;
  v_billing_id UUID;
  v_existing_amount NUMERIC;
  v_existing_balance NUMERIC;
  v_price NUMERIC;
  v_elapsed_minute INTEGER;
  v_debit_success BOOLEAN;
  v_debit_message TEXT;
  v_new_balance NUMERIC;
  v_wallet_transaction_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;
  IF p_billing_minute IS NULL OR p_billing_minute < 1 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid billing minute');
  END IF;
  IF p_source NOT IN ('consultation', 'call') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid billing source');
  END IF;

  SELECT c.*, a.price_per_minute
    INTO v_con
  FROM public.consultations c
  JOIN public.astrologers a ON a.id = c.astrologer_id
  WHERE c.id = p_consultation_id
  FOR UPDATE;

  IF NOT FOUND OR v_con.user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation not found');
  END IF;
  IF v_con.status NOT IN ('active', 'in_progress') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation is not active');
  END IF;

  -- A retry with the same minute returns the original result and does not
  -- touch the wallet again. The consultation lock serializes two screens.
  SELECT id, amount, new_balance
    INTO v_billing_id, v_existing_amount, v_existing_balance
  FROM public.consultation_billing
  WHERE consultation_id = p_consultation_id
    AND billing_minute = p_billing_minute
  FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'billing_minute', p_billing_minute,
      'amount', v_existing_amount,
      'new_balance', v_existing_balance
    );
  END IF;

  -- The consultation row stores the rate snapshot accepted at booking time;
  -- never bill against a later astrologer profile edit.
  v_price := v_con.price;
  IF v_price IS NULL OR v_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation rate is unavailable');
  END IF;

  -- Do not allow a modified client to submit future minute numbers in a burst.
  -- The client may retry an older minute; the unique anchor handles that case.
  v_elapsed_minute := GREATEST(
    1,
    FLOOR(GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(v_con.start_time, now())))) / 60)::INTEGER + 1
  );
  IF p_billing_minute > v_elapsed_minute THEN
    RETURN jsonb_build_object('success', false, 'message', 'Billing minute is not due yet');
  END IF;

  INSERT INTO public.consultation_billing (consultation_id, billing_minute, amount)
  VALUES (p_consultation_id, p_billing_minute, v_price)
  RETURNING id INTO v_billing_id;

  -- debit_wallet locks the user's row and writes the ledger entry. The
  -- transaction-scoped guard is needed because this trusted RPC is invoked by
  -- an authenticated client but is itself the server-authoritative boundary.
  PERFORM set_config('app.bypass_wallet_guard', 'on', true);
  SELECT d.success, d.message, d.new_balance
    INTO v_debit_success, v_debit_message, v_new_balance
  FROM public.debit_wallet(
    p_user_id      => v_uid,
    p_amount       => v_price,
    p_source       => p_source,
    p_description  => 'Consultation minute ' || p_billing_minute::TEXT,
    p_reference_id => v_billing_id::TEXT
  ) d;

  IF NOT COALESCE(v_debit_success, false) THEN
    -- The idempotency anchor was inserted before the wallet call. Remove it
    -- when the debit is rejected so an insufficient-balance attempt cannot
    -- reserve a billing minute permanently.
    DELETE FROM public.consultation_billing
    WHERE id = v_billing_id;
    RETURN jsonb_build_object('success', false, 'message', COALESCE(v_debit_message, 'Payment failed'));
  END IF;

  SELECT id INTO v_wallet_transaction_id
  FROM public.wallet_transactions
  WHERE reference_id = v_billing_id
    AND type = 'debit'
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.consultation_billing
  SET wallet_transaction_id = v_wallet_transaction_id,
      new_balance = v_new_balance
  WHERE id = v_billing_id;

  RETURN jsonb_build_object(
    'success', true,
    'billing_minute', p_billing_minute,
    'amount', v_price,
    'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.debit_consultation_minute(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.debit_consultation_minute(UUID, INTEGER, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Participant-derived chat writes and read receipts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_consultation_message(
  p_consultation_id UUID,
  p_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_con RECORD;
  v_sender_type TEXT;
  v_row RECORD;
  v_content TEXT := NULLIF(left(COALESCE(p_message, ''), 10000), '');
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;
  IF v_content IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Message cannot be empty');
  END IF;

  SELECT c.user_id, a.user_id AS astrologer_user_id, c.status
    INTO v_con
  FROM public.consultations c
  JOIN public.astrologers a ON a.id = c.astrologer_id
  WHERE c.id = p_consultation_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation not found');
  END IF;
  IF v_uid = v_con.user_id THEN
    v_sender_type := 'user';
  ELSIF v_uid = v_con.astrologer_user_id THEN
    v_sender_type := 'astrologer';
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Not authorised');
  END IF;
  IF v_con.status IN ('completed', 'cancelled', 'declined', 'refunded') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation has ended');
  END IF;

  INSERT INTO public.chat_messages (
    consultation_id, sender_id, sender_type, message
  ) VALUES (
    p_consultation_id, v_uid, v_sender_type, v_content
  )
  RETURNING id, consultation_id, sender_id, sender_type, message, is_read, created_at
  INTO v_row;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_row.id,
    'consultation_id', v_row.consultation_id,
    'sender_id', v_row.sender_id,
    'sender_type', v_row.sender_type,
    'message', v_row.message,
    'is_read', v_row.is_read,
    'created_at', v_row.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_consultation_messages_read(p_consultation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_user_id UUID;
  v_astrologer_user_id UUID;
  v_count INTEGER;
BEGIN
  SELECT c.user_id, a.user_id
    INTO v_user_id, v_astrologer_user_id
  FROM public.consultations c
  JOIN public.astrologers a ON a.id = c.astrologer_id
  WHERE c.id = p_consultation_id;
  IF NOT FOUND OR v_uid IS NULL OR v_uid NOT IN (v_user_id, v_astrologer_user_id) THEN
    RETURN 0;
  END IF;

  UPDATE public.chat_messages
  SET is_read = true
  WHERE consultation_id = p_consultation_id
    AND sender_id IS DISTINCT FROM v_uid
    AND is_read = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.send_consultation_message(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_consultation_messages_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_consultation_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_consultation_messages_read(UUID) TO authenticated;

-- Keep direct INSERT available only for the SECURITY DEFINER path. Existing
-- permissive policies cannot derive sender_type, so remove client INSERT.
REVOKE INSERT ON public.chat_messages FROM anon, authenticated;
