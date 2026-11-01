-- scripts/disable-ai-production.sql
--
-- Run this against the PRODUCTION database after migrations and before the
-- v1 store release. It keeps all AI code and schema intact, but takes the AI
-- astrologer offline so it cannot be discovered, booked, or billed.
--
-- Do NOT run this in development/staging if you want to test AI there.
--
-- psql "$SUPABASE_DB_URL" -f scripts/disable-ai-production.sql

BEGIN;

UPDATE public.astrologers
SET is_online = false,
    is_available = false
WHERE is_ai = true;

-- Optional safety cleanup for a database that was used during beta:
-- close any open AI sessions so they cannot keep billing.
UPDATE public.consultations c
SET status = 'cancelled',
    updated_at = now()
FROM public.astrologers a
WHERE c.astrologer_id = a.id
  AND a.is_ai = true
  AND c.status IN ('pending', 'active');

COMMIT;
