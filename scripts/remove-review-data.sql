-- ============================================================================
-- REVIEW-ONLY ASTROLOGER CLEANUP
-- ============================================================================
-- Run this against the staging/review Supabase project when the review build
-- is no longer needed. It removes only the deterministic demo profiles.
--
-- This does not reverse the optional review credit grant. Discard the review
-- project or zero the demo account balance separately if needed.
-- ============================================================================

BEGIN;

DELETE FROM public.astrologers
 WHERE id IN (
   '99999999-9999-4999-8999-999999999901',
   '99999999-9999-4999-8999-999999999902',
   '99999999-9999-4999-8999-999999999903'
 );

COMMIT;
