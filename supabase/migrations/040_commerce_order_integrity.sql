-- Migration 040: server-backed order cancellation and commerce integrity
--
-- Client order screens may request cancellation, but the client must not be
-- able to change a paid order into a cancelled order without a refund path.
-- This RPC permits only the owner to cancel an unshipped, unpaid order.
-- Paid orders remain immutable until a server-side refund workflow exists.

CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_order RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT *
    INTO v_order
  FROM public.orders
  WHERE id = p_order_id
    AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found');
  END IF;

  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'message', 'This order can no longer be cancelled');
  END IF;

  IF COALESCE(v_order.payment_status, 'pending') <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Paid orders require a server-side refund before cancellation'
    );
  END IF;

  UPDATE public.orders
     SET status = 'cancelled',
         updated_at = now()
   WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'cancelled'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID) TO authenticated;


-- ============================================================================
-- Payment fulfillment integrity
--
-- A captured Razorpay payment can arrive through verify-payment, the webhook,
-- or both concurrently.  JSON metadata markers and a pending -> processing
-- update in an Edge Function are not a transaction boundary: either runner can
-- create duplicate business rows, or the webhook can complete money without
-- creating the product order/consultation.  The payment row is the single
-- concurrency boundary below.  Every fulfillment is performed while that row
-- is locked and the payment is marked completed only after all side effects
-- commit in the same transaction.
-- ============================================================================

-- Durable anchors for every paid business object.
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id);

CREATE INDEX IF NOT EXISTS idx_consultations_payment_id
  ON public.consultations (payment_id);

CREATE TABLE IF NOT EXISTS public.pooja_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pooja_id TEXT NOT NULL,
  pooja_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_id UUID NOT NULL UNIQUE REFERENCES public.payments(id),
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'processing', 'completed', 'cancelled', 'refunded')),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pooja_bookings_user_created
  ON public.pooja_bookings (user_id, created_at DESC);

