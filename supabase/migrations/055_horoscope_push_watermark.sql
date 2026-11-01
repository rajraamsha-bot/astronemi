-- Migration 055: daily-horoscope push watermark
--
-- Finding H-8 from the 2026-09 production-readiness audit: the FCM push
-- loop in daily-horoscope had no per-row idempotency. Horoscope GENERATION
-- was idempotent (upsert on sign,period,date) but a retried invocation
-- (platform retry after a mid-loop timeout) re-pushed to every subscriber.
--
-- last_pushed_date is the IST business-day the row was last successfully
-- pushed for. The Edge Function skips rows already stamped with today's
-- date and stamps them after FCM returns 2xx.
--
-- SAFE TO RE-RUN: ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.horoscope_subscriptions
  ADD COLUMN IF NOT EXISTS last_pushed_date DATE;