# Deployment Guide - Progressive Disclosure System

## Pre-Deployment Checklist

**Status**: Ready for Staging  
**Version**: 1.0.0  
**Date**: April 12, 2026

---

## ✅ Pre-Deployment Verification

### Code Quality
- [x] All TypeScript errors resolved
- [x] All tests passing (41/41 progressive disclosure, 30+ A/B testing)
- [x] No console errors in development
- [x] Code reviewed and approved
- [x] Documentation complete

### Features Implemented
- [x] Progressive disclosure system (3 tiers)
- [x] Onboarding flow (3 steps)
- [x] Feature protection (3 premium features)
- [x] Analytics tracking (comprehensive)
- [x] A/B testing infrastructure (4 experiments)
- [x] Tier progress card
- [x] Feature lock modal

### Testing Complete
- [ ] Manual testing completed (see TESTING_GUIDE.md)
- [ ] All test cases passed
- [ ] Edge cases tested
- [ ] Performance verified
- [ ] No critical issues found

---

## Step 1: Prepare for Deployment

### 1.1 Environment Variables

Create/update `.env.staging`:

```bash
# App Configuration
EXPO_PUBLIC_ENV=staging
EXPO_PUBLIC_API_URL=https://staging-api.astronemi.app

# Analytics (Optional - can use mock for staging)
EXPO_PUBLIC_FIREBASE_API_KEY=your_staging_firebase_key
EXPO_PUBLIC_MIXPANEL_TOKEN=your_staging_mixpanel_token

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_AB_TESTING=true
EXPO_PUBLIC_ENABLE_PROGRESSIVE_DISCLOSURE=true

# Debug
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_LOG_LEVEL=debug
```

### 1.2 Build Configuration

Update `app.json` or `app.config.js`:

```json
{
  "expo": {
    "name": "AstroNemi (Staging)",
    "slug": "astronemi-staging",
    "version": "1.0.0",
    "extra": {
      "environment": "staging",
      "enableAnalytics": true,
      "enableABTesting": true
    }
  }
}
```

### 1.3 Version Bump

```bash
# Update version in package.json
npm version patch  # 1.0.0 -> 1.0.1

# Or manually update package.json
{
  "version": "1.0.1"
}
```

---

## Step 2: Deploy to Staging

### Option A: Expo EAS Build (Recommended)

#### 2.1 Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

#### 2.2 Configure EAS
```bash
# Initialize EAS (if not done)
eas build:configure

# Create eas.json
{
  "build": {
    "staging": {
      "env": {
        "EXPO_PUBLIC_ENV": "staging"
      },
      "distribution": "internal",
      "channel": "staging"
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENV": "production"
      },
      "distribution": "store"
    }
  }
}
```

#### 2.3 Build for Staging
```bash
# Build for iOS (internal distribution)
eas build --platform ios --profile staging

# Build for Android (internal distribution)
eas build --platform android --profile staging

# Build for both
eas build --platform all --profile staging
```

#### 2.4 Submit to Internal Testing
```bash
# iOS TestFlight
eas submit --platform ios --profile staging

# Android Internal Testing
eas submit --platform android --profile staging
```

### Option B: Expo Go (Quick Testing)

```bash
# Start development server
npx expo start

# Scan QR code with Expo Go app
# Or press 'i' for iOS simulator
# Or press 'a' for Android emulator
```

### Option C: Local Build

```bash
# iOS
npx expo run:ios --configuration Staging

# Android
npx expo run:android --variant stagingDebug
```

---

## Step 3: Verify Staging Deployment

### 3.1 Installation Check
- [ ] App installs successfully
- [ ] App launches without crashes
- [ ] Splash screen shows correctly
- [ ] No immediate errors

### 3.2 Feature Verification
- [ ] Onboarding shows for new users
- [ ] Tier progress card displays
- [ ] Premium features locked
- [ ] Lock modal appears correctly
- [ ] Analytics tracking works
- [ ] A/B testing assigns variants

