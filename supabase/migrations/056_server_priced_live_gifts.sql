-- Migration 056: server-priced live gift catalog
--
-- Module 14 finding (2026-09): send_live_gift (046) accepted the client's
-- p_amount_inr and only checked > 0 and <= rate limit. A caller could send
-- gift_id='diamond' with p_amount_inr=0.01, debiting their wallet 1 paise
-- while the astrologer is credited 1 paise and the gift is labelled as the
-- ₹100 diamond. Display values live only in the client's LIVE_GIFTS const.
--
-- This migration:
--   1. Adds a server-side catalog (same pattern as topup_denominations /
--      question_prices in 046) seeded with the current client values.
--   2. Replaces send_live_gift so the amount is DERIVED from the catalog;
--      the client's p_amount_inr is ignored (kept in the signature only to
--      avoid breaking the deployed client; a mismatch is rejected).
--   3. Grants the new table's read to authenticated so the client can later
--      render the authoritative price list instead of its const.
--
-- SAFE TO RE-RUN: CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE.

-- =====================================================================
-- 1. Catalog
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.live_gift_catalog (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id      TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  icon         TEXT NOT NULL,
  amount_inr   NUMERIC(12,2) NOT NULL CHECK (amount_inr > 0),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.live_gift_catalog (gift_id, name, icon, amount_inr, display_order) VALUES
  ('flower',  'Flower',  '🌸', 10,   1),
  ('heart',   'Heart',   '❤️', 25,   2),
  ('star',    'Star',    '⭐', 50,   3),
  ('diamond', 'Diamond', '💎', 100,  4),
  ('crown',   'Crown',   '👑', 250,  5),
  ('rocket',  'Rocket',  '🚀', 500,  6)
ON CONFLICT (gift_id) DO NOTHING;

ALTER TABLE public.live_gift_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads active gift catalog" ON public.live_gift_catalog;
CREATE POLICY "Anyone reads active gift catalog" ON public.live_gift_catalog
  FOR SELECT TO anon, authenticated USING (is_active = true);
-- No write policies: catalog is admin/service-role maintained only.
REVOKE INSERT, UPDATE, DELETE ON public.live_gift_catalog FROM anon, authenticated;

-- =====================================================================
-- 2. Hardened send_live_gift — amount derived from the catalog
-- =====================================================================
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
  v_catalog_amount NUMERIC(12,2);
  v_debit JSONB;
  v_tx_id UUID;
  v_gift_id UUID;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_gift_id IS NULL OR p_stream_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_fields');
  END IF;

  -- Server-authoritative price. The client's amount is rejected on mismatch
  -- (a caller sending gift_id='diamond' with 0.01 must not debit 1 paise).
  SELECT amount_inr INTO v_catalog_amount
    FROM public.live_gift_catalog
    WHERE gift_id = p_gift_id AND is_active = true;

  IF v_catalog_amount IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_gift');
  END IF;
  IF p_amount_inr IS DISTINCT FROM v_catalog_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'price_mismatch');
  END IF;

  PERFORM public.check_rate_limit('live_gift', v_caller::text, 60, 60);

  SELECT (d.success IS TRUE), d.new_balance, d.transaction_id, d.error
    INTO v_debit
    FROM public.debit_wallet(
      p_user_id := v_caller,
      p_amount  := v_catalog_amount,
      p_reason  := 'live_gift:' || p_gift_id,
      p_reference_id := p_stream_id,
      p_reference_type := 'live_gift'
    ) AS d(success, new_balance, transaction_id, error);

  IF (v_debit->>'success')::BOOLEAN IS DISTINCT FROM TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_debit->>'error','debit_failed'));
  END IF;

  v_tx_id := (v_debit->>'transaction_id')::UUID;

  INSERT INTO public.live_stream_gifts (stream_id, sender_id, astrologer_id, gift_id, amount_inr, ledger_ref)
    VALUES (p_stream_id, v_caller, p_astrologer_id, p_gift_id, v_catalog_amount, v_tx_id)
    RETURNING id INTO v_gift_id;

  IF p_astrologer_id IS NOT NULL THEN
    INSERT INTO public.astrologer_earnings (astrologer_id, gross_amount, net_amount, status, source, source_id, created_at)
      VALUES (p_astrologer_id, v_catalog_amount, v_catalog_amount, 'pending', 'live_gift', v_gift_id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'gift_id', v_gift_id, 'transaction_id', v_tx_id);
END;
$$;

REVOKE ALL ON FUNCTION public.send_live_gift(TEXT, TEXT, NUMERIC, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_live_gift(TEXT, TEXT, NUMERIC, UUID) TO authenticated;