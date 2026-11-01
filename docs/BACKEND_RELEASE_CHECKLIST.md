# Backend Release Checklist (Supabase v1)

Companion to `docs/BACKEND_LAUNCH_SEQUENCE.md`, `docs/PRODUCTION_READINESS.md`,
and `docs/MIGRATION_EXIT_PLAN.md`.

## 1. Project setup

- [ ] Staging and production Supabase projects exist.
- [ ] `supabase link --project-ref <ref>` for each environment.
- [ ] Supabase Auth → Providers → Phone is configured with Twilio/MessageBird.
- [ ] Phone OTP rate limits are configured.
- [ ] One Supabase **Test OTP** number is configured for store review
      (`docs/REVIEW_ACCESS.md`); create the scoped demo account with it.
- [ ] Public legal pages are live over HTTPS:
      `/privacy`, `/terms`, `/account-deletion`, `/wallet-terms`
      (`docs/STORE_LISTING.md`).
- [ ] Realtime is enabled for the tables used by chat/notifications.
- [ ] No Supabase Storage dependency is added without a migration note.

## 2. Secrets

Set with `supabase secrets set` (never in the client bundle):

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `RAZORPAY_KEY_ID`
- [ ] `RAZORPAY_KEY_SECRET`
- [ ] `RAZORPAY_WEBHOOK_SECRET`
- [ ] `AGORA_APP_ID`
- [ ] `AGORA_APP_CERTIFICATE`
- [ ] `PRODUCTION_URL=https://astronemi.app`
- [ ] `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` (only if `send-sms` is deployed/used)
- [ ] `FCM_SERVICE_ACCOUNT_JSON` / `FIREBASE_PROJECT_ID` (legacy push only)
- [ ] `APPLE_BUNDLE_ID=com.astronemi.astronemi`
- [ ] `APPLE_ISSUER_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` (App Store Server API)
- [ ] `APPLE_ALLOW_SANDBOX=false` in production; `true` only in staging
- [ ] `GOOGLE_PLAY_PACKAGE_NAME=com.astronemi.astronemi`
- [ ] `GOOGLE_SERVICE_ACCOUNT_JSON` (Play Developer API service account)
- [ ] **Do not set `OPENAI_API_KEY`** for the v1 launch.

## 3. Migrations

- [ ] Backup: `npm run db:backup`.
- [ ] Apply `001` → `067` to staging: `supabase db push`.
- [ ] Run migration guard tests and smoke tests on staging.
- [ ] Production: backup, then `supabase db push`.
- [ ] Production only: `psql "$SUPABASE_DB_URL" -f scripts/disable-ai-production.sql`.
- [ ] Verify `is_admin` and `verify_user_flag_protection()` still work.
- [ ] Verify `cron_health()` shows the expected jobs.

## 4. Edge Functions (11 for v1)

- [ ] `agora-token`
- [ ] `cancel-subscription`
- [ ] `create-razorpay-order`
- [ ] `daily-horoscope`
- [ ] `deduct-wallet`
- [ ] `health-check`
- [ ] `prokerala`
- [ ] `razorpay-webhook`
- [ ] `send-sms`
- [ ] `verify-iap-purchase`
- [ ] `verify-payment`
- [ ] Do **not** deploy `ai-chat` or `interpret-dream`.

## 5. Razorpay

