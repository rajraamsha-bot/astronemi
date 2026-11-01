-- =====================================================================
-- 030: Runtime privilege + astrologer-scope reconciliation
-- =====================================================================
-- WHY THIS EXISTS
--   `supabase db push` only runs migrations that have not been applied yet.
--   Fixes that edit already-applied migration files (001b/001c/012/013/018/
--   019/026) repair FRESH deployments, but the existing database keeps the
--   old definitions. This migration re-asserts the runtime-critical state on
--   any database, fresh or existing.
--
-- Three known problems fixed here:
--   1. Migration 008 did `REVOKE ALL ON ALL TABLES FROM authenticated` then
--      `GRANT SELECT ON ALL TABLES`. That silently removed every client-side
--      write privilege (users INSERT for signup, profile UPDATE, chat
--      INSERT, orders upsert, reviews, kundlis, onboarding, community,
--      reminders, ...). RLS policies gate ROWS, they do not grant the base
--      table privilege — so those writes failed with permission denied.
--      The per-table grants below restore the original 001/002/005/006
--      design; RLS remains the row-level gate. wallet_transactions stays
--      SELECT-only (server-authoritative, see 027).
--   2. Migration 019 compared `astrologer_id = auth.uid()`, but
--      astrologers.id (profile id) is never auth.uid() (auth.uid() is the
--      users.id linked via astrologers.user_id). The whole astrologer
--      dashboard (reviews, earnings, stats, payouts, availability) and the
--      accept/decline/complete RPCs could never match. Policies and RPCs
--      are re-created below using the user_id -> profile id resolution.
--   3. orders.payment_status / payment_method are written by
--      contexts/CartContext.tsx and referenced by 026's RLS policies but
--      never created on databases where 026 already ran.
--
-- SAFE TO RE-RUN: GRANTs are idempotent, ADD COLUMN IF NOT EXISTS,
-- DROP POLICY IF EXISTS + CREATE, CREATE OR REPLACE FUNCTION.

-- =====================================================================
-- 0. consultation_status enum values (see header note 2)
--    'accepted' / 'declined' are written by accept_consultation,
--    decline_consultation and the client, but migration 011 only added
--    'active'. Databases that already applied 001-029 need the values too.
--    Idempotent: duplicate_object is swallowed.
-- =====================================================================
DO $$
BEGIN
  ALTER TYPE public.consultation_status ADD VALUE 'accepted';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.consultation_status ADD VALUE 'declined';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================
-- 1. Restore client write privileges (see header note 1)
-- =====================================================================
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.astrologers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.consultations TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT SELECT, INSERT ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kundlis TO authenticated;
GRANT SELECT, INSERT ON public.kundli_matching TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

GRANT ALL ON public.astrologer_onboarding TO authenticated;
GRANT ALL ON public.consultation_reviews TO authenticated;
GRANT ALL ON public.consultation_disputes TO authenticated;
GRANT ALL ON public.horoscope_subscriptions TO authenticated;
GRANT ALL ON public.referrals TO authenticated;
GRANT ALL ON public.astrologer_availability TO authenticated;

GRANT ALL ON public.forum_posts, public.forum_replies, public.forum_likes,
  public.live_streams, public.live_stream_reminders TO authenticated;
GRANT ALL ON public.user_reminders, public.astro_event_bookmarks,
  public.dream_entries TO authenticated;

-- Tables created after 008 (no write grants in their owning migrations):
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.astrologer_time_off TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_slots TO authenticated;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT SELECT ON public.astrologer_stats TO authenticated;
GRANT SELECT ON public.astrologer_earnings TO authenticated;
GRANT SELECT ON public.payouts TO authenticated;

-- =====================================================================
-- 2. orders columns (see header note 3)
-- =====================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);

