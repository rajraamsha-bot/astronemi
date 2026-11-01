-- Migration 047: Time/timezone correctness for money/analytics views
-- 1. Recast admin_revenue_timeseries to use Asia/Kolkata for date bucketing
-- 2. Add server helper get_business_day_buckets for client RPCs

-- Recast the admin revenue timeseries to bucket by Asia/Kolkata, not server TZ.
CREATE OR REPLACE FUNCTION public.admin_revenue_timeseries(p_days INT DEFAULT 7)
RETURNS TABLE(day DATE, revenue_inr NUMERIC, consultation_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT gs::DATE AS day
    FROM generate_series(
      ((NOW() AT TIME ZONE 'Asia/Kolkata')::DATE - GREATEST(p_days,1) + 1),
      ((NOW() AT TIME ZONE 'Asia/Kolkata')::DATE),
      '1 day'::INTERVAL
    ) gs
  ),
  per_day AS (
    SELECT (c.created_at AT TIME ZONE 'Asia/Kolkata')::DATE AS day,
           COALESCE(SUM(c.price * c.duration_minutes), 0) AS revenue_inr,
           COUNT(*) AS consultation_count
    FROM public.consultations c
    WHERE c.status = 'completed'
      AND c.created_at >= ((NOW() AT TIME ZONE 'Asia/Kolkata')::DATE - GREATEST(p_days,1) + 1)::TIMESTAMP
    GROUP BY 1
  )
  SELECT d.day,
         COALESCE(p.revenue_inr, 0)::NUMERIC(12,2),
         COALESCE(p.consultation_count, 0)::BIGINT
  FROM days d
  LEFT JOIN per_day p ON p.day = d.day
  ORDER BY d.day;
$$;

REVOKE ALL ON FUNCTION public.admin_revenue_timeseries(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revenue_timeseries(INT) TO authenticated;

-- Server helper: returns the current business day (Asia/Kolkata) and a
-- bucketed timestamp the client should display.
CREATE OR REPLACE FUNCTION public.business_now()
RETURNS TABLE(
  utc TIMESTAMPTZ,
  ist_date DATE,
  ist_iso TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT now() AS utc,
         (now() AT TIME ZONE 'Asia/Kolkata')::DATE AS ist_date,
         (now() AT TIME ZONE 'Asia/Kolkata') AS ist_iso;
$$;

REVOKE ALL ON FUNCTION public.business_now() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_now() TO authenticated;

-- Server-authoritative subscription / pro subscription status checks.
-- These replace client-clock comparisons in services that gated features on
-- `current_period_end > new Date().toISOString()`.
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(p_user_id UUID)
RETURNS TABLE(
  is_premium boolean,
  tier text,
  ends_at timestamptz,
  starts_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL OR (v_caller <> p_user_id AND NOT public.is_admin(v_caller)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT
    (u.subscription_tier IN ('premium','gold')
     AND (u.subscription_ends_at IS NULL OR u.subscription_ends_at > now())
    ) AS is_premium,
    COALESCE(u.subscription_tier, 'free') AS tier,
    u.subscription_ends_at AS ends_at,
    u.subscription_starts_at AS starts_at
  FROM public.users u
  WHERE u.id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_subscription_status(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_status(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_astrologer_pro_status(p_astrologer_id UUID)
RETURNS TABLE(
  is_active boolean,
  plan_slug text,
  billing_cycle text,
  current_period_end timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_owner UUID;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT user_id INTO v_owner FROM public.astrologers WHERE id = p_astrologer_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Astrologer not found';
  END IF;
  IF v_owner <> v_caller AND NOT public.is_admin(v_caller) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT
    (s.status = 'active' AND s.current_period_end > now()) AS is_active,
    s.plan_slug,
    s.billing_cycle,
    s.current_period_end
  FROM public.astrologer_subscriptions s
  WHERE s.astrologer_id = p_astrologer_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_astrologer_pro_status(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_astrologer_pro_status(UUID) TO authenticated;