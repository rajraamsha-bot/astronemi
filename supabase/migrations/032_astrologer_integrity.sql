-- Migration 032: Astrologer integrity + booking correctness
--
-- Fixes verified during the 2026-08 production-readiness audit:
--   A. Any user could INSERT their own astrologers row with
--      is_verified = true (001 "Astrologers insert own") and then self-set
--      rating / total_reviews / total_earnings via the unrestricted
--      "Astrologers update own" policy — a direct marketplace-trust and
--      payout-fraud chain (complete_consultation pays earnings from these
--      rows).
--      PRODUCT DECISION (safe default): self-service astrologer
--      registration stays open, but every trust/financial column is forced
--      neutral on insert and frozen on update for non-admin callers.
--      Verification happens exclusively via set_astrologer_verified(),
--      callable only by admins. Change the trigger below to hard-disable
--      self-registration if you want an approval queue instead.
--   B. astrologer_onboarding.status / kyc_verified were self-settable.
--   C. reviews: 011's loose "Users insert own reviews" INSERT policy is
--      OR'ed with 019's strict consultation-bound policy — Postgres ORs
--      permissive policies, so the loose one wins and anyone could
--      fabricate reviews for any astrologer.
--   D. complete_consultation preferred the client-supplied
--      p_duration_minutes for earnings when total_amount was NULL — the
--      astrologer could bill 120 minutes for a 1-minute session.
--   E. Scheduled consultations had no uniqueness: two users could book the
--      identical (astrologer, slot); the booking screen offers hardcoded
--      slots, so collisions are the common case, not the edge case.
--
-- SAFE TO RE-RUN: idempotent guards throughout.

-- =====================================================================
-- A. Trust/financial column freeze on astrologers
-- =====================================================================
CREATE OR REPLACE FUNCTION public.enforce_astrologer_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypass BOOLEAN;
BEGIN
  -- Admin RPCs set this GUC (transaction-scoped); admins pass is_admin().
  v_bypass := current_setting('app.bypass_astrologer_protection', true) = 'on'
              OR public.is_admin(auth.uid());

  IF v_bypass THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Self-registered astrologers start with neutral trust state.
    NEW.is_verified       := false;
    NEW.rating            := 0;
    NEW.total_reviews     := 0;
    NEW.total_consultations := 0;
    NEW.total_earnings    := 0;
    NEW.withdrawn_amount  := 0;
  ELSE
    -- Self-updates cannot touch trust/financial columns; the server-side
    -- completion/payout RPCs set them with the bypass GUC raised.
    NEW.is_verified         := OLD.is_verified;
    NEW.rating              := OLD.rating;
    NEW.total_reviews       := OLD.total_reviews;
    NEW.total_consultations := OLD.total_consultations;
    NEW.total_earnings      := OLD.total_earnings;
    NEW.withdrawn_amount    := OLD.withdrawn_amount;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_astrologer_integrity ON public.astrologers;
CREATE TRIGGER trg_astrologer_integrity
  BEFORE INSERT OR UPDATE ON public.astrologers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_astrologer_integrity();