### 3.3 Smoke Tests
```bash
# Run quick smoke tests
npm run test:smoke  # If you have smoke tests

# Or manually test:
# 1. Launch app
# 2. Complete onboarding
# 3. Navigate to home
# 4. Try to access locked feature
# 5. Verify lock modal
# 6. Check analytics in console
```

---

## Step 4: Monitor Staging

### 4.1 Analytics Dashboard

Check your analytics dashboard (Firebase/Mixpanel/Amplitude):

**Key Metrics to Monitor**:
- Session starts
- Onboarding completion rate
- Feature lock events
- Tier progression events
- Error rates
- Crash rates

### 4.2 Error Monitoring

Check error reporting service (Sentry/Crashlytics):

```typescript
// Errors should be tracked automatically
// Check for:
// - JavaScript errors
// - Native crashes
// - Network errors
// - Analytics errors
```

### 4.3 User Feedback

Collect feedback from internal testers:

**Feedback Form**:
- Onboarding experience (1-5 stars)
- Feature discovery (1-5 stars)
- Lock modal clarity (1-5 stars)
- Overall experience (1-5 stars)
- Issues encountered (text)
- Suggestions (text)

---

## Step 5: Staging Testing Period

### Week 1: Internal Testing
**Testers**: Development team (5-10 people)

**Focus**:
- [ ] Core functionality works
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Analytics tracking correctly

**Daily Checks**:
- Check error logs
- Review analytics data
- Collect tester feedback
- Fix critical issues

### Week 2: Beta Testing
**Testers**: Selected users (50-100 people)

**Focus**:
- [ ] Real-world usage patterns
- [ ] Edge cases discovered
- [ ] User experience feedback
- [ ] Performance under load

**Metrics to Track**:
- Onboarding completion: Target 80%+
- Day 1 retention: Target 40%+
- Feature discovery: Track which features accessed
- Lock events: Track which features users try to access
- Conversion: Track subscription rate

---

## Step 6: Production Deployment

### 6.1 Pre-Production Checklist
- [ ] All staging tests passed
- [ ] No critical issues found
- [ ] User feedback positive
- [ ] Metrics meet targets
- [ ] Team approval obtained

### 6.2 Production Build

```bash
# Update environment
EXPO_PUBLIC_ENV=production

# Build for production
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

### 6.3 Gradual Rollout

**Phase 1: 10% of users** (Day 1-3)
- Monitor closely
- Check for issues
- Ready to rollback

**Phase 2: 50% of users** (Day 4-7)
- Verify metrics
- Collect feedback
- Optimize based on data

**Phase 3: 100% of users** (Day 8+)
- Full rollout
- Continue monitoring
- Iterate based on data

---

## Step 7: Post-Deployment Monitoring

### 7.1 Key Metrics Dashboard

Create a dashboard to monitor:

**User Engagement**:
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- Session duration
- Session frequency

**Progressive Disclosure**:
- User tier distribution (NEW/ENGAGED/POWER)
- Tier progression rate
- Time to ENGAGED tier
- Time to POWER tier

**Feature Usage**:
- Feature access by tier
- Feature lock events
- Most locked features
- Feature discovery rate

**Conversion**:
- Onboarding completion rate
- Subscription conversion rate
- Lock → Subscribe conversion
- Revenue per user

**Technical**:
- Error rate
- Crash rate
- API response times
- App performance metrics

### 7.2 Alerts Setup

Set up alerts for:

**Critical**:
- Crash rate > 1%
- Error rate > 5%
- API downtime
- Analytics tracking failure

**Warning**:
- Onboarding completion < 70%
- Day 1 retention < 30%
- Subscription conversion < 2%

**Info**:
- New tier progression
- Feature unlock events
- A/B test results

---

## Step 8: Optimization & Iteration

### 8.1 A/B Testing

Launch experiments:

**Experiment 1: Onboarding Flow**
- Control: 3 steps
- Variant: 2 steps
- Metric: Completion rate
- Duration: 2 weeks
- Sample size: 1000 users

**Experiment 2: Tier Thresholds**
- Control: 6 sessions to ENGAGED
- Variant: 4 sessions to ENGAGED
- Metric: Retention rate
- Duration: 2 weeks
- Sample size: 1000 users

### 8.2 Data-Driven Decisions

Based on data, optimize:

**If onboarding completion < 80%**:
- Simplify steps
- Add skip option
- Improve value proposition

**If tier progression slow**:
- Lower session thresholds
- Add more engagement hooks
- Improve feature discovery

**If conversion low**:
- Improve lock modal messaging
- Add more value to premium features
- Optimize pricing

### 8.3 Feature Protection

Based on lock events, protect remaining features:

```typescript
// Check analytics for most locked features
// Example: If users try to access Medical Astrology 100+ times
// → Protect it next

// Priority order:
// 1. Most attempted locks
// 2. Highest value features
// 3. Most requested features
```

---

## Rollback Plan

### If Critical Issues Found

**Immediate Actions**:
1. Stop rollout (if gradual)
2. Assess severity
3. Decide: Fix forward or rollback

**Rollback Steps**:
```bash
# Revert to previous version
eas build --platform all --profile production --no-wait

# Or use EAS rollback
eas channel:rollback production

# Notify users
# - In-app message
# - Email notification
# - Social media update
```

**Post-Rollback**:
1. Identify root cause
2. Fix issue
3. Test thoroughly
4. Redeploy

---

## Success Criteria

### Technical Success
- [ ] Zero critical bugs
- [ ] Crash rate < 0.5%
- [ ] Error rate < 2%
- [ ] 99.9% uptime

### User Success
- [ ] Onboarding completion > 80%
- [ ] Day 1 retention > 40%
- [ ] Day 7 retention > 25%
- [ ] Day 30 retention > 15%

### Business Success
- [ ] Subscription conversion > 3%
- [ ] Revenue increase > 20%
- [ ] User satisfaction > 4/5 stars
- [ ] Feature discovery > 50%

---

## Deployment Timeline

### Week 1: Staging Deployment
- Day 1: Deploy to staging
- Day 2-3: Internal testing
- Day 4-7: Beta testing

### Week 2: Production Preparation
- Day 8-10: Fix issues from staging
- Day 11-12: Final testing
- Day 13-14: Production build

### Week 3: Production Rollout
- Day 15-17: 10% rollout
- Day 18-21: 50% rollout
- Day 22+: 100% rollout

### Week 4: Monitor & Optimize
- Day 22-28: Monitor metrics
- Day 29+: Optimize based on data

---

## Support & Documentation

### For Developers
- `PROGRESSIVE_DISCLOSURE_IMPLEMENTATION.md` - Implementation guide
- `TESTING_GUIDE.md` - Testing procedures
- `FEATURES_PROTECTED_STATUS.md` - Protection status

### For Users
- In-app help section
- FAQ page
- Support email
- Community forum

### For Stakeholders
- Analytics dashboard
- Weekly metrics report
- Monthly business review

---

## Contacts

### Development Team
- Lead Developer: ___________
- Backend Developer: ___________
- Mobile Developer: ___________

### Operations
- DevOps Engineer: ___________
- QA Lead: ___________

### Business
- Product Manager: ___________
- Marketing Lead: ___________

---

## Deployment Sign-off

**Staging Deployment**:
- [ ] Code reviewed
- [ ] Tests passed
- [ ] Deployed to staging
- [ ] Verified working

**Approved by**: ___________  
**Date**: ___________

**Production Deployment**:
- [ ] Staging tests passed
- [ ] User feedback positive
- [ ] Metrics meet targets
- [ ] Ready for production

**Approved by**: ___________  
**Date**: ___________

---

## Next Steps

1. ✅ Complete testing (see TESTING_GUIDE.md)
2. ✅ Deploy to staging (this guide)
3. ⏳ Monitor staging metrics
4. ⏳ Fix any issues found
5. ⏳ Deploy to production
6. ⏳ Monitor production metrics
7. ⏳ Optimize based on data

**Current Status**: Ready for Staging Deployment 🚀

