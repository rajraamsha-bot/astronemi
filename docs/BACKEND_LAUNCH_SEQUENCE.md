# Backend Launch Sequence (Supabase v1)

Use this as the execution order after code review. It complements
`docs/BACKEND_RELEASE_CHECKLIST.md`, `docs/REVIEW_ACCESS.md`, and
`docs/STORE_LISTING.md`.

Do not run the review seed or review-only demo profiles in production.

## 0. Preconditions

- [ ] Staging and production Supabase projects exist.
- [ ] `astronemi.app` is registered, HTTPS hosting is live, and
      `support@` / `legal@` mailboxes receive mail.
- [ ] App Store Connect and Google Play Console apps exist with the bundle IDs
      `com.astronemi.astronemi`.
- [ ] EAS project is initialized and `app.json` no longer contains the
      placeholder project ID.
- [ ] Apple/Google/Razorpay accounts are verified for payments.

## 1. Supabase Auth

1. Authentication → Providers → Phone: enable and configure Twilio/MessageBird.
2. Set OTP rate limits.
3. Add one **Test OTP** number for store review (see `docs/REVIEW_ACCESS.md`).
4. Create the scoped demo account after the app is running, then run the
   optional review credit block in `scripts/seed-review-data.sql`.

## 2. Server secrets

Set these in each Supabase project (never in the client bundle):

```bash
supabase secrets set --project-ref "$SUPABASE_REF" \
  SUPABASE_URL="https://<ref>.supabase.co" \
  SUPABASE_ANON_KEY="<anon-key>" \
  SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
  PRODUCTION_URL="https://astronemi.app" \
  RAZORPAY_KEY_ID="<razorpay-key-id>" \
  RAZORPAY_KEY_SECRET="<razorpay-key-secret>" \
  RAZORPAY_WEBHOOK_SECRET="<razorpay-webhook-secret>" \
  AGORA_APP_ID="<agora-app-id>" \
  AGORA_APP_CERTIFICATE="<agora-certificate>" \
  APPLE_BUNDLE_ID="com.astronemi.astronemi" \
  APPLE_ISSUER_ID="<app-store-issuer-id>" \
  APPLE_KEY_ID="<app-store-key-id>" \
  APPLE_PRIVATE_KEY="<p8-private-key>" \
  APPLE_ALLOW_SANDBOX="false" \
  GOOGLE_PLAY_PACKAGE_NAME="com.astronemi.astronemi" \
  GOOGLE_SERVICE_ACCOUNT_JSON="<service-account-json>"
```

- `APPLE_ALLOW_SANDBOX=true` only in staging; `false` in production.
- Do **not** set `OPENAI_API_KEY` for v1.
- Keep `RAZORPAY_*` for physical orders and eligible consultations/pooja only.

## 3. Database migrations

Staging first:

```bash
supabase link --project-ref "$STAGING_REF"
npm run db:backup
supabase db push
```

- Chain: `001` → `067`.
- Verify `iap_products` has credit, plan, and AstroPro rows.
- Verify `iap_transactions`, `content_reports`, and `fulfill_iap_purchase_v2`
  exist.
- Run the RPC/auth and portability checks:
  `npm run check:rpc-auth`, `npm run check:portability`.

Production:

```bash
supabase link --project-ref "$PROD_REF"
npm run db:backup
supabase db push
psql "$SUPABASE_DB_URL" -f scripts/disable-ai-production.sql
```

- The AI-disable script takes the AI astrologer offline and closes open AI
  sessions. It is production-only.
- Never run `scripts/seed-review-data.sql` against production.

## 4. Deploy Edge Functions

Deploy only the 11 non-AI functions:

```bash
for fn in agora-token cancel-subscription create-razorpay-order \
  daily-horoscope deduct-wallet health-check prokerala razorpay-webhook \
  send-sms verify-iap-purchase verify-payment; do
  supabase functions deploy "$fn" --project-ref "$SUPABASE_REF"
done
```

- Do **not** deploy `ai-chat` or `interpret-dream`.
- `verify-iap-purchase` must have the Apple/Google secrets from step 2.
- Confirm `create-razorpay-order` rejects digital-goods types:
  `topup`, `wallet`, `subscription`, `astrologer_subscription`, `question`.

