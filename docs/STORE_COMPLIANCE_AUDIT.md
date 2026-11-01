# Store Submission Compliance Audit

Date: 2026-10-27
Scope: static code review of the AstroNemi app for Apple App Store and Google
Play submission risk. This is not legal advice; get a store-policy/legal review
before submitting.

## Verdict

**Do not submit the current build.** Approval is possible, but there are
several high-probability rejection blockers. The astrology category itself is
allowed; the problems are payments, reviewer access, public legal pages,
unsubstantiated claims, and UGC moderation.

## Fix status (2026-10-29)

Checkpoint `925a82b` preserved the AstroNemi rename, backend docs, and this
audit. The working tree then applied the non-payment fixes below.

| # | Finding | Status |
|---|---------|--------|
| 1 | Razorpay for digital goods | **FIXED for v1 scope** — wallet credits, customer subscription passes, and AstroPro passes use store IAP + server verification; courses/gift cards are hidden until built; Razorpay is limited to physical orders and eligible consultations/pooja |
| 2 | Reviewer login / demo access | **PARTIALLY FIXED** — gated reviewer shortcut + Supabase test-OTP runbook; configure the test number/OTP and review notes |
| 3 | Public privacy, terms, deletion URLs | **PARTIALLY FIXED** — static HTML pages added; domain/hosting/mailboxes still required |
| 4 | Unsubstantiated social proof | **FIXED** — hardcoded user/astrologer/consultation/rating numbers removed; login copy is now neutral |
| 5 | AI/live/80+ claims | **FIXED for onboarding** — AI remains disabled; verify store listing |
| 6 | UGC reporting/moderation | **PARTIALLY FIXED** — `content_reports` table + RLS, profile/chat reporting, local-only review submission removed; admin workflow still needed |
| 7 | Marketplace supply | **PARTIALLY FIXED** — review-only seed with labeled demo profiles; production still needs real astrologers |
| 8 | Unfinished features | **OPEN** — live-stream screen has an honest empty state; `onboard-demo` and mock admin analytics are not linked but must be hidden or finished |
| 9 | Medical/financial disclaimers | **PARTIALLY FIXED** — shared disclaimer added to Horoscope/Kundli; medical/financial screens retain local disclaimers; legal review still required |
| 10 | Unused permissions | **FIXED** — contacts, photo-library, background-fetch, and `expo-image-picker` removed |
| 11 | Legal entity/address | **PARTIALLY FIXED** — About/Terms/Privacy/Wallet pages now use the same Bangalore address; confirm the registered entity before submission |
| 12 | Domain/mailboxes/social | **OPEN** — needs registration and live mailboxes/handles |

Changes applied in the working tree:
- Removed hardcoded “5000+ / 50M+ / 5M+ / 10M+ / 4.8” claims and neutralized
  the login/About/onboarding copy; removed the unverifiable “thousands helped”
  astrologer bio.
- Added a store-verified IAP rail: `expo-iap`, `066_iap_wallet_credits.sql`,
  `067_iap_subscription_passes.sql`, `verify-iap-purchase`, and a Wallet Terms
  screen/public page. Wallet credits, customer subscription passes, and
  AstroPro passes are verified server-side and fulfilled idempotently.
  `create-razorpay-order` now accepts only physical orders and eligible
  consultations/pooja. Courses and gift cards are hidden because they were UI
  stubs with no purchase/entitlement flow. The IAP flag stays `false` until
  store products/secrets are configured.
- Added reviewer access support: `EXPO_PUBLIC_REVIEW_MODE` /
  `EXPO_PUBLIC_REVIEW_PHONE`, a login shortcut, and
  `docs/REVIEW_ACCESS.md` for Supabase test OTP.
- Added public `privacy.html`, `terms.html`, `account-deletion.html`, and
  `wallet-terms.html`, plus `_redirects` for clean URLs.
- Added `supabase/migrations/065_content_reports.sql`; `reportAstrologer()` now
  writes to `content_reports`; profile and chat report flows are wired with
  cross-platform reason pickers.
- Removed the local-only “Write a Review” flow and fake “Helpful” counter;
  reviews continue to come from persisted consultation reviews.
- Added `AstrologyDisclaimer` to the Horoscope and Kundli screens.
- Removed the unused contacts/photo-library/background-fetch permissions and
  the `expo-image-picker` plugin/dependency.
- `npm run typecheck`, `npm run lint`, `npx expo-doctor`, portability audit, and
  affected Jest/smoke tests pass.

## Blockers

### 1. Digital purchases use Razorpay only (no IAP / Play Billing) — FIXED for v1 scope

