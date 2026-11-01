-- Migration 031: Deployability + wallet-system repair + privilege reconciliation
--
-- Fixes verified during the 2026-08 production-readiness audit:
--   A. __assert_service_role (027) used `NOT LIKE '%...service_role"*%'` — `*`
--      is a LITERAL in SQL LIKE patterns (only % and _ are wildcards), so the
--      guard raised for EVERY caller, including genuine service-role JWTs.
--      Result: wallet top-ups captured money at Razorpay and never credited;
--      consultation billing, referral bonuses and tips all threw.
--      Additionally, user-callable SECURITY DEFINER RPCs (apply_signup_bonus,
--      apply_referral_bonus, send_tip) legitimately call credit/debit_wallet
--      under the CALLER's JWT, which a correct role assert would now reject.
--      Fix: correct the pattern and add a transaction-scoped
--      `app.bypass_wallet_guard` GUC — the same pattern 017/022 already use
--      for `app.bypass_user_protection`. PostgREST clients cannot set GUCs,
--      so only in-database code can raise this flag.
--   B. debit_wallet lost its FOR UPDATE row lock in 027 (017 had it):
--      read-check-write race between concurrent debits.
--   C. process_payment_refund passed p_payment_id (UUID) into debit_wallet's
--      p_source (TEXT) positionally → 42883 no matching function → the whole
--      refund rolled back while the gateway refund had already left.
--   D. send_tip called debit_wallet with wrong arity AND a non-UUID 5th arg.
--   E. apply_referral_code (called by AuthContext) never existed; the
--      referral bonus RPC raced on referred_by and never wrote referrals rows.
--   F. 030's table-level GRANT UPDATE on users overrode 017's column-level
--      REVOKEs (a table-level privilege covers every column).
--   G. astrologers.bank_account / upi_id: the column-level REVOKE in 001 was
--      ineffective next to table-level SELECT grants. Column ACLs only bind
--      when no table-level privilege exists.
--   H. astrologer_subscription_plans and tip_presets have no RLS (full
--      anon/authenticated CRUD via default privileges).
--   I. astrologer_stats had a public SELECT policy; astrologer_earnings had a
--      FOR ALL policy and default-privilege writes.
--   J. astrologer_marketplace_ranking (non-invoker view) exposed
--      astrologer_subscriptions.current_period_end to everyone;
--      rate_limit_hits_recent bypassed the deny-all policy for anyone.
--   K. secure_create_consultation never supplied `price`, but consultations
--      declares price NOT NULL → every booking failed on a fresh chain.
--   L. chat_messages has no UPDATE policy → read receipts never persisted.
--
-- SAFE TO RE-RUN: CREATE OR REPLACE / IF NOT EXISTS / idempotent guards.

-- =====================================================================
-- A. __assert_service_role — corrected match + RPC escape hatch
-- =====================================================================
CREATE OR REPLACE FUNCTION public.__assert_service_role()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Trusted SECURITY DEFINER RPCs set this transaction-scoped GUC around
  -- their internal credit/debit_wallet calls. PostgREST cannot set GUCs,
  -- so a client request can never raise it.
  IF current_setting('app.bypass_wallet_guard', true) = 'on' THEN
    RETURN;
  END IF;

  IF current_setting('request.jwt.claims', true) IS NOT NULL
     AND current_setting('request.jwt.claims', true) NOT LIKE '%"role":"service_role"%'
  THEN
    RAISE EXCEPTION 'This function may only be invoked from the service role';
  END IF;
END;
$$;

