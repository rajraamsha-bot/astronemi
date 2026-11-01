# Quick Commands Reference

## Testing Commands

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Progressive disclosure tests
npm test -- __tests__/utils/progressive-disclosure.test.ts

# A/B testing tests
npm test -- __tests__/utils/ab-testing.test.ts

# Run with coverage
npm test -- --coverage
```

### Check TypeScript Errors
```bash
npx tsc --noEmit
```

### Run Linter
```bash
npm run lint
```

---

## Development Commands

### Start Development Server
```bash
npx expo start
```

### Run on iOS
```bash
npx expo run:ios
```

### Run on Android
```bash
npx expo run:android
```

### Clear Cache
```bash
npx expo start --clear
```

---

## Testing User Tiers (In App Console)

### Reset to NEW Tier
```javascript
import { useUserEngagement } from '@/contexts/UserEngagementContext';

const { resetEngagement } = useUserEngagement();
await resetEngagement();
```

### Progress to ENGAGED Tier
```javascript
const { incrementSession } = useUserEngagement();

for (let i = 0; i < 6; i++) {
  await incrementSession();
}
```

### Progress to POWER Tier
```javascript
const { setSubscription } = useUserEngagement();
await setSubscription(true);
```

### Check Current Tier
```javascript
const { currentTier, engagement } = useUserEngagement();
console.log('Tier:', currentTier);
console.log('Sessions:', engagement.sessionCount);
console.log('Days:', engagement.daysSinceSignup);
```

---

## A/B Testing Commands (In App Console)

### Get Variant
```javascript
import { abTesting, EXPERIMENTS } from '@/utils/ab-testing';

const variant = await abTesting.getVariant(EXPERIMENTS.ONBOARDING_FLOW);
console.log('Variant:', variant);
```

### Track Conversion
```javascript
abTesting.trackConversion('onboarding_flow', 1);
```

### Reset Assignments
```javascript
await abTesting.resetAssignments();
```

### Get Active Experiments
```javascript
const experiments = abTesting.getActiveExperiments();
console.log('Active:', experiments);
```

---

## Analytics Commands (In App Console)

### Track Event
```javascript
import { analytics } from '@/utils/analytics-tracker';

analytics.track('test_event', { test: true });
```

### Track Screen View
```javascript
analytics.trackScreenView('test_screen');
```

### Track Feature Usage
```javascript
analytics.trackFeatureUsage('feature_id', 'action', { metadata: 'value' });
```

### Set User Properties
```javascript
analytics.setUserProperties({
  userRole: 'premium',
  userTier: 'power',
});
```

---

## Deployment Commands

### Build for Staging (EAS)
```bash
# iOS
eas build --platform ios --profile staging

# Android
eas build --platform android --profile staging

# Both
eas build --platform all --profile staging
```

### Build for Production (EAS)
```bash
eas build --platform all --profile production
```

### Submit to Stores
```bash
# iOS TestFlight
eas submit --platform ios --profile staging

# Android Internal Testing
eas submit --platform android --profile staging
```

---

## Debugging Commands

### View Logs
```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

### Check Bundle Size
```bash
npx expo export --platform ios
npx expo export --platform android
```

### Analyze Bundle
```bash
npx expo-cli customize:web
npm run analyze
```

---

## Database/Storage Commands

### Clear AsyncStorage (In App Console)
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clear all
await AsyncStorage.clear();

// Clear specific key
await AsyncStorage.removeItem('@user_engagement/session_count');
```

### View AsyncStorage (In App Console)
```javascript
// Get all keys
const keys = await AsyncStorage.getAllKeys();
console.log('Keys:', keys);

// Get specific value
const value = await AsyncStorage.getItem('@user_engagement/session_count');
console.log('Value:', value);
```

---

## Git Commands

### Commit Changes
```bash
git add .
git commit -m "feat: implement progressive disclosure system"
git push origin main
```

### Create Release Branch
```bash
git checkout -b release/v1.0.0
git push origin release/v1.0.0
```

### Tag Release
```bash
git tag -a v1.0.0 -m "Release v1.0.0 - Progressive Disclosure"
git push origin v1.0.0
```

---

## Useful Shortcuts

### Quick Test Cycle
```bash
# 1. Run tests
npm test

# 2. Check types
npx tsc --noEmit

# 3. Run linter
npm run lint

# 4. Start dev server
npx expo start
```

### Quick Deploy to Staging
```bash
# 1. Build
eas build --platform all --profile staging

# 2. Submit
eas submit --platform all --profile staging

# 3. Monitor
# Check EAS dashboard
```

---

## Environment Variables

### Development
```bash
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_DEBUG_MODE=true
```

### Staging
```bash
EXPO_PUBLIC_ENV=staging
EXPO_PUBLIC_DEBUG_MODE=true
```

### Production
```bash
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_DEBUG_MODE=false
```

---

## Quick Links

### Documentation
- Implementation: `PROGRESSIVE_DISCLOSURE_IMPLEMENTATION.md`
- Testing: `TESTING_GUIDE.md`
- Deployment: `DEPLOYMENT_GUIDE.md`
- Monitoring: `MONITORING_GUIDE.md`

### Code
- Progressive Disclosure: `utils/progressive-disclosure.ts`
- Analytics: `utils/analytics-tracker.ts`
- A/B Testing: `utils/ab-testing.ts`
- User Engagement: `contexts/UserEngagementContext.tsx`

### Tests
- Progressive Disclosure: `__tests__/utils/progressive-disclosure.test.ts`
- A/B Testing: `__tests__/utils/ab-testing.test.ts`

---

## Emergency Commands

### Rollback Deployment
```bash
# EAS rollback
eas channel:rollback production

# Or deploy previous version
eas build --platform all --profile production --no-wait
```

### Disable Feature
```javascript
// In utils/progressive-disclosure.ts
// Set feature tier to POWER and requiresSubscription to true
{
  id: 'feature-id',
  tier: UserTier.POWER,
  requiresSubscription: true,
}
```

### Disable A/B Test
```javascript
// In utils/ab-testing.ts
abTesting.registerExperiment({
  id: 'experiment_id',
  enabled: false, // Disable experiment
  // ...
});
```

---

## Monitoring Commands

### Check Analytics (Firebase)
```bash
firebase analytics:export --date=YYYY-MM-DD
```

### Check Errors (Sentry)
```bash
sentry-cli issues list
```

### Check Performance
```bash
# In browser DevTools
# Performance tab → Record → Analyze
```

---

## Useful npm Scripts

Add these to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit",
    "build:staging": "eas build --platform all --profile staging",
    "build:production": "eas build --platform all --profile production",
    "deploy:staging": "eas submit --platform all --profile staging",
    "deploy:production": "eas submit --platform all --profile production"
  }
}
```

---

## Quick Reference Card

**Print this and keep it handy!**

```
┌─────────────────────────────────────────┐
│  QUICK COMMANDS REFERENCE               │
├─────────────────────────────────────────┤
│  Test:     npm test                     │
│  Lint:     npm run lint                 │
│  Types:    npx tsc --noEmit             │
│  Start:    npx expo start               │
│  Build:    eas build --profile staging  │
│  Deploy:   eas submit --profile staging │
├─────────────────────────────────────────┤
│  Reset Tier:  resetEngagement()         │
│  ENGAGED:     incrementSession() x6     │
│  POWER:       setSubscription(true)     │
├─────────────────────────────────────────┤
│  Docs:     TESTING_GUIDE.md             │
│           DEPLOYMENT_GUIDE.md           │
│           MONITORING_GUIDE.md           │
└─────────────────────────────────────────┘
```