Evidence:
- `app/subscription.tsx` now uses `IapPlanPurchase` non-renewing passes; the
  legacy `processSubscriptionPayment` fails closed.
- `app/astrologer/pro.tsx` now uses `IapPlanPurchase` AstroPro passes; the
  Razorpay checkout is removed.
- Wallet top-ups use `expo-iap` + `verify-iap-purchase`; the wallet screen no
  longer calls `topUpWallet`.
- `create-razorpay-order` accepts only `pooja_booking`, `consultation`, and
  `product_order`; digital goods are rejected.
- Courses and gift cards are UI stubs, so they are removed from progressive
  disclosure and their feature flags are disabled.
- Physical shop orders and eligible human consultations can keep Razorpay;
  confirm the pooja/consultation exception with policy counsel.

Risk: Apple 3.1.1 requires In-App Purchase for digital subscriptions,
wallet credit, reports, courses, and app features. Google Play requires Play
Billing for digital goods. Razorpay is acceptable for physical goods and
possibly real-time person-to-person services (Apple 3.1.3(d)), but not for the
current digital subscription/wallet package.

Fix:
- Use IAP/Play Billing for subscriptions, wallet top-ups used for digital
  features, digital reports, courses, and gift cards.
- Keep Razorpay only for physical goods and eligible real-time human
  consultations.
- Or remove paid digital features from the mobile v1 and launch free core +
  physical shop + eligible consultations.

Status: fixed for the v1 feature set. Wallet credits, customer subscription
passes, and AstroPro passes use `expo-iap` products, are bound to the
signed-in account, and are granted only after `verify-iap-purchase` verifies the
Apple/Google transaction and calls the idempotent `fulfill_iap_purchase_v2`
RPC. `create-razorpay-order` rejects digital-goods types. Courses and gift
cards are hidden until they have a real purchase/entitlement flow.
`EXPO_PUBLIC_ENABLE_IAP` must stay `false` until store products and server
secrets are configured. Paid reports are subscription-gated, so no separate
report purchase exists. Confirm the pooja/consultation Razorpay exception with
policy counsel.

### 2. Reviewer cannot easily log in

Evidence:
- `app/login.tsx` is phone OTP only, hardcoded `+91`, 10-digit input.
- No demo mode, fixed OTP, or reviewer account path.
- `EXPO_PUBLIC_ENABLE_DEMO_MODE` exists in env but is not implemented in code.

Risk: Apple 2.1 requires a demo account or clear review access. A US reviewer
may never receive the Indian SMS.

Fix: provide a review account/test OTP flow and exact review notes. Do not ship
a production-only bypass.

Status: partially fixed. `app/login.tsx` has a gated “Reviewer access” shortcut
(`EXPO_PUBLIC_REVIEW_MODE` + `EXPO_PUBLIC_REVIEW_PHONE`) that only pre-fills the
phone number; `docs/REVIEW_ACCESS.md` documents Supabase test OTP and includes
App Store/Play review-note text. The actual test number/OTP must be configured
in Supabase and the scoped demo account created before submission.

### 3. No public privacy-policy / terms / account-deletion URLs

Evidence:
- `app/privacy-policy.tsx` and `app/terms.tsx` are in-app screens only.
- `docs/SETUP_GUIDE.md:194` says to create `assets/legal/privacy-policy.html`;
  that file does not exist.
- No public account-deletion page exists. `app/settings.tsx` and
  `services/account-management.ts:141` implement in-app deletion.

Risk: Apple requires a privacy-policy URL; Google Play requires a privacy
policy and a web account-deletion URL for apps with accounts.

Fix: publish `https://astronemi.app/privacy`, `/terms`, and
`/account-deletion`; link them from login, settings, and the store listing.

Status: partially fixed. `public/privacy.html`, `public/terms.html`, and
`public/account-deletion.html` exist (plus `public/wallet-terms.html` and
`public/_redirects`). The domain, HTTPS hosting, and support/legal mailboxes
must be live before submission.

### 4. Hardcoded, unsubstantiated social proof — FIXED

Evidence:
- `contexts/LanguageContext.tsx:101-102`: “5000+ Expert Astrologers”,
  “50M+ Happy Users”.
- `locales/hi.ts:73-74` repeats the same numbers.
- `app/login.tsx` displays those values.
- `app/about.tsx:94-104`: 5M+ users, 500+ astrologers, 10M+ consultations,
  4.8 rating — all hardcoded.

Risk: Apple 2.3 (accurate metadata) and Google Play deceptive-behavior policy.
These are also inconsistent with each other.

Fix: remove the numbers or replace them with verified live counts. Update every
locale.

Status: fixed. The numbers were removed from `LanguageContext`, `locales/hi.ts`,
and the About stats block. Login now says “Verified Astrologers” and “Private &
Secure”; About no longer shows a user/consultation/rating count.

### 5. AI/live/80+ claims while AI is disabled — FIXED for onboarding

Evidence:
- `components/onboarding/OnboardingFlow.tsx:59` says “AI astrologer, live
  consultations, and 80+ features”.
- AI routes are disabled in v1; `ai-chat`/`interpret-dream` are not deployed.
- Store listing and onboarding must not promise AI.

Risk: misrepresentation and 4.2 minimum-functionality review.

Fix: rewrite onboarding to list only working features; remove AI and “80+”
claims until verified.

Status: fixed for both onboarding implementations. `OnboardingFlow.tsx` and
`app/onboarding.tsx` now list horoscopes, Kundli, Panchang, and verified human
astrologers; the “AI-Powered” title and “50+ features” count are gone. Store
listing copy must be checked separately so it does not promise AI.

### 6. UGC reporting/moderation is incomplete — PARTIALLY FIXED

Evidence:
- `services/chat.ts:612` `reportUser()` inserts into a `reports` table.
- No migration creates a `reports` table (only `cron_health` comments mention
  “report”).
- `app/astrologer/[id].tsx:221` calls `reportUser`; the flow will fail closed
  in production.
- `app/astrologer/[id].tsx` review submission updates local state only; it is
  not persisted to the database.
- Chat has no in-thread report/moderation flow.

Risk: Apple 1.2 and Google Play UGC policy require reporting, blocking,
moderation, and terms for UGC/social features.

Fix: add a `reports` table + RLS + admin workflow; persist reviews; add
report/block in chat; moderate community/live content or hide those features.

Status: partially fixed. `065_content_reports.sql` adds `content_reports` with
RLS (users insert/view their own; admins view/update), `reportAstrologer()` now
writes to it, and both the astrologer profile and chat header expose a
cross-platform report reason picker. The local-only “Write a Review” UI and the
fake “Helpful” counter were removed; displayed reviews come from the persisted
`reviews` table. Still required: an admin moderation queue/runbook and a check
that community/live content has equivalent reporting or is hidden.

### 7. Marketplace may be empty at review time

Evidence:
- Canonical `supabase/migrations` has no human astrologer seed (the old
  `backend/database/migrations/004_seed_astrologers.sql` is not part of the
  deployed chain).
- The Astrologers tab and consultation flow depend on real rows.

Risk: reviewers see an empty marketplace and consider the app non-functional;
unsubstantiated “5000+ astrologers” makes it worse.

Fix: onboard real astrologers, or provide a controlled review/demo dataset.
Never seed fake “verified” profiles for production.

Status: partially fixed. `scripts/seed-review-data.sql` adds three
deterministic `REVIEW DEMO` profiles (unverified, zero reviews, demo bio) for
the staging/review project only; `scripts/remove-review-data.sql` cleans them
up. They are not live astrologers and do not reply to consultations. Production
still needs real practitioners.

### 8. Unfinished features are still reachable or advertised

Evidence:
- `app/live-stream/[id].tsx` shows “Live streaming coming soon!”
- `app/astrologer-onboarding.tsx:86-87` submits a skills test with
  `'onboard-demo'`.
- `components/admin/AnalyticsDashboard.tsx:349` says it is a demo dashboard
  with mock data.
- `app/community.tsx`, `app/courses.tsx`, `app/podcasts.tsx`,
  `app/live-streams.tsx`, `app/gift-cards.tsx` exist but were not verified as
  complete production flows.

Risk: Apple 4.2 / 2.3; Google Play misleading content.

Fix: hide unfinished features or finish them before listing them.

### 9. Medical/financial astrology disclaimers are not on screen — PARTIALLY FIXED

Evidence:
- `app/medical-astrology.tsx` and `app/financial-astrology.tsx` exist.
- `components/AstrologyDisclaimer.tsx` exists but is not imported anywhere.
- `app/terms.tsx:146` has a general entertainment disclaimer only.

Risk: health/financial claims can trigger Apple 1.4.1 and Google Play health
misinformation scrutiny.

Fix: add `AstrologyDisclaimer` to those screens, or hide those categories for
v1.

Status: partially fixed. `AstrologyDisclaimer` is now rendered on the Horoscope
and Kundli screens. `medical-astrology.tsx` and `financial-astrology.tsx`
already had local disclaimer cards, but their content is static/sample data and
should be reviewed by counsel or hidden for v1.

