-- Migration 010: Dual-mode consultations (AI + human astrologers)
--
-- Goal: support BOTH an instant AI astrologer and traditional human
-- astrologers (AstroTalk-style) on the SAME consultation flow.
--
-- Design:
--   * astrologers.is_ai marks AI personas. They share the astrologers table
--     so the existing list / profile / consultation FK / RLS all work unchanged.
--   * AI consultations are created already 'active' (no human to wait for).
--   * Human consultations are created 'pending' and an astrologer must accept
--     them (accept_consultation) which flips them to 'active'.
--   * Both bill per-minute through the existing debit_wallet RPC, referenced
--     by consultation id.
--
-- SAFE TO RE-RUN: additive + CREATE OR REPLACE.

-- ============================================================
-- 0. Reconcile chat_messages column name (content -> message)
--    Migration 001 created chat_messages.content, but the generated DB types
--    and all app code use chat_messages.message. Align to `message`.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'content')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'message') THEN
    ALTER TABLE public.chat_messages RENAME COLUMN content TO message;
  END IF;
END $$;

-- ============================================================
-- 1. AI flag on astrologers
-- ============================================================
ALTER TABLE public.astrologers
  ADD COLUMN IF NOT EXISTS is_ai BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_astrologers_is_ai ON public.astrologers (is_ai);
-- Helps the discovery list sort "available now" first.
CREATE INDEX IF NOT EXISTS idx_astrologers_online ON public.astrologers (is_online, is_available);

-- Seed a single AI astrologer persona (id is stable so the client can deep-link).
INSERT INTO public.astrologers (
  id, name, avatar_url, expertise, specializations, languages,
  experience_years, rating, total_reviews, total_consultations,
  price_per_minute, is_verified, is_online, is_available, is_ai, bio
) VALUES (
  '00000000-0000-4000-a000-0000000000a1',
  'AstroBot (AI)',
  NULL,
  'AI Vedic Astrology Assistant',
  ARRAY['Vedic','Horoscope','Remedies','Numerology'],
  ARRAY['English','Hindi'],
  0, 5.0, 0, 0,
  2.00,                 -- low per-minute rate for AI
  true, true, true, true,
  'Instant AI-powered astrology guidance. Available 24/7. For in-depth, personalised readings, consult one of our human astrologers.'
)
ON CONFLICT (id) DO UPDATE
  SET is_ai = true,
      is_online = true,
      is_available = true,
      name = EXCLUDED.name,
      expertise = EXCLUDED.expertise;

-- ============================================================
-- 2. secure_create_consultation
--    Called by services/chat.ts. Returns jsonb {success, id, message}.
--    - AI astrologer  -> created 'active' immediately.
--    - Human astrologer -> created 'pending' (awaits accept).
--    Validates the caller is authenticated and has at least 1 minute of balance.
-- ============================================================
CREATE OR REPLACE FUNCTION public.secure_create_consultation(
  p_astrologer_id UUID,
  p_type TEXT DEFAULT 'chat'
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

  IF NOT v_astro.is_ai AND (NOT v_astro.is_online OR NOT v_astro.is_available) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Astrologer is currently unavailable');
  END IF;

  SELECT wallet_balance INTO v_balance FROM public.users WHERE id = v_uid;
  IF v_balance IS NULL OR v_balance < v_astro.price_per_minute THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient balance. Please add at least ₹' || v_astro.price_per_minute || ' to start.'
    );
  END IF;

  -- AI starts active right away; human waits for acceptance.
  v_status := CASE WHEN v_astro.is_ai THEN 'active' ELSE 'pending' END;

  INSERT INTO public.consultations (user_id, astrologer_id, type, status, start_time)
  VALUES (
    v_uid,
    p_astrologer_id,
    p_type::consultation_type,
    v_status::consultation_status,
    CASE WHEN v_astro.is_ai THEN now() ELSE NULL END
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id, 'status', v_status, 'is_ai', v_astro.is_ai);
END;
$$;

-- ============================================================
-- 3. accept_consultation (human astrologer side)
--    Flips a pending consultation to active. Only the assigned astrologer
--    (matched via astrologers.user_id = auth.uid()) may accept.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_consultation(
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
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT c.*, a.user_id AS astro_user_id
    INTO v_con
  FROM public.consultations c
  JOIN public.astrologers a ON a.id = c.astrologer_id
  WHERE c.id = p_consultation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation not found');
  END IF;

  IF v_con.astro_user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorised for this consultation');
  END IF;

  IF v_con.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation is not pending');
  END IF;

  UPDATE public.consultations
  SET status = 'active', start_time = now()
  WHERE id = p_consultation_id;

  RETURN jsonb_build_object('success', true, 'id', p_consultation_id);
END;
$$;

-- ============================================================
-- 4. RLS: let the assigned human astrologer update their consultation
--    (accept/end). Users already covered by migration 001 policies.
-- ============================================================
DROP POLICY IF EXISTS "Astrologer updates own consultations" ON public.consultations;
CREATE POLICY "Astrologer updates own consultations" ON public.consultations
  FOR UPDATE USING (
    astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid())
  );

GRANT EXECUTE ON FUNCTION public.secure_create_consultation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_consultation(UUID) TO authenticated;
