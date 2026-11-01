-- Migration 054: Payments integer-paise column (money-path integrity)
--
-- Finding C-4 from the 2026-09 production-readiness audit: verify-payment
-- and razorpay-webhook compared the gateway's integer paise against the DB
-- `amount NUMERIC(12,2)` by JS string-splitting ("100.00" -> "100" + "00"),
-- which breaks for any driver serialization that drops trailing zeros or
-- carries extra scale ("100.0000" parsed fine, but a hypothetical
-- "100.005" would mis-parse). The root fix is an exact integer column.
--
-- This migration:
--   1. Adds payments.amount_paise BIGINT.
--   2. Backfills it from `amount` using exact NUMERIC arithmetic
--      (ROUND(amount * 100) — amount has scale 2, so the product is an
--      exact integer; ROUND is belt-and-braces).
--   3. Installs a BEFORE INSERT/UPDATE trigger that keeps amount_paise in
--      lockstep with amount, so every insert path (create-razorpay-order,
--      admin tooling, backfills) stays correct without code changes.
--   4. Adds a CHECK constraint as a second, independent guarantee.
--
-- Edge functions now read amount_paise directly (separate commit).
--
-- SAFE TO RE-RUN: IF NOT EXISTS + idempotent trigger/constraint creation.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS amount_paise BIGINT;

-- Backfill existing rows. amount is NUMERIC(12,2): amount * 100 is exact.
UPDATE public.payments
   SET amount_paise = ROUND(amount * 100)::BIGINT
 WHERE amount_paise IS NULL;

-- Lockstep trigger: amount_paise is always ROUND(amount * 100).
CREATE OR REPLACE FUNCTION public.sync_payment_amount_paise()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.amount_paise := ROUND(NEW.amount * 100)::BIGINT;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_amount_paise_sync ON public.payments;
CREATE TRIGGER payments_amount_paise_sync
  BEFORE INSERT OR UPDATE OF amount ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_payment_amount_paise();

-- Backfilled rows now satisfy NOT NULL; enforce it going forward.
ALTER TABLE public.payments
  ALTER COLUMN amount_paise SET NOT NULL;

-- Independent guarantee: the integer column can never drift from the
-- decimal one. (Redundant with the trigger; catches manual UPDATEs that
-- bypass the trigger, e.g. session_replication_role = replica.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_amount_paise_matches'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_amount_paise_matches
      CHECK (amount_paise = ROUND(amount * 100)::BIGINT);
  END IF;
END $$;