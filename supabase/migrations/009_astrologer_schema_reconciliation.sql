-- Migration 009 (reordered): Reconcile astrologers/consultations columns
--
-- WHY THIS RUNS BEFORE MIGRATION 010:
--   The app (services/api.ts, services/chat.ts, lib/database.types.ts) and
--   migration 010 (AI astrologer seed) reference columns that NO earlier
--   migration created. On a fresh database, 010's INSERT with avatar_url /
--   expertise would fail with "column does not exist". This file sorts
--   between 008 and 010 ("astrologer..." < "payment...") so the columns
--   exist before anything uses them.
--
-- Columns added:
--   astrologers: avatar_url, expertise, available_from, available_to
--     (001/004 only defined `avatar`; `expertise`/`available_from|to` were
--      never defined but are used by migration 010 and every client query)
--   consultations: total_amount
--     (migrations 011 and 024 write total_amount, and the client reads it,
--      but 001 only defined `price`. Kept nullable — safe.)
--
-- SAFE TO RE-RUN: ADD COLUMN IF NOT EXISTS + idempotent backfill.

ALTER TABLE public.astrologers
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS expertise TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS available_from TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS available_to TIMESTAMP WITH TIME ZONE;

-- Backfill avatar_url from the legacy avatar column so existing seed rows
-- keep their pictures.
UPDATE public.astrologers
SET avatar_url = avatar
WHERE avatar_url IS NULL AND avatar IS NOT NULL;

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2);

-- ============================================================
-- PAYMENT RPC RECONCILIATION (merged from 009b)
--
-- The Supabase GitHub integration only tracks numeric migration versions, so
-- 009b was skipped on a fresh project. Its payment RPC definitions and wallet
-- grants are required by the edge functions, so they are applied here.
-- ============================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_sub
  ON public.subscriptions (razorpay_subscription_id);

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
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_payment.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already processed');
  END IF;

  UPDATE public.payments
  SET status = 'completed',
      razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_payment_id),
      method = COALESCE(p_method::payment_method, method),
      updated_at = now()
  WHERE id = p_payment_id;

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

REVOKE EXECUTE ON FUNCTION public.credit_wallet(UUID, DECIMAL, TEXT, TEXT, UUID, UUID) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.debit_wallet(UUID, DECIMAL, TEXT, TEXT, UUID, UUID)  FROM authenticated, anon;
GRANT  EXECUTE ON FUNCTION public.credit_wallet(UUID, DECIMAL, TEXT, TEXT, UUID, UUID) TO service_role;
GRANT  EXECUTE ON FUNCTION public.debit_wallet(UUID, DECIMAL, TEXT, TEXT, UUID, UUID)  TO service_role;
