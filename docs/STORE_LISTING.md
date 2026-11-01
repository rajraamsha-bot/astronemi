# Store Listing / Submission Notes

Use this alongside `docs/STORE_COMPLIANCE_AUDIT.md` and
`docs/REVIEW_ACCESS.md`.

## Identity

- App name: **AstroNemi**
- iOS bundle ID: `com.astronemi.astronemi`
- Android package: `com.astronemi.astronemi`
- Scheme: `astronemi`
- Website/domain: `https://astronemi.app`
- Support: `support@astronemi.app`
- Legal: `legal@astronemi.app`

## Public URLs

- Privacy Policy: `https://astronemi.app/privacy`
- Terms of Service: `https://astronemi.app/terms`
- Account deletion: `https://astronemi.app/account-deletion`
- Wallet Terms: `https://astronemi.app/wallet-terms`

Static source files:

- `public/privacy.html`
- `public/terms.html`
- `public/account-deletion.html`
- `public/wallet-terms.html`
- `public/_redirects` maps clean URLs if the host supports redirects.

The domain, HTTPS hosting, and mailboxes must be live before submission.

## Review access

Follow `docs/REVIEW_ACCESS.md`. Use a Supabase test-OTP phone number and a
scoped demo account. Put the phone/OTP in App Store Connect Review Notes and
Play Console App access. Never ship a production admin account or hardcoded
OTP bypass.

## In-app purchases

Digital goods are sold as consumables through Apple IAP / Google Play Billing:

- Credits: `com.astronemi.credits.*` / `astronemi_credits_*`
- Customer passes: `com.astronemi.plan.*` / `astronemi_plan_*`
- AstroPro passes: `com.astronemi.astropro.*` / `astronemi_astropro_*`

Passes are **non-renewing** access passes. They do not auto-renew. The final
price, currency, and taxes come from the store.

Keep `EXPO_PUBLIC_ENABLE_IAP=false` until the products and
`verify-iap-purchase` secrets are configured. When false, existing credits are
spendable but purchases show as unavailable.

## Store-listing claims

Do not claim:

- “5000+ astrologers” or “50M+ users” until verified.
- AI astrologer / AI chat / AI Guru features in v1.
- Live streaming, courses, or gift cards as available features.
- A specific rating or consultation count without a verified source.

Do describe:

- Kundli, horoscopes, Panchang, and matchmaking.
- Human astrologer consultations.
- AstroNemi Credits and non-renewing passes.
- The entertainment/guidance disclaimer.

## Data safety / privacy labels

Declare at minimum:

- Phone number, email, name, profile photo (account).
- Birth date/time/place and approximate/precise location (astrology features).
- Purchase history and wallet/credit ledger.
- Chat messages and consultation metadata.
- Device identifiers, diagnostics, crash logs, push tokens.
- Data encrypted in transit; account deletion available in app and on the web.
- Payment card data handled by Apple/Google/Razorpay, not stored by us.

## Before pressing Submit

- [ ] Public URLs return 200 over HTTPS.
- [ ] `support@` and `legal@` mailboxes receive mail.
- [ ] Review account/test OTP works on a clean install.
- [ ] IAP sandbox tests pass for credits, customer pass, and AstroPro pass.
- [ ] `EXPO_PUBLIC_REVIEW_MODE` is false in the production/release build (or the
      shortcut is intentionally included and documented).
- [ ] `EXPO_PUBLIC_ENABLE_AI_FEATURES=false`.
- [ ] No placeholder EAS/Sentry/Supabase values.
- [ ] Privacy labels match the actual data flows.
- [ ] Marketplace has real astrologers or the review-only seed
      (`scripts/seed-review-data.sql`) is run in the review project. Demo
      profiles are labeled `REVIEW DEMO`, unverified, and do not reply to
      consultations.
- [ ] Legal entity/address is the real registered one.
