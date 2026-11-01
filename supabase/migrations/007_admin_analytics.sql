-- ============================================
-- Admin analytics RPCs
-- ============================================
-- Server-side aggregation functions the admin dashboard calls via
-- supabase.rpc(). Every function is SECURITY DEFINER and gated by the
-- existing `is_admin(auth.uid())` helper from migration 001 so only
-- admin users can read these numbers.
-- ============================================

-- ─── admin_overview_metrics ──────────────────────────────────────────────────
-- Returns the top-level KPIs shown on the admin dashboard.
CREATE OR REPLACE FUNCTION public.admin_overview_metrics()
RETURNS TABLE (
    total_users BIGINT,
    active_users BIGINT,
    new_users_7d BIGINT,
    new_users_prev_7d BIGINT,
    total_astrologers BIGINT,
    active_astrologers BIGINT,
    total_consultations BIGINT,
    consultations_7d BIGINT,
    consultations_prev_7d BIGINT,
    gross_revenue_inr NUMERIC,
    revenue_7d_inr NUMERIC,
    revenue_prev_7d_inr NUMERIC,
    active_disputes BIGINT,
    avg_session_minutes NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'permission denied';
    END IF;

    RETURN QUERY
    WITH
    u AS (
        SELECT
            COUNT(*) AS total_users,
            COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '30 days') AS active_users,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_users_7d,
            COUNT(*) FILTER (
                WHERE created_at >= NOW() - INTERVAL '14 days'
                  AND created_at < NOW() - INTERVAL '7 days'
            ) AS new_users_prev_7d
        FROM public.users
    ),
    a AS (
        SELECT
            COUNT(*) AS total_astrologers,
            COUNT(*) FILTER (WHERE is_available = true) AS active_astrologers
        FROM public.astrologers
    ),
    c AS (
        SELECT
            COUNT(*) AS total_consultations,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS consultations_7d,
            COUNT(*) FILTER (
                WHERE created_at >= NOW() - INTERVAL '14 days'
                  AND created_at < NOW() - INTERVAL '7 days'
            ) AS consultations_prev_7d,
            COALESCE(AVG(duration_minutes) FILTER (WHERE status = 'completed'), 0) AS avg_session_minutes,
            COALESCE(SUM(price) FILTER (WHERE status = 'completed'), 0) AS gross_revenue_inr,
            COALESCE(SUM(price) FILTER (
                WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '7 days'
            ), 0) AS revenue_7d_inr,
            COALESCE(SUM(price) FILTER (
                WHERE status = 'completed'
                  AND created_at >= NOW() - INTERVAL '14 days'
                  AND created_at < NOW() - INTERVAL '7 days'
            ), 0) AS revenue_prev_7d_inr
        FROM public.consultations
    ),
    d AS (
        SELECT COUNT(*) AS active_disputes
        FROM public.consultation_disputes
        WHERE status IN ('open', 'under_review')
    )
    SELECT
        u.total_users,
        u.active_users,
        u.new_users_7d,
        u.new_users_prev_7d,
        a.total_astrologers,
        a.active_astrologers,
        c.total_consultations,
        c.consultations_7d,
        c.consultations_prev_7d,
        c.gross_revenue_inr,
        c.revenue_7d_inr,
        c.revenue_prev_7d_inr,
        d.active_disputes,
        c.avg_session_minutes
    FROM u, a, c, d;
END;
$$;

