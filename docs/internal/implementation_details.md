# AstroNemi implementation Details

## 1. Tech Stack Overview
- **Frontend**: Expo SDK 50+, React Native, TypeScript, Tamagui (for UI components), Reanimated (for animations).
- **Backend/DB**: Supabase (Postgres, Auth, Storage, Edge Functions).
- **API Strategy**: Hono (Edge Functions) with tRPC for end-to-end type safety.
- **Payments**: Razorpay SDK for React Native.
- **Observability**: Sentry for React Native (mobile) and Sentry for Node (edge functions).
- **Analytics**: PostHog for user behavior and telemetry.

## 2. Recommended Folder Structure
For a production app, scalability starts with structure.

```text
/
├── app/                    # Expo Router (Tabs & Screens)
│   ├── (tabs)/             # Tab navigation (Home, Astrologers, Pooja, Profile)
│   ├── (auth)/             # Login, Sign Up, Forgot Password flows
│   ├── astrologer/[id].tsx # Dynamic astrologer profiles
│   ├── pooja/[id].tsx      # Dynamic pooja booking screens
│   └── _layout.tsx         # Global provider & root navigation
├── components/             # Reusable UI components
│   ├── common/             # Button, Input, Modal, Loader (Atom-level)
│   ├── home/               # Home-screen specific components
│   ├── astrologers/        # Cards and filters
│   └── forms/              # Validated forms (Birth details, address)
├── constants/              # App-wide constants (Colors, Fonts, Configs)
├── contexts/               # React Contexts (Auth, Payment, Location)
├── hooks/                  # Custom React hooks (useAuth, usePanchang)
├── services/               # API & External service wrappers
│   ├── api.ts              # tRPC/Hono client
│   ├── supabase.ts         # Supabase client config
│   └── analytics.ts        # PostHog/Sentry wrappers
├── stores/                 # State management (Zustand)
├── supabase/               # Backend logic
│   ├── functions/          # Hono-based Edge Functions
│   └── migrations/         # SQL Schema & RLS
├── types/                  # Global TypeScript definitions
├── utils/                  # Pure utility functions (Formatting, Calculations)
└── config/                 # Environment-specific configs (Dev, Staging, Prod)
```

## 3. Step-by-Step Implementation Plan

### Phase 1: Security & Foundation (Week 1)
- [ ] Initialize Supabase project with Local Development setup.
- [ ] Implement strict RLS on all tables.
- [ ] Setup Sentry for error tracking.
- [ ] Implement Zod-based validation for all API inputs.

### Phase 2: Core Features & Payments (Week 2)
- [ ] Build the "Astrologer Consultation" booking flow.
- [ ] Integrate Razorpay with server-side webhook verification.
- [ ] Implement "Wallet" system with database-level consistency triggers.

### Phase 3: Performance & Scale (Week 3)
- [ ] Set up Redis for caching planetary data.
- [ ] Implement Image optimization for astrologer profiles.
- [ ] Run load tests with `k6`.

### Phase 4: Final Hardening & Deployment (Week 4)
- [ ] Security audit (Pen-testing common RLS bypass attempts).
- [ ] EAS Build automation.
- [ ] App Store & Play Store metadata preparation.

## 4. Deployment Guide

### Deployment Workflow
1. **Frontend**:
   - Web: `npm run deploy:web` (pushes to Vercel).
   - Mobile: `eas build --profile production` (generates AAB/IPA).
2. **Backend**:
   - Migrations: `supabase db push` to production instance.
   - Edge Functions: `supabase functions deploy --no-verify-jwt`.
3. **Secrets**: Ensure all production secrets are set in `Supabase Dashboard` and `GitHub Secrets`.

### Prevention of Direct Pushes
- Branch protection on `main`.
- Requirement of Status Checks (TSC, Lint, Tests) before merging.
- Automatic deployments only triggered by Release Tags.
