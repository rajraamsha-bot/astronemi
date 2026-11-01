-- Migration 008: Production critical fixes
-- Missing RPC functions, RLS policies, and security hardening

-- ============================================================
-- 1. MISSING RPC FUNCTIONS
-- ============================================================

-- Mark payment completed (called by razorpay-webhook)
CREATE OR REPLACE FUNCTION public.mark_payment_completed_v2(
  p_razorpay_event_id TEXT,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_already_processed BOOLEAN;
BEGIN
  -- Check idempotency
  SELECT EXISTS(
    SELECT 1 FROM webhook_events WHERE event_id = p_razorpay_event_id
  ) INTO v_already_processed;

  IF v_already_processed THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already processed');
  END IF;

  -- Record the webhook event
  INSERT INTO webhook_events (event_id, event_type, payload, processed)
  VALUES (p_razorpay_event_id, 'payment.captured', jsonb_build_object(
    'razorpay_order_id', p_razorpay_order_id,
    'razorpay_payment_id', p_razorpay_payment_id
  ), true)
  ON CONFLICT (event_id) DO NOTHING;

  -- Find the payment record
  SELECT * INTO v_payment
  FROM payments
  WHERE razorpay_order_id = p_razorpay_order_id
    AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    -- Check if already completed
    SELECT * INTO v_payment
    FROM payments
    WHERE razorpay_order_id = p_razorpay_order_id
      AND status = 'completed'
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'message', 'Payment already completed');
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'Payment record not found');
  END IF;

  -- Update payment status
  UPDATE payments
  SET status = 'completed',
      razorpay_payment_id = p_razorpay_payment_id,
      razorpay_signature = p_razorpay_signature,
      updated_at = now()
  WHERE id = v_payment.id;

  -- Credit wallet for topup payments
  IF v_payment.type = 'topup' OR v_payment.type = 'wallet' THEN
    PERFORM credit_wallet(
      v_payment.user_id,
      v_payment.amount,
      v_payment.id,
      'Wallet top-up via Razorpay'
    );
  END IF;

  -- Activate subscription for subscription payments
  IF v_payment.type = 'subscription' THEN
    INSERT INTO subscriptions (
      user_id, plan_id, plan_name, amount, currency,
      start_date, end_date, is_active, payment_id
    ) VALUES (
      v_payment.user_id,
      COALESCE(v_payment.metadata->>'plan_id', 'basic_monthly'),
      COALESCE(v_payment.metadata->>'plan_id', 'basic_monthly'),
      v_payment.amount,
      v_payment.currency,
      now(),
      CASE
        WHEN COALESCE(v_payment.metadata->>'duration', 'monthly') = 'yearly'
        THEN now() + INTERVAL '1 year'
        ELSE now() + INTERVAL '1 month'
      END,
      true,
      v_payment.id
    );

    -- Update user subscription tier
    UPDATE users
    SET subscription_tier = CASE
      WHEN COALESCE(v_payment.metadata->>'plan_id', '') LIKE '%gold%' THEN 'gold'
      WHEN COALESCE(v_payment.metadata->>'plan_id', '') LIKE '%premium%' THEN 'premium'
      ELSE 'basic'
    END,
    subscription_ends_at = CASE
      WHEN COALESCE(v_payment.metadata->>'duration', 'monthly') = 'yearly'
      THEN now() + INTERVAL '1 year'
      ELSE now() + INTERVAL '1 month'
    END
    WHERE id = v_payment.user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment.id);
END;
$$;

-- Create webhook_events table if not exists (for idempotency)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
-- No user access - service role only

-- Check rate limit (called by rate-limit edge function)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action TEXT,
  p_identifier TEXT,
  p_max_attempts INTEGER DEFAULT 10,
  p_window_seconds INTEGER DEFAULT 900
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;

  -- Clean up old entries
  DELETE FROM rate_limit_entries
  WHERE created_at < v_window_start;

  -- Count attempts in window
  SELECT COUNT(*) INTO v_count
  FROM rate_limit_entries
  WHERE action = p_action
    AND identifier = p_identifier
    AND created_at > v_window_start;

  IF v_count >= p_max_attempts THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', (v_window_start + (p_window_seconds || ' seconds')::INTERVAL)::TEXT
    );
  END IF;

  -- Record this attempt
  INSERT INTO rate_limit_entries (action, identifier)
  VALUES (p_action, p_identifier);

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_max_attempts - v_count - 1,
    'reset_at', (now() + (p_window_seconds || ' seconds')::INTERVAL)::TEXT
  );
END;
$$;

-- Create rate_limit_entries table if not exists
CREATE TABLE IF NOT EXISTS rate_limit_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup ON rate_limit_entries (action, identifier, created_at);
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;
-- No user access - service role only

