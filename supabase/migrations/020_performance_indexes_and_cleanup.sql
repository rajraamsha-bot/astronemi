-- Migration 020: Performance indexes + cleanup
--
-- Adds missing indexes identified during security/performance review:
--   - payments.razorpay_order_id (used by verify-payment Edge Function)
--   - payments.razorpay_payment_id (used by webhook handler)
--   - consultations(astrologer_id, status) composite (used by getAstrologerInbox)
--
-- Also removes the legacy update_wallet_balance function (replaced by
-- credit_wallet/debit_wallet RPCs) to prevent accidental direct calls.

-- =============================================================================
-- 1. Performance indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id
  ON public.payments(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id
  ON public.payments(razorpay_payment_id);

CREATE INDEX IF NOT EXISTS idx_consultations_astrologer_status
  ON public.consultations(astrologer_id, status);

-- =============================================================================
-- 2. Remove legacy update_wallet_balance function
-- =============================================================================
-- This function from the original schema uses SECURITY DEFINER but lacks
-- the GUC escape hatch, making it incompatible with migration 017's
-- enforce_user_update_restrictions trigger. It should not be called;
-- credit_wallet / debit_wallet are the correct entry points.

DROP FUNCTION IF EXISTS public.update_wallet_balance(UUID, DECIMAL);

-- =============================================================================
-- 3. Server-side astrologer rating aggregation
-- =============================================================================
-- Replaces the client-side N+1 query that fetched all ratings then
-- updated the astrologer row. This RPC performs the aggregation in a
-- single round-trip using SQL.

CREATE OR REPLACE FUNCTION public.update_astrologer_rating(p_astrologer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg DECIMAL(3,2);
  v_count INTEGER;
BEGIN
  SELECT
    COALESCE(ROUND(AVG(user_rating)::NUMERIC, 2), 0),
    COUNT(*)::INTEGER
  INTO v_avg, v_count
  FROM consultations
  WHERE astrologer_id = p_astrologer_id
    AND user_rating IS NOT NULL;

  UPDATE astrologers
  SET rating = v_avg,
      total_reviews = v_count,
      updated_at = NOW()
  WHERE id = p_astrologer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_astrologer_rating(UUID) TO authenticated;
