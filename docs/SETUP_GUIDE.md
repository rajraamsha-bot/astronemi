# AstroNemi App - Pre-Launch Setup Guide

This guide covers all the critical and important tasks needed before launching the app.

## 🔴 CRITICAL (Must Do Before Launch)

### 1. Supabase Backend Setup (1-2 hours)

#### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key from Settings > API
3. Add to `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

#### Step 2: Run Database Migrations
1. Go to SQL Editor in Supabase dashboard
2. Run the migration from `supabase/migrations/001_initial_schema.sql`
3. Enable Row Level Security (RLS) on all tables

#### Step 3: Configure Authentication
1. Go to Authentication > Providers
2. Enable Phone provider
3. Configure SMS provider (Twilio, MSG91, or Supabase built-in)
4. Set up SMS templates for OTP

#### Step 4: Configure Storage
1. Go to Storage
2. Create buckets: `avatars`, `documents`, `recordings`
3. Set up bucket policies for public/private access

### 2. Payment Gateway - Razorpay (1 hour)

#### Step 1: Create Razorpay Account
1. Go to [razorpay.com](https://razorpay.com) and create account
2. Complete KYC verification
3. Get API keys from Settings > API Keys

#### Step 2: Configure Environment
Add to `.env`:
```
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-secret-key
```

#### Step 3: Set Up Webhooks
1. Go to Settings > Webhooks
2. Add webhook URL: `https://your-project.supabase.co/functions/v1/razorpay-webhook`
3. Select events: `payment.captured`, `payment.failed`, `refund.created`

#### Step 4: Test Payments
1. Use test card: `4111 1111 1111 1111`, CVV: `123`, Expiry: any future date
2. Test UPI: `success@razorpay`
3. Verify webhook receives events

### 3. Push Notifications - Firebase (1 hour)

#### Step 1: Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create new project "AstroNemi"
3. Add Android and iOS apps

#### Step 2: Configure Android
1. Add package name: `com.astronemi.app`
2. Download `google-services.json`
3. Place in `android/app/`

#### Step 3: Configure iOS
1. Add bundle ID: `com.astronemi.app`
2. Download `GoogleService-Info.plist`
3. Place in `ios/AstroNemi/`

#### Step 4: Get FCM Server Key
1. Go to Project Settings > Cloud Messaging
2. Copy Server Key
3. Add to `.env`:
   ```
   FCM_SERVER_KEY=your-server-key
   ```

#### Step 5: Configure in App
The app already has notification service at `services/notifications.ts`

### 4. Device Testing (2-3 hours)

#### Android Testing
```bash
# Build development APK
npx eas build --platform android --profile development

# Or run directly on connected device
npx expo run:android
```

#### iOS Testing
```bash
# Build development build (requires Apple Developer account)
npx eas build --platform ios --profile development

# Or run directly on connected device
npx expo run:ios
```

#### Test Checklist
- [ ] Login with phone OTP
- [ ] View horoscope
- [ ] Create kundli
- [ ] Book consultation
- [ ] Make payment
- [ ] Chat with astrologer
- [ ] Receive notifications
- [ ] Dark mode toggle
- [ ] Language change
- [ ] Profile update

---

## 🟡 IMPORTANT (Should Do Before Launch)

### 1. Replace Mock Data with Real API

The following screens use mock data that need to be connected to real APIs:

| Screen | File | Mock Data | Real API |
|--------|------|-----------|----------|
| Home | `app/(tabs)/index.tsx` | Mock horoscopes | `services/api.ts` |
| Horoscope | `app/(tabs)/horoscope.tsx` | Mock predictions | Supabase `horoscopes` table |
| Astrologers | `app/(tabs)/astrologers.tsx` | Mock astrologers | Supabase `astrologers` table |
| Kundli | `app/(tabs)/kundli.tsx` | Mock kundli data | Prokerala API |
| Shop | `app/shop.tsx` | Mock products | Supabase `products` table |