### 10. Unused permission prompts — FIXED

Evidence in `app.json`:
- `NSContactsUsageDescription` — no contacts code found.
- `NSPhotoLibraryUsageDescription` + `expo-image-picker` plugin — no
  `ImagePicker` usage found.
- `UIBackgroundModes: ["remote-notification", "fetch"]` — no background-fetch
  code found.
- `NSUserNotificationsUsageDescription` is not an iOS usage-description key.

Risk: reviewer questions, privacy-label mismatches, unnecessary permission
prompts.

Fix: remove unused permissions/plugins; keep camera/mic (Agora) and location
(astrology).

Status: fixed. `NSContactsUsageDescription`, `NSPhotoLibraryUsageDescription`,
`NSUserNotificationsUsageDescription`, the `fetch` background mode, the
`expo-image-picker` plugin, and the `expo-image-picker` dependency were removed.
Camera, microphone, location, notifications, and remote-notification background
mode remain.

### 11. Legal entity and address are inconsistent — PARTIALLY FIXED

Evidence:
- `app/about.tsx`, `app/terms.tsx`, `app/privacy-policy.tsx`, and the public
  pages now use the same Bangalore address.
- The legal entity may not be registered under that name.

Risk: inaccurate legal/contact information and consumer-protection issues.

Fix: use the actual registered entity and address; if the product is owned by
an existing company, say “AstroNemi is operated by <Legal Entity>”.

Status: address consistency fixed. Confirm the registered entity/address and
update the app and public pages if different.

### 12. Public domain / mailboxes / social handles are not live

Evidence:
- `app.json` router origin, `security-config.ts` CORS, emails, and social links
  now point at `astronemi.app`.
- `astronemi.app` was unregistered at the time of the rename; `.com` is
  registered.
- Support/security/legal mailboxes and `@astronemi` handles are not created.

Risk: broken links, failed deep links, bounced support emails, trademark/name
dispute.

Fix: register `astronemi.app` and secure the handles/mailboxes before the
store build.

## What is already in good shape

- In-app account deletion via `request_account_deletion`
  (`services/account-management.ts:141`, `app/settings.tsx`).
- Terms include an entertainment/guidance disclaimer (`app/terms.tsx:146`).
- AI is disabled; no OpenAI key is set for production.
- Phone OTP auth exists; no third-party social login (so no Sign in with Apple
  requirement yet).
- RLS, RPC authorization audits, device binding, and rate limits are in place.
- Physical shop orders can use Razorpay; human 1:1 consultations may qualify
  for the person-to-person exception if the payment flow is restructured.
- Wallet credits, customer subscription passes, and AstroPro passes now have a
  compliant IAP rail, server-side receipt verification, account binding, and an
  idempotent ledger; Wallet Terms are in the app and
  `public/wallet-terms.html`.
- Public privacy/terms/account-deletion pages and a reviewer test-OTP runbook
  are in `public/` and `docs/REVIEW_ACCESS.md`; domain/hosting/mailboxes and the
  Supabase test number remain deployment tasks.
- No mock astrologer list is served in production; the marketplace is honest
  when empty.

## Recommended fix order

1. **Payments architecture** — DONE for v1 scope: credits, customer passes, and
   AstroPro passes use IAP/Play Billing; courses/gift cards are hidden; Razorpay
   is limited to physical orders and eligible human services. Confirm the
   pooja/consultation exception with policy counsel.
2. **Reviewer access** — demo account/test OTP + review notes.
3. **Public legal pages** — privacy, terms, account deletion on astronemi.app.
4. **Claims cleanup** — remove unverified numbers, AI/live/80+ copy, and
   inconsistent stats.
5. **UGC** — reports table, persisted reviews, chat report/block, moderation.
6. **Feature surface** — hide unfinished community/courses/podcasts/live
   streams/gift cards; align store listing.
7. **Disclaimers** — medical/financial screens or hide them.
8. **Permissions** — remove contacts/photo/background-fetch.
9. **Supply** — real astrologers or controlled review data.
10. **Internal testing** — TestFlight + Play internal testing, then a policy
    review before submission.

## Approval likelihood

- **Current build:** high rejection risk on both stores until reviewer access
  and public legal URLs are resolved.
- **After the remaining fixes:** approval is plausible. Astrology is an allowed
  category; the decision now turns on reviewer access, legal pages, marketplace
  supply, and moderation — the digital-goods payment blocker is addressed for
  the v1 feature set.
