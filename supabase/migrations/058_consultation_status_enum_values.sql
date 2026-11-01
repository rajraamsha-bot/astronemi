-- Migration 058: consultation_status enum values used by the state machine
--
-- PROBLEM (C4 from 2026-09 audit): migration 053's
-- validate_consultation_status_change() allows transitions to 'scheduled'
-- and 'failed', but the consultation_status enum only contains
-- pending/confirmed/in_progress/completed/cancelled/refunded (001) plus
-- active/accepted/declined (011, re-asserted 030). Writing either missing
-- value on a fresh database raises `invalid input value for enum
-- consultation_status`. Verified by grepping every migration for ADD VALUE.
--
-- FIX: add both values. NOTE on Postgres mechanics: ALTER TYPE ... ADD
-- VALUE cannot run inside a transaction block (and therefore cannot run
-- inside a function or a multi-statement migration transaction on older
-- server versions). Follow the existing 011/030 pattern: standalone DO
-- blocks that swallow duplicate_object, one value per block.
--
-- SAFE TO RE-RUN: duplicate_object is swallowed; no-ops on existing DBs.

DO $$
BEGIN
  ALTER TYPE public.consultation_status ADD VALUE 'scheduled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.consultation_status ADD VALUE 'failed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