#### Example: Connect Astrologers Screen
```typescript
// Before (mock)
import { astrologers } from '../mocks/astrologers';

// After (real API)
import { api } from '../services/api';

const { data: astrologers } = await api.getAstrologers();
```

### 2. Analytics Setup

#### Sentry (Crash Reporting)
1. Create account at [sentry.io](https://sentry.io)
2. Create new React Native project
3. Add to `.env`:
   ```
   SENTRY_DSN=https://xxx@sentry.io/xxx
   ```
4. Already configured in `services/crash-reporting.ts`

#### Mixpanel (Analytics)
1. Create account at [mixpanel.com](https://mixpanel.com)
2. Create new project
3. Add to `.env`:
   ```
   EXPO_PUBLIC_MIXPANEL_TOKEN=your-token
   ```
4. Already configured in `services/analytics.ts`

### 3. Video Calls - Agora

#### Step 1: Create Agora Account
1. Go to [agora.io](https://agora.io) and create account
2. Create a new project
3. Get App ID and App Certificate

#### Step 2: Configure Environment
Add to `.env`:
```
EXPO_PUBLIC_AGORA_APP_ID=your-app-id
AGORA_APP_CERTIFICATE=your-certificate
```

#### Step 3: Enable Screen Sharing (iOS)
Add to `ios/Podfile`:
```ruby
pod 'AgoraScreenShareExtension'
```

### 4. Content & Assets

#### App Store Screenshots
Create screenshots for:
- Phone (1080x1920)
- Tablet (2048x2732)
- Showcase: Home, Horoscope, Kundli, Chat, Profile

#### Privacy Policy
Create at `assets/legal/privacy-policy.html`:
- Data collection practices
- Third-party services (Razorpay, Agora, Firebase)
- User rights (GDPR, DPDP)

#### Terms of Service
Create at `assets/legal/terms.html`:
- Service description
- Payment terms
- Refund policy
- Astrologer disclaimer

---

## 🟢 NICE TO HAVE (Can Do After Launch)

### 1. Testing
- Unit tests in `__tests__/` directory
- E2E tests with Detox

### 2. Performance
- Code splitting configured in `config/code-splitting.ts`
- Image optimization in `services/image.ts`

### 3. Offline Mode
- AsyncStorage persistence in `services/offline-storage.ts`
- Sync when online

### 4. Advanced Features
- A/B testing in `services/ab-testing.ts`
- Feature flags in `services/feature-flags.ts`
- Rate limiting in `services/rate-limiter.ts`

---

## Environment Variables Checklist

Create `.env` file with all required variables:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# Razorpay
EXPO_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Firebase
FCM_SERVER_KEY=

# Agora
EXPO_PUBLIC_AGORA_APP_ID=
AGORA_APP_CERTIFICATE=

# Analytics
EXPO_PUBLIC_MIXPANEL_TOKEN=
SENTRY_DSN=

# APIs (Optional)
PROKERALA_API_KEY=
PROKERALA_API_SECRET=

# App Config
EXPO_PUBLIC_APP_ENV=production
```

---

## Quick Launch Checklist

### Before Submitting to App Stores

- [ ] All environment variables configured
- [ ] Supabase migrations run
- [ ] Payment gateway tested
- [ ] Push notifications working
- [ ] Tested on real Android device
- [ ] Tested on real iOS device
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] App store screenshots ready
- [ ] App store descriptions written
- [ ] Content rating questionnaire completed

### App Store Submission

#### Google Play Store
1. Create developer account ($25 one-time)
2. Create app in Play Console
3. Upload AAB from `npx eas build --platform android --profile production`
4. Fill store listing
5. Submit for review (1-3 days)

#### Apple App Store
1. Create developer account ($99/year)
2. Create app in App Store Connect
3. Upload IPA from `npx eas build --platform ios --profile production`
4. Fill store listing
5. Submit for review (1-7 days)

---

## Support

For issues or questions:
- GitHub Issues: [project-repo]/issues
- Email: support@astronemi.app
- Discord: discord.gg/astronemi