-- =====================================================================
-- B. debit_wallet — restore the row lock (TOCTOU fix from 017 that 027 lost)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id      UUID,
  p_amount       NUMERIC,
  p_source       TEXT DEFAULT 'system',
  p_description  TEXT DEFAULT 'Payment',
  p_payment_id   UUID DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, message TEXT, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  PERFORM public.__assert_service_role();

  -- FOR UPDATE serializes concurrent debits on the same wallet; without it
  -- two debits both pass the balance check and one overdrafts (027 regression).
  SELECT wallet_balance INTO v_balance FROM users WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN RETURN QUERY SELECT FALSE, 'User not found', 0::NUMERIC; RETURN; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN QUERY SELECT FALSE, 'Invalid amount', v_balance; RETURN; END IF;
  IF v_balance < p_amount THEN RETURN QUERY SELECT FALSE, 'Insufficient balance', v_balance; RETURN; END IF;

  UPDATE users
     SET wallet_balance = wallet_balance - p_amount,
         updated_at = NOW()
   WHERE id = p_user_id
   RETURNING wallet_balance INTO v_balance;

  INSERT INTO wallet_transactions (
    user_id, type, amount, description, balance_after, reference_type,
    reference_id, payment_id
  ) VALUES (
    p_user_id, 'debit', p_amount, p_description, v_balance,
    p_source, p_reference_id, p_payment_id
  );

  RETURN QUERY SELECT TRUE, 'Success', v_balance;
END;
$$;

-- =====================================================================
-- C. process_payment_refund — correct call, lock, cumulative refund cap
-- =====================================================================
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
  v_refunded_so_far NUMERIC;
  v_debit_ok BOOLEAN;
  v_debit_msg TEXT;
  v_balance NUMERIC;
BEGIN
  -- FOR UPDATE serializes duplicate refund webhooks for the same payment.
  SELECT * INTO v_payment
  FROM payments
  WHERE id = p_payment_id
    AND status = 'completed'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found or not completed');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid refund amount');
  END IF;

  -- Cumulative cap: metadata.refunds_total tracks every prior refund so a
  -- second/duplicate event cannot refund beyond the original payment.
  v_refunded_so_far := COALESCE((v_payment.metadata ->> 'refunds_total')::NUMERIC, 0);

  IF p_amount > (v_payment.amount - v_refunded_so_far) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Refund amount exceeds refundable amount',
      'already_refunded', v_refunded_so_far,
      'payment_amount', v_payment.amount
    );
  END IF;

  -- Reverse the wallet credit FIRST (correct argument order this time):
  -- the gateway refund has already happened by the time this runs, so a
  -- wallet reversal failure is recorded for ops rather than silently kept.
  IF v_payment.type IN ('topup', 'wallet') THEN
    PERFORM set_config('app.bypass_wallet_guard', 'on', true);
    SELECT d.success, d.message, d.new_balance INTO v_debit_ok, v_debit_msg, v_balance
      FROM public.debit_wallet(
             p_user_id      => v_payment.user_id,
             p_amount       => p_amount,
             p_source       => 'refund',
             p_description  => 'Refund: ' || p_reason,
             p_reference_id => p_payment_id::TEXT
           ) d;
    IF NOT v_debit_ok THEN
      PERFORM public.log_audit(
        'REFUND_WALLET_REVERSAL_FAILED', 'payment', false,
        jsonb_build_object('payment_id', p_payment_id, 'amount', p_amount, 'reason', v_debit_msg)
      );
    END IF;
  END IF;

  UPDATE payments
  SET status = 'refunded',
      metadata = metadata || jsonb_build_object(
        'refunds_total', v_refunded_so_far + p_amount,
        'refund_amount', p_amount,
        'refund_reason', p_reason,
        'refunded_at', now()
      )
  WHERE id = p_payment_id;

  RETURN jsonb_build_object('success', true, 'refunded_amount', p_amount);
END;
$$;

