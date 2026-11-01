-- Migration 045: Server-authoritative astrologer application submission
-- - Adds submit_astrologer_application() SECURITY DEFINER RPC.
-- - Revokes client INSERT/UPDATE/DELETE on astrologer_onboarding so the
--   only write path is the RPC. Prevents the C-7/H-2 class of bugs
--   where a forged client could rewrite status / kyc / payout.
-- - Tightens UPDATE to WITH CHECK = (auth.uid() = user_id) and restricts
--   client UPDATE columns via REVOKE.
-- - Drop dead `event_id` column from webhook_events (H-15).
-- - Add CHECK constraint on payments.status (L-11).
-- - Add formatBusinessDate / biz helpers are client-only; no SQL impact.

CREATE OR REPLACE FUNCTION public.submit_astrologer_application(
  p_user_id           UUID,
  p_name              TEXT,
  p_experience        TEXT,
  p_languages         TEXT,
  p_pan_number        TEXT,
  p_aadhaar_number    TEXT,
  p_account_number    TEXT,
  p_ifsc              TEXT,
  p_upi_id            TEXT,
  p_chat_rate         NUMERIC,
  p_call_rate         NUMERIC,
  p_video_rate        NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_existing UUID;
  v_id UUID;
  v_pricing JSONB;
  v_payout JSONB;
BEGIN
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: caller mismatch';
  END IF;

  IF NOT public.is_admin(v_caller) THEN
    PERFORM public.check_rate_limit('astrologer_application', v_caller::text, 3, 3600);
  END IF;

  IF p_chat_rate < 0 OR p_call_rate < 0 OR p_video_rate < 0 THEN
    RAISE EXCEPTION 'Rates must be non-negative';
  END IF;

  SELECT id INTO v_existing
    FROM public.astrologer_onboarding
    WHERE user_id = p_user_id
    FOR UPDATE;

  v_pricing := jsonb_build_object(
    'chatRate', p_chat_rate, 'callRate', p_call_rate, 'videoRate', p_video_rate
  );
  v_payout := jsonb_build_object(
    'method', CASE WHEN p_upi_id IS NOT NULL AND p_upi_id <> '' THEN 'upi' ELSE 'bank_transfer' END,
    'accountNumber', p_account_number,
    'ifscCode', p_ifsc,
    'upiId', p_upi_id
  );

  IF v_existing IS NULL THEN
    INSERT INTO public.astrologer_onboarding (
      user_id, status, profile_data, kyc_documents, pricing_tier,
      payout_details, submitted_at, kyc_verified
    ) VALUES (
      p_user_id, 'under_review',
      jsonb_build_object('name', p_name, 'experience', p_experience, 'languages', p_languages),
      jsonb_build_object('pan', p_pan_number, 'aadhaar', p_aadhaar_number),
      v_pricing,
      v_payout,
      now(),
      false
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.astrologer_onboarding
      SET status = 'under_review',
          profile_data = jsonb_build_object('name', p_name, 'experience', p_experience, 'languages', p_languages),
          kyc_documents = jsonb_build_object('pan', p_pan_number, 'aadhaar', p_aadhaar_number),
          pricing_tier = v_pricing,
          payout_details = v_payout,
          submitted_at = now(),
          updated_at = now()
      WHERE id = v_existing
      RETURNING id INTO v_id;
  END IF;

  PERFORM public.log_audit(
    v_caller,
    'astrologer_application_submit',
    jsonb_build_object('onboarding_id', v_id)
  );

  RETURN jsonb_build_object('success', true, 'onboarding_id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_astrologer_application(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_astrologer_application(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC
) TO authenticated;

-- Lock the table down so only the RPC writes privileged columns.
-- Admin tooling uses service_role which bypasses these.
DROP POLICY IF EXISTS "Users update own onboarding" ON public.astrologer_onboarding;
DROP POLICY IF EXISTS "Users insert own onboarding"  ON public.astrologer_onboarding;
DROP POLICY IF EXISTS "Users delete own onboarding"  ON public.astrologer_onboarding;
DROP POLICY IF EXISTS "Users view own onboarding"    ON public.astrologer_onboarding;

CREATE POLICY "Users view own onboarding"
  ON public.astrologer_onboarding FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.astrologer_onboarding FROM authenticated, anon;
GRANT SELECT ON public.astrologer_onboarding TO authenticated;

-- Tighten payments.status with allowed values (L-11).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_status_check'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_status_check
      CHECK (status IN ('pending','processing','completed','failed','refunded'));
  END IF;
END$$;

-- Drop dead webhook_events.event_id column from 001 (H-15).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhook_events' AND column_name = 'event_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhook_events' AND column_name = 'razorpay_event_id'
  ) THEN
    ALTER TABLE public.webhook_events DROP COLUMN event_id;
  END IF;
END$$;