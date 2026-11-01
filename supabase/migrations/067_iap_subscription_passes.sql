-- 067_iap_subscription_passes.sql
-- Extends the verified IAP ledger to customer subscription passes and
-- astrologer Pro/Elite passes.
--
-- These are non-renewing passes (one-time IAP products), not auto-renewable
-- subscriptions. A pass grants a fixed access period; buying another pass
-- extends from the current end date. This avoids silent renewal and keeps the
-- store transaction verifiable by the existing verify-iap-purchase function.

-- ---------------------------------------------------------------------------
-- 1. Product catalogue: add entitlement metadata and allow zero-credit rows
-- ---------------------------------------------------------------------------

ALTER TABLE public.iap_products
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'credits',
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS target_id TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE public.iap_products
  ALTER COLUMN credit_inr DROP NOT NULL,
  ALTER COLUMN credit_inr SET DEFAULT 0;

ALTER TABLE public.iap_products
  DROP CONSTRAINT IF EXISTS iap_products_credit_inr_check;
ALTER TABLE public.iap_products
  ADD CONSTRAINT iap_products_credit_inr_check CHECK (credit_inr >= 0);

ALTER TABLE public.iap_products
  DROP CONSTRAINT IF EXISTS iap_products_kind_check;
ALTER TABLE public.iap_products
  ADD CONSTRAINT iap_products_kind_check
  CHECK (kind IN ('credits', 'subscription', 'astrologer_subscription', 'course', 'gift_card'));

ALTER TABLE public.iap_products
  DROP CONSTRAINT IF EXISTS iap_products_duration_days_check;
ALTER TABLE public.iap_products
  ADD CONSTRAINT iap_products_duration_days_check
  CHECK (duration_days IS NULL OR duration_days > 0);

-- ---------------------------------------------------------------------------
-- 2. Transaction ledger: record the granted entitlement, not just credits
-- ---------------------------------------------------------------------------

ALTER TABLE public.iap_transactions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'credits',
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS target_id TEXT,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

ALTER TABLE public.iap_transactions
  ALTER COLUMN credit_inr DROP NOT NULL,
  ALTER COLUMN credit_inr SET DEFAULT 0;

ALTER TABLE public.iap_transactions
  DROP CONSTRAINT IF EXISTS iap_transactions_credit_inr_check;
ALTER TABLE public.iap_transactions
  ADD CONSTRAINT iap_transactions_credit_inr_check CHECK (credit_inr >= 0);

ALTER TABLE public.iap_transactions
  DROP CONSTRAINT IF EXISTS iap_transactions_kind_check;
ALTER TABLE public.iap_transactions
  ADD CONSTRAINT iap_transactions_kind_check
  CHECK (kind IN ('credits', 'subscription', 'astrologer_subscription', 'course', 'gift_card'));

ALTER TABLE public.astrologer_subscriptions
  ADD COLUMN IF NOT EXISTS iap_transaction_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_astrologer_sub_iap_txn
  ON public.astrologer_subscriptions (iap_transaction_id)
  WHERE iap_transaction_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Seed non-renewing subscription products
-- ---------------------------------------------------------------------------

INSERT INTO public.iap_products
  (platform, product_id, kind, plan_id, duration_days, title, credit_inr, bonus_inr, display_order)