-- Cancel subscription securely
CREATE OR REPLACE FUNCTION public.cancel_subscription_secure(
  p_subscription_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
BEGIN
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE id = p_subscription_id
    AND user_id = p_user_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription not found or already cancelled');
  END IF;

  -- Mark as cancelled but keep active until end_date (grace period)
  UPDATE subscriptions
  SET cancelled_at = now()
  WHERE id = p_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Subscription will remain active until end of billing period',
    'end_date', v_subscription.end_date::TEXT
  );
END;
$$;

-- Process payment refund
CREATE OR REPLACE FUNCTION public.process_payment_refund(
  p_payment_id UUID,
  p_amount NUMERIC,
  p_reason TEXT DEFAULT 'User requested'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
BEGIN
  SELECT * INTO v_payment
  FROM payments
  WHERE id = p_payment_id
    AND status = 'completed';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found or not completed');
  END IF;

  IF p_amount > v_payment.amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Refund amount exceeds payment amount');
  END IF;

  -- Update payment status
  UPDATE payments
  SET status = 'refunded',
      metadata = metadata || jsonb_build_object('refund_amount', p_amount, 'refund_reason', p_reason, 'refunded_at', now())
  WHERE id = p_payment_id;

  -- Debit wallet if it was a topup (reverse the credit)
  IF v_payment.type = 'topup' OR v_payment.type = 'wallet' THEN
    PERFORM debit_wallet(
      v_payment.user_id,
      p_amount,
      p_payment_id,
      'Refund: ' || p_reason
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'refunded_amount', p_amount);
END;
$$;

-- ============================================================
-- 2. RLS POLICIES FOR UNPROTECTED TABLES
-- ============================================================

-- audit_logs: Only admins can read
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT USING (is_admin());

-- products: Anyone can read, only admins can modify
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Products are publicly readable" ON products;
CREATE POLICY "Products are publicly readable" ON products
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Only admins can modify products" ON products;
CREATE POLICY "Only admins can modify products" ON products
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- horoscopes: Anyone can read, only service can write
ALTER TABLE horoscopes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Horoscopes are publicly readable" ON horoscopes;
CREATE POLICY "Horoscopes are publicly readable" ON horoscopes
  FOR SELECT USING (true);

-- panchang: Anyone can read
ALTER TABLE panchang ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Panchang is publicly readable" ON panchang;
CREATE POLICY "Panchang is publicly readable" ON panchang
  FOR SELECT USING (true);

-- muhurats: Anyone can read
ALTER TABLE muhurats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Muhurats are publicly readable" ON muhurats;
CREATE POLICY "Muhurats are publicly readable" ON muhurats
  FOR SELECT USING (true);

-- otp_storage: No user access (service role only via SECURITY DEFINER functions)
ALTER TABLE otp_storage ENABLE ROW LEVEL SECURITY;

-- payment_idempotency_keys: No user access (service role only)
ALTER TABLE payment_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- subscription_plans: Anyone can read
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
    EXECUTE 'ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Plans are publicly readable" ON subscription_plans FOR SELECT USING (true)';
  END IF;
END $$;

-- ============================================================
-- 3. FIX get_astrologer_earnings AUTH CHECK
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_astrologer_earnings(p_astrologer_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  -- Only allow the astrologer themselves or an admin to view earnings
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_caller_id != p_astrologer_id AND NOT is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Not authorized to view these earnings';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM payments
  WHERE status = 'completed'
    AND metadata->>'astrologer_id' = p_astrologer_id::TEXT;

  RETURN v_total;
END;
$$;

-- ============================================================
-- 4. FIX: Restrict GRANT ALL to specific permissions
-- ============================================================

-- Revoke overly broad grant and re-grant specific permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
-- Specific INSERT/UPDATE/DELETE is handled by RLS policies

-- Grant service role full access (for edge functions)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ============================================================
-- 5. SUBSCRIPTION EXPIRY ENFORCEMENT
-- ============================================================

-- Function to expire subscriptions and downgrade users
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deactivate expired subscriptions
  UPDATE subscriptions
  SET is_active = false
  WHERE is_active = true
    AND end_date < now();

  -- Downgrade users whose subscriptions have expired
  UPDATE users
  SET subscription_tier = 'free',
      subscription_ends_at = NULL
  WHERE subscription_tier != 'free'
    AND subscription_ends_at IS NOT NULL
    AND subscription_ends_at < now();
END;
$$;

-- Create pg_cron extension if available (Supabase hosted supports this)
-- Run expire_subscriptions every hour
-- NOTE: Requires pg_cron extension enabled in Supabase dashboard
DO $$
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'expire-subscriptions',
      '0 * * * *',  -- Every hour at minute 0
      'SELECT public.expire_subscriptions()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not available, function can be called manually or via edge function
  RAISE NOTICE 'pg_cron not available. Call expire_subscriptions() manually or via edge function.';
END $$;
