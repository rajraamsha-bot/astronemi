-- 036_server_device_binding.sql
-- M1: server-side device registry + the 2-device binding cap.
-- Replaces the advisory, client-side-only device list previously kept in
-- services/auth-service.ts local secure storage. The cap is now enforced in
-- the database and cannot be bypassed by clearing app data / reinstalling.

CREATE TABLE IF NOT EXISTS public.devices (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id    TEXT NOT NULL,
  device_name  TEXT,
  os           TEXT,
  bound_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  CONSTRAINT devices_user_device_uniq UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Owners may read and delete (delete == revoke) their own devices, but cannot
-- INSERT or UPDATE directly: binds must go through bind_device(), which is the
-- only path that enforces the 2-device cap. A direct client INSERT would bypass
-- the count, so it is deliberately not granted.
REVOKE ALL ON public.devices FROM anon, authenticated;
GRANT SELECT, DELETE ON public.devices TO authenticated;

CREATE POLICY "devices_select_own" ON public.devices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "devices_delete_own" ON public.devices
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Bind a device, enforcing a maximum of 2 active devices per user.
-- A transaction-scoped advisory lock keyed on the user id serializes concurrent
-- binds for the same user (SELECT ... FOR UPDATE cannot serialize an empty
-- relation), so two simultaneous first-binds cannot exceed the cap.
CREATE OR REPLACE FUNCTION public.bind_device(
  p_device_id   TEXT,
  p_device_name TEXT DEFAULT NULL,
  p_os          TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, device_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_count INTEGER;
  v_max   CONSTANT INTEGER := 2;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::TEXT, 0::INTEGER;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text));

  -- Idempotent: re-binding an already-active device is a no-op success.
  IF EXISTS (
    SELECT 1 FROM public.devices
    WHERE user_id = v_uid AND device_id = p_device_id AND revoked_at IS NULL
  ) THEN
    UPDATE public.devices SET last_seen_at = now()
    WHERE user_id = v_uid AND device_id = p_device_id AND revoked_at IS NULL;
    SELECT count(*) INTO v_count
    FROM public.devices WHERE user_id = v_uid AND revoked_at IS NULL;
    RETURN QUERY SELECT true, 'Device already bound'::TEXT, v_count;
    RETURN;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.devices WHERE user_id = v_uid AND revoked_at IS NULL;

  IF v_count >= v_max THEN
    RETURN QUERY SELECT false,
      'Device limit exceeded. Please revoke a device first.'::TEXT, v_count;
    RETURN;
  END IF;

  INSERT INTO public.devices (user_id, device_id, device_name, os)
  VALUES (v_uid, p_device_id, p_device_name, p_os)
  ON CONFLICT (user_id, device_id)
  DO UPDATE SET
    revoked_at   = NULL,
    bound_at     = now(),
    device_name  = EXCLUDED.device_name,
    os           = EXCLUDED.os,
    last_seen_at = now();

  SELECT count(*) INTO v_count
  FROM public.devices WHERE user_id = v_uid AND revoked_at IS NULL;

  RETURN QUERY SELECT true, 'Device bound'::TEXT, v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bind_device(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bind_device(TEXT, TEXT, TEXT) TO authenticated;

-- Revoke (unbind) a device owned by the calling user.
CREATE OR REPLACE FUNCTION public.revoke_device(p_device_id TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::TEXT;
    RETURN;
  END IF;

  UPDATE public.devices
  SET revoked_at = now()
  WHERE user_id = v_uid AND device_id = p_device_id AND revoked_at IS NULL;

  IF FOUND THEN
    RETURN QUERY SELECT true, 'Device revoked'::TEXT;
  ELSE
    RETURN QUERY SELECT false, 'Device not found'::TEXT;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_device(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_device(TEXT) TO authenticated;
