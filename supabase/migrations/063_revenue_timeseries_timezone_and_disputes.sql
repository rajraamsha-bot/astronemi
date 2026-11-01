-- Migration 063: Timezone correctness for admin revenue and transactional dispute refunds
-- 1. Fix admin_revenue_timeseries datetime boundary to Asia/Kolkata timestamptz
-- 2. Add transactional resolve_consultation_dispute RPC that credits wallet atomically

-- 1. Revenue timeseries fix
CREATE OR REPLACE FUNCTION public.admin_revenue_timeseries(p_days INT DEFAULT 7)
RETURNS TABLE(day DATE, revenue_inr NUMERIC, consultation_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
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
      AND c.created_at >= (((NOW() AT TIME ZONE 'Asia/Kolkata')::DATE - GREATEST(p_days,1) + 1)::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
    GROUP BY 1
  )
  SELECT d.day,
         COALESCE(p.revenue_inr, 0)::NUMERIC(12,2),
         COALESCE(p.consultation_count, 0)::BIGINT
  FROM days d
  LEFT JOIN per_day p ON p.day = d.day
  ORDER BY d.day;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revenue_timeseries(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revenue_timeseries(INT) TO authenticated, service_role;

-- 2. Transactional dispute resolution and refund
CREATE OR REPLACE FUNCTION public.resolve_consultation_dispute(
  p_dispute_id     UUID,
  p_status         TEXT,
  p_resolution     TEXT,
  p_refund_amount  NUMERIC(12,2) DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller CONSTANT UUID := auth.uid();
  v_dispute RECORD;
BEGIN
  IF v_caller IS NULL OR NOT public.is_admin(v_caller) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Admin access required');
  END IF;

  SELECT * INTO v_dispute
    FROM public.consultation_disputes
    WHERE id = p_dispute_id
    FOR UPDATE;

  IF v_dispute.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Dispute not found');
  END IF;

  IF v_dispute.status IN ('resolved', 'closed') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Dispute already resolved');
  END IF;

  -- If refund is approved and amount > 0, credit the client's wallet
  IF p_refund_amount > 0 AND p_status = 'resolved' THEN
    PERFORM public.credit_wallet(
      p_user_id        := v_dispute.user_id,
      p_amount         := p_refund_amount,
      p_reason         := 'dispute_refund',
      p_reference_id   := v_dispute.id::TEXT,
      p_reference_type := 'consultation_dispute'
    );
  END IF;

  UPDATE public.consultation_disputes
    SET status = p_status::public.dispute_status,
        resolution = p_resolution,
        refund_amount = p_refund_amount,
        resolved_by = v_caller,
        resolved_at = now()
    WHERE id = p_dispute_id;

  PERFORM public.log_audit(
    v_caller,
    'consultation_dispute_resolved',
    jsonb_build_object('dispute_id', p_dispute_id, 'status', p_status, 'refund_amount', p_refund_amount)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Dispute resolved successfully'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_consultation_dispute(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_consultation_dispute(UUID, TEXT, TEXT, NUMERIC) TO authenticated, service_role;
