-- Migration 062: Reconcile subscribe_astrologer_secure RPC
-- Harmonizes parameter types, looks up payment by UUID or Razorpay string,
-- uses the actual schema of astrologer_subscriptions (plan_id FK, razorpay_payment_id, amount_paid_inr).

DROP FUNCTION IF EXISTS public.subscribe_astrologer_secure(UUID, UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.subscribe_astrologer_secure(UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.subscribe_astrologer_secure(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.subscribe_astrologer_secure(
  p_astrologer_id  UUID,
  p_plan_slug      TEXT,
  p_billing_cycle  TEXT,
  p_payment_id     TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller CONSTANT UUID := auth.uid();
  v_user_id UUID;
  v_payment RECORD;
  v_pricing_amount NUMERIC(12,2);
  v_period_start TIMESTAMPTZ := now();
  v_period_end   TIMESTAMPTZ;
  v_new_id UUID;
  v_plan_id UUID;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  SELECT user_id INTO v_user_id FROM public.astrologers WHERE id = p_astrologer_id;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Astrologer not found');
  END IF;
  IF v_user_id <> v_caller AND NOT public.is_admin(v_caller) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot subscribe on behalf of another astrologer');
  END IF;

  IF p_plan_slug NOT IN ('pro','elite') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid plan');
  END IF;
  IF p_billing_cycle NOT IN ('monthly','quarterly','yearly') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid billing cycle');
  END IF;

  -- Look up plan_id from astrologer_subscription_plans
  SELECT id INTO v_plan_id
    FROM public.astrologer_subscription_plans
    WHERE slug = p_plan_slug;
  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Plan not found in catalog');
  END IF;

  SELECT amount_inr INTO v_pricing_amount
    FROM public.astrologer_subscription_pricing
    WHERE plan_slug = p_plan_slug
      AND billing_cycle = p_billing_cycle
      AND is_active = true;
  IF v_pricing_amount IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pricing for plan/cycle not found');
  END IF;

  -- Look up payment by UUID or razorpay_payment_id or order_id
  SELECT id, status, type, amount, user_id, razorpay_payment_id
    INTO v_payment
    FROM public.payments
    WHERE (
      (CASE WHEN p_payment_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN id = p_payment_id::UUID
            ELSE false END)
      OR razorpay_payment_id = p_payment_id
      OR razorpay_order_id = p_payment_id
      OR order_id = p_payment_id
    )
    FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payment record not found');
  END IF;
  IF v_payment.status <> 'completed' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payment not completed');
  END IF;
  IF v_payment.type <> 'astrologer_subscription' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payment is not for an astrologer subscription');
  END IF;
  IF v_payment.amount <> v_pricing_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payment amount does not match subscription price');
  END IF;

  -- Idempotency check on razorpay_payment_id or payment record
  IF EXISTS (
    SELECT 1 FROM public.astrologer_subscriptions
    WHERE razorpay_payment_id = COALESCE(v_payment.razorpay_payment_id, p_payment_id)
  ) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Subscription already active');
  END IF;

  v_period_end := CASE p_billing_cycle
    WHEN 'monthly'   THEN v_period_start + INTERVAL '1 month'
    WHEN 'quarterly' THEN v_period_start + INTERVAL '3 months'
    WHEN 'yearly'    THEN v_period_start + INTERVAL '1 year'
  END;

  -- Cancel existing active subscriptions for this astrologer
  UPDATE public.astrologer_subscriptions
    SET status = 'cancelled',
        cancelled_at = now(),
        updated_at = now()
    WHERE astrologer_id = p_astrologer_id
      AND status = 'active';

  INSERT INTO public.astrologer_subscriptions (
    astrologer_id, plan_id, status, billing_cycle,
    current_period_start, current_period_end,
    razorpay_payment_id, amount_paid_inr, auto_renew,
    created_at, updated_at
  ) VALUES (
    p_astrologer_id, v_plan_id, 'active', p_billing_cycle,
    v_period_start, v_period_end,
    COALESCE(v_payment.razorpay_payment_id, p_payment_id), v_pricing_amount, true,
    now(), now()
  )
  RETURNING id INTO v_new_id;

  PERFORM public.log_audit(
    v_caller,
    'astrologer_subscription_activated',
    jsonb_build_object('astrologer_id', p_astrologer_id, 'plan', p_plan_slug,
                       'cycle', p_billing_cycle, 'payment_id', v_payment.id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Subscription activated',
    'subscription_id', v_new_id,
    'ends_at', v_period_end
  );
END;
$$;

REVOKE ALL ON FUNCTION public.subscribe_astrologer_secure(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_astrologer_secure(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
