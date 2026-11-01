-- Migration 009: Payment RPC reconciliation
--
-- WHY THIS EXISTS
-- The Edge Functions (verify-payment, razorpay-webhook) call a set of RPCs
-- whose signatures drifted from the definitions in migration 008. This caused
-- two classes of production bugs:
--   1. Signature mismatches  -> RPC calls throw "function does not exist".
--   2. Double-credit risk     -> both verify-payment (synchronous) and the
--      webhook (async) applied the SAME payment, with no shared idempotency.
--
-- This migration redefines the money-applying RPCs so that:
--   * Their signatures match exactly what the edge functions call.
--   * Crediting/activation is idempotent on the payment's status (a payment
--     can only ever be applied once, no matter how many times either path
--     fires).
--
-- Canonical schema (from lib/database.types.ts / migration 001 + 008):
--   users.subscription_tier, users.subscription_ends_at
--   payments(id, user_id, amount, currency, status, type, metadata,
--            razorpay_payment_id, razorpay_order_id)
--   subscriptions(user_id, plan_id, plan_name, amount, currency, payment_id,
--                 payment_status, start_date, end_date, is_active)
--
-- SAFE TO RE-RUN: uses CREATE OR REPLACE and additive ALTERs.

-- ============================================================
-- 0. Schema additions needed by the webhook
-- ============================================================

-- The subscription.cancelled webhook identifies a subscription by its
-- Razorpay subscription id. Add the column if it isn't there yet.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_sub
  ON public.subscriptions (razorpay_subscription_id);

-- ============================================================
-- 1. mark_payment_completed_v2  (called by razorpay-webhook AND verify-payment)
--    Signature matches the webhook call:
--      mark_payment_completed_v2(p_payment_id, p_razorpay_payment_id,
--                                p_method, p_amount_received)
--    Idempotent: only applies business logic on the pending -> completed
--    transition, guarded by SELECT ... FOR UPDATE.
-- ============================================================

-- Drop the old (incompatible) 4-TEXT-arg version from migration 008.
DROP FUNCTION IF EXISTS public.mark_payment_completed_v2(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.mark_payment_completed_v2(
  p_payment_id UUID,
  p_razorpay_payment_id TEXT DEFAULT NULL,
  p_method TEXT DEFAULT NULL,
  p_amount_received NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_is_yearly BOOLEAN;
  v_plan TEXT;
  v_tier TEXT;
  v_end TIMESTAMPTZ;
BEGIN
  PERFORM set_config('app.bypass_user_protection', 'on', true);
  -- Lock the payment row so concurrent webhook + verify-payment calls serialise.
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  -- Idempotency: already applied -> no-op.
  IF v_payment.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already processed');
  END IF;

  -- Mark completed first; the FOR UPDATE lock guarantees only one caller wins.
  UPDATE public.payments
  SET status = 'completed',
      razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_payment_id),
      method = COALESCE(p_method::payment_method, method),
      updated_at = now()
  WHERE id = p_payment_id;

  -- Apply business logic exactly once.
  IF v_payment.type IN ('topup', 'wallet') THEN
    PERFORM public.credit_wallet(
      v_payment.user_id,
      v_payment.amount,
      'razorpay',
      'Wallet top-up via Razorpay',
      v_payment.id,
      NULL
    );

  ELSIF v_payment.type = 'subscription' THEN
    v_plan := COALESCE(v_payment.metadata->>'plan_id', 'basic_monthly');
    v_is_yearly := (COALESCE(v_payment.metadata->>'duration', '') = 'yearly')
                    OR (v_plan LIKE '%yearly%');
    v_end := CASE WHEN v_is_yearly THEN now() + INTERVAL '1 year'
                  ELSE now() + INTERVAL '1 month' END;
    v_tier := CASE
      WHEN v_plan LIKE '%gold%' THEN 'gold'
      WHEN v_plan LIKE '%premium%' THEN 'premium'
      ELSE 'basic'
    END;

    INSERT INTO public.subscriptions (
      user_id, plan_id, plan_name, amount, currency,
      payment_id, payment_status, start_date, end_date, is_active
    ) VALUES (
      v_payment.user_id, v_plan, v_plan, v_payment.amount,
      COALESCE(v_payment.currency, 'INR'), v_payment.id, 'completed',
      now(), v_end, true
    );

    UPDATE public.users
    SET subscription_tier = v_tier,
        subscription_ends_at = v_end
    WHERE id = v_payment.user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment.id);
END;
$$;

-- ============================================================
-- 2. cancel_subscription_secure  (called by razorpay-webhook)
--    Signature matches the webhook call: (p_razorpay_sub_id TEXT)
--    The previous (p_subscription_id UUID, p_user_id UUID) overload is kept
--    for any in-app caller.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cancel_subscription_secure(
  p_razorpay_sub_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  PERFORM set_config('app.bypass_user_protection', 'on', true);
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE razorpay_subscription_id = p_razorpay_sub_id
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active subscription not found');
  END IF;

  -- Deactivate the subscription and downgrade the user.
  UPDATE public.subscriptions
  SET is_active = false
  WHERE id = v_sub.id;

  UPDATE public.users
  SET subscription_tier = 'free',
      subscription_ends_at = NULL
  WHERE id = v_sub.user_id;

  RETURN jsonb_build_object('success', true, 'subscription_id', v_sub.id);
END;
$$;

-- ============================================================
-- 3. Lock down the wallet RPCs
--    credit_wallet / debit_wallet are SECURITY DEFINER and take an arbitrary
--    p_user_id, so a logged-in user could otherwise move another user's money.
--    Restrict EXECUTE to service_role only; all client wallet operations must
--    go through the deduct-wallet / verify-payment edge functions, which set
--    p_user_id from the verified JWT.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.credit_wallet(UUID, DECIMAL, TEXT, TEXT, UUID, UUID) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.debit_wallet(UUID, DECIMAL, TEXT, TEXT, UUID, UUID)  FROM authenticated, anon;
GRANT  EXECUTE ON FUNCTION public.credit_wallet(UUID, DECIMAL, TEXT, TEXT, UUID, UUID) TO service_role;
GRANT  EXECUTE ON FUNCTION public.debit_wallet(UUID, DECIMAL, TEXT, TEXT, UUID, UUID)  TO service_role;
