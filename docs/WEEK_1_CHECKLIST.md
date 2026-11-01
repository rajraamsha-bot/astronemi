# Week 1 Implementation Checklist

## ✅ Task 1: Configure Production Environment Variables

### 1.1 Update .env.production
```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Razorpay Payment Gateway
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
EXPO_PUBLIC_RAZORPAY_KEY_SECRET=your-secret-key-here

# Agora Video Calls
EXPO_PUBLIC_AGORA_APP_ID=your-agora-app-id
EXPO_PUBLIC_AGORA_APP_CERTIFICATE=your-agora-certificate

# Sentry Crash Reporting
EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Mixpanel Analytics
EXPO_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-token

# Firebase (Optional)
EXPO_PUBLIC_FIREBASE_ANALYTICS=true

# Country Code
EXPO_PUBLIC_COUNTRY_CODE=+91
```

### 1.2 GitHub Secrets Setup
Add these secrets to your GitHub repository:
- Settings → Secrets and variables → Actions → New repository secret

Required secrets:
- `EXPO_TOKEN` - Get from: `npx eas login && npx eas whoami`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `SENTRY_DSN`
- `SLACK_WEBHOOK` (for CI/CD notifications)

---

## ✅ Task 2: Complete Payment Integration

### 2.1 Install Razorpay Native Module
```bash
cd rork-astronemi-app-main
npm install react-native-razorpay
```

### 2.2 Update app.json
Add Razorpay plugin configuration (already done in your app.json)

### 2.3 Test Payment Flow
- [ ] Test wallet top-up
- [ ] Test consultation payment
- [ ] Test subscription payment
- [ ] Test order payment
- [ ] Verify webhook handling

---

## ✅ Task 3: Add Sentry Crash Reporting

### 3.1 Install Sentry
```bash
npm install @sentry/react-native
npx @sentry/wizard -i reactNative
```

### 3.2 Configuration Steps
1. Follow wizard prompts
2. Select your project
3. Configure source maps upload
4. Test crash reporting

### 3.3 Verify Integration
- [ ] Test crash capture
- [ ] Verify breadcrumbs
- [ ] Check user context
- [ ] Test performance monitoring

---

## ✅ Task 4: Fix Critical Accessibility Issues

### 4.1 Add Accessibility Labels
Priority screens:
- [ ] Login/OTP screens
- [ ] Home screen
- [ ] Kundli generation
- [ ] Astrologer list
- [ ] Payment screens

### 4.2 Test with Screen Readers
- [ ] iOS VoiceOver
- [ ] Android TalkBack

### 4.3 Color Contrast
- [ ] Run contrast checker
- [ ] Fix failing elements

---

## 📋 Verification Steps

### Environment Variables
```bash
# Test environment loading
npm run start
# Check console for "Supabase is not configured" warnings
```

### Payment Integration
```bash
# Run payment tests
npm test -- payment
```

### Sentry Integration
```bash
# Trigger test error
# Check Sentry dashboard for event
```

### Accessibility
```bash
# Run accessibility audit
npm run lint:a11y
```

---

## 🎯 Success Criteria

- [ ] All environment variables configured
- [ ] Payment flows working end-to-end
- [ ] Sentry capturing errors in dashboard
- [ ] All interactive elements have accessibility labels
- [ ] Screen reader navigation works smoothly
- [ ] Color contrast meets WCAG AA standards

---

## 📝 Notes

- Keep production credentials secure
- Never commit .env files to git
- Test on real devices before production
- Document any issues encountered
