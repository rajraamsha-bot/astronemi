# AstroNemi Go-Live Checklist

Run through this list end to end before submitting to the App Store or
Google Play. The automated gate `npm run check:production` covers the
code-level items; the rest require human verification.

## 1. Environment & secrets

- [ ] `.env.production` filled with real values (no `your-*`, `xxx`, or
      `rzp_live_12345…` placeholders).
- [ ] No server-side secrets in `.env*` files. `RAZORPAY_KEY_SECRET`,
      `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
      `AGORA_APP_CERTIFICATE`, `TWILIO_AUTH_TOKEN`, `SENTRY_AUTH_TOKEN`,
      `JWT_SECRET`, `ENCRYPTION_KEY` are stored as Supabase Edge Function
      secrets (`supabase secrets set …`) or in the backend host's vault.
- [ ] GitHub Actions secrets populated: `EXPO_TOKEN`,
      `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SLACK_WEBHOOK_URL`.
- [ ] `EXPO_PUBLIC_APP_ENV=production`, `EXPO_PUBLIC_DEBUG_MODE=false`,
      `EXPO_PUBLIC_USE_MOCK_API=false`.

## 2. App identity

- [ ] `app.json` → `expo.version` bumped and `buildNumber`/`versionCode`
      incremented.
- [ ] `app.json` → `expo.extra.eas.projectId` set (run `eas init`).
- [ ] `eas.json` → `submit.production.ios` has real `appleId`,
      `ascAppId`, `appleTeamId`.
- [ ] `google-service-account.json` present at repo root (gitignored)
      for Play Store auto-submit.

## 3. Native dependencies

- [ ] `react-native-razorpay` installed (payment will silently fail on
      device without it).
- [ ] `@sentry/react-native` wired in `app/_layout.tsx`.
- [ ] `react-native-agora` App ID configured and token endpoint live
      (`supabase/functions/agora-token`).

## 4. Supabase backend

- [ ] Migrations applied to the production project: full `001` → `067` chain.
- [ ] RLS enabled on every user-data table.
- [ ] Edge Functions deployed: `create-razorpay-order`, `razorpay-webhook`,
      `verify-payment`, `verify-iap-purchase`, `agora-token`, `send-sms`,
      `health-check`, `daily-horoscope`, `deduct-wallet`, `prokerala`,
      `cancel-subscription`. Do not deploy `ai-chat` or `interpret-dream`.
- [ ] Razorpay webhook URL registered in the Razorpay dashboard and
      signed with `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Supabase test OTP configured for the review demo account; review notes
      include the phone and OTP (`docs/REVIEW_ACCESS.md`).
- [ ] Public `/privacy`, `/terms`, `/account-deletion`, and `/wallet-terms`
      URLs return 200 over HTTPS.
- [ ] Daily automated database backup scheduled.

## 5. End-to-end device smoke test (real iOS + Android device)

- [ ] OTP send → verify → session persists.
- [ ] Kundli generation with correct planetary positions.
- [ ] Astrologer browse, filter, and profile load from Supabase.
- [ ] Wallet credit top-up via App Store/Play sandbox → server-verified
      transaction visible in history → balance correct; replay does not double-credit.
- [ ] Customer subscription pass and AstroPro pass sandbox purchases activate
      the correct tier/plan and extend on a second pass.
- [ ] Chat consultation deducts per-minute from wallet and ends on
      depletion.
- [ ] Voice and video consultation connect via Agora and end billing
      correctly.
- [ ] Push notification received on a physical device.
- [ ] Deep link from a notification opens the correct screen.

## 6. Observability

- [ ] Sentry captures a test crash from a production build
      (`Sentry.captureException(new Error('release smoke'))`).
- [ ] Analytics dashboard shows `app_opened`, `screen_view`,
      `payment_completed` within 5 minutes of the smoke test.
- [ ] Supabase `health-check` function returns `status: healthy`.

## 7. Legal & store metadata

- [ ] Privacy Policy URL live and linked from `app/privacy-policy.tsx`.
- [ ] Terms of Service URL live and linked from `app/terms.tsx`.
- [ ] Data Safety form (Play) and App Privacy (App Store) match what
      the app actually collects (phone, location, camera, microphone,
      photos, push token).
- [ ] Age rating reflects astrology-consultation content.

## 8. Rollout

- [ ] Internal/TestFlight build approved by at least two testers.
- [ ] Staged rollout: 10% → 50% → 100% on Play Store over 72 hours.
- [ ] Rollback plan documented (previous AAB kept, Supabase migrations
      reversible).

Run the automated gate before each production build:

```
npm run check:production
```
