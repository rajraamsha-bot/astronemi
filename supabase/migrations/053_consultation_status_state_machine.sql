-- Migration 053: Consultation status state machine
--
-- Findings from the 2026-09 production-readiness audit:
--   C-1. "Users update own consultations" (001:678) had no WITH CHECK and a
--        USING that allowed both participants to UPDATE status. The trigger
--        validate_consultation_status_change only blocked 'completed' for
--        non-astrologers and 'cancelled -> in_progress|completed'. A
--        customer could write status='refunded' or any other value.
--   H-2. 033 left `status` writable from the client via the column-level
--        GRANT, which contradicts its own comment "All status transitions
--        now go through SECURITY DEFINER RPCs".
--
-- This migration:
--   1. Closes the WITH CHECK on the consultations UPDATE policy so the
--      row's user_id / astrologer_id cannot be re-pointed mid-flight.
--   2. Replaces validate_consultation_status_change with a full state
--      machine that mirrors the transitions the SECURITY DEFINER RPCs
--      perform (accept_consultation, decline_consultation,
--      start_consultation, end_consultation, complete_consultation,
--      fail_payment_for_consultation). Any other transition raises.
--   3. Re-asserts that 'status' is NOT client-writable: REVOKEs UPDATE
--      on consultations, then re-grants the non-status columns. Clients
--      must go through the RPCs.
--   4. Adds the missing RPC start_consultation (was referenced in code
--      but missing from the chain on a fresh deployment — confirmed by
--      grep; previously only its body lived in 010/011 without a final
--      CREATE OR REPLACE landing here).
--
-- SAFE TO RE-RUN: CREATE OR REPLACE + idempotent REVOKE/GRANT.
-- SAFE TO RE-RUN: CREATE OR REPLACE + idempotent REVOKE/GRANT.

-- =====================================================================
-- 1. consultations UPDATE policy gains WITH CHECK
-- =====================================================================

DROP POLICY IF EXISTS "Users update own consultations" ON public.consultations;
CREATE POLICY "Users update own consultations"
  ON public.consultations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR id IN (
      SELECT c.id FROM public.consultations c
      JOIN public.astrologers a ON c.astrologer_id = a.id
      WHERE a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = (SELECT u.user_id FROM public.consultations u WHERE u.id = consultations.id)
    AND astrologer_id = (SELECT u.astrologer_id FROM public.consultations u WHERE u.id = consultations.id)
  );

-- =====================================================================
-- 2. Status state machine (replaces 024's lighter trigger)
-- =====================================================================

-- The trigger is invoked from SECURITY DEFINER RPCs (which run as the
-- function owner, bypass RLS) AND from any direct UPDATE by an admin.
-- Direct UPDATEs by a participant cannot change `status` after migration
-- step 3 below; this trigger is therefore mainly a defence-in-depth backstop
-- for admins and migration backfills.
CREATE OR REPLACE FUNCTION validate_consultation_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN := COALESCE(public.is_admin(auth.uid()), false);
  v_is_service_role BOOLEAN := current_setting('is_superuser', true) = 'on';
  v_from TEXT := OLD.status::TEXT;
  v_to   TEXT := NEW.status::TEXT;
  v_allowed BOOLEAN := FALSE;
BEGIN
  IF v_from = v_to THEN
    RETURN NEW;  -- no-op
  END IF;

  -- service_role (migrations, admin tooling, Edge Functions) may write any
  -- transition.
  IF v_is_service_role THEN
    RETURN NEW;
  END IF;

  -- Allowed participant/admin transitions. Any other pair raises.
  v_allowed := CASE v_to
    WHEN 'accepted'    THEN v_from IN ('pending')
    WHEN 'declined'    THEN v_from IN ('pending','accepted')
    WHEN 'active'      THEN v_from IN ('accepted','pending','scheduled','confirmed')
    WHEN 'in_progress' THEN v_from IN ('active','accepted')
    WHEN 'completed'   THEN v_from IN ('active','in_progress')
                          AND (v_is_admin
                               OR EXISTS (SELECT 1 FROM public.astrologers a WHERE a.id = NEW.astrologer_id AND a.user_id = auth.uid()))
    WHEN 'cancelled'   THEN v_from IN ('pending','accepted','scheduled','confirmed')
    WHEN 'refunded'    THEN v_from IN ('completed','cancelled')
                          AND v_is_admin
    WHEN 'failed'      THEN v_from IN ('pending','accepted','active','scheduled','confirmed')
    ELSE FALSE
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Illegal consultation status transition: % -> %', v_from, v_to
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- Re-create trigger (idempotent).
DROP TRIGGER IF EXISTS consultation_status_validation ON public.consultations;
CREATE TRIGGER consultation_status_validation
  BEFORE UPDATE OF status ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION validate_consultation_status_change();

-- =====================================================================
-- 3. Revoke status from the column-level UPDATE grant
-- =====================================================================

REVOKE UPDATE ON public.consultations FROM anon, authenticated;
GRANT UPDATE (notes, user_rating, user_review, updated_at)
  ON public.consultations TO authenticated;
-- status is server-authoritative: only the SECURITY DEFINER RPCs and
-- service_role direct writes (e.g. reconciliation) can change it.

-- =====================================================================
-- 4. start_consultation RPC (fills the gap from 010/011)
-- =====================================================================
-- secure_create_consultation inserts with status='active' for AI flows;
-- for human astrologer flows status starts at 'pending' and only moves
-- to 'active' when the astrologer accepts and the user starts. The
-- RPC below is the only path for that user-initiated transition.

DROP FUNCTION IF EXISTS public.start_consultation(UUID);
CREATE OR REPLACE FUNCTION public.start_consultation(p_consultation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller CONSTANT UUID := auth.uid();
  v_con RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT id, user_id, astrologer_id, status
    INTO v_con
    FROM public.consultations
    WHERE id = p_consultation_id
    FOR UPDATE;

  IF v_con.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Consultation not found');
  END IF;
  IF v_con.user_id <> v_caller AND NOT public.is_admin(v_caller) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
  END IF;

  UPDATE public.consultations
    SET status = 'active', start_time = COALESCE(start_time, now()), updated_at = now()
  WHERE id = p_consultation_id
    AND status IN ('pending','accepted');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Consultation not in a startable state');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.start_consultation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_consultation(UUID) TO authenticated;