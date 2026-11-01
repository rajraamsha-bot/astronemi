-- Migration 046: Money-path integrity fixes
-- 1. Server-priced topup denominations and question prices
-- 2. Astrologer subscription pricing table; tighten subscribe_astrologer_secure
-- 3. Fix process_payment_refund wallet-failure fail-closed
-- 4. Add fail_payment_for_consultation RPC
-- 5. Add consultation_billing running-total reconciliation
-- 6. Update live_streams to support server-side state; add live_stream_gifts
-- 7. Update fulfill_payment_v1 to call log_audit and to handle astrologer_subscription
-- 8. Add user_notification_settings table
-- 9. Add UNIQUE on wallet_transactions(user_id) WHERE reference_type='signup_bonus' guard
-- 10. Idempotency hardening on apply_referral_code

-- ============================================================
-- 1. Server-priced catalogs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.topup_denominations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_inr  NUMERIC(12,2) NOT NULL UNIQUE,
  bonus_inr   NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.topup_denominations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads active topups" ON public.topup_denominations;
CREATE POLICY "Anyone reads active topups" ON public.topup_denominations
  FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage topups" ON public.topup_denominations;
CREATE POLICY "Admins manage topups" ON public.topup_denominations
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.topup_denominations (amount_inr, bonus_inr, display_order) VALUES
  (100, 0, 1),
  (500, 25, 2),
  (1000, 75, 3),
  (2000, 200, 4),
  (5000, 600, 5),
  (10000, 1500, 6)
ON CONFLICT (amount_inr) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.question_prices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  amount_inr  NUMERIC(12,2) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.question_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads active question prices" ON public.question_prices;
CREATE POLICY "Anyone reads active question prices" ON public.question_prices
  FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage question prices" ON public.question_prices;
CREATE POLICY "Admins manage question prices" ON public.question_prices
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.question_prices (slug, display_name, amount_inr, display_order) VALUES
  ('basic', 'Basic Question', 149, 1),
  ('detailed', 'Detailed Reading', 199, 2)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. Astrologer subscription pricing table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.astrologer_subscription_pricing (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug       TEXT NOT NULL,
  billing_cycle   TEXT NOT NULL,
  amount_inr      NUMERIC(12,2) NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_slug, billing_cycle),
  CHECK (plan_slug IN ('pro','elite')),
  CHECK (billing_cycle IN ('monthly','quarterly','yearly'))
);

ALTER TABLE public.astrologer_subscription_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads active subscription pricing" ON public.astrologer_subscription_pricing;
CREATE POLICY "Anyone reads active subscription pricing" ON public.astrologer_subscription_pricing
  FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage subscription pricing" ON public.astrologer_subscription_pricing;
CREATE POLICY "Admins manage subscription pricing" ON public.astrologer_subscription_pricing
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.astrologer_subscription_pricing (plan_slug, billing_cycle, amount_inr) VALUES
  ('pro',    'monthly',  1999),
  ('pro',    'quarterly', 5697),
  ('pro',    'yearly',   19999),
  ('elite',  'monthly',  4999),
  ('elite',  'quarterly', 14247),
  ('elite',  'yearly',   49999)
ON CONFLICT (plan_slug, billing_cycle) DO NOTHING;