VALUES
  ('ios',     'com.astronemi.plan.basic.30',       'subscription', 'basic',   30,  'Basic — 30 days',      0, 0, 10),
  ('ios',     'com.astronemi.plan.basic.365',      'subscription', 'basic',   365, 'Basic — 365 days',     0, 0, 11),
  ('ios',     'com.astronemi.plan.premium.30',     'subscription', 'premium', 30,  'Premium — 30 days',    0, 0, 12),
  ('ios',     'com.astronemi.plan.premium.365',    'subscription', 'premium', 365, 'Premium — 365 days',   0, 0, 13),
  ('ios',     'com.astronemi.plan.gold.30',        'subscription', 'gold',    30,  'Gold — 30 days',       0, 0, 14),
  ('ios',     'com.astronemi.plan.gold.365',       'subscription', 'gold',    365, 'Gold — 365 days',      0, 0, 15),
  ('android', 'astronemi_plan_basic_30',           'subscription', 'basic',   30,  'Basic — 30 days',      0, 0, 10),
  ('android', 'astronemi_plan_basic_365',          'subscription', 'basic',   365, 'Basic — 365 days',     0, 0, 11),
  ('android', 'astronemi_plan_premium_30',         'subscription', 'premium', 30,  'Premium — 30 days',    0, 0, 12),
  ('android', 'astronemi_plan_premium_365',        'subscription', 'premium', 365, 'Premium — 365 days',   0, 0, 13),
  ('android', 'astronemi_plan_gold_30',            'subscription', 'gold',    30,  'Gold — 30 days',       0, 0, 14),
  ('android', 'astronemi_plan_gold_365',           'subscription', 'gold',    365, 'Gold — 365 days',      0, 0, 15),
  ('ios',     'com.astronemi.astropro.pro.30',     'astrologer_subscription', 'pro',   30,  'AstroPro — 30 days',   0, 0, 20),
  ('ios',     'com.astronemi.astropro.pro.365',    'astrologer_subscription', 'pro',   365, 'AstroPro — 365 days',  0, 0, 21),
  ('ios',     'com.astronemi.astropro.elite.30',   'astrologer_subscription', 'elite', 30,  'AstroElite — 30 days', 0, 0, 22),
  ('ios',     'com.astronemi.astropro.elite.365',  'astrologer_subscription', 'elite', 365, 'AstroElite — 365 days',0, 0, 23),
  ('android', 'astronemi_astropro_pro_30',         'astrologer_subscription', 'pro',   30,  'AstroPro — 30 days',   0, 0, 20),
  ('android', 'astronemi_astropro_pro_365',        'astrologer_subscription', 'pro',   365, 'AstroPro — 365 days',  0, 0, 21),
  ('android', 'astronemi_astropro_elite_30',       'astrologer_subscription', 'elite', 30,  'AstroElite — 30 days', 0, 0, 22),
  ('android', 'astronemi_astropro_elite_365',      'astrologer_subscription', 'elite', 365, 'AstroElite — 365 days',0, 0, 23)
ON CONFLICT (platform, product_id) DO UPDATE SET
  kind = EXCLUDED.kind,
  plan_id = EXCLUDED.plan_id,
  duration_days = EXCLUDED.duration_days,
  title = EXCLUDED.title,
  credit_inr = EXCLUDED.credit_inr,
  bonus_inr = EXCLUDED.bonus_inr,
  display_order = EXCLUDED.display_order,
  is_active = true;

