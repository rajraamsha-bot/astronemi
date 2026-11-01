# AstroNemi — Production readiness handoff

Summary of everything that was changed across seven remediation rounds so
the code matches the app's marketing claims and is ready for a real
launch. Nothing here replaces the `docs/GO_LIVE_CHECKLIST.md` — that file
remains the operational runbook. This is the "what changed and why"
companion document.

## Starting point vs. ending point

| | Before | After |
|---|---|---|
| Claim vs. reality | README claimed 8.5/10 production-ready; ~14 feature screens showed hardcoded mock data | Every user-visible screen reads from a real backend, engine, or graceful empty state |
| Razorpay | Imported in code, missing from `package.json` — payments would fail silently on device | Installed and wired through Supabase Edge Functions |
| `.env.production` | Committed with live-looking placeholder keys including a client-side `STRIPE_SECRET_KEY` | Sanitized template; server secrets documented as server-only |
| EAS submit config | `YOUR_APPLE_ID_EMAIL`, `your-eas-project-id` placeholders | Empty strings, detected by the pre-build gate |
| Store-submit guard | None | `npm run check:production` blocks builds on any placeholder, bad key shape, or missing dependency |
| TypeScript | Clean | Clean (verified after every round) |

## Migrations added (apply with `supabase db push`)

| File | Purpose |
|---|---|
| `supabase/migrations/003_cms_content.sql` | Single `cms_entries` table with `kind` discriminator + seed data for 7 content kinds (blog, news, video, podcast, course, meditation, mantra) |
| `supabase/migrations/004_seed_astrologers.sql` | 12 realistic placeholder astrologer rows across 4 pricing tiers (`user_id = NULL` convention) |
| `supabase/migrations/005_community_and_streams.sql` | `forum_posts`, `forum_replies`, `forum_likes`, `live_streams`, `live_stream_reminders` with RLS and counter triggers |
| `supabase/migrations/006_reminders_events_dreams.sql` | `user_reminders`, `astro_events`, `astro_event_bookmarks`, `dream_entries` with RLS and seed events |
| `supabase/migrations/007_admin_analytics.sql` | Four admin RPCs (`admin_overview_metrics`, `admin_revenue_timeseries`, `admin_recent_activity`, `admin_top_astrologers`), all gated by `is_admin()` |

All migrations use `ON CONFLICT (…) DO NOTHING` where relevant so
re-running is safe in development.

## Edge Functions added

| Function | Purpose | Server secret required |
|---|---|---|
| `supabase/functions/interpret-dream/index.ts` | Calls OpenAI with a strict JSON schema for dream interpretations | `OPENAI_API_KEY` |

Deploy with `supabase functions deploy interpret-dream`. Set the key
once per environment with `supabase secrets set OPENAI_API_KEY=sk-...`.

## New engines / services

| File | What it does |
|---|---|
| `utils/ashtakvarga-engine.ts` | Classical Bhinnashtak + Sarvashtak computation with the 8-reference-point benefic-house tables |
| `services/cms.ts` | Reads `cms_entries`, normalises to camelCase, helpers for duration / read-time / compact counts / relative time |
| `services/community.ts` | Forum posts, replies, and like-toggle with joined author info |
| `services/live-streams.ts` | Live stream list + per-user reminder toggle |
| `services/reminders.ts` | Supabase-backed reminders that also schedule `expo-notifications` triggers |
| `services/astro-events.ts` | Admin-maintained calendar + per-user bookmarks |
| `services/dream-interpretation.ts` | Calls the `interpret-dream` Edge Function, falls back to an offline keyword heuristic marked `source: 'offline'` |
| `services/referral.ts` | Real referral stats from the `referrals` table |
| `services/admin-analytics.ts` | Thin wrappers around the admin RPCs with INR and percent-delta formatters |

## New hooks

All under `hooks/queries/`, backed by React Query with short stale times
so pull-to-refresh works correctly:

`useKundliData`, `useCmsEntries`, `useCommunity` (posts, replies,
like, create), `useLiveStreams`, `useReminders` (list, create, toggle,
delete), `useAstroEvents`, `useReferralStats`, `useAdminAnalytics`
(overview, revenue timeseries, activity feed, top astrologers).

## New shared components

- `components/VideoPlayer.tsx` — thin wrapper around `expo-video` that plays MP4 / HLS natively and falls back to "Open on YouTube" for YouTube URLs. Used by the CMS detail route.

## Screens that switched from fake to real

Every screen below had its `mock*` arrays removed; each one now reads
from the relevant real source with loading, empty, and error states.

| Screen | Source of truth |
|---|---|
| `app/shadbala.tsx` | `calculateShadbala()` engine via `useKundliData` |
| `app/ashtakvarga.tsx` | `calculateAshtakvarga()` engine via `useKundliData` |
| `app/jaimini.tsx` | Chara karakas, chara dasha, arudha padas, Jaimini yogas from the generated kundli |
| `app/gem-recommendation.tsx` | `getGemstoneRecommendations()` engine |
| `app/referral.tsx` | `services/referral.ts` + real clipboard copy via `expo-clipboard` |
| `app/wallet.tsx` | Real `useTransactions` with an empty-state fallback |
| `app/admin/disputes.tsx` | New `ConsultationQualityService.listDisputes()` |
| `app/blog.tsx` | `cms_entries` (kind='blog') |
| `app/news.tsx` | `cms_entries` (kind='news') |
| `app/videos.tsx` | `cms_entries` (kind='video') |
| `app/podcasts.tsx` | `cms_entries` (kind='podcast') |
| `app/courses.tsx` | `cms_entries` (kind='course') |
| `app/meditation.tsx` | `cms_entries` (kind='meditation') |
| `app/mantras.tsx` | `cms_entries` (kind='mantra') with `metadata.sanskrit` + `metadata.benefits` |
| `app/content/[slug].tsx` | New shared CMS detail route with `VideoPlayer` for videos |
| `app/community.tsx` | Forum tables with compose modal, category filter, search |
| `app/live-streams.tsx` | `live_streams` + `live_stream_reminders` with "Join live" → Agora |
| `app/reminders.tsx` | `user_reminders` + actual `expo-notifications` scheduling |
| `app/event-calendar.tsx` | `astro_events` + bookmarks |
| `app/dreams.tsx` | Edge-Function AI + offline fallback + private `dream_entries` journal |
| `app/admin/index.tsx` | Four admin RPCs with real week-over-week deltas and a native sparkline |

## Dependencies added

- `react-native-razorpay` (native payments — was referenced in code but missing)
- `expo-clipboard` (real copy for referral codes)
- `expo-video` (inline video playback)

All SDK 54 compatible, no other version bumps needed.

## Documentation created

| File | Purpose |
|---|---|
| `docs/GO_LIVE_CHECKLIST.md` | Device smoke test, env, store metadata, rollout |
| `docs/CMS_CONTENT_GUIDE.md` | How to add, schedule, and localise CMS rows |
| `docs/ASTROLOGER_ONBOARDING.md` | Replacing seeded astrologers with real practitioners |
| `docs/HANDOFF.md` | This file |

## Pre-build production gate

`scripts/check-production-ready.js` runs as `prebuild:production` and
fails the build if:

- A required native dependency is missing (`react-native-razorpay`, `@sentry/react-native`, `react-native-agora`, `@supabase/supabase-js`)
- `app.json` or `eas.json` still contains placeholder values
- `.env.production` has missing or placeholder critical keys
- A forbidden server-side secret appears in `.env.production` (e.g. `STRIPE_SECRET_KEY`, `RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`)
- `EXPO_PUBLIC_DEBUG_MODE=true`, `EXPO_PUBLIC_USE_MOCK_API=true`, or a `rzp_test_` key is used in a production env
- The Razorpay key ID has the characteristic `rzp_live_12345…` placeholder shape

```bash
npm run check:production
```

## Release playbook

One-time per environment (staging + production):

```bash
# 1. Apply all seven migrations
supabase db push

# 2. Server-side secrets (never appear in the client bundle)
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set RAZORPAY_KEY_SECRET=...
supabase secrets set RAZORPAY_WEBHOOK_SECRET=...
supabase secrets set AGORA_APP_CERTIFICATE=...

# 3. Deploy every edge function in this repo
supabase functions deploy

# 4. Promote an admin (so admin dashboard works)
#    Run in SQL editor after signing in with the target phone number:
#    UPDATE public.users SET role='admin' WHERE phone='+91…';
```

Before every production build:

```bash
npm run check:production          # gate
eas build --profile production    # only runs if gate is green
```

## Business items still outstanding

These are not code issues. They are what "ready to ship" means
operationally:

1. **Fill `.env.production`** with real Supabase, Razorpay live, Agora, Sentry, Firebase values.
2. **`eas init`** and paste the generated project id into `app.json` → `expo.extra.eas.projectId`.
3. **Fill `eas.json`** iOS submit block (`appleId`, `ascAppId`, `appleTeamId`).
4. **Drop `google-service-account.json`** at the repo root (gitignored) for Play Store auto-submit.
5. **Recruit real astrologers.** Delete seed rows with `DELETE FROM public.astrologers WHERE user_id IS NULL;` once you have at least a dozen real practitioners onboarded.
6. **Seed real content.** Extend `cms_entries` through Supabase Studio as described in `docs/CMS_CONTENT_GUIDE.md`.
7. **Walk the device smoke test** in `docs/GO_LIVE_CHECKLIST.md` section 5 on a real iOS and Android device, using an App Store/Play sandbox credit purchase (no Razorpay wallet top-up).
8. **Stagger the rollout.** Use Play Store's 10% → 50% → 100% rollout.

## Quick reference — where to find things

```
app/                    70+ expo-router screens
  admin/index.tsx       live-aggregation dashboard
  content/[slug].tsx    shared CMS detail route

services/
  admin-analytics.ts    admin RPC wrappers
  astro-events.ts       events + bookmarks
  cms.ts                CMS list + helpers
  community.ts          forum CRUD
  dream-interpretation.ts AI + offline fallback
  live-streams.ts       streams + reminders
  reminders.ts          supabase + local notifications
  referral.ts           referral stats
  wallet.ts             server-authoritative wallet
  auth-service.ts       Supabase Auth OTP

utils/
  ashtakvarga-engine.ts new Parashari engine
  shadbala-engine.ts    six-fold strength
  jaimini-engine.ts     karakas / chara dasha / arudha
  kp-engine.ts          249-sub-lord KP
  kundli-generator.ts   main orchestrator

hooks/queries/          React Query wrappers for every service

supabase/
  functions/            all edge functions (ai-chat, interpret-dream, razorpay-*, agora-token, …)
  migrations/           001–007 applied in order

docs/
  GO_LIVE_CHECKLIST.md  device smoke test + rollout
  CMS_CONTENT_GUIDE.md  adding content
  ASTROLOGER_ONBOARDING.md real astrologer setup
  HANDOFF.md            this file
```

## One-liner summary

The app's marketing now matches its code. Every feature that claims to
do something actually does it, or shows a clear empty state. Remaining
work is business operations (credentials, content, astrologer supply),
not engineering.