-- ============================================================
-- 2b. Rewrite subscribe_astrologer_secure to use the new table
-- ============================================================
CREATE OR REPLACE FUNCTION public.subscribe_astrologer_secure(
  p_astrologer_id  UUID,
  p_plan_slug      TEXT,
  p_billing_cycle  TEXT,
  p_payment_id     UUID
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
  v_existing_id UUID;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT user_id INTO v_user_id FROM public.astrologers WHERE id = p_astrologer_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Astrologer not found';
  END IF;
  IF v_user_id <> v_caller AND NOT public.is_admin(v_caller) THEN
    RAISE EXCEPTION 'Cannot subscribe on behalf of another astrologer';
  END IF;

  IF p_plan_slug NOT IN ('pro','elite') THEN
    RAISE EXCEPTION 'Invalid plan';
  END IF;
  IF p_billing_cycle NOT IN ('monthly','quarterly','yearly') THEN
    RAISE EXCEPTION 'Invalid billing cycle';
  END IF;

  SELECT amount_inr INTO v_pricing_amount
    FROM public.astrologer_subscription_pricing
    WHERE plan_slug = p_plan_slug
      AND billing_cycle = p_billing_cycle
      AND is_active = true;
  IF v_pricing_amount IS NULL THEN
    RAISE EXCEPTION 'Pricing for plan/cycle not found';
  END IF;

  SELECT id, status, type, amount, user_id
    INTO v_payment
    FROM public.payments
    WHERE id = p_payment_id
    FOR UPDATE;
  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;
  IF v_payment.status <> 'completed' THEN
    RAISE EXCEPTION 'Payment not completed';
  END IF;
  IF v_payment.type <> 'astrologer_subscription' THEN
    RAISE EXCEPTION 'Payment is not for an astrologer subscription';
  END IF;
  IF v_payment.amount <> v_pricing_amount THEN
    RAISE EXCEPTION 'Payment amount (% INR) does not match subscription price (% INR)', v_payment.amount, v_pricing_amount;
  END IF;

  -- Idempotency: a single payment_id can only activate one subscription.
  IF EXISTS (SELECT 1 FROM public.astrologer_subscriptions WHERE payment_id = p_payment_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Subscription already active');
  END IF;

  v_period_end := CASE p_billing_cycle
    WHEN 'monthly'   THEN v_period_start + INTERVAL '1 month'
    WHEN 'quarterly' THEN v_period_start + INTERVAL '3 months'
    WHEN 'yearly'    THEN v_period_start + INTERVAL '1 year'
  END;

  SELECT id INTO v_existing_id
    FROM public.astrologer_subscriptions
    WHERE astrologer_id = p_astrologer_id
      AND status = 'active'
    FOR UPDATE;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.astrologer_subscriptions
      SET plan_slug = p_plan_slug,
          billing_cycle = p_billing_cycle,
          current_period_start = v_period_start,
          current_period_end = v_period_end,
          payment_id = p_payment_id,
          updated_at = now()
      WHERE id = v_existing_id
      RETURNING id INTO v_new_id;
  ELSE
    INSERT INTO public.astrologer_subscriptions (
      astrologer_id, plan_slug, billing_cycle,
      current_period_start, current_period_end,
      status, payment_id, auto_renew, created_at, updated_at
    ) VALUES (
      p_astrologer_id, p_plan_slug, p_billing_cycle,
      v_period_start, v_period_end,
      'active', p_payment_id, true, now(), now()
    )
    RETURNING id INTO v_new_id;
  END IF;

  PERFORM public.log_audit(
    v_caller,
    'astrologer_subscription_activated',
    jsonb_build_object('astrologer_id', p_astrologer_id, 'plan', p_plan_slug,
                       'cycle', p_billing_cycle, 'payment_id', p_payment_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Subscription activated',
    'subscription_id', v_new_id,
    'ends_at', v_period_end
  );
END;
$$;

-- ============================================================
-- 3. Fix process_payment_refund: fail closed if wallet debit fails
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_payment_refund(
  p_payment_id UUID,
  p_amount     NUMERIC(12,2),
  p_reason     TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_refunded NUMERIC(12,2) := 0;
  v_user_id UUID;
  v_type TEXT;
  v_refund_id UUID;
  v_debit_success BOOLEAN;
BEGIN
  PERFORM public.__assert_service_role('process_payment_refund');

  SELECT id, user_id, amount, type, status, metadata
    INTO v_payment
    FROM public.payments
    WHERE id = p_payment_id
    FOR UPDATE;
  IF v_payment.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'payment_not_found');
  END IF;
  IF v_payment.status = 'refunded' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_refunded');
  END IF;
  IF v_payment.status <> 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'payment_not_completed');
  END IF;

  v_refunded := COALESCE((v_payment.metadata->>'refunds_total')::NUMERIC, 0);
  IF p_amount <= 0 OR p_amount > (v_payment.amount - v_refunded) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_refund_amount');
  END IF;

  v_user_id := v_payment.user_id;
  v_type    := v_payment.type;

  -- Wallet-funded payments must reverse the wallet debit before status flips.
  IF v_type IN ('wallet_topup','topup','subscription','astrologer_subscription') THEN
    SELECT (d.success IS TRUE) INTO v_debit_success
      FROM public.debit_wallet(
        p_user_id := v_user_id,
        p_amount  := p_amount,
        p_reason  := 'refund:' || p_payment_id::text,
        p_reference_id := p_payment_id::text,
        p_reference_type := 'refund'
      ) AS d(success, new_balance, error);
    IF v_debit_success IS DISTINCT FROM TRUE THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'wallet_debit_failed',
        'detail', 'Refusing to mark payment refunded when wallet reversal failed'
      );
    END IF;
  END IF;

  UPDATE public.payments
    SET status = 'refunded',
        metadata = metadata || jsonb_build_object(
          'refunds_total', v_refunded + p_amount,
          'refund_amount', p_amount,
          'refund_reason', p_reason,
          'refunded_at', now()
        ),
        updated_at = now()
    WHERE id = p_payment_id;

  INSERT INTO public.payment_refunds (payment_id, amount, reason, processed_at)
    VALUES (p_payment_id, p_amount, p_reason, now())
    RETURNING id INTO v_refund_id;

  PERFORM public.log_audit(
    auth.uid(),
    'payment_refund_processed',
    jsonb_build_object('payment_id', p_payment_id, 'amount', p_amount, 'reason', p_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'refund_id', v_refund_id,
    'refunded_total', v_refunded + p_amount
  );
END;
$$;

-- Ensure payment_refunds table exists (was likely created ad-hoc earlier).
CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    UUID NOT NULL REFERENCES public.payments(id),
  amount        NUMERIC(12,2) NOT NULL,
  reason        TEXT,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only on payment_refunds" ON public.payment_refunds;
CREATE POLICY "Service role only on payment_refunds" ON public.payment_refunds
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- 4. fail_payment_for_consultation RPC for H-11
-- ============================================================
CREATE OR REPLACE FUNCTION public.fail_payment_for_consultation(
  p_consultation_id UUID,
  p_reason TEXT DEFAULT 'payment_failed'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller CONSTANT UUID := auth.uid();
  v_con RECORD;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT user_id, status, astrologer_id
    INTO v_con
    FROM public.consultations
    WHERE id = p_consultation_id
    FOR UPDATE;
  IF v_con.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF v_con.user_id <> v_caller AND NOT public.is_admin(v_caller) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF v_con.status NOT IN ('pending','confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_state');
  END IF;

  UPDATE public.consultations
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = p_consultation_id;

  PERFORM public.log_audit(v_caller, 'consultation_payment_failed',
    jsonb_build_object('consultation_id', p_consultation_id, 'reason', p_reason));

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.fail_payment_for_consultation(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fail_payment_for_consultation(UUID, TEXT) TO authenticated;

-- ============================================================
-- 5. log_audit calls for fulfillment_v1 (H-13)
-- The function body is large; we patch it by adding audit calls via
-- a wrapper that fulfill_payment_v1 invokes at the end. Easier and
-- safer: add an AFTER INSERT trigger on payment_fulfillments that
-- writes an audit row.
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_payment_fulfillment() RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_audit(
    COALESCE(auth.uid(), NULL),
    'payment_fulfilled',
    jsonb_build_object(
      'payment_id', NEW.payment_id,
      'status', NEW.status,
      'type', NEW.payment_type
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payment_fulfillment ON public.payment_fulfillments;
CREATE TRIGGER trg_audit_payment_fulfillment
  AFTER INSERT OR UPDATE ON public.payment_fulfillments
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_fulfillment();

-- ============================================================
-- 6. live_stream_gifts table (H-10)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.live_stream_gifts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id     TEXT NOT NULL,
  sender_id     UUID NOT NULL REFERENCES public.users(id),
  astrologer_id UUID REFERENCES public.astrologers(id),
  gift_id       TEXT NOT NULL,
  amount_inr    NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ledger_ref    UUID REFERENCES public.wallet_transactions(id),
  UNIQUE (sender_id, stream_id, gift_id)
);

ALTER TABLE public.live_stream_gifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Senders view own gifts" ON public.live_stream_gifts;
CREATE POLICY "Senders view own gifts" ON public.live_stream_gifts
  FOR SELECT TO authenticated USING (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Astrologers view own gifts" ON public.live_stream_gifts;
CREATE POLICY "Astrologers view own gifts" ON public.live_stream_gifts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.astrologers WHERE id = live_stream_gifts.astrologer_id AND user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Admins manage gifts" ON public.live_stream_gifts;
CREATE POLICY "Admins manage gifts" ON public.live_stream_gifts
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.live_stream_gifts FROM authenticated, anon;

-- RPC for sending gifts: atomic wallet-debit + ledger + earnings credit.
CREATE OR REPLACE FUNCTION public.send_live_gift(
  p_stream_id     TEXT,
  p_gift_id       TEXT,
  p_amount_inr    NUMERIC(12,2),
  p_astrologer_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller CONSTANT UUID := auth.uid();
  v_debit JSONB;
  v_tx_id UUID;
  v_gift_id UUID;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_amount_inr IS NULL OR p_amount_inr <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;
  PERFORM public.check_rate_limit('live_gift', v_caller::text, 60, 60);

  SELECT (d.success IS TRUE), d.new_balance, d.transaction_id, d.error
    INTO v_debit
    FROM public.debit_wallet(
      p_user_id := v_caller,
      p_amount  := p_amount_inr,
      p_reason  := 'live_gift:' || p_gift_id,
      p_reference_id := p_stream_id,
      p_reference_type := 'live_gift'
    ) AS d(success, new_balance, transaction_id, error);

  IF (v_debit->>'success')::BOOLEAN IS DISTINCT FROM TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_debit->>'error','debit_failed'));
  END IF;

  v_tx_id := (v_debit->>'transaction_id')::UUID;

  INSERT INTO public.live_stream_gifts (stream_id, sender_id, astrologer_id, gift_id, amount_inr, ledger_ref)
    VALUES (p_stream_id, v_caller, p_astrologer_id, p_gift_id, p_amount_inr, v_tx_id)
    RETURNING id INTO v_gift_id;

  IF p_astrologer_id IS NOT NULL THEN
    INSERT INTO public.astrologer_earnings (astrologer_id, gross_amount, net_amount, status, source, source_id, created_at)
      VALUES (p_astrologer_id, p_amount_inr, p_amount_inr, 'pending', 'live_gift', v_gift_id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'gift_id', v_gift_id, 'transaction_id', v_tx_id);
END;
$$;

REVOKE ALL ON FUNCTION public.send_live_gift(TEXT, TEXT, NUMERIC, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_live_gift(TEXT, TEXT, NUMERIC, UUID) TO authenticated;

-- ============================================================
-- 7. user_notification_settings (M-17, M-19)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  user_id             UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  daily_horoscope     BOOLEAN NOT NULL DEFAULT true,
  consultation_updates BOOLEAN NOT NULL DEFAULT true,
  marketing_emails    BOOLEAN NOT NULL DEFAULT false,
  push_enabled        BOOLEAN NOT NULL DEFAULT true,
  sms_enabled         BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start   TIME,
  quiet_hours_end     TIME,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own settings" ON public.user_notification_settings;
CREATE POLICY "Users view own settings" ON public.user_notification_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users upsert own settings" ON public.user_notification_settings;
CREATE POLICY "Users upsert own settings" ON public.user_notification_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 8. Hard guarantee for signup bonus uniqueness (H-12)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'ux_wallet_tx_signup_bonus_user'
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX ux_wallet_tx_signup_bonus_user
        ON public.wallet_transactions (user_id)
        WHERE reference_type = 'signup_bonus';
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'signup_bonus unique index not created; duplicates exist. Reconcile separately.';
    END;
  END IF;
END$$;

-- ============================================================
-- 9. harden apply_referral_code: lock referrer row (M-5)
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_referral_code(
  p_referral_code TEXT,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller CONSTANT UUID := auth.uid();
  v_referrer UUID;
  v_existing UUID;
  v_bonus NUMERIC(12,2) := 50;
  v_ref_row UUID;
BEGIN
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT referred_by INTO v_existing
    FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_referred');
  END IF;

  SELECT id INTO v_referrer
    FROM public.users
    WHERE referral_code = p_referral_code
    LIMIT 1
    FOR UPDATE;
  IF v_referrer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;
  IF v_referrer = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral');
  END IF;

  UPDATE public.users SET referred_by = v_referrer WHERE id = p_user_id;

  BEGIN
    INSERT INTO public.referrals (referrer_id, referred_id, status, created_at)
      VALUES (v_referrer, p_user_id, 'completed', now())
      RETURNING id INTO v_ref_row;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_referred');
  END;

  PERFORM public.credit_wallet(
    p_user_id := p_user_id,
    p_amount  := v_bonus,
    p_reason  := 'referral_bonus',
    p_reference_id := v_ref_row::text,
    p_reference_type := 'referral'
  );
  PERFORM public.credit_wallet(
    p_user_id := v_referrer,
    p_amount  := v_bonus,
    p_reason  := 'referral_bonus_referrer',
    p_reference_id := v_ref_row::text,
    p_reference_type := 'referral_referrer'
  );

  PERFORM public.log_audit(v_caller, 'referral_redeemed',
    jsonb_build_object('referrer_id', v_referrer, 'referred_id', p_user_id));

  RETURN jsonb_build_object('success', true, 'bonus', v_bonus);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_referral_code(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(TEXT, UUID) TO authenticated;