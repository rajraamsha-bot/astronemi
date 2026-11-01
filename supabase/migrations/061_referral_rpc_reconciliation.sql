-- Migration 061: Reconcile apply_referral_code and wrapper signatures
-- Drops the inverted overload from 046 and establishes canonical
-- apply_referral_code(p_user_id UUID, p_referral_code TEXT) returning JSONB.
-- Preserves all locking, anti-self-referral, and ledger integrity.

DROP FUNCTION IF EXISTS public.apply_referral_code(TEXT, UUID);
DROP FUNCTION IF EXISTS public.apply_referral_code(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.apply_referral_code(
  p_user_id       UUID,
  p_referral_code TEXT
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
  v_new_balance NUMERIC(12,2);
BEGIN
  IF v_caller IS NULL OR (v_caller <> p_user_id AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT referred_by INTO v_existing
    FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_referred', 'message', 'You have already been referred by another user');
  END IF;

  SELECT id INTO v_referrer
    FROM public.users
    WHERE UPPER(referral_code) = UPPER(TRIM(p_referral_code))
    LIMIT 1
    FOR UPDATE;
  IF v_referrer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code', 'message', 'Invalid referral code');
  END IF;
  IF v_referrer = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral', 'message', 'You cannot use your own referral code');
  END IF;

  UPDATE public.users SET referred_by = v_referrer WHERE id = p_user_id;

  BEGIN
    INSERT INTO public.referrals (referrer_id, referred_id, status, created_at)
      VALUES (v_referrer, p_user_id, 'completed', now())
      RETURNING id INTO v_ref_row;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_referred', 'message', 'Referral already recorded');
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
    p_reference_type := 'referral'
  );

  SELECT wallet_balance INTO v_new_balance FROM public.users WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral code applied! You received ₹' || v_bonus || ' bonus.',
    'new_balance', v_new_balance,
    'bonus', v_bonus
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_referral_code(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(UUID, TEXT) TO authenticated, service_role;

-- Re-declare apply_referral_bonus wrapper
CREATE OR REPLACE FUNCTION public.apply_referral_bonus(
  p_user_id       UUID,
  p_referral_code TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RETURN QUERY SELECT false, 'Unauthorized: you can only apply a referral code to your own account'::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  v_res := public.apply_referral_code(p_user_id, p_referral_code);
  RETURN QUERY SELECT
    COALESCE((v_res->>'success')::BOOLEAN, false),
    COALESCE(v_res->>'message', v_res->>'error', 'Unknown response')::TEXT,
    (v_res->>'new_balance')::NUMERIC;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_referral_bonus(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_bonus(UUID, TEXT) TO authenticated, service_role;
