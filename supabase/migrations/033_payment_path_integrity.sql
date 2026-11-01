-- Migration 033: Payment-path integrity
--
-- Fixes verified during the 2026-08 production-readiness audit:
--   A. "Users insert own payments" (001) let any client forge
--      status='completed' payment records, and a duplicate
--      razorpay_order_id permanently wedged the .single() lookups in
--      verify-payment / razorpay-webhook (PGRST116 → webhook 500s forever).
--      All legitimate payment writes come from Edge Functions using the
--      service-role client (create-razorpay-order:233, verify-payment,
--      razorpay-webhook) — no client code inserts payments (verified by
--      repo-wide grep).
--   B. "Users insert own subscriptions" (001/001b) let a client insert
--      {plan_id:'gold_yearly', is_active:true, end_date:+10 years};
--      services/subscription.ts getCurrentSubscription() trusts that table.
--      Activation happens exclusively via the service-role-only
--      activate_subscription() RPC.
--   C. "Users update own consultations" was column-unrestricted: either
--      participant could set total_amount=0.01 mid-session (zeroing the
--      astrologer's earnings via end_consultation's COALESCE) or inflate it.
--      All status transitions now go through SECURITY DEFINER RPCs
--      (end/complete/accept/decline); direct client updates are limited to
--      status transitions policed by the existing
--      validate_consultation_status_change trigger, plus rating/review/notes.
--
-- SAFE TO RE-RUN: IF EXISTS guards throughout.

-- =====================================================================
-- A. Payments: server-written only
-- =====================================================================
DROP POLICY IF EXISTS "Users insert own payments" ON public.payments;
REVOKE INSERT ON public.payments FROM anon, authenticated;

-- =====================================================================
-- B. Subscriptions: server-written only
-- =====================================================================
DROP POLICY IF EXISTS "Users insert own subscriptions" ON public.subscriptions;
REVOKE INSERT, UPDATE ON public.subscriptions FROM anon, authenticated;

-- =====================================================================
-- C. Consultations: column-restricted client updates
-- =====================================================================
-- price, total_amount, duration_minutes, start/end times and astrologer
-- binding are server-authoritative (secure_create_consultation,
-- end_consultation, complete_consultation).
REVOKE UPDATE ON public.consultations FROM anon, authenticated;
GRANT UPDATE (status, notes, user_rating, user_review, updated_at)
  ON public.consultations TO authenticated;