-- =====================================================================
-- D. send_tip — fix the broken debit_wallet call + wallet-guard GUC
-- =====================================================================
CREATE OR REPLACE FUNCTION public.send_tip(
  p_user_id          UUID,
  p_astrologer_id    UUID,
  p_amount_inr       NUMERIC,
  p_consultation_id  UUID DEFAULT NULL,
  p_message          TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, tip_id UUID, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tip_id             UUID;
  v_astrologer_user_id UUID;
  v_user_balance       NUMERIC;
  v_debit_ok           BOOLEAN;
  v_debit_msg          TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN QUERY SELECT false, 'Unauthorized: You can only send tips from your own wallet'::TEXT, NULL::UUID, NULL::NUMERIC;
    RETURN;
  END IF;

  IF p_amount_inr IS NULL OR p_amount_inr <= 0 THEN
    RETURN QUERY SELECT false, 'Tip amount must be positive'::TEXT, NULL::UUID, NULL::NUMERIC;
    RETURN;
  END IF;

  IF p_amount_inr > 100000 THEN
    RETURN QUERY SELECT false, 'Tip amount exceeds maximum (₹1,00,000)'::TEXT, NULL::UUID, NULL::NUMERIC;
    RETURN;
  END IF;

  SELECT user_id INTO v_astrologer_user_id
  FROM astrologers
  WHERE id = p_astrologer_id;

  IF v_astrologer_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Astrologer not found'::TEXT, NULL::UUID, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Atomic wallet debit (correct arity this time: source/description as
  -- declared, reference as text). Aliased so plpgsql does not substitute
  -- this function's own OUT parameter names for the result columns.
  PERFORM set_config('app.bypass_wallet_guard', 'on', true);
  SELECT d.success, d.message, d.new_balance INTO v_debit_ok, v_debit_msg, v_user_balance
    FROM public.debit_wallet(
           p_user_id      => p_user_id,
           p_amount       => p_amount_inr,
           p_source       => 'tip',
           p_description  => 'Tip to astrologer: ₹' || p_amount_inr::TEXT,
           p_reference_id => COALESCE(p_consultation_id::TEXT, 'tip_' || gen_random_uuid()::TEXT)
         ) d;

  IF NOT v_debit_ok THEN
    RETURN QUERY SELECT false, COALESCE(v_debit_msg, 'Insufficient wallet balance'::TEXT), NULL::UUID, NULL::NUMERIC;
    RETURN;
  END IF;

  INSERT INTO tips (user_id, astrologer_id, consultation_id, amount_inr, message, status, completed_at)
  VALUES (p_user_id, p_astrologer_id, p_consultation_id, p_amount_inr, p_message, 'completed', NOW())
  RETURNING id INTO v_tip_id;

  PERFORM public.credit_wallet(
    p_user_id      => v_astrologer_user_id,
    p_amount       => p_amount_inr,
    p_source       => 'tip',
    p_description  => 'Tip from user: ₹' || p_amount_inr::TEXT,
    p_reference_id => v_tip_id::TEXT
  );

  PERFORM public.log_audit(
    'TIP_SENT', 'tip', true,
    jsonb_build_object('user_id', p_user_id, 'astrologer_id', p_astrologer_id, 'amount', p_amount_inr, 'tip_id', v_tip_id)
  );

  RETURN QUERY SELECT true, 'Tip sent successfully'::TEXT, v_tip_id, v_user_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_tip(UUID, UUID, NUMERIC, UUID, TEXT) TO authenticated;

