-- 037_pricing_table.sql
-- H1: single source of truth for pricing. Plan, pooja, and coupon prices move
-- out of the create-razorpay-order edge function (and the duplicated client
-- catalogs) into this table, so a price change is a database update, not a code
-- deploy. create-razorpay-order reads from here with the service role.

CREATE TABLE IF NOT EXISTS public.pricing (
  id              TEXT PRIMARY KEY,            -- 'premium_yearly' | 'pooja_3' | 'ASTRO10'
  kind            TEXT NOT NULL CHECK (kind IN ('plan','pooja','coupon')),
  price_rupees    NUMERIC(12,2),               -- plan / pooja selling price
  discount_amount NUMERIC(12,2),               -- coupon discount (flat amount or percent value)
  discount_type   TEXT CHECK (discount_type IN ('flat','percent')), -- coupon only
  duration        TEXT,                        -- 'monthly' | 'yearly' (plan only)
  is_active       BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Read-only to authenticated clients (display only). The edge function reads
-- with the service role, which bypasses RLS. No client writes.
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pricing FROM anon, authenticated;
GRANT SELECT ON public.pricing TO authenticated;

CREATE POLICY "pricing_read_all" ON public.pricing
  FOR SELECT TO authenticated
  USING (true);

-- Seed: subscription plans. premium_yearly = 3593 (H1 canonical price).
INSERT INTO public.pricing (id, kind, price_rupees, duration) VALUES
  ('basic_monthly',   'plan', 199,  'monthly'),
  ('basic_yearly',    'plan', 1433, 'yearly'),
  ('premium_monthly', 'plan', 499,  'monthly'),
  ('premium_yearly',  'plan', 3593, 'yearly'),
  ('gold_monthly',    'plan', 999,  'monthly'),
  ('gold_yearly',     'plan', 7193, 'yearly')
ON CONFLICT (id) DO NOTHING;

-- Seed: pooja prices (id = 'pooja_' || pooja_id).
INSERT INTO public.pricing (id, kind, price_rupees) VALUES
  ('pooja_1',  'pooja', 2100),  -- Rahu Shanti
  ('pooja_2',  'pooja', 5100),  -- Navgrah Shanti
  ('pooja_3',  'pooja', 3100),  -- Mangal Dosh
  ('pooja_4',  'pooja', 4100),  -- Kaal Sarp Dosh
  ('pooja_5',  'pooja', 5500),  -- Pitr Dosh Nivaran
  ('pooja_6',  'pooja', 4500),  -- Shani Sade Sati
  ('pooja_7',  'pooja', 2500),  -- Surya Shanti
  ('pooja_8',  'pooja', 2500),  -- Chandra Shanti
  ('pooja_9',  'pooja', 3500),  -- Guru Chandal
  ('pooja_10', 'pooja', 1100)   -- Satyanarayan
ON CONFLICT (id) DO NOTHING;

-- Seed: coupons (discount_amount + discount_type).
INSERT INTO public.pricing (id, kind, discount_amount, discount_type) VALUES
  ('ASTRO10',  'coupon', 10,  'percent'),
  ('FIRST100', 'coupon', 100, 'flat'),
  ('GEM20',    'coupon', 20,  'percent')
ON CONFLICT (id) DO NOTHING;