-- ─── admin_revenue_timeseries ────────────────────────────────────────────────
-- Day-by-day revenue and consultation counts for the last N days.
CREATE OR REPLACE FUNCTION public.admin_revenue_timeseries(days INTEGER DEFAULT 14)
RETURNS TABLE (
    day DATE,
    consultations BIGINT,
    revenue_inr NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'permission denied';
    END IF;

    IF days IS NULL OR days < 1 OR days > 90 THEN
        days := 14;
    END IF;

    RETURN QUERY
    SELECT
        gs::DATE AS day,
        COUNT(c.id) FILTER (WHERE c.status = 'completed') AS consultations,
        COALESCE(SUM(c.price) FILTER (WHERE c.status = 'completed'), 0) AS revenue_inr
    FROM generate_series(
        CURRENT_DATE - (days - 1),
        CURRENT_DATE,
        '1 day'::INTERVAL
    ) AS gs
    LEFT JOIN public.consultations c
        ON DATE(c.created_at) = gs::DATE
    GROUP BY gs
    ORDER BY gs ASC;
END;
$$;

-- ─── admin_recent_activity ───────────────────────────────────────────────────
-- A unified recent-activity feed combining sign-ups, bookings, completions,
-- and top-ups. Returns a small fixed page.
CREATE OR REPLACE FUNCTION public.admin_recent_activity(max_rows INTEGER DEFAULT 15)
RETURNS TABLE (
    activity_at TIMESTAMPTZ,
    actor_name TEXT,
    action TEXT,
    detail TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'permission denied';
    END IF;

    IF max_rows IS NULL OR max_rows < 1 OR max_rows > 100 THEN
        max_rows := 15;
    END IF;

    RETURN QUERY
    (
        SELECT
            u.created_at AS activity_at,
            COALESCE(u.name, 'User') AS actor_name,
            'signup'::TEXT AS action,
            ''::TEXT AS detail
        FROM public.users u
        ORDER BY u.created_at DESC
        LIMIT max_rows
    )
    UNION ALL
    (
        SELECT
            c.created_at AS activity_at,
            COALESCE(u.name, 'User') AS actor_name,
            CASE c.status
                WHEN 'completed' THEN 'consultation_completed'
                ELSE 'consultation_booked'
            END AS action,
            COALESCE('₹' || c.price::TEXT, '')::TEXT AS detail
        FROM public.consultations c
        LEFT JOIN public.users u ON u.id = c.user_id
        ORDER BY c.created_at DESC
        LIMIT max_rows
    )
    UNION ALL
    (
        SELECT
            o.created_at AS activity_at,
            COALESCE(u.name, 'User') AS actor_name,
            'order_placed'::TEXT AS action,
            COALESCE('₹' || o.total::TEXT, '')::TEXT AS detail
        FROM public.orders o
        LEFT JOIN public.users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
        LIMIT max_rows
    )
    ORDER BY activity_at DESC
    LIMIT max_rows;
END;
$$;

-- ─── admin_top_astrologers ───────────────────────────────────────────────────
-- Top astrologers by recent consultation revenue (last 30 days).
CREATE OR REPLACE FUNCTION public.admin_top_astrologers(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
    astrologer_id UUID,
    name VARCHAR,
    consultations BIGINT,
    revenue_inr NUMERIC,
    rating NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'permission denied';
    END IF;

    IF limit_count IS NULL OR limit_count < 1 OR limit_count > 50 THEN
        limit_count := 5;
    END IF;

    RETURN QUERY
    SELECT
        a.id AS astrologer_id,
        a.name,
        COUNT(c.id) FILTER (WHERE c.status = 'completed') AS consultations,
        COALESCE(SUM(c.price) FILTER (WHERE c.status = 'completed'), 0) AS revenue_inr,
        COALESCE(a.rating, 0) AS rating
    FROM public.astrologers a
    LEFT JOIN public.consultations c
        ON c.astrologer_id = a.id
       AND c.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY a.id
    ORDER BY revenue_inr DESC, consultations DESC, a.rating DESC
    LIMIT limit_count;
END;
$$;

-- ─── Permissions ─────────────────────────────────────────────────────────────
-- Grant EXECUTE to authenticated so the Supabase client can call them; the
-- is_admin() check inside each function enforces actual authorisation.

GRANT EXECUTE ON FUNCTION public.admin_overview_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revenue_timeseries(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_activity(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_top_astrologers(INTEGER) TO authenticated;