-- Admin-only verification flip (supplements the trigger's freeze).
CREATE OR REPLACE FUNCTION public.set_astrologer_verified(
  p_astrologer_id UUID,
  p_verified BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid())
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Admin only');
  END IF;

  PERFORM set_config('app.bypass_astrologer_protection', 'on', true);

  UPDATE public.astrologers
     SET is_verified = p_verified,
         updated_at = NOW()
   WHERE id = p_astrologer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Astrologer not found');
  END IF;

  PERFORM public.log_audit(
    'ASTROLOGER_VERIFICATION_SET', 'astrologer', true,
    jsonb_build_object('astrologer_id', p_astrologer_id, 'verified', p_verified)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_astrologer_verified(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_astrologer_verified(UUID, BOOLEAN) TO authenticated, service_role;

-- update_astrologer_rating legitimately recomputes rating/total_reviews from
-- real consultation ratings, but its UPDATE now passes through the integrity
-- trigger above — re-declared with the bypass GUC so non-admin callers
-- (services/consultation-quality.ts) keep working.
CREATE OR REPLACE FUNCTION public.update_astrologer_rating(p_astrologer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg DECIMAL(3,2);
  v_count INTEGER;
BEGIN
  SELECT
    COALESCE(ROUND(AVG(user_rating)::NUMERIC, 2), 0),
    COUNT(*)::INTEGER
  INTO v_avg, v_count
  FROM consultations
  WHERE astrologer_id = p_astrologer_id
    AND user_rating IS NOT NULL;

  PERFORM set_config('app.bypass_astrologer_protection', 'on', true);

  UPDATE astrologers
  SET rating = v_avg,
      total_reviews = v_count,
      updated_at = NOW()
  WHERE id = p_astrologer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_astrologer_rating(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_astrologer_rating(UUID) TO authenticated, service_role;

-- =====================================================================
-- B. Onboarding status/KYC freeze for non-admins
-- =====================================================================
CREATE OR REPLACE FUNCTION public.enforce_onboarding_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.bypass_astrologer_protection', true) = 'on'
     OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  NEW.status        := OLD.status;
  NEW.kyc_verified  := OLD.kyc_verified;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_integrity ON public.astrologer_onboarding;
CREATE TRIGGER trg_onboarding_integrity
  BEFORE UPDATE ON public.astrologer_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.enforce_onboarding_integrity();

-- =====================================================================
-- C. Reviews: drop the loose INSERT policy; the strict 019 policy
--    ("review must reference the caller's own completed consultation with
--     the reviewed astrologer") becomes the only path.
-- =====================================================================
DROP POLICY IF EXISTS "Users insert own reviews" ON public.reviews;

-- =====================================================================
-- D. complete_consultation: server-derived duration only
-- =====================================================================
CREATE OR REPLACE FUNCTION public.complete_consultation(
  p_consultation_id UUID,
  p_duration_minutes INTEGER DEFAULT NULL  -- deprecated, ignored: earnings
                                           -- must never trust client clocks
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_con RECORD;
  v_price NUMERIC;
  v_gross NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_duration INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT c.*, a.user_id AS astro_user_id, a.price_per_minute,
         u.name AS booked_user_name
    INTO v_con
  FROM public.consultations c
  JOIN public.astrologers a ON a.id = c.astrologer_id
  LEFT JOIN public.users u ON u.id = c.user_id
  WHERE c.id = p_consultation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation not found');
  END IF;

  IF v_con.astro_user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorised');
  END IF;

  IF v_con.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Consultation is not active');
  END IF;

  -- Duration: recorded value > derived from the trusted server-side
  -- start_time. The client-supplied parameter is deliberately NOT used:
  -- the billing meter never writes duration_minutes, so honoring it let an
  -- astrologer bill arbitrary minutes (024 audit finding).
  v_duration := COALESCE(
    NULLIF(v_con.duration_minutes, 0),
    GREATEST(1, CEIL(EXTRACT(EPOCH FROM (now() - COALESCE(v_con.start_time, now()))) / 60)::INTEGER)
  );
  v_price := v_con.price_per_minute;
  v_gross := COALESCE(NULLIF(v_con.total_amount, 0), v_duration * v_price, 0);
  v_fee := ROUND(v_gross * 0.30, 2);
  v_net := v_gross - v_fee;

  UPDATE public.consultations
  SET status = 'completed',
      end_time = now(),
      duration_minutes = v_duration,
      total_amount = v_gross,
      updated_at = now()
  WHERE id = p_consultation_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.astrologer_earnings WHERE consultation_id = p_consultation_id
  ) THEN
    INSERT INTO public.astrologer_earnings (
      astrologer_id, consultation_id, user_name, gross_amount, platform_fee, net_amount, status
    ) VALUES (
      v_con.astrologer_id, p_consultation_id, v_con.booked_user_name, v_gross, v_fee, v_net, 'pending'
    );

    INSERT INTO public.astrologer_stats (
      astrologer_id, total_earnings, today_earnings, total_consultations, completion_rate
    ) VALUES (
      v_con.astrologer_id, v_net, v_net, 1, 1.0
    )
    ON CONFLICT (astrologer_id)
    DO UPDATE SET
      total_earnings = public.astrologer_stats.total_earnings + v_net,
      today_earnings = public.astrologer_stats.today_earnings + v_net,
      total_consultations = public.astrologer_stats.total_consultations + 1,
      completion_rate = LEAST(
        (public.astrologer_stats.completion_rate * public.astrologer_stats.total_consultations + 1.0)
        / NULLIF(public.astrologer_stats.total_consultations + 1, 0),
        1.0
      ),
      updated_at = now();
  END IF;

  RETURN jsonb_build_object('success', true, 'consultation_id', p_consultation_id, 'net_earnings', v_net);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_consultation(UUID, INTEGER) TO authenticated;

-- =====================================================================
-- E. One live booking per (astrologer, slot)
-- =====================================================================
-- Data migration: collapse duplicate active bookings for the same slot,
-- keeping the earliest-created row. Terminal states (completed/cancelled/
-- declined/refunded) free the slot naturally via the partial index.
DELETE FROM public.consultations a
  USING public.consultations b
  WHERE a.id <> b.id
    AND a.astrologer_id = b.astrologer_id
    AND a.scheduled_at IS NOT NULL
    AND a.scheduled_at = b.scheduled_at
    AND a.status IN ('pending', 'confirmed', 'accepted', 'active', 'in_progress')
    AND b.status IN ('pending', 'confirmed', 'accepted', 'active', 'in_progress')
    AND (a.created_at, a.id) > (b.created_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS consultations_unique_active_slot
  ON public.consultations (astrologer_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL
    AND status IN ('pending', 'confirmed', 'accepted', 'active', 'in_progress');