- [ ] Webhook URL points at the production `razorpay-webhook` function.
- [ ] Webhook secret matches `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Events enabled: `payment.captured`, `payment.failed`, `refund.processed`,
      `order.paid`, `subscription.cancelled`.
- [ ] Test-mode end-to-end: consultation, product order, pooja booking.
      **Do not test wallet top-ups, subscription passes, or AstroPro passes
      here** — all digital goods now use IAP.
- [ ] Live-key smoke test after the test-mode pass.

## 5b. In-app purchases (credits + passes)

- [ ] Create consumable products in App Store Connect and Google Play Console
      matching `public.iap_products`:
      - Credits: `com.astronemi.credits.*` / `astronemi_credits_*`
      - Customer passes: `com.astronemi.plan.*` / `astronemi_plan_*`
      - AstroPro passes: `com.astronemi.astropro.*` / `astronemi_astropro_*`
      All passes are one-time, non-renewing products.
- [ ] Set store prices to cover Apple/Google commission. Credit packs grant
      `credit_inr + bonus_inr`; passes grant the configured plan/duration. The
      server never trusts a client-supplied price or credit amount.
- [ ] The Android product IDs must be active and the app must be on a testing
      or production track.
- [ ] Run `verify-iap-purchase` with the Apple/Google secrets above.
- [ ] Sandbox credit purchase → server verifies → credits appear → transaction
      is finished. Repeat the same transaction and confirm no duplicate credit.
- [ ] Sandbox customer pass → `activate_subscription_iap` grants the tier and
      expiry; buying another pass extends from the current expiry.
- [ ] Sandbox AstroPro pass → `activate_astrologer_subscription_iap` activates
      the plan and expiry; buying another pass extends it.
- [ ] Buy from account A, then attempt to verify from account B: must be rejected
      (app account token / obfuscated account ID binding).
- [ ] Set `EXPO_PUBLIC_ENABLE_IAP=true` only after the sandbox pass.
- [ ] Confirm `create-razorpay-order` rejects all digital-goods types
      (`topup`, `wallet`, `subscription`, `astrologer_subscription`, `question`).
- [ ] Confirm courses and gift cards are hidden (feature flags false / removed
      from progressive disclosure).
- [ ] Publish `/wallet-terms.html` and link it from the wallet screen and store
      listing.

## 6. Health, cron, observability

- [ ] `GET /functions/v1/health-check` returns HTTP 200.
- [ ] Add an uptime monitor for health-check.
- [ ] Edge Function logs are reviewed after deploy.
- [ ] Sentry DSN is configured for the client.
- [ ] Slack webhook (`SLACK_WEBHOOK_URL`) is set if deploy alerts are wanted.
- [ ] Backups/PITR are enabled; restore has been tested on staging.
- [ ] k6 baseline runs against staging with a real `STAGING_API_URL`.

## 7. Money-path smoke test

- [ ] OTP login → profile creation → signup bonus.
- [ ] Wallet credit top-up via the App Store/Play sandbox; server-verified
      credits match `iap_products` and no duplicate is issued on replay.
- [ ] Subscription activation and tier grant.
- [ ] Consultation booking + per-minute debit.
- [ ] Referral code → both wallets credited.
- [ ] Account deletion request (30-day grace).
- [ ] Refund path (test mode).
- [ ] Admin gating: non-admin cannot read admin data.

## 8. AI-off checks

- [ ] `EXPO_PUBLIC_ENABLE_AI_FEATURES` is unset or `false`.
- [ ] `/ai-chat`, `/ai-chatbot`, `/ask-question` redirect Home.
- [ ] No `is_ai=true` astrologer appears in discovery/search/booking.
- [ ] AI Guru and Soulmate cards are hidden.
- [ ] Subscription copy contains no AI features.
- [ ] `scripts/disable-ai-production.sql` has run in production.
- [ ] `OPENAI_API_KEY` is not set.

## 9. Known CI issue

The manual `database-migration` job still uses:

```bash
supabase db remote psql --project-ref ...
```

Newer Supabase CLI versions may not ship that command. Replace it with
`psql "$SUPABASE_DB_URL"` (add `SUPABASE_DB_URL` as a repository secret) or
remove the post-push verification steps.

## 10. Portability guardrails

- [ ] `npm run check:portability` reviewed for new coupling.
- [ ] New data access lives in `services/`, not screens.
- [ ] No new `supabase.storage`, `vault`, `pg_net`, or `pg_cron` usage without
      updating `docs/MIGRATION_EXIT_PLAN.md`.
- [ ] Latest `pg_dump` is stored somewhere outside the Supabase project.
