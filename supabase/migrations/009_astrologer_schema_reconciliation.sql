-- Migration 009 (reordered): Reconcile astrologers/consultations columns
--
-- WHY THIS RUNS BEFORE MIGRATION 010:
--   The app (services/api.ts, services/chat.ts, lib/database.types.ts) and
--   migration 010 (AI astrologer seed) reference columns that NO earlier
--   migration created. On a fresh database, 010's INSERT with avatar_url /
--   expertise would fail with "column does not exist". This file sorts
--   between 008 and 010 ("astrologer..." < "payment...") so the columns
--   exist before anything uses them.
--
-- Columns added:
--   astrologers: avatar_url, expertise, available_from, available_to
--     (001/004 only defined `avatar`; `expertise`/`available_from|to` were
--      never defined but are used by migration 010 and every client query)
--   consultations: total_amount
--     (migrations 011 and 024 write total_amount, and the client reads it,
--      but 001 only defined `price`. Kept nullable — safe.)
--
-- SAFE TO RE-RUN: ADD COLUMN IF NOT EXISTS + idempotent backfill.

ALTER TABLE public.astrologers
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS expertise TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS available_from TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS available_to TIMESTAMP WITH TIME ZONE;

-- Backfill avatar_url from the legacy avatar column so existing seed rows
-- keep their pictures.
UPDATE public.astrologers
SET avatar_url = avatar
WHERE avatar_url IS NULL AND avatar IS NOT NULL;

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2);
