-- Migration 051: cancelled_at column + notification consent helper
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Server RPC for notification settings (M-17, M-19).
CREATE OR REPLACE FUNCTION public.upsert_notification_settings(
  p_user_id UUID,
  p_daily_horoscope BOOLEAN DEFAULT NULL,
  p_consultation_updates BOOLEAN DEFAULT NULL,
  p_marketing_emails BOOLEAN DEFAULT NULL,
  p_push_enabled BOOLEAN DEFAULT NULL,
  p_sms_enabled BOOLEAN DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller CONSTANT UUID := auth.uid();
BEGIN
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  INSERT INTO public.user_notification_settings (
    user_id, daily_horoscope, consultation_updates,
    marketing_emails, push_enabled, sms_enabled, updated_at
  ) VALUES (
    p_user_id,
    COALESCE(p_daily_horoscope, true),
    COALESCE(p_consultation_updates, true),
    COALESCE(p_marketing_emails, false),
    COALESCE(p_push_enabled, true),
    COALESCE(p_sms_enabled, true),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET daily_horoscope = COALESCE(EXCLUDED.daily_horoscope, public.user_notification_settings.daily_horoscope),
        consultation_updates = COALESCE(EXCLUDED.consultation_updates, public.user_notification_settings.consultation_updates),
        marketing_emails = COALESCE(EXCLUDED.marketing_emails, public.user_notification_settings.marketing_emails),
        push_enabled = COALESCE(EXCLUDED.push_enabled, public.user_notification_settings.push_enabled),
        sms_enabled = COALESCE(EXCLUDED.sms_enabled, public.user_notification_settings.sms_enabled),
        updated_at = now();
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_notification_settings(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_notification_settings(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;