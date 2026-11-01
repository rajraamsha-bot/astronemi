-- Migration 016: Restrict subscription activation RPC
--
-- `activate_subscription` is a SECURITY DEFINER function that updates
-- arbitrary users by the p_user_id argument. It must only be callable from
-- service-role payment/webhook code, never directly by authenticated clients.

REVOKE EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, INTEGER, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, INTEGER, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, INTEGER, TEXT, TEXT) TO service_role;

