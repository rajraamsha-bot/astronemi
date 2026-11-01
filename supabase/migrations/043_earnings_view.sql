-- 043_earnings_view.sql
-- Fixes the TOCTOU race condition in today_earnings by replacing the hacky cron job
-- with a dynamically computed view that correctly computes today's earnings at IST timezone.

-- 1. Drop the hacky cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('reset-today-earnings');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron might not be installed, ignore
END $$;

-- 2. Create the dynamically computed view
CREATE OR REPLACE VIEW public.astrologer_dashboard_stats WITH (security_invoker = true) AS
SELECT 
  s.astrologer_id,
  s.total_earnings,
  s.pending_earnings,
  s.this_month_earnings,
  s.this_week_earnings,
  (
    SELECT COALESCE(SUM(net_amount), 0)
    FROM public.astrologer_earnings e
    WHERE e.astrologer_id = s.astrologer_id
      AND e.status IN ('pending', 'processing', 'paid')
      AND e.created_at >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date AT TIME ZONE 'Asia/Kolkata'
  ) AS today_earnings,
  s.total_consultations,
  s.this_month_consultations,
  s.total_reviews,
  s.average_rating,
  s.rating_5_count,
  s.rating_4_count,
  s.rating_3_count,
  s.rating_2_count,
  s.rating_1_count,
  s.completion_rate,
  s.repeat_client_rate,
  s.last_active_at,
  s.updated_at
FROM public.astrologer_stats s;

-- 3. Grant access to the view
GRANT SELECT ON public.astrologer_dashboard_stats TO authenticated;
