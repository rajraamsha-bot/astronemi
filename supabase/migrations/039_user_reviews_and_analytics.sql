-- Migration 039: user-reviews sync enablement + analytics aggregates
--
-- Fixes verified during the 2026-08 production-readiness engagement:
--   A. public.reviews had TWO divergent shapes: 011 created it WITHOUT
--      consultation_id (user_name/user_avatar/consultation_type), while 019's
--      INSERT policy and index reference consultation_id. 019 now ALTERs the
--      column in (see 019 patch); this migration re-asserts the strict INSERT
--      policy idempotently so databases migrated before that fix converge.
--   B. Lifetime/pending earnings for the astrologer dashboard were computed
--      by fetching EVERY completed consultation to the client. Replace with
--      an O(1)-transfer SECURITY DEFINER aggregate over astrologer_earnings.
--
-- SAFE TO RE-RUN: IF NOT EXISTS / CREATE OR REPLACE / idempotent policy DDL.

-- =====================================================================
-- A. reviews: strict, self-verifying INSERT path (mirrors 019 intent,
--    additionally requiring the reviewer to own the consultation)
-- =====================================================================
DROP POLICY IF EXISTS "Users create own reviews" ON public.reviews;
CREATE POLICY "Users create own reviews" ON public.reviews
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND consultation_id IS NOT NULL
    AND astrologer_id = (
      SELECT c.astrologer_id
      FROM public.consultations c
      WHERE c.id = reviews.consultation_id
        AND c.user_id = auth.uid()
        AND c.status IN ('active', 'in_progress', 'completed')
    )
  );

-- =====================================================================
-- B. Server-side earnings aggregates (lifetime + pending payout)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.astrologer_earnings_summary(p_astrologer_id UUID)
RETURNS TABLE(lifetime_net NUMERIC, pending_net NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(net_amount), 0)::NUMERIC,
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'pending'), 0)::NUMERIC
  FROM public.astrologer_earnings
  WHERE astrologer_id = p_astrologer_id;
$$;

REVOKE ALL ON FUNCTION public.astrologer_earnings_summary(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.astrologer_earnings_summary(UUID) TO authenticated;
