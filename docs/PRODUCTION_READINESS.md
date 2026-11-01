# AstroNemi — Production Readiness & Deployment Runbook

Companion to SECURITY.md, `BACKEND_RELEASE_CHECKLIST.md`, and the migration
chain in supabase/migrations/. A future AWS/Neon exit path is documented in
`MIGRATION_EXIT_PLAN.md`; run `npm run check:portability` for the current
Supabase coupling inventory. Pre-submission store risks are tracked in
`STORE_COMPLIANCE_AUDIT.md`.

## 1. Verification gates (run from a clean checkout)

| Gate | Command | Status |
| --- | --- | --- |
| Type check | `npx tsc --noEmit` | PASS (0 errors) |
| Unit tests | `npx jest --config jest.config.js` | PASS (95 suites / 1,703 tests) |
| Lint | `npm run lint` | PASS |
| Web bundle | `npx expo export --platform web` | PASS (6.56 MB, under 8 MB CI budget) |
| Expo config | `npx expo-doctor` | PASS after SDK version alignment |
| RPC auth audit | `node scripts/audit-rpc-auth.js` | PASS (unexpected: 0) |
| Cron wiring | `node scripts/check-cron-functions.js` | PASS |
| Production env validation | `node scripts/check-production-ready.js` | Must pass with real secrets; reads `.env.production` and CI secrets |
| Dependency audit | `npm run check:audit` | PASS with documented Expo-build-tooling allowlist |

Device-level Detox E2E is not part of CI. Unit-style critical-flow tests live
under `__tests__/e2e/`; `npm run test:smoke` runs that maintained suite. The
legacy top-level `e2e/` service tests were removed because they were never
wired into CI and asserted behaviors that no longer exist.

## 2. Required environment variables

### Client bundle (EXPO_PUBLIC_*, inlined at build)
| Variable | Requirement |
| --- | --- |
| EXPO_PUBLIC_SUPABASE_URL | valid https URL |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | real anon key (not placeholder) |
| EXPO_PUBLIC_RAZORPAY_KEY_ID | `rzp_live_...` in production (test keys are rejected) |
| EXPO_PUBLIC_SENTRY_DSN | `https://<key>@sentry.io/<project>` (real DSN) |
| EXPO_PUBLIC_APP_ENV | `production` |
| EXPO_PUBLIC_DEBUG_MODE | `false` |
| EXPO_PUBLIC_USE_MOCK_API | unset or `false` |
| EXPO_PUBLIC_ENABLE_AI_FEATURES | unset or `false` for the v1 launch |
| EXPO_PUBLIC_ENABLE_IAP | `false` until store products and verification secrets are configured |
| EXPO_PUBLIC_REVIEW_MODE | `false` in production; `true` only in the review build with a Supabase test number |

