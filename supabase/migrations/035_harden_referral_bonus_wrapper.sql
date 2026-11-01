-- Migration 035: Hardened apply_referral_bonus wrapper
--
-- 031 replaced apply_referral_bonus with a SQL-language wrapper that forwards
-- to apply_referral_code (which enforces ownership). The wrapper itself had
-- no inline auth.uid() check, so scripts/audit-rpc-auth.js flagged it as an
-- unreviewed privilege-escalation candidate. This migration re-declares the
-- wrapper as plpgsql with an explicit ownership guard (defence in depth) and
-- re-asserts its grants.
--
-- SAFE TO RE-RUN: CREATE OR REPLACE + idempotent REVOKE/GRANT.

CREATE OR REPLACE FUNCTION public.apply_referral_bonus(
  p_user_id       UUID,
  p_referral_code TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY: caller may only redeem a code for their own account. The
  -- underlying apply_referral_code re-asserts the same check; this guard makes
  -- the boundary explicit for the static RPC audit and adds defence in depth.
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RETURN QUERY SELECT false, 'Unauthorized: you can only apply a referral code to your own account'::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  RETURN QUERY SELECT * FROM public.apply_referral_code(p_user_id, p_referral_code);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_referral_bonus(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_bonus(UUID, TEXT) TO authenticated, service_role;
