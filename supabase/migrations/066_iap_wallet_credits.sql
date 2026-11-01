-- 066_iap_wallet_credits.sql
-- Store-compliant wallet top-ups.
--
-- Wallet balances are "AstroNemi Credits" (service credits), not cash. Credits
-- are purchased as consumable in-app products on iOS/Android and are fulfilled
-- only after the server verifies the store transaction. The store product ID is
-- mapped to a credit amount here; the client-supplied price is never trusted.

CREATE TABLE IF NOT EXISTS public.iap_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  product_id TEXT NOT NULL,
  credit_inr NUMERIC(12, 2) NOT NULL CHECK (credit_inr > 0),
  bonus_inr NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (bonus_inr >= 0),
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, product_id)
);

ALTER TABLE public.iap_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active IAP products" ON public.iap_products;
CREATE POLICY "Anyone reads active IAP products" ON public.iap_products
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage IAP products" ON public.iap_products;
CREATE POLICY "Admins manage IAP products" ON public.iap_products
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

REVOKE ALL ON public.iap_products FROM anon, authenticated;
GRANT SELECT ON public.iap_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.iap_products TO authenticated;

-- Product IDs must be created in App Store Connect and Google Play Console with
-- these exact identifiers. Store prices are set in the consoles; credit_inr is
-- what the user receives. Price the store products to cover store commission.
INSERT INTO public.iap_products
  (platform, product_id, credit_inr, bonus_inr, display_order)
VALUES
  ('ios',     'com.astronemi.credits.100',   100,   0,   1),
  ('ios',     'com.astronemi.credits.500',   500,   25,  2),
  ('ios',     'com.astronemi.credits.1000',  1000,  75,  3),
  ('ios',     'com.astronemi.credits.2000',  2000,  200, 4),
  ('ios',     'com.astronemi.credits.5000',  5000,  600, 5),
  ('ios',     'com.astronemi.credits.10000', 10000, 1500, 6),
  ('android', 'astronemi_credits_100',       100,   0,   1),
  ('android', 'astronemi_credits_500',       500,   25,  2),
  ('android', 'astronemi_credits_1000',      1000,  75,  3),
  ('android', 'astronemi_credits_2000',      2000,  200, 4),
  ('android', 'astronemi_credits_5000',      5000,  600, 5),
  ('android', 'astronemi_credits_10000',     10000, 1500, 6)
ON CONFLICT (platform, product_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.iap_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  product_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  original_transaction_id TEXT,
  credit_inr NUMERIC(12, 2) NOT NULL CHECK (credit_inr > 0),
  bonus_inr NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (bonus_inr >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'fulfilled', 'failed', 'refunded')),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ,
  UNIQUE (platform, transaction_id)
);

ALTER TABLE public.iap_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own IAP transactions" ON public.iap_transactions;
CREATE POLICY "Users view own IAP transactions" ON public.iap_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all IAP transactions" ON public.iap_transactions;
CREATE POLICY "Admins view all IAP transactions" ON public.iap_transactions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

REVOKE ALL ON public.iap_transactions FROM anon, authenticated;
GRANT SELECT ON public.iap_transactions TO authenticated;

CREATE INDEX IF NOT EXISTS idx_iap_transactions_user_created
  ON public.iap_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iap_transactions_status
  ON public.iap_transactions (status, created_at DESC);

DROP TRIGGER IF EXISTS update_iap_products_updated_at ON public.iap_products;
CREATE TRIGGER update_iap_products_updated_at
  BEFORE UPDATE ON public.iap_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_iap_transactions_updated_at ON public.iap_transactions;
CREATE TRIGGER update_iap_transactions_updated_at
  BEFORE UPDATE ON public.iap_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Server-only fulfillment. The edge function verifies the store receipt first,
