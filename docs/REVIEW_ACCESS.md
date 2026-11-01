# Reviewer Access Runbook

This is the store-review login path. It uses **Supabase test OTP** for one
dedicated demo phone number. Do not ship a hardcoded OTP bypass or a production
admin account. See `docs/BACKEND_LAUNCH_SEQUENCE.md` for the deploy order.

## 1. Configure the Supabase test OTP

1. Open Supabase Dashboard → **Authentication → Providers → Phone**.
2. Ensure the Phone provider and SMS provider (Twilio/MessageBird) are
   configured for real users.
3. Open the **Test OTP** / **Test phone numbers** section.
4. Add the demo number in E.164 format, e.g. `+919999999999`, and a fixed
   six-digit OTP, e.g. `246810`.
5. Save. Supabase will accept that OTP for that number without sending an SMS.

Use a number that is **not** a real customer account. The app’s phone field
accepts the 10-digit Indian number and prepends `+91` from
`EXPO_PUBLIC_COUNTRY_CODE`.

## 2. Create the demo account

1. Build/run the app in a review environment.
2. Sign in with the test number and the fixed test OTP.
3. Complete onboarding with non-sensitive demo birth details.
4. Keep the account free of admin privileges, real wallet money, and real
   payment instruments.
5. If you want the reviewer to test IAP, use an Apple/Google **sandbox**
   account and make that clear in the review notes. Otherwise leave
   `EXPO_PUBLIC_ENABLE_IAP=false`; the wallet/credits screen will honestly show
   that top-ups are disabled.
6. Optionally seed review-only astrologers so the marketplace is not empty:

```bash
psql "$STAGING_DB_URL" -f scripts/seed-review-data.sql
```

The demo profiles are marked `REVIEW DEMO`, are unverified, and have zero
reviews. They are for browsing/profile screens only; they are not live
astrologers and will not reply to a consultation. Use a real astrologer for a
live consultation test. Clean up with `scripts/remove-review-data.sql` or
discard the review project.

## 3. Enable the in-app shortcut (optional)

The login screen shows a “Reviewer access” shortcut when:

```bash
EXPO_PUBLIC_REVIEW_MODE=true
EXPO_PUBLIC_REVIEW_PHONE=+919999999999
```

Keep both unset/false in production. The shortcut only pre-fills the phone
number; the reviewer still has to tap **Get OTP** and enter the test OTP. It is
not an authentication bypass.

## 4. Review notes template

Paste this into App Store Connect → App Review Information → Notes and Google
Play Console → App access:

```text
Demo account for review:
Phone: +91 99999 99999
OTP: 246810 (Supabase test OTP for this number only)

Steps:
1. Open the app.
2. Tap “Reviewer access” (or enter the phone number above).
3. Tap “Get OTP”.
4. Enter the OTP above.
5. You are signed into the demo account.

The demo account has no real wallet balance and no admin access. Digital
purchases use Apple/Google sandbox products; no real charge is made.
```

Replace the phone/OTP with the values configured in Supabase. Do not use a real
customer number.

## 5. After review

- Rotate/remove the Supabase test OTP entry.
- Disable or delete the demo account if it is no longer needed.
- Keep `EXPO_PUBLIC_REVIEW_MODE=false` in production builds.
- Re-check the public privacy, terms, account-deletion, and wallet-terms URLs.

## 6. Public URLs

Use the deployed pages:

- Privacy: `https://astronemi.app/privacy`
- Terms: `https://astronemi.app/terms`
- Account deletion: `https://astronemi.app/account-deletion`
- Wallet terms: `https://astronemi.app/wallet-terms`

The static files are `public/privacy.html`, `public/terms.html`,
`public/account-deletion.html`, and `public/wallet-terms.html`.
`public/_redirects` maps the clean URLs to those files on hosts that support
redirects. If your host does not, use the `.html` URLs instead.

The domain, mailboxes (`support@`, `legal@`), and hosting must be live before
submission; adding the files alone is not enough.