## 5. Store products and IAP

Create consumable products in App Store Connect and Google Play Console:

- Credits: `com.astronemi.credits.*` / `astronemi_credits_*`
- Customer passes: `com.astronemi.plan.*` / `astronemi_plan_*`
- AstroPro passes: `com.astronemi.astropro.*` / `astronemi_astropro_*`

Then:

1. Set the store prices so they cover Apple/Google commission.
2. Run sandbox tests for a credit pack, a customer pass, and an AstroPro pass.
3. Confirm replaying the same transaction does not double-credit.
4. Confirm account A cannot claim account B’s purchase.
5. Set `EXPO_PUBLIC_ENABLE_IAP=true` only after the sandbox pass.
6. Leave `EXPO_PUBLIC_REVIEW_MODE=false` in production.

## 6. Razorpay webhook

- URL: production `razorpay-webhook` function.
- Secret: `RAZORPAY_WEBHOOK_SECRET`.
- Events: `payment.captured`, `payment.failed`, `refund.processed`,
  `order.paid`, `subscription.cancelled` (legacy events may remain for
  reconciliation).
- Test physical product, consultation, and pooja flows only.
- Do not test wallet, subscription, or AstroPro purchases here.

## 7. Review environment

1. Build/prepare the review environment (staging project recommended).
2. Create the demo account with the Supabase test OTP.
3. Run the review seed:

```bash
psql "$STAGING_DB_URL" -f scripts/seed-review-data.sql
```

4. The demo profiles are marked `REVIEW DEMO` and are unverified. They are for
   browsing/profile screens; they are not live astrologers and will not reply
   to consultations. Use a real astrologer for a live consultation test.
5. Put the demo phone/OTP and the fact that demo profiles are review-only in the
   store review notes.
6. Clean up with `scripts/remove-review-data.sql` or discard the review project.

## 8. Public legal pages

Deploy the Expo web build/static files, then verify:

```bash
curl -I https://astronemi.app/privacy
curl -I https://astronemi.app/terms
curl -I https://astronemi.app/account-deletion
curl -I https://astronemi.app/wallet-terms
```

All must return 200 over HTTPS. If the host ignores `public/_redirects`, use
the `.html` URLs in the store listings.

## 9. Build and submit

```bash
npx expo prebuild --clean
eas build --profile production --platform ios
eas build --profile production --platform android
```

- Use a native development/EAS build for IAP; Expo Go is not supported.
- Fill App Store Connect review notes and Play Console app-access notes from
  `docs/REVIEW_ACCESS.md`.
- Complete data-safety/privacy labels using `docs/STORE_LISTING.md`.
- Do not submit with Supabase/Sentry/EAS placeholders (`npm run check:production`).

## 10. Post-deploy smoke tests

- [ ] `/functions/v1/health-check` returns 200.
- [ ] OTP login and test-OTP demo login.
- [ ] Kundli generation and daily horoscope.
- [ ] Credit purchase → server verification → balance → transaction history.
- [ ] Customer pass → tier/expiry → second pass extends.
- [ ] AstroPro pass → plan/expiry → second pass extends.
- [ ] Consultation booking/per-minute debit with a real astrologer.
- [ ] Physical shop order and eligible consultation/pooja via Razorpay.
- [ ] Report/review/report-block flows.
- [ ] Account deletion request and 30-day grace notice.
- [ ] Backups/PITR enabled; restore tested on staging.

## 11. Rollback

- App: `eas update` to the previous update or rebuild the prior commit.
- Edge Functions: redeploy the previous bundle; state lives in Postgres.
- Migrations: forward-fix only. Do not edit an applied migration.
- If a payment/IAP incident occurs, disable the feature flag
  (`EXPO_PUBLIC_ENABLE_IAP=false` or Razorpay webhook) before rotating secrets.

## 12. Known CI issue

The manual database-migration job still uses the removed
`supabase db remote psql --project-ref` command. Replace it with
`psql "$SUPABASE_DB_URL"` and add `SUPABASE_DB_URL` as a repository secret.