-- then calls this RPC exactly once per (platform, transaction_id). A replayed
-- transaction returns already_processed=true without crediting again.
CREATE OR REPLACE FUNCTION public.fulfill_iap_purchase(
  p_user_id UUID,
  p_platform TEXT,
  p_product_id TEXT,
  p_transaction_id TEXT,
  p_credit_inr NUMERIC,
  p_bonus_inr NUMERIC DEFAULT 0,
  p_raw JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_balance NUMERIC,
  already_processed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_existing public.iap_transactions%ROWTYPE;
  v_balance NUMERIC;
  v_total NUMERIC := COALESCE(p_credit_inr, 0) + COALESCE(p_bonus_inr, 0);
  v_credit RECORD;
BEGIN
  PERFORM public.__assert_service_role();

  IF p_platform NOT IN ('ios', 'android') THEN
    RETURN QUERY SELECT FALSE, 'Invalid platform'::TEXT, 0::NUMERIC, FALSE;
    RETURN;
  END IF;
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) < 3 THEN
    RETURN QUERY SELECT FALSE, 'Invalid transaction ID'::TEXT, 0::NUMERIC, FALSE;
    RETURN;
  END IF;
  IF p_product_id IS NULL OR length(trim(p_product_id)) = 0 THEN
    RETURN QUERY SELECT FALSE, 'Invalid product ID'::TEXT, 0::NUMERIC, FALSE;
    RETURN;
  END IF;
  IF v_total <= 0 THEN
    RETURN QUERY SELECT FALSE, 'Invalid credit amount'::TEXT, 0::NUMERIC, FALSE;
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RETURN QUERY SELECT FALSE, 'User not found'::TEXT, 0::NUMERIC, FALSE;
    RETURN;
  END IF;

  INSERT INTO public.iap_transactions (
    user_id, platform, product_id, transaction_id, credit_inr, bonus_inr,
    status, raw_payload
  ) VALUES (
    p_user_id, p_platform, p_product_id, trim(p_transaction_id),
    p_credit_inr, COALESCE(p_bonus_inr, 0), 'pending',
    COALESCE(p_raw, '{}'::jsonb)
  )
  ON CONFLICT (platform, transaction_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT * INTO v_existing
      FROM public.iap_transactions
     WHERE platform = p_platform AND transaction_id = trim(p_transaction_id)
     FOR UPDATE;

    IF v_existing.id IS NULL THEN
      RETURN QUERY SELECT FALSE, 'Purchase record missing'::TEXT, 0::NUMERIC, FALSE;
      RETURN;
    END IF;
    IF v_existing.user_id <> p_user_id THEN
      RETURN QUERY SELECT FALSE, 'Purchase already bound to another account'::TEXT, 0::NUMERIC, FALSE;
      RETURN;
    END IF;
    IF v_existing.status = 'refunded' THEN
      RETURN QUERY SELECT FALSE, 'Purchase was refunded'::TEXT, 0::NUMERIC, FALSE;
      RETURN;
    END IF;
    IF v_existing.status = 'fulfilled' THEN
      SELECT wallet_balance INTO v_balance FROM public.users WHERE id = p_user_id;
      RETURN QUERY SELECT TRUE, 'Already processed'::TEXT, v_balance, TRUE;
      RETURN;
    END IF;
    IF v_existing.status = 'failed' THEN
      UPDATE public.iap_transactions
         SET status = 'pending', updated_at = now()
       WHERE id = v_existing.id;
    END IF;
    v_id := v_existing.id;
  END IF;

  SELECT * INTO v_credit
    FROM public.credit_wallet(
      p_user_id,
      v_total,
      'iap_purchase',
      'AstroNemi Credits purchase',
      NULL,
      v_id::text
    );

  IF NOT v_credit.success THEN
    UPDATE public.iap_transactions
       SET status = 'failed', updated_at = now()
     WHERE id = v_id;
    RETURN QUERY SELECT FALSE, v_credit.message, v_credit.new_balance, FALSE;
    RETURN;
  END IF;

  UPDATE public.iap_transactions
     SET status = 'fulfilled', fulfilled_at = now(), updated_at = now()
   WHERE id = v_id;

  RETURN QUERY SELECT TRUE, 'Credited'::TEXT, v_credit.new_balance, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_iap_purchase(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_iap_purchase(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, JSONB)
  TO service_role;