-- =====================================================================
-- 3. Astrologer-scoped RLS policies (see header note 2)
-- =====================================================================
DROP POLICY IF EXISTS "Astrologers view own reviews" ON public.reviews;
CREATE POLICY "Astrologers view own reviews" ON public.reviews
  FOR SELECT USING (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Astrologers view own earnings" ON public.astrologer_earnings;
CREATE POLICY "Astrologers view own earnings" ON public.astrologer_earnings
  FOR SELECT USING (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Astrologers manage own availability" ON public.availability_slots;
CREATE POLICY "Astrologers manage own availability" ON public.availability_slots
  FOR ALL USING (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()))
  WITH CHECK (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Astrologers manage own time off" ON public.astrologer_time_off;
CREATE POLICY "Astrologers manage own time off" ON public.astrologer_time_off
  FOR ALL USING (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()))
  WITH CHECK (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Astrologers view own stats" ON public.astrologer_stats;
CREATE POLICY "Astrologers view own stats" ON public.astrologer_stats
  FOR SELECT USING (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Astrologers view own payouts" ON public.payouts;
CREATE POLICY "Astrologers view own payouts" ON public.payouts
  FOR SELECT USING (astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()));

-- =====================================================================
-- 4. Astrologer console RPCs (see header note 2)
--    CREATE OR REPLACE so already-applied databases converge too.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.accept_consultation(p_consultation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_astrologer_id UUID;
BEGIN
  -- Resolve the caller's astrologer PROFILE id: consultations.astrologer_id
  -- references astrologers.id, which is NOT auth.uid().
  SELECT id INTO v_astrologer_id
  FROM public.astrologers
  WHERE user_id = auth.uid();

  IF v_astrologer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.consultations
    SET status = 'accepted', accepted_at = NOW()
  WHERE id = p_consultation_id
    AND astrologer_id = v_astrologer_id
    AND status = 'pending';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_consultation(
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
  SELECT id INTO v_astrologer_id
  FROM public.astrologers
  WHERE user_id = auth.uid();

  IF v_astrologer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.consultations
    SET status = 'declined', declined_reason = p_reason
  WHERE id = p_consultation_id
    AND astrologer_id = v_astrologer_id
    AND status = 'pending';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_astrologer_availability(p_slots JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_astrologer_id UUID;
  v_slot JSONB;
BEGIN
  SELECT id INTO v_astrologer_id
  FROM public.astrologers
  WHERE user_id = auth.uid();

  IF v_astrologer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.availability_slots WHERE astrologer_id = v_astrologer_id;

  IF p_slots IS NOT NULL AND jsonb_array_length(p_slots) > 0 THEN
    FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
    LOOP
      INSERT INTO public.availability_slots (astrologer_id, day_of_week, start_time, end_time, is_recurring)
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

CREATE OR REPLACE FUNCTION public.request_astrologer_payout()
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
  SELECT id INTO v_astrologer_id
  FROM public.astrologers
  WHERE user_id = auth.uid();

  IF v_astrologer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(SUM(net_amount), 0)
  INTO v_total
  FROM public.astrologer_earnings
  WHERE astrologer_id = v_astrologer_id AND status = 'pending';

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'No pending earnings to pay out';
  END IF;

  SELECT payout_method, payout_details
  INTO v_method, v_details
  FROM public.astrologers WHERE id = v_astrologer_id;

  IF v_method IS NULL THEN
    RAISE EXCEPTION 'No payout method configured. Add a bank account or UPI ID in your profile.';
  END IF;

  INSERT INTO public.payouts (astrologer_id, amount, status, payment_method, payment_details)
  VALUES (v_astrologer_id, v_total, 'pending', v_method, v_details)
  RETURNING id INTO v_payout_id;

  UPDATE public.astrologer_earnings
  SET status = 'processing', payout_id = v_payout_id
  WHERE astrologer_id = v_astrologer_id AND status = 'pending';

  RETURN QUERY SELECT v_payout_id, v_total;
END;
$$;

-- Re-assert the console RPC grants (idempotent).
GRANT EXECUTE ON FUNCTION public.accept_consultation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_consultation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_astrologer_availability(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_astrologer_payout() TO authenticated;
