# Backend Migration Exit Plan

Status: **Supabase is the v1 primary backend.** This plan keeps a future move
to AWS/Neon possible without discovering the coupling after the fact. It is not
a launch task and it does not require changing the current architecture.

## 1. Decision

- **v1:** Supabase (Postgres + Auth + Edge Functions + Realtime + pg_cron).
- **Future option:** AWS (RDS/Aurora + Cognito/Auth0 + API Gateway/Lambda +
  EventBridge + S3) or Neon for Postgres.
- **Not a migration target:** Convex. Its document model would require a
  rewrite of the SQL schema, RPCs, triggers, RLS, and reporting.

## 2. Current coupling snapshot

Regenerate with `npm run check:portability`.

| Area | Current count |
|---|---|
| SQL migration files | 70 |
| Edge Functions | 13 (11 deployed for v1) |
| `auth.uid()` in migrations | 289 |
| `auth.role()` in migrations | 12 |
| pg_cron references | 52 |
| Client `supabase.from` calls | 12 |
| Client `supabase.rpc` calls | 46 |
| Client `functions.invoke` calls | 13 |
| Client `supabase.auth.*` calls | 40 |

The biggest lock-in is **Auth + RLS** (`auth.uid()` / `auth.role()`), followed
by **pg_cron** and the **Edge Functions**. Postgres itself is portable; the
Supabase runtime around it is not.

## 3. Portability principles

1. **SQL migrations are canonical.** Every schema change goes through
   `supabase/migrations/`; never edit an applied migration.
2. **Standard Postgres first.** Use plain tables, indexes, constraints,
   functions, and triggers. Avoid new `pg_cron`, `pg_net`, `vault`, or
   `storage.*` dependencies unless the feature genuinely needs them.
3. **New data access goes through `services/`.** Screens should not grow new
   direct `supabase.from/rpc/functions.invoke` calls. This keeps one adapter
   surface to replace.
4. **Keep auth/realtime/storage behind interfaces.** The client already imports
   the single client from `lib/supabase.ts`; keep it that way and add adapters
   for auth subscriptions and realtime before a migration.
5. **No Supabase Storage dependency without a migration note.** Storage is
   currently not used by the client; keep it that way unless needed.
6. **Back up and restore regularly.** A migration plan that has never restored
   a dump is fiction.

## 4. Target AWS mapping

| Supabase | AWS / Neon equivalent |
|---|---|
| Postgres | RDS/Aurora PostgreSQL or Neon |
| Auth (phone OTP) | Cognito user pool + SNS, or Auth0/Clerk |
| Edge Functions (Deno) | API Gateway + Lambda (Node/Deno) or ECS Fargate |
| Realtime | API Gateway WebSocket + ElastiCache/DynamoDB, or Ably/Pusher |
| pg_cron | EventBridge Scheduler + Lambda |
| Storage | S3 + CloudFront (not currently used) |
| Vault/secrets | AWS Secrets Manager / SSM Parameter Store |
| Logs/metrics | CloudWatch + Sentry |
| CI/CD | GitHub Actions with OIDC to AWS |

## 5. Auth migration

Phone OTP users do not have passwords, which makes auth migration easier but
session migration impossible.

1. Export `auth.users` and `public.users` through the Supabase admin API /
   SQL dump. Map the stable `users.id` values.
2. Create users in Cognito/Auth0/Clerk with the same phone numbers and preserve
   the internal user IDs in your own table.
3. Invalidate old sessions; users re-login once with OTP.
4. Replace `auth.uid()`, `auth.role()`, and `auth.jwt()` with a SQL helper that
   reads the caller identity from the API-set JWT claims or session settings.
   Every RLS policy and SECURITY DEFINER function must use that helper.
5. Re-run the RPC authorization audit and the user-flag/device-binding tests
   against the new database.

## 6. Database migration

1. `pg_dump` the public schema + data, including functions, triggers, views,
   and indexes.
2. Restore into the target Postgres; enable `pgcrypto`/`uuid-ossp` as required.
3. Replace Supabase auth helper calls; keep the same RLS intent.
4. Recreate the `pg_cron` jobs as EventBridge schedules or an external cron.
5. Run the migration guard tests and the wallet/payment smoke tests.
6. For the money-path cutover: freeze writes, take a final dump, verify row
   counts/checksums, then switch the API. Keep Supabase read-only for rollback.

## 7. Edge Functions and webhooks

- Port each function to Lambda/API Gateway or a small container. Keep the
  request/response contracts unchanged so the client adapter only changes the
  transport.
- Razorpay webhook: API Gateway route, HMAC verification, idempotency table,
  retry semantics. Keep `fulfill_payment_v1` behavior equivalent.
- Replace `supabase.functions.invoke` with an `api.invoke` adapter.
- Move `supabase secrets` to Secrets Manager/SSM.

## 8. Realtime

- Chat (`chat_messages`), consultation status, and notifications are the
  realtime surfaces.
- Replace with API Gateway WebSocket + a fan-out store, or Ably/Pusher.
- Keep event names and payload shapes stable so the UI does not change.
- Add an adapter (`subscribeToChat`, `subscribeToNotifications`,
  `subscribeToConsultationStatus`) before the migration.

## 9. Phased plan

| Phase | Work |
|---|---|
| 0 (now) | Keep SQL canonical; run `check:portability`; no new Supabase-only features; regular dump/restore drills. |
| 1 | Restore a staging clone into RDS/Neon; run read-only queries and migration guard tests. |
| 2 | Add auth/API/realtime adapters; port Edge Functions and cron; test on staging. |
| 3 | Dual-deliver webhooks, backfill, cut over reads then writes; validate money paths. |
| 4 | Decommission Supabase writes; keep a read-only snapshot for rollback. |

## 10. Rollback

- Keep the Supabase project and a final dump until the new backend has run
  through at least one billing cycle.
- Keep webhook dual-delivery configured during the cutover.
- Rollback is DNS/API configuration plus a database restore; never delete the
  source database until the first full billing cycle passes.

## 11. Guardrails for new work

- No new `supabase.storage`, `vault`, `pg_net`, or `pg_cron` usage without an
  entry in this document.
- No direct `supabase.*` calls in screens for new features; add a service.
- No new auth-provider-specific fields in the public schema without a mapping
  note.
- Run `npm run check:portability` when reviewing backend changes.
