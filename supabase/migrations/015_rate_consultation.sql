-- Migration: Rate Consultation RPC
-- Purpose: Allow users to rate and review their completed consultations
-- Security: Users can only rate their own consultations
--
-- P1 FIX: added `SET search_path = public` to prevent search_path hijack
-- (see supabase/migrations/017 for the same hardening on the other
-- SECURITY DEFINER functions). This function references unqualified
-- `consultations` and `audit_logs` tables; without the search_path pin,
-- a malicious user could create a `public.consultations` that hijacks
-- the lookup.

-- Create rate_consultation function
CREATE OR REPLACE FUNCTION rate_consultation(
  p_consultation_id UUID,
  p_user_rating INTEGER,
  p_user_review TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_consultation_user_id UUID;
  v_consultation_status TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be logged in to rate consultations';
  END IF;

  -- Validate rating range (1-5)
  IF p_user_rating < 1 OR p_user_rating > 5 THEN
    RAISE EXCEPTION 'Invalid rating: Must be between 1 and 5';
  END IF;

  -- Get consultation details and verify ownership
  SELECT user_id, status INTO v_consultation_user_id, v_consultation_status
  FROM consultations
  WHERE id = p_consultation_id;

  -- Check if consultation exists
  IF v_consultation_user_id IS NULL THEN
    RAISE EXCEPTION 'Consultation not found';
  END IF;

  -- Verify user owns this consultation
  IF v_consultation_user_id != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only rate your own consultations';
  END IF;

  -- Verify consultation is completed
  IF v_consultation_status != 'completed' THEN
    RAISE EXCEPTION 'Invalid status: Can only rate completed consultations';
  END IF;

  -- Update consultation with rating and review
  UPDATE consultations
  SET 
    user_rating = p_user_rating,
    user_review = p_user_review,
    rated_at = NOW()
  WHERE id = p_consultation_id;

  -- Log the rating action for audit trail
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    metadata
  ) VALUES (
    v_user_id,
    'rate_consultation',
    'consultations',
    p_consultation_id,
    jsonb_build_object(
      'rating', p_user_rating,
      'has_review', p_user_review IS NOT NULL
    )
  );

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION rate_consultation TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION rate_consultation IS 'Allows users to rate and review their completed consultations with auth verification';