ALTER TABLE public.pooja_bookings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pooja_bookings FROM anon, authenticated;
GRANT SELECT ON public.pooja_bookings TO authenticated;
DROP POLICY IF EXISTS "Users view own pooja bookings" ON public.pooja_bookings;
CREATE POLICY "Users view own pooja bookings" ON public.pooja_bookings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.payment_fulfillments (
  payment_id UUID PRIMARY KEY REFERENCES public.payments(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  target_id UUID,
  result JSONB NOT NULL DEFAULT '{}'::JSONB,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON public.payment_fulfillments FROM anon, authenticated;

-- These indexes are the independent database guarantees.  The payment-row
-- lock in fulfill_payment_v1 is still required because it also protects the
-- wallet balance, subscription entitlement, and notification transaction.
CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_razorpay_order_id
  ON public.payments (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_razorpay_payment_id
  ON public.payments (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_payment_id
  ON public.orders (payment_id)
  WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_consultations_payment_id
  ON public.consultations (payment_id)
  WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_subscriptions_payment_id
  ON public.subscriptions (payment_id)
  WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_wallet_credit_payment_id
  ON public.wallet_transactions (payment_id)
  WHERE payment_id IS NOT NULL AND type = 'credit';

-- Notifications use the SQL schema's `body` column.  A dedupe key lets the
-- transaction safely retry without creating a second user-facing event.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_notifications_dedupe_key
  ON public.notifications (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- ============================================================================
-- One shared, service-role-only payment settlement transaction.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fulfill_payment_v1(
  p_payment_id UUID,
  p_razorpay_payment_id TEXT DEFAULT NULL,
  p_method TEXT DEFAULT 'razorpay',
  p_amount_received NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_fulfillment public.payment_fulfillments%ROWTYPE;
  v_meta JSONB;
  v_result JSONB;
  v_type TEXT;
  v_method public.payment_method;
  v_target_id UUID;
  v_legacy_id UUID;
  v_wallet_success BOOLEAN;
  v_new_balance NUMERIC;
  v_ledger_id UUID;
  v_plan TEXT;
  v_tier TEXT;
  v_end TIMESTAMPTZ;
  v_is_yearly BOOLEAN;
  v_consultation_type TEXT;
  v_scheduled_at TIMESTAMPTZ;
  v_pooja_id TEXT;
  v_pooja_name TEXT;
  v_items JSONB;
  v_address JSONB;
  v_subtotal NUMERIC;
  v_discount NUMERIC;
  v_shipping NUMERIC;
  v_existing_status TEXT;
  v_notification_type TEXT;
  v_notification_title TEXT;
  v_notification_body TEXT;
BEGIN
  -- The Edge Functions use the service-role client.  Keep the RPC private so
  -- a client cannot settle an arbitrary payment UUID or mutate wallet money.
  IF COALESCE(auth.role(), '') NOT IN ('service_role', '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service role required');
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF p_razorpay_payment_id IS NOT NULL
     AND v_payment.razorpay_payment_id IS NOT NULL
     AND v_payment.razorpay_payment_id <> p_razorpay_payment_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment id mismatch');
  END IF;

  IF p_amount_received IS NOT NULL
     AND round(p_amount_received::NUMERIC, 2) <> round(v_payment.amount::NUMERIC, 2) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment amount mismatch');
  END IF;

  IF p_currency IS NOT NULL
     AND upper(p_currency) <> upper(COALESCE(v_payment.currency, 'INR')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment currency mismatch');
  END IF;

  IF v_payment.status IN ('failed', 'refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment is not settleable');
  END IF;

  -- A previously committed fulfillment is the strongest replay result.  The
  -- payment status may have been changed by a legacy webhook, so the presence
  -- of this row—not a JSON marker—is the durable completion signal.
  SELECT * INTO v_fulfillment
  FROM public.payment_fulfillments
  WHERE payment_id = v_payment.id
  FOR UPDATE;

  IF FOUND AND v_fulfillment.status = 'completed' THEN
    RETURN v_fulfillment.result || jsonb_build_object('already_processed', true);
  END IF;

  v_meta := COALESCE(v_payment.metadata, '{}'::JSONB);
  v_type := lower(COALESCE(v_payment.type, ''));
  v_method := CASE
    WHEN lower(COALESCE(p_method, 'razorpay')) IN ('razorpay', 'wallet', 'upi', 'card', 'netbanking')
      THEN lower(COALESCE(p_method, 'razorpay'))::public.payment_method
    ELSE 'razorpay'::public.payment_method
  END;

  INSERT INTO public.payment_fulfillments (
    payment_id, payment_type, status, last_error, updated_at
  ) VALUES (
    v_payment.id, v_type, 'processing', NULL, now()
  )
  ON CONFLICT (payment_id) DO UPDATE SET
    payment_type = EXCLUDED.payment_type,
    status = 'processing',
    last_error = NULL,
    updated_at = now();

  -- Wallet top-ups: the payment_id unique ledger anchor makes recovery from
  -- the older mark_payment_completed_v2 path safe as well.
  IF v_type IN ('wallet', 'topup') THEN
    SELECT id, balance_after
      INTO v_ledger_id, v_new_balance
    FROM public.wallet_transactions
    WHERE payment_id = v_payment.id
      AND type = 'credit'
    ORDER BY created_at, id
    LIMIT 1
    FOR UPDATE;

    IF v_ledger_id IS NULL THEN
      PERFORM set_config('app.bypass_wallet_guard', 'on', true);
      SELECT c.success, c.new_balance
        INTO v_wallet_success, v_new_balance
      FROM public.credit_wallet(
        p_user_id      => v_payment.user_id,
        p_amount       => v_payment.amount,
        p_source       => 'razorpay',
        p_description  => 'Wallet top-up via Razorpay',
        p_payment_id   => v_payment.id,
        p_reference_id => v_payment.id::TEXT
      ) c;

      IF NOT COALESCE(v_wallet_success, false) THEN
        RAISE EXCEPTION 'Wallet credit failed for payment %', v_payment.id;
      END IF;
    END IF;

    v_notification_type := 'payment_success';
    v_notification_title := 'Funds Credited';
    v_notification_body := 'Your payment of ₹' || v_payment.amount::TEXT || ' was successful. Balance updated.';
    v_result := jsonb_build_object(
      'success', true,
      'payment_id', v_payment.id,
      'payment_type', v_type,
      'fulfillment_status', 'completed',
      'new_balance', v_new_balance
    );

  ELSIF v_type = 'subscription' THEN
    v_plan := COALESCE(NULLIF(v_meta->>'plan_id', ''), 'basic_monthly');
    v_is_yearly := COALESCE(v_meta->>'duration', '') = 'yearly' OR v_plan LIKE '%yearly%';
    v_end := CASE WHEN v_is_yearly THEN now() + INTERVAL '1 year'
                  ELSE now() + INTERVAL '1 month' END;
    v_tier := CASE
      WHEN v_plan LIKE '%gold%' THEN 'gold'
      WHEN v_plan LIKE '%premium%' THEN 'premium'
      ELSE 'basic'
    END;

    SELECT id INTO v_target_id
    FROM public.subscriptions
    WHERE payment_id = v_payment.id
    ORDER BY created_at, id
    LIMIT 1
    FOR UPDATE;

    IF v_target_id IS NULL THEN
      INSERT INTO public.subscriptions (
        user_id, plan_id, plan_name, amount, currency,
        payment_id, payment_status, start_date, end_date, is_active
      ) VALUES (
        v_payment.user_id, v_plan, v_plan, v_payment.amount,
        COALESCE(v_payment.currency, 'INR'), v_payment.id, 'completed',
        now(), v_end, true
      )
      RETURNING id INTO v_target_id;
    END IF;

    UPDATE public.users
    SET subscription_tier = v_tier,
        subscription_ends_at = COALESCE(subscription_ends_at, v_end),
        updated_at = now()
    WHERE id = v_payment.user_id;

    v_notification_type := 'subscription';
    v_notification_title := 'Subscription Activated';
    v_notification_body := 'Your ' || v_plan || ' subscription is now active.';
    v_result := jsonb_build_object(
      'success', true,
      'payment_id', v_payment.id,
      'payment_type', v_type,
      'fulfillment_status', 'completed',
      'subscription_id', v_target_id
    );

  ELSIF v_type = 'consultation' THEN
    -- Recover consultations created by the pre-040 verifier only when the
    -- row belongs to this payer and is not already bound to another payment.
    SELECT id INTO v_target_id
    FROM public.consultations
    WHERE payment_id = v_payment.id
    ORDER BY created_at, id
    LIMIT 1
    FOR UPDATE;

    IF v_target_id IS NULL
       AND (v_meta->>'consultation_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_legacy_id := (v_meta->>'consultation_id')::UUID;
      SELECT id INTO v_target_id
      FROM public.consultations
      WHERE id = v_legacy_id
        AND user_id = v_payment.user_id
        AND payment_id IS NULL
      FOR UPDATE;
      IF v_target_id IS NOT NULL THEN
        UPDATE public.consultations
        SET payment_id = v_payment.id, updated_at = now()
        WHERE id = v_target_id;
      END IF;
    END IF;

    IF v_target_id IS NULL THEN
      IF NOT ((v_meta->>'astrologer_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
        RAISE EXCEPTION 'Consultation payment missing astrologer binding';
      END IF;

      v_consultation_type := CASE lower(COALESCE(v_meta->>'consultation_type', 'chat'))
        WHEN 'call' THEN 'call'
        WHEN 'video' THEN 'video'
        ELSE 'chat'
      END;
      v_scheduled_at := CASE
        WHEN (v_meta->>'scheduled_at') IS NULL OR (v_meta->>'scheduled_at') = '' THEN NULL
        ELSE (v_meta->>'scheduled_at')::TIMESTAMPTZ
      END;

      INSERT INTO public.consultations (
        user_id, astrologer_id, type, status, price, total_amount, scheduled_at
      ) VALUES (
        v_payment.user_id,
        (v_meta->>'astrologer_id')::UUID,
        v_consultation_type::public.consultation_type,
        'pending'::public.consultation_status,
        v_payment.amount,
        v_payment.amount,
        v_scheduled_at
      )
      RETURNING id INTO v_target_id;
    END IF;

    v_notification_type := 'consultation';
    v_notification_title := 'Consultation Booked';
    v_notification_body := 'Your consultation has been booked.';
    v_result := jsonb_build_object(
      'success', true,
      'payment_id', v_payment.id,
      'payment_type', v_type,
      'fulfillment_status', 'completed',
      'consultation_id', v_target_id
    );

  ELSIF v_type = 'product_order' THEN
    -- The payment_id unique index is the product-order idempotency anchor.
    SELECT id, status::TEXT INTO v_target_id, v_existing_status
    FROM public.orders
    WHERE payment_id = v_payment.id
    ORDER BY created_at, id
    LIMIT 1
    FOR UPDATE;

    IF v_target_id IS NULL THEN
      v_items := COALESCE(v_meta->'server_items', v_meta->'items', '[]'::JSONB);
      v_address := COALESCE(v_meta->'address', '{}'::JSONB);
      v_subtotal := COALESCE(
        NULLIF(v_meta->>'server_subtotal', '')::NUMERIC,
        NULLIF(v_meta->>'subtotal', '')::NUMERIC,
        v_payment.amount
      );
      v_discount := COALESCE(
        NULLIF(v_meta->>'server_discount', '')::NUMERIC,
        NULLIF(v_meta->>'discount', '')::NUMERIC,
        0
      );
      v_shipping := COALESCE(
        NULLIF(v_meta->>'server_delivery', '')::NUMERIC,
        NULLIF(v_meta->>'deliveryCharges', '')::NUMERIC,
        0
      );

      IF round((v_subtotal - v_discount + v_shipping)::NUMERIC, 2)
         <> round(v_payment.amount::NUMERIC, 2) THEN
        RAISE EXCEPTION 'Stored product order total does not match payment';
      END IF;

      INSERT INTO public.orders (
        user_id, items, subtotal, discount, shipping, total,
        status, shipping_address, payment_method, payment_status, payment_id
      ) VALUES (
        v_payment.user_id, v_items, v_subtotal, v_discount, v_shipping,
        v_payment.amount, 'confirmed', v_address, 'razorpay', 'paid', v_payment.id
      )
      RETURNING id INTO v_target_id;
    ELSE
      UPDATE public.orders
      SET payment_status = 'paid',
          payment_method = 'razorpay',
          status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
          updated_at = now()
      WHERE id = v_target_id;
    END IF;

    v_notification_type := 'order';
    v_notification_title := 'Order Placed Successfully';
    v_notification_body := 'Your product order has been confirmed.';
    v_result := jsonb_build_object(
      'success', true,
      'payment_id', v_payment.id,
      'payment_type', v_type,
      'fulfillment_status', 'completed',
      'order_id', v_target_id,
      'order_record_id', v_target_id
    );

  ELSIF v_type = 'pooja_booking' THEN
    SELECT id INTO v_target_id
    FROM public.pooja_bookings
    WHERE payment_id = v_payment.id
    FOR UPDATE;

    IF v_target_id IS NULL THEN
      v_pooja_id := COALESCE(NULLIF(v_meta->>'pooja_id', ''), 'unknown');
      v_pooja_name := COALESCE(NULLIF(v_meta->>'pooja_name', ''), 'Ritual Service');
      INSERT INTO public.pooja_bookings (
        user_id, pooja_id, pooja_name, amount, payment_id, status, metadata
      ) VALUES (
        v_payment.user_id, v_pooja_id, v_pooja_name, v_payment.amount,
        v_payment.id, 'confirmed', v_meta
      )
      RETURNING id INTO v_target_id;
    END IF;

    v_notification_type := 'pooja';
    v_notification_title := 'Pooja Booked Successfully';
    v_notification_body := 'Your pooja booking has been confirmed. Our team will contact you shortly.';
    v_result := jsonb_build_object(
      'success', true,
      'payment_id', v_payment.id,
      'payment_type', v_type,
      'fulfillment_status', 'completed',
      'pooja_booking_id', v_target_id
    );

  ELSE
    RAISE EXCEPTION 'Unsupported payment type: %', v_type;
  END IF;

  -- Only after the type-specific writes succeed is money considered settled.
  UPDATE public.payments
  SET status = 'completed',
      razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_payment_id),
      method = v_method,
      metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
        'fulfillment_status', 'completed',
        'fulfilled_at', now(),
        'fulfillment_result', v_result
      ),
      updated_at = now()
  WHERE id = v_payment.id;

  INSERT INTO public.payment_fulfillments (
    payment_id, payment_type, status, target_id, result, last_error, updated_at
  ) VALUES (
    v_payment.id, v_type, 'completed', v_target_id, v_result, NULL, now()
  )
  ON CONFLICT (payment_id) DO UPDATE SET
    payment_type = EXCLUDED.payment_type,
    status = 'completed',
    target_id = EXCLUDED.target_id,
    result = EXCLUDED.result,
    last_error = NULL,
    updated_at = now();

  INSERT INTO public.notifications (
    user_id, type, title, body, data, dedupe_key
  ) VALUES (
    v_payment.user_id,
    v_notification_type,
    v_notification_title,
    v_notification_body,
    v_result,
    'payment:' || v_payment.id::TEXT || ':fulfilled'
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_payment_v1(UUID, TEXT, TEXT, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_payment_v1(UUID, TEXT, TEXT, NUMERIC, TEXT)
  TO service_role;