### Server-side (Supabase Edge Function secrets — never in the client bundle)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
`AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `PRODUCTION_URL`.
IAP: `APPLE_BUNDLE_ID`, `APPLE_ISSUER_ID`, `APPLE_KEY_ID`,
`APPLE_PRIVATE_KEY`, `APPLE_ALLOW_SANDBOX=false`,
`GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_SERVICE_ACCOUNT_JSON`.
SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
For daily-horoscope push: `FCM_SERVICE_ACCOUNT_JSON` + `FIREBASE_PROJECT_ID`
(legacy FCM tokens); Expo push tokens need no server secret.
`OPENAI_API_KEY` is intentionally **not set** for v1; it is only needed when
the AI functions are deployed later.

Supabase Auth phone login also needs an SMS provider configured in the
Supabase dashboard (Authentication → Providers → Phone). The `send-sms` Edge
Function is not a substitute for the Auth provider used by
`supabase.auth.signInWithOtp`.

### CI secrets
The `production-checks` job maps `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_RAZORPAY_KEY_ID`, and
`EXPO_PUBLIC_SENTRY_DSN` from repository secrets. Add them before the first
production dispatch. `SLACK_WEBHOOK_URL` is used for deploy notifications.

### Build/deploy
`app.json` → `expo.extra.eas.projectId` (real EAS id); `eas.json` submit values
(no `REPLACE_WITH`/`CONFIGURE_` placeholders).

## 3. Database migrations

- Chain: `001` → `067`, applied in lexicographic order by `supabase db push`.
- Reconciliation files use suffixes (`001b`, `001c`, `009b`) and two files
  share the `009_` prefix. Non-standard but harmless — Supabase orders by
  filename. Never edit an applied migration; add the next number.
- `035_harden_referral_bonus_wrapper.sql` re-declares the
  `apply_referral_bonus` wrapper with an explicit `auth.uid()` ownership guard.
- `046_money_path_integrity.sql` seeds `topup_denominations` (the only amounts
  the client may buy) and `astrologer_subscription_pricing`.
- `063_revenue_timeseries_timezone_and_disputes.sql` fixes revenue bucketing in
  IST and dispute visibility.
- `064_disable_ai_consultations.sql` blocks pending/active consultations for an
  offline AI astrologer; run `scripts/disable-ai-production.sql` after
  migrations in production.
- `065_content_reports.sql` adds the UGC report table + RLS.
- `066_iap_wallet_credits.sql` adds the `iap_products` catalog, the
  `iap_transactions` idempotency ledger, and the service-role-only
  `fulfill_iap_purchase` RPC.
- `067_iap_subscription_passes.sql` adds non-renewing customer and AstroPro
  pass products, `activate_subscription_iap`,
  `activate_astrologer_subscription_iap`, and the dispatching
  `fulfill_iap_purchase_v2` RPC.
- ALWAYS apply to a staging/cloned database first and run a smoke test before
  production. Take a dump before any run: `npm run db:backup`.

## 4. Edge functions (11 deployed for v1)

`supabase functions deploy` for: `agora-token`, `cancel-subscription`,
`create-razorpay-order`, `daily-horoscope`, `deduct-wallet`, `health-check`,
`prokerala`, `razorpay-webhook`, `send-sms`, `verify-iap-purchase`,
`verify-payment`.

`ai-chat` and `interpret-dream` stay in `supabase/functions/` but are **not
deployed** for the v1 launch. `rate-limit` and `register-push-token` were
removed; rate limiting runs through the `check_rate_limit` RPC and the client
writes `push_tokens` directly under RLS. Do not recreate them.

### AI is disabled in v1

- `EXPO_PUBLIC_ENABLE_AI_FEATURES=false` in production; the master switch is
  fail-closed when unset.
- The client redirects `/ai-chat`, `/ai-chatbot`, and `/ask-question` home;
  AI astrologers are excluded from discovery/booking/chat; AI Guru and
  Soulmate cards are hidden; subscription copy omits AI lines.
- Dream interpretation remains available using the offline keyword heuristic
  only; it never calls OpenAI.
- `supabase/migrations/064_disable_ai_consultations.sql` blocks any new
  pending/active consultation for an AI astrologer whose `is_available` is
  false.
- Run `psql "$SUPABASE_DB_URL" -f scripts/disable-ai-production.sql` after
  migrations and before release. This takes the AI row offline and closes any
  open beta AI sessions.
- Re-enable later by: setting the flag true in production, setting
  `OPENAI_API_KEY`, deploying `ai-chat`/`interpret-dream`, setting the AI row
  online, and adding the AI privacy/terms/moderation work.

## 5. Background jobs (pg_cron — migrations 034, 038, 060)

Registered schedules: `expire-subscriptions` (*/15m),
`sweep-deleted-accounts` (hourly), `expire-astrologer-subscriptions` (hourly),
`reset-today-earnings` (18:30 UTC / midnight IST).
Observable via `cron_health()` (migration 060) and `/functions/v1/health-check`.

### External Scheduler Strategy (when pg_cron is unavailable)
If hosting PostgreSQL without `pg_cron` (e.g., standard vanilla Postgres, CI, or external managed Postgres):
1. **Supabase Scheduled Functions / Cloud Scheduler / cron-job.org**:
   Invoke the service_role sweep RPCs on schedule:
   - `expire_subscriptions()` (every 15m)
   - `sweep_deleted_accounts()` (every 1h)
   - `expire_astrologer_subscriptions()` (every 1h)
   - `reset_today_earnings()` (daily at 18:30 UTC / 00:00 IST)
2. **Monitoring & Observability**:
   Hit `/functions/v1/health-check`. The response includes `services.cron` reporting active status for each job and evidence of execution from `subscription_audit` and `users.deletion_scheduled_at`. Status returns `degraded` if any required job is inactive or missing.

## 6. Deploy order

1. Backup: `npm run db:backup`.
2. Migrate staging, run `scripts/disable-ai-production.sql` in production,
   smoke test.
3. Set Edge Function secrets (`supabase secrets set ...`), protect
   `SUPABASE_SERVICE_ROLE_KEY` and `RAZORPAY_KEY_SECRET` as server-only, then
   deploy the 11 non-AI functions (staging then production).
4. `eas build` the app; upload Sentry source maps.
5. Hit `/functions/v1/health-check` → expect HTTP 200 (healthy).
6. Production is manual only: `workflow_dispatch` with `deploy_production=deploy`
   on `main` (typed confirmation gate in ci.yml).

## 7. Smoke tests (post-deploy)

OTP login → signup bonus credited; wallet credit top-up via App Store/Play
sandbox with server verification and replay protection; customer subscription
pass → tier grant and extension; AstroPro pass → plan grant; consultation
booking + per-minute debit;
referral code → both wallets credited; admin gating (non-admin cannot reach admin
data); health-check 200.

## 8. Rollback plan

- **App:** `eas update --branch` to the previous update, or rebuild the prior
  commit. App rollback is independent of data.
- **Edge functions:** redeploy the previous function bundle (they are stateless;
  all money/state lives in Postgres).
- **Migrations:** forward-fix only — the chain is additive. Never edit an applied
  migration; add a new one (pattern used by 030/031/033/035). Restore point:
  the pre-deploy `supabase db dump` (point-in-time recovery).

## 9. Backup / restore

- Backup: `npm run db:backup` (`supabase db dump`). Schedule daily.
- Restore: `supabase db restore` against the dump. Test restore on staging monthly.

## 10. Observability

- Client: Sentry (services/error-reporting.ts) with sensitive-field sanitization
  + structured Logger (services/logger.ts).
- Server: `/functions/v1/health-check` returns 200/503 with per-service status;
  edge functions log via `console.*` (captured by Supabase logs).

## 11. Open items / decisions required

Resolved in the 2026-10 readiness pass:

1. **M1 device binding** — DONE. `036_server_device_binding.sql` adds a
   `public.devices` table plus `bind_device()` (2-device cap via a per-user
   advisory lock) and `revoke_device()` RPCs. Login fails closed if binding
   fails.
2. **H1 pricing single-source** — DONE. `037_pricing_table.sql` and
   `046_money_path_integrity.sql` own plan/pooja/coupon, top-up, question, and
   astrologer-subscription prices. The AstroPro screen no longer hardcodes
   amounts.
3. **CI duplication** — DONE. Single `ci.yml`. The dead Detox job was removed
   and every matrix leg now scopes coverage correctly. Production functions
   deploy only on a manually confirmed dispatch.
4. **CI env provisioning** — DONE. `production-checks` maps the required
   `EXPO_PUBLIC_*` values from repository secrets. `check-production-ready.js`
   reads `.env.production` as well as `.env`, with process env taking
   precedence.
5. **Slack secret name** — standardised on `SLACK_WEBHOOK_URL`.
6. **Wallet top-up** — IAP-ready. Digital credits use `expo-iap` consumables;
   `verify-iap-purchase` verifies the store transaction and
   `fulfill_iap_purchase` credits idempotently. Razorpay top-ups fail closed.
   The legacy test at `__tests__/services/wallet-topup.test.ts` now asserts that
   policy; set `EXPO_PUBLIC_ENABLE_IAP=true` only after store products/secrets
   are configured.
7. **Push delivery** — DONE. The client writes its Expo token to both
   `push_tokens` and `horoscope_subscriptions`; `daily-horoscope` sends Expo
   push messages and keeps FCM for legacy tokens.
8. **Dependency audit** — DONE. `npm run check:audit` fails on new high/critical
   advisories and explicitly allowlists only unfixable Expo build-tooling
   advisories (see `scripts/check-npm-audit.js`).

Still requires account access (cannot be committed):

- Run `eas init` and replace `expo.extra.eas.projectId`; then
  `eas update:configure` to add `updates.url`.
- Fill `eas.json` App Store Connect values and add `google-service-account.json`.
- Rotate the credentials that were committed in `.env.staging` and purge repo
  history — see `docs/SECRET_ROTATION.md`.