-- =====================================================================
-- E. Referral: create the RPC the client actually calls, with a row lock
--    and the referrals ledger row the stats screen reads.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.apply_referral_code(
  p_user_id       UUID,
  p_referral_code TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id  UUID;
  v_bonus        NUMERIC := 100;
  v_existing_by  UUID;
  v_balance      NUMERIC;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RETURN QUERY SELECT false, 'Unauthorized: you can only apply a referral code to your own account'::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Lock the redeemer's row: two concurrent redemptions both used to read
  -- referred_by IS NULL and double-credit. FOR UPDATE serializes them.
  SELECT referred_by INTO v_existing_by FROM users WHERE id = p_user_id FOR UPDATE;

  IF v_existing_by IS NOT NULL THEN
    SELECT wallet_balance INTO v_balance FROM users WHERE id = p_user_id;
    RETURN QUERY SELECT false, 'Referral code already applied'::TEXT, v_balance;
    RETURN;
  END IF;

  SELECT id INTO v_referrer_id
    FROM users
   WHERE referral_code = upper(trim(p_referral_code))
   LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid referral code'::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_referrer_id = p_user_id THEN
    RETURN QUERY SELECT false, 'Cannot refer yourself'::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  UPDATE users SET referred_by = v_referrer_id WHERE id = p_user_id;

  PERFORM set_config('app.bypass_wallet_guard', 'on', true);

  PERFORM public.credit_wallet(
    p_user_id      => p_user_id,
    p_amount       => v_bonus,
    p_source       => 'referral',
    p_description  => 'Referral bonus: ' || upper(trim(p_referral_code)),
    p_reference_id => v_referrer_id::TEXT
  );

  PERFORM public.credit_wallet(
    p_user_id      => v_referrer_id,
    p_amount       => v_bonus,
    p_source       => 'referral',
    p_description  => 'Referral reward for: ' || upper(trim(p_referral_code)),
    p_reference_id => p_user_id::TEXT
  );

  -- The referrals table is what the stats/history screen reads. 023/026
  -- credited wallets but never wrote it, so stats were permanently zero.
  -- UNIQUE(referred_id) doubles as the idempotency anchor.
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status, reward_amount, credited_at)
  VALUES (v_referrer_id, p_user_id, upper(trim(p_referral_code)), 'completed', v_bonus, NOW())
  ON CONFLICT (referred_id) DO NOTHING;

  SELECT wallet_balance INTO v_balance FROM users WHERE id = p_user_id;

  PERFORM public.log_audit(
    'REFERRAL_APPLIED', 'wallet', true,
    jsonb_build_object('user_id', p_user_id, 'referrer_id', v_referrer_id, 'amount', v_bonus)
  );

  RETURN QUERY SELECT true, 'Referral applied'::TEXT, v_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_referral_code(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(UUID, TEXT) TO authenticated, service_role;

-- Keep the 023-era name working (services/auth-service.ts calls it).
CREATE OR REPLACE FUNCTION public.apply_referral_bonus(
  p_user_id       UUID,
  p_referral_code TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_balance NUMERIC)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.apply_referral_code(p_user_id, p_referral_code);
$$;

REVOKE ALL ON FUNCTION public.apply_referral_bonus(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_bonus(UUID, TEXT) TO authenticated, service_role;

-- apply_signup_bonus also credits under the caller's JWT — re-assert with guard.
CREATE OR REPLACE FUNCTION public.apply_signup_bonus(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bonus      NUMERIC := 100;
  v_existing   BOOLEAN;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: signup bonus can only be applied to your own account';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE user_id = p_user_id
      AND reference_type = 'signup_bonus'
  ) INTO v_existing;

  IF v_existing THEN
    RETURN (SELECT wallet_balance FROM users WHERE id = p_user_id);
  END IF;

  PERFORM set_config('app.bypass_wallet_guard', 'on', true);
  PERFORM public.credit_wallet(
    p_user_id      => p_user_id,
    p_amount       => v_bonus,
    p_source       => 'signup_bonus',
    p_description  => 'Welcome bonus for new account',
    p_reference_id => NULL
  );

  PERFORM public.log_audit(
    'SIGNUP_BONUS_CREDITED', 'wallet', true,
    jsonb_build_object('user_id', p_user_id, 'amount', v_bonus)
  );

  RETURN v_bonus;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_signup_bonus(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_signup_bonus(UUID) TO authenticated, service_role;

-- =====================================================================
-- F. Re-apply 017's column-level protection after 030's table-level grants
--    (a table-level UPDATE grant covers every column and overrides them).
-- =====================================================================
REVOKE UPDATE (
    is_admin, is_super_admin, subscription_tier, subscription_ends_at,
    subscription_plan, role, wallet_balance
  ) ON public.users FROM authenticated;

REVOKE UPDATE (
    is_admin, is_super_admin, subscription_tier, subscription_ends_at,
    subscription_plan, role, wallet_balance
  ) ON public.users FROM anon;

-- =====================================================================
-- G. astrologers: make the column ACLs actually bind.
--    Drop table-level SELECT for client roles, grant the safe columns only.
--    Excluded: bank_account, upi_id (payout PII), total_earnings,
--    withdrawn_amount (private financials — astrologer_stats/earnings are
--    the owner-scoped source for those).
-- =====================================================================
REVOKE SELECT ON public.astrologers FROM anon, authenticated;

-- Complete public column set (001 + 009a + 010 + 011/019). Excluded:
-- bank_account, upi_id, payout_method, payout_details (payout PII),
-- total_earnings, withdrawn_amount (private financials — the owner-scoped
-- astrologer_earnings/astrologer_stats tables are the source for those).
GRANT SELECT (
    id, user_id, name, avatar, avatar_url, bio, expertise, experience_years,
    specializations, languages, skills, certifications, price_per_minute,
    price_per_minute_chat, price_per_minute_voice, price_per_minute_video,
    discount_price, rating, total_reviews, total_consultations, is_verified,
    is_ai, is_online, is_available, is_available_for_chat,
    is_available_for_voice, is_available_for_video, last_seen_at,
    next_available_at, available_from, available_to, created_at, updated_at
  ) ON public.astrologers TO anon, authenticated;

-- =====================================================================
-- H. RLS for the two never-protected catalog tables
-- =====================================================================
ALTER TABLE public.astrologer_subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AstroPro plans publicly readable" ON public.astrologer_subscription_plans;
CREATE POLICY "AstroPro plans publicly readable" ON public.astrologer_subscription_plans
  FOR SELECT USING (is_active);

-- Catalog data is server-managed; clients must never write it (prices and
-- rank_boost drive the marketplace).
REVOKE INSERT, UPDATE, DELETE ON public.astrologer_subscription_plans FROM anon, authenticated;

ALTER TABLE public.tip_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tip presets publicly readable" ON public.tip_presets;
CREATE POLICY "Tip presets publicly readable" ON public.tip_presets
  FOR SELECT USING (is_active);

REVOKE INSERT, UPDATE, DELETE ON public.tip_presets FROM anon, authenticated;

-- =====================================================================
-- I. Money/earnings tables: owner-read only, no client writes
-- =====================================================================
DROP POLICY IF EXISTS "Anyone views astrologer stats" ON public.astrologer_stats;

DROP POLICY IF EXISTS "Astrologer sees own earnings" ON public.astrologer_earnings;
-- (030's owner-scoped SELECT policy remains.)

REVOKE INSERT, UPDATE, DELETE ON public.astrologer_stats, public.astrologer_earnings, public.payouts
  FROM anon, authenticated;

-- =====================================================================
-- J. Views that bypassed RLS
-- =====================================================================
-- astrologer_marketplace_ranking: the only genuinely private field it leaked
-- was astrologer_subscriptions.current_period_end (a billing date). The plan
-- slug/badge/boost fields are intentional public marketing data (badges are
-- rendered in the marketplace UI), so the view keeps publishing them but the
-- private column is removed. Recreated (not OR REPLACE) to also repair
-- databases already carrying the leaking definition.
DROP VIEW IF EXISTS astrologer_marketplace_ranking;

CREATE VIEW astrologer_marketplace_ranking AS
SELECT
  a.id                                              AS astrologer_id,
  a.user_id                                         AS user_id,
  a.name,
  a.avatar_url,
  a.specializations                                 AS specialties,
  a.languages,
  a.experience_years,
  a.rating,
  a.total_consultations,
  a.price_per_minute                                AS chat_price_per_minute,
  a.price_per_minute                                AS voice_price_per_minute,
  a.price_per_minute                                AS video_price_per_minute,
  a.is_online,
  a.is_verified,
  a.bio,
  COALESCE(sp.rank_boost, 0)                         AS rank_boost,
  COALESCE(sp.visibility_multiplier, 1.0)           AS visibility_multiplier,
  COALESCE(sp.slug, 'free')                          AS plan_slug,
  COALESCE(sp.display_name, 'Free')                  AS plan_display_name,
  COALESCE(sp.badge_color, '#9CA3AF')                AS plan_badge_color,
  COALESCE(sp.can_livestream, false)                AS can_livestream,
  COALESCE(sp.can_set_custom_rate, false)           AS can_set_custom_rate,
  (
    COALESCE(a.rating, 0) * 20
    + LOG(GREATEST(COALESCE(a.total_consultations, 0), 1)) * 5
    + COALESCE(sp.rank_boost, 0)
    + CASE WHEN a.updated_at > NOW() - INTERVAL '7 days' THEN 10 ELSE 0 END
  )                                                 AS ranking_score
FROM astrologers a
LEFT JOIN astrologer_subscriptions sub
       ON sub.astrologer_id = a.id
      AND sub.status = 'active'
      AND sub.current_period_end > NOW()
LEFT JOIN astrologer_subscription_plans sp
       ON sp.id = sub.plan_id;

GRANT SELECT ON astrologer_marketplace_ranking TO anon, authenticated;

COMMENT ON VIEW astrologer_marketplace_ranking IS
  'Public marketplace ranking. Deliberately excludes astrologer_subscriptions.current_period_end (private billing date); plan marketing fields are intentionally public.';

-- rate_limit_hits_recent: run with the caller's privileges so the deny-all
-- policy on rate_limit_hits applies; super_admins get read access via policy.
ALTER VIEW rate_limit_hits_recent SET (security_invoker = true);

REVOKE SELECT ON rate_limit_hits_recent FROM anon;

REVOKE ALL ON public.rate_limit_hits FROM anon, authenticated;
GRANT SELECT ON public.rate_limit_hits TO authenticated;

DROP POLICY IF EXISTS "Super admins read rate limit hits" ON public.rate_limit_hits;
CREATE POLICY "Super admins read rate limit hits" ON public.rate_limit_hits
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_super_admin));

-- =====================================================================
-- K. secure_create_consultation — satisfy consultations.price NOT NULL and
--    reject a slot that is already booked (see the unique index in 032).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.secure_create_consultation(
  p_astrologer_id UUID,
  p_type TEXT DEFAULT 'chat',
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_astro RECORD;
  v_balance NUMERIC;
  v_id UUID;
  v_status TEXT;
  v_slot_taken BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT id, price_per_minute, is_ai, is_online, is_available
    INTO v_astro
  FROM public.astrologers
  WHERE id = p_astrologer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Astrologer not found');
  END IF;

  IF p_scheduled_at IS NULL
     AND NOT v_astro.is_ai
     AND (NOT v_astro.is_online OR NOT v_astro.is_available) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Astrologer is currently unavailable');
  END IF;

  -- Double-booking guard for scheduled consultations. The partial unique
  -- index (032) is the hard guarantee; this check makes the failure friendly
  -- and closes the race window for concurrent RPC calls on the same slot.
  IF p_scheduled_at IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.consultations
      WHERE astrologer_id = p_astrologer_id
        AND scheduled_at = p_scheduled_at
        AND status IN ('pending', 'confirmed', 'accepted', 'active', 'in_progress')
    ) INTO v_slot_taken;

    IF v_slot_taken THEN
      RETURN jsonb_build_object('success', false, 'message', 'This time slot has just been booked. Please choose another.');
    END IF;
  END IF;

  SELECT wallet_balance INTO v_balance FROM public.users WHERE id = v_uid;
  IF v_balance IS NULL OR v_balance < v_astro.price_per_minute THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient balance. Please add at least ₹' || v_astro.price_per_minute || ' to start.'
    );
  END IF;

  v_status := CASE
    WHEN v_astro.is_ai AND p_scheduled_at IS NULL THEN 'active'
    ELSE 'pending'
  END;

  -- price (NOT NULL since 001) was never supplied — every booking failed on
  -- a migrations-built database. Snapshot the astrologer's rate at booking
  -- time; it is the authoritative price for this consultation regardless of
  -- later rate changes.
  INSERT INTO public.consultations (user_id, astrologer_id, type, status, price, start_time, scheduled_at)
  VALUES (
    v_uid,
    p_astrologer_id,
    p_type::consultation_type,
    v_status::consultation_status,
    v_astro.price_per_minute,
    CASE WHEN v_astro.is_ai AND p_scheduled_at IS NULL THEN now() ELSE NULL END,
    p_scheduled_at
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id, 'status', v_status, 'is_ai', v_astro.is_ai);
END;
$$;

GRANT EXECUTE ON FUNCTION public.secure_create_consultation(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

-- =====================================================================
-- L. chat_messages read receipts
-- =====================================================================
GRANT UPDATE (is_read) ON public.chat_messages TO authenticated;

DROP POLICY IF EXISTS "Participants mark messages read" ON public.chat_messages;
CREATE POLICY "Participants mark messages read" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (public.owns_consultation(consultation_id))
  WITH CHECK (public.owns_consultation(consultation_id));
