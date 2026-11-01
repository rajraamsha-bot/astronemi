-- Migration 049: Server-authoritative user profile update RPC
-- Clients route their profile_update offline-queue items through this
-- instead of bypassing RLS. Allowlists display columns only.

CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id UUID,
  p_updates JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller CONSTANT UUID := auth.uid();
  v_allowed TEXT[] := ARRAY[
    'full_name','display_name','avatar_url','email','language','country',
    'timezone','date_of_birth','gender',
    'push_notifications_enabled','sms_notifications_enabled',
    'email_notifications_enabled','marketing_emails_enabled'
  ];
  v_key TEXT;
  v_value JSONB;
BEGIN
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_updates)
  LOOP
    IF NOT (v_key = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'Column % is not user-settable', v_key;
    END IF;
  END LOOP;

  UPDATE public.users
    SET updated_at = now()
  WHERE id = p_user_id;

  -- Apply each allowed column explicitly to avoid JSON injection of other keys.
  IF p_updates ? 'full_name' THEN
    UPDATE public.users SET full_name = p_updates->>'full_name' WHERE id = p_user_id;
  END IF;
  IF p_updates ? 'display_name' THEN
    UPDATE public.users SET display_name = p_updates->>'display_name' WHERE id = p_user_id;
  END IF;
  IF p_updates ? 'avatar_url' THEN
    UPDATE public.users SET avatar_url = p_updates->>'avatar_url' WHERE id = p_user_id;
  END IF;
  IF p_updates ? 'email' THEN
    UPDATE public.users SET email = p_updates->>'email' WHERE id = p_user_id;
  END IF;
  IF p_updates ? 'language' THEN
    UPDATE public.users SET language = p_updates->>'language' WHERE id = p_user_id;
  END IF;
  IF p_updates ? 'country' THEN
    UPDATE public.users SET country = p_updates->>'country' WHERE id = p_user_id;
  END IF;
  IF p_updates ? 'timezone' THEN
    UPDATE public.users SET timezone = p_updates->>'timezone' WHERE id = p_user_id;
  END IF;
  IF p_updates ? 'date_of_birth' THEN
    UPDATE public.users SET date_of_birth = (p_updates->>'date_of_birth')::DATE WHERE id = p_user_id;
  END IF;
  IF p_updates ? 'gender' THEN
    UPDATE public.users SET gender = p_updates->>'gender' WHERE id = p_user_id;
  END IF;
  IF p_updates ? 'push_notifications_enabled' THEN
    UPDATE public.users SET push_notifications_enabled = (p_updates->>'push_notifications_enabled')::BOOLEAN WHERE id = p_user_id;
  END IF;
  IF p_updates ? 'sms_notifications_enabled' THEN
    UPDATE public.users SET sms_notifications_enabled = (p_updates->>'sms_notifications_enabled')::BOOLEAN WHERE id = p_user_id;
  END IF;
  IF p_updates ? 'email_notifications_enabled' THEN
    UPDATE public.users SET email_notifications_enabled = (p_updates->>'email_notifications_enabled')::BOOLEAN WHERE id = p_user_id;
  END IF;
  IF p_updates ? 'marketing_emails_enabled' THEN
    UPDATE public.users SET marketing_emails_enabled = (p_updates->>'marketing_emails_enabled')::BOOLEAN WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.update_user_profile(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, JSONB) TO authenticated;