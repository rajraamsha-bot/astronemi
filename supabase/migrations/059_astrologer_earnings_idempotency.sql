-- Migration 059: astrologer_earnings idempotency (H2 from 2026-09 audit)
--
-- PROBLEM: end_consultation (024) and complete_consultation guard the
-- earnings insert with IF NOT EXISTS (SELECT 1 ... WHERE consultation_id
-- = ...). astrologer_earnings (011) has no UNIQUE(consultation_id), so two
-- concurrent end-calls that both serialize past the consultations FOR
-- UPDATE row lock can both pass the guard and insert — double-counting
-- the astrologer's earnings. Verified: 011:66-77 defines no unique on
-- consultation_id; 024:100-109 is check-then-insert.
--
-- FIX: partial UNIQUE on consultation_id WHERE consultation_id IS NOT
-- NULL (NULLs allowed: legacy/adjustment rows without a consultation keep
-- working). The IF NOT EXISTS guard stays as the fast path; the unique
-- is the backstop — a loser of the race gets 23505, which callers treat
-- as already-processed.
--
-- DATA MIGRATION: if duplicates already exist, keep the earliest row per
-- consultation_id and delete the rest before adding the constraint, so
-- deploying never fails on existing data.
--
-- SAFE TO RE-RUN: dedupe is idempotent; index uses IF NOT EXISTS.

-- 1. Dedupe existing doubles (keep earliest created row per consultation).
DELETE FROM public.astrologer_earnings a
USING public.astrologer_earnings b
WHERE a.consultation_id IS NOT NULL
  AND b.consultation_id IS NOT NULL
  AND a.consultation_id = b.consultation_id
  AND a.id <> b.id
  AND (
    a.created_at > b.created_at
    OR (a.created_at = b.created_at AND a.id > b.id)
  );

-- 2. Backstop unique: one earnings row per consultation.
CREATE UNIQUE INDEX IF NOT EXISTS ux_astrologer_earnings_consultation
  ON public.astrologer_earnings (consultation_id)
  WHERE consultation_id IS NOT NULL;
