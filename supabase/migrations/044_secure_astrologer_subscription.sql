-- Migration 044: Secure Astrologer Subscription with Payment Verification
-- 
-- SECURITY FIX: The original subscribe_astrologer function in migration 013
-- accepted nullable p_payment_id and directly created active subscriptions
-- without verifying payment completion or amount. This allowed any 
-- authenticated user to bypass payment.
--
-- This migration:
-- 1. Revokes authenticated access to the original function
-- 2. Creates a new payment-verified wrapper function
-- 3. Grants only the secure wrapper to authenticated users

-- Revoke direct access to the original subscribe_astrologer function
REVOKE EXECUTE ON FUNCTION subscribe_astrologer(UUID, UUID, TEXT, TEXT, UUID) FROM authenticated;

-- Create payment-verified secure subscription function
CREATE OR REPLACE FUNCTION subscribe_astrologer_secure(
  p_subscriber_id UUID,
  p_astrologer_id UUID,
  p_tier TEXT,
  p_cycle TEXT,
  p_payment_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_payment_record RECORD;
  v_expected_type TEXT;
  v_expected_amount NUMERIC;
  v_tier_prices JSONB;
BEGIN
  -- SECURITY: Verify caller is the subscriber
  IF auth.uid() != p_subscriber_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unauthorized: You can only subscribe for yourself'
    );
  END IF;

  -- SECURITY: Payment ID is required (no free subscriptions)
  IF p_payment_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Payment verification required'
    );
  END IF;

  -- SECURITY: Verify payment exists, is completed, and matches the subscription type
  SELECT 
    id, user_id, type, amount, currency, status, metadata
  INTO v_payment_record
  FROM payments
  WHERE id = p_payment_id
    AND status = 'completed'
    AND user_id = p_subscriber_id
  FOR UPDATE; -- Lock payment row to prevent double-use

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Payment not found or not completed'
    );
  END IF;

  -- SECURITY: Verify payment type matches subscription
  v_expected_type := 'astrologer_subscription';
  IF v_payment_record.type != v_expected_type THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Payment type mismatch: expected ' || v_expected_type || ', got ' || v_payment_record.type
    );
  END IF;

  -- SECURITY: Verify payment amount matches tier/cycle pricing
  -- Tier prices per month in INR (these should match your pricing in the app)
  v_tier_prices := jsonb_build_object(
    'basic', 99,
    'premium', 299,
    'gold', 599
  );

  -- Calculate expected amount based on cycle
  v_expected_amount := (v_tier_prices->>p_tier)::NUMERIC;
  IF p_cycle = 'quarterly' THEN
    v_expected_amount := v_expected_amount * 3 * 0.95; -- 5% discount
  ELSIF p_cycle = 'yearly' THEN
    v_expected_amount := v_expected_amount * 12 * 0.85; -- 15% discount
  END IF;

  -- Allow small rounding differences (up to 1 rupee)
  IF ABS(v_payment_record.amount - v_expected_amount) > 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Payment amount mismatch: expected ₹' || v_expected_amount || ', got ₹' || v_payment_record.amount
    );
  END IF;

  -- SECURITY: Check if payment has already been used for a subscription
  IF EXISTS (
    SELECT 1 FROM astrologer_subscriptions
    WHERE payment_id = p_payment_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Payment has already been used for a subscription'
    );
  END IF;

  -- All security checks passed - delegate to the original function
  -- The original function is still SECURITY DEFINER and handles the actual
  -- subscription creation logic (ownership checks, duration calculation, etc.)
  RETURN subscribe_astrologer(
    p_subscriber_id,
    p_astrologer_id,
    p_tier,
    p_cycle,
    p_payment_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution only to authenticated users
GRANT EXECUTE ON FUNCTION subscribe_astrologer_secure(UUID, UUID, TEXT, TEXT, UUID) TO authenticated;

-- Add comment documenting the security model
COMMENT ON FUNCTION subscribe_astrologer_secure IS 
'Secure wrapper for astrologer subscriptions. Verifies payment completion, amount, 
and type before delegating to subscribe_astrologer. Payment ID is required and 
must reference a completed payment of the correct type and amount.';

-- Optional: Add index to speed up payment verification queries
CREATE INDEX IF NOT EXISTS idx_payments_verification 
ON payments(id, user_id, status, type) 
WHERE status = 'completed';