-- ---------------------------------------------------------------------------
-- 4. Customer subscription pass activation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_subscription_iap(
  p_user_id UUID,
  p_tier TEXT,
  p_duration_days INTEGER,
  p_transaction_id TEXT
) RETURNS TABLE(success BOOLEAN, message TEXT, ends_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier TEXT;
  v_old_ends TIMESTAMPTZ;
  v_base TIMESTAMPTZ;
  v_ends TIMESTAMPTZ;
BEGIN
  PERFORM public.__assert_service_role();

  IF p_tier NOT IN ('basic', 'premium', 'gold') THEN
    RETURN QUERY SELECT FALSE, 'Invalid subscription tier'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  IF p_duration_days IS NULL OR p_duration_days <= 0 OR p_duration_days > 400 THEN
    RETURN QUERY SELECT FALSE, 'Invalid pass duration'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT subscription_tier, subscription_ends_at
    INTO v_old_tier, v_old_ends
    FROM public.users
   WHERE id = p_user_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'User not found'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_base := GREATEST(now(), COALESCE(v_old_ends, now()));
  v_ends := v_base + make_interval(days => p_duration_days);

  PERFORM set_config('app.bypass_user_protection', 'on', true);
  UPDATE public.users
     SET subscription_tier = p_tier,
         subscription_ends_at = v_ends
   WHERE id = p_user_id;

  -- Keep the client-shaped subscriptions row in sync so the UI/feature gates
  -- see the pass immediately, not only the privileged users columns.
  UPDATE public.subscriptions
     SET plan_id = p_tier,
         plan_name = initcap(p_tier),
         amount = 0,
         currency = 'INR',
         payment_status = 'completed',
         start_date = COALESCE(start_date, now()),
         end_date = v_ends,
         is_active = true
   WHERE user_id = p_user_id
     AND is_active = true;

  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (
      user_id, plan_id, plan_name, amount, currency,
      payment_status, start_date, end_date, is_active
    ) VALUES (
      p_user_id, p_tier, initcap(p_tier), 0, 'INR',
      'completed', now(), v_ends, true
    );
  END IF;

  INSERT INTO public.subscription_audit
    (user_id, old_tier, new_tier, source, payment_id, ends_at)
  VALUES
    (p_user_id, v_old_tier, p_tier, 'iap', p_transaction_id, v_ends);

  PERFORM public.log_audit(
    'SUBSCRIPTION_ACTIVATED',
    'subscription',
    true,
    jsonb_build_object(
      'user_id', p_user_id,
      'from', v_old_tier,
      'to', p_tier,
      'source', 'iap',
      'payment_id', p_transaction_id,
      'ends_at', v_ends
    )
  );

  RETURN QUERY SELECT TRUE, 'Subscription pass activated'::TEXT, v_ends;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_subscription_iap(UUID, TEXT, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription_iap(UUID, TEXT, INTEGER, TEXT)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Astrologer Pro/Elite pass activation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_astrologer_subscription_iap(
  p_user_id UUID,
  p_plan_slug TEXT,
  p_duration_days INTEGER,
  p_transaction_id TEXT
) RETURNS TABLE(success BOOLEAN, message TEXT, ends_at TIMESTAMPTZ, subscription_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_astrologer_id UUID;
  v_plan_id UUID;
  v_amount NUMERIC(12,2);
  v_billing_cycle TEXT;
  v_period_start TIMESTAMPTZ := now();
  v_period_end TIMESTAMPTZ;
  v_existing_id UUID;
  v_existing_end TIMESTAMPTZ;
  v_new_id UUID;
BEGIN
  PERFORM public.__assert_service_role();

  IF p_plan_slug NOT IN ('pro', 'elite') THEN
    RETURN QUERY SELECT FALSE, 'Invalid AstroPro plan'::TEXT, NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;
  IF p_duration_days IS NULL OR p_duration_days <= 0 OR p_duration_days > 400 THEN
    RETURN QUERY SELECT FALSE, 'Invalid pass duration'::TEXT, NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;

  v_billing_cycle := CASE
    WHEN p_duration_days = 30 THEN 'monthly'
    WHEN p_duration_days = 90 THEN 'quarterly'
    WHEN p_duration_days = 365 THEN 'yearly'
    ELSE 'monthly'
  END;

  SELECT id INTO v_astrologer_id
    FROM public.astrologers
   WHERE user_id = p_user_id;
  IF v_astrologer_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Astrologer profile not found'::TEXT, NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;

  SELECT id INTO v_plan_id
    FROM public.astrologer_subscription_plans
   WHERE slug = p_plan_slug AND is_active = true;
  IF v_plan_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Plan not found'::TEXT, NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;

  SELECT amount_inr INTO v_amount
    FROM public.astrologer_subscription_pricing
   WHERE plan_slug = p_plan_slug
     AND billing_cycle = v_billing_cycle
     AND is_active = true;
  IF v_amount IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Plan pricing not found'::TEXT, NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;

  SELECT id, current_period_end
    INTO v_existing_id, v_existing_end
    FROM public.astrologer_subscriptions
   WHERE astrologer_id = v_astrologer_id
     AND status = 'active'
   FOR UPDATE;

  IF v_existing_id IS NOT NULL THEN
    v_period_start := GREATEST(now(), COALESCE(v_existing_end, now()));
    v_period_end := v_period_start + make_interval(days => p_duration_days);

    UPDATE public.astrologer_subscriptions
       SET plan_id = v_plan_id,
           status = 'active',
           billing_cycle = v_billing_cycle,
           current_period_start = v_period_start,
           current_period_end = v_period_end,
           cancelled_at = NULL,
           cancelled_reason = NULL,
           iap_transaction_id = p_transaction_id,
           amount_paid_inr = v_amount,
           auto_renew = false,
           updated_at = now()
     WHERE id = v_existing_id
     RETURNING id INTO v_new_id;
  ELSE
    v_period_end := v_period_start + make_interval(days => p_duration_days);
    INSERT INTO public.astrologer_subscriptions (
      astrologer_id, plan_id, status, billing_cycle,
      current_period_start, current_period_end,
      iap_transaction_id, amount_paid_inr, auto_renew,
      created_at, updated_at
    ) VALUES (
      v_astrologer_id, v_plan_id, 'active', v_billing_cycle,
      v_period_start, v_period_end,
      p_transaction_id, v_amount, false,
      now(), now()
    )
    RETURNING id INTO v_new_id;
  END IF;

  PERFORM public.log_audit(
    'ASTROLOGER_SUBSCRIPTION_ACTIVATED',
    'astrologer_subscription',
    true,
    jsonb_build_object(
      'astrologer_id', v_astrologer_id,
      'user_id', p_user_id,
      'plan', p_plan_slug,
      'cycle', v_billing_cycle,
      'transaction_id', p_transaction_id
    )
  );

  RETURN QUERY SELECT TRUE, 'AstroPro pass activated'::TEXT, v_period_end, v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_astrologer_subscription_iap(UUID, TEXT, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_astrologer_subscription_iap(UUID, TEXT, INTEGER, TEXT)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Dispatcher: credit or entitlement, idempotent per store transaction
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fulfill_iap_purchase_v2(
  p_user_id UUID,
  p_platform TEXT,
  p_product_id TEXT,
  p_transaction_id TEXT,
  p_raw JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_balance NUMERIC,
  already_processed BOOLEAN,
  kind TEXT,
  plan_id TEXT,
  ends_at TIMESTAMPTZ,
  credited NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.iap_products%ROWTYPE;
  v_txn public.iap_transactions%ROWTYPE;
  v_txn_id UUID;
  v_balance NUMERIC;
  v_ends TIMESTAMPTZ;
  v_credited NUMERIC := 0;
  v_total NUMERIC;
  v_credit RECORD;
  v_sub RECORD;
  v_ast RECORD;
BEGIN
  PERFORM public.__assert_service_role();

  IF p_platform NOT IN ('ios', 'android') THEN
    RETURN QUERY SELECT FALSE, 'Invalid platform'::TEXT, 0::NUMERIC, FALSE, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, 0::NUMERIC;
    RETURN;
  END IF;
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) < 3 THEN
    RETURN QUERY SELECT FALSE, 'Invalid transaction ID'::TEXT, 0::NUMERIC, FALSE, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, 0::NUMERIC;
    RETURN;
  END IF;

  SELECT * INTO v_product
    FROM public.iap_products
   WHERE platform = p_platform
     AND product_id = p_product_id
     AND is_active = true
   LIMIT 1;
  IF v_product.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Unknown or inactive IAP product'::TEXT, 0::NUMERIC, FALSE, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, 0::NUMERIC;
    RETURN;
  END IF;

  v_total := COALESCE(v_product.credit_inr, 0) + COALESCE(v_product.bonus_inr, 0);

  INSERT INTO public.iap_transactions (
    user_id, platform, product_id, transaction_id, kind, plan_id,
    duration_days, target_id, credit_inr, bonus_inr, status, raw_payload
  ) VALUES (
    p_user_id, p_platform, p_product_id, trim(p_transaction_id), v_product.kind,
    v_product.plan_id, v_product.duration_days, v_product.target_id,
    COALESCE(v_product.credit_inr, 0), COALESCE(v_product.bonus_inr, 0),
    'pending', COALESCE(p_raw, '{}'::jsonb)
  )
  ON CONFLICT (platform, transaction_id) DO NOTHING
  RETURNING id INTO v_txn_id;

  IF v_txn_id IS NULL THEN
    SELECT * INTO v_txn
      FROM public.iap_transactions
     WHERE platform = p_platform AND transaction_id = trim(p_transaction_id)
     FOR UPDATE;
    IF v_txn.id IS NULL THEN
      RETURN QUERY SELECT FALSE, 'Purchase record missing'::TEXT, 0::NUMERIC, FALSE, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, 0::NUMERIC;
      RETURN;
    END IF;
    IF v_txn.user_id <> p_user_id THEN
      RETURN QUERY SELECT FALSE, 'Purchase already bound to another account'::TEXT, 0::NUMERIC, FALSE, v_txn.kind, v_txn.plan_id, v_txn.ends_at, 0::NUMERIC;
      RETURN;
    END IF;
    IF v_txn.status = 'refunded' THEN
      RETURN QUERY SELECT FALSE, 'Purchase was refunded'::TEXT, 0::NUMERIC, FALSE, v_txn.kind, v_txn.plan_id, v_txn.ends_at, 0::NUMERIC;
      RETURN;
    END IF;
    IF v_txn.status = 'fulfilled' THEN
      SELECT wallet_balance INTO v_balance FROM public.users WHERE id = p_user_id;
      RETURN QUERY SELECT TRUE, 'Already processed'::TEXT, v_balance, TRUE, v_txn.kind, v_txn.plan_id, v_txn.ends_at, COALESCE(v_txn.credit_inr, 0) + COALESCE(v_txn.bonus_inr, 0);
      RETURN;
    END IF;
    IF v_txn.status = 'failed' THEN
      UPDATE public.iap_transactions SET status = 'pending', updated_at = now() WHERE id = v_txn.id;
    END IF;
    v_txn_id := v_txn.id;
  END IF;

  IF v_product.kind = 'credits' THEN
    SELECT * INTO v_credit
      FROM public.credit_wallet(
        p_user_id,
        v_total,
        'iap_purchase',
        'AstroNemi Credits purchase',
        NULL,
        v_txn_id::text
      );
    IF NOT v_credit.success THEN
      UPDATE public.iap_transactions SET status = 'failed', updated_at = now() WHERE id = v_txn_id;
      RETURN QUERY SELECT FALSE, v_credit.message, v_credit.new_balance, FALSE, v_product.kind, v_product.plan_id, NULL::TIMESTAMPTZ, 0::NUMERIC;
      RETURN;
    END IF;
    v_balance := v_credit.new_balance;
    v_credited := v_total;
  ELSIF v_product.kind = 'subscription' THEN
    SELECT * INTO v_sub
      FROM public.activate_subscription_iap(
        p_user_id,
        v_product.plan_id,
        v_product.duration_days,
        trim(p_transaction_id)
      );
    IF NOT v_sub.success THEN
      UPDATE public.iap_transactions SET status = 'failed', updated_at = now() WHERE id = v_txn_id;
      RETURN QUERY SELECT FALSE, v_sub.message, 0::NUMERIC, FALSE, v_product.kind, v_product.plan_id, NULL::TIMESTAMPTZ, 0::NUMERIC;
      RETURN;
    END IF;
    v_ends := v_sub.ends_at;
    SELECT wallet_balance INTO v_balance FROM public.users WHERE id = p_user_id;
  ELSIF v_product.kind = 'astrologer_subscription' THEN
    SELECT * INTO v_ast
      FROM public.activate_astrologer_subscription_iap(
        p_user_id,
        v_product.plan_id,
        v_product.duration_days,
        trim(p_transaction_id)
      );
    IF NOT v_ast.success THEN
      UPDATE public.iap_transactions SET status = 'failed', updated_at = now() WHERE id = v_txn_id;
      RETURN QUERY SELECT FALSE, v_ast.message, 0::NUMERIC, FALSE, v_product.kind, v_product.plan_id, NULL::TIMESTAMPTZ, 0::NUMERIC;
      RETURN;
    END IF;
    v_ends := v_ast.ends_at;
    SELECT wallet_balance INTO v_balance FROM public.users WHERE id = p_user_id;
  ELSE
    UPDATE public.iap_transactions SET status = 'failed', updated_at = now() WHERE id = v_txn_id;
    RETURN QUERY SELECT FALSE, 'This product kind is not available for purchase'::TEXT, 0::NUMERIC, FALSE, v_product.kind, v_product.plan_id, NULL::TIMESTAMPTZ, 0::NUMERIC;
    RETURN;
  END IF;

  UPDATE public.iap_transactions
     SET status = 'fulfilled',
         ends_at = v_ends,
         fulfilled_at = now(),
         updated_at = now()
   WHERE id = v_txn_id;

  RETURN QUERY SELECT TRUE, 'Fulfilled'::TEXT, v_balance, FALSE, v_product.kind, v_product.plan_id, v_ends, v_credited;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_iap_purchase_v2(UUID, TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_iap_purchase_v2(UUID, TEXT, TEXT, TEXT, JSONB)
  TO service_role;
