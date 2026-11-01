# Testing Guide - Progressive Disclosure System

## Pre-Deployment Testing Checklist

**Estimated Time**: 30 minutes  
**Status**: Ready to Test

---

## Test 1: Onboarding Flow (5 min)

### Setup
```typescript
// In your app, run this in console or create a test button
import { useUserEngagement } from '@/contexts/UserEngagementContext';

const { resetEngagement } = useUserEngagement();
await resetEngagement();
```

### Test Steps
1. **Reset engagement** (simulate new user)
2. **Restart app** or navigate to home screen
3. **Verify onboarding appears**
   - [ ] Step 1: Welcome screen shows
   - [ ] Step 2: Feature highlights show
   - [ ] Step 3: Quick win (free horoscope) shows
4. **Test skip button**
   - [ ] Skip button works
   - [ ] Returns to home screen
5. **Test complete flow**
   - [ ] All 3 steps navigate correctly
   - [ ] "Get My Horoscope" button works
   - [ ] Redirects to horoscope screen
6. **Verify onboarding doesn't show again**
   - [ ] Restart app
   - [ ] Onboarding should not appear

### Expected Results
✅ Onboarding shows for new users only  
✅ All navigation works  
✅ Analytics events tracked  
✅ Doesn't show again after completion

---

## Test 2: Tier Progression (10 min)

### Test NEW Tier (0-5 sessions)
```typescript
const { resetEngagement, currentTier, engagement } = useUserEngagement();

// Reset to NEW tier
await resetEngagement();

console.log('Current tier:', currentTier); // Should be 'new'
console.log('Sessions:', engagement.sessionCount); // Should be 0
console.log('Days:', engagement.daysSinceSignup); // Should be 0
```

**Verify**:
- [ ] Tier progress card shows "New Explorer"
- [ ] Progress bar at 0%
- [ ] Can access 10 core features
- [ ] Cannot access KP Astrology, Lal Kitab, Nadi

### Test ENGAGED Tier (6-15 sessions)
```typescript
const { incrementSession, currentTier } = useUserEngagement();

// Simulate 6 sessions
for (let i = 0; i < 6; i++) {
  await incrementSession();
}

console.log('Current tier:', currentTier); // Should be 'engaged'
console.log('Sessions:', engagement.sessionCount); // Should be 6
```

**Verify**:
- [ ] Tier progress card shows "Engaged Seeker"
- [ ] Progress bar shows progress to POWER
- [ ] Can access 29 features (10 NEW + 19 ENGAGED)
- [ ] Still cannot access KP Astrology, Lal Kitab, Nadi

### Test POWER Tier (16+ sessions or subscription)
```typescript
const { setSubscription, currentTier } = useUserEngagement();

// Option 1: Simulate subscription
await setSubscription(true);

// Option 2: Simulate 16 sessions
for (let i = 0; i < 16; i++) {
  await incrementSession();
}

console.log('Current tier:', currentTier); // Should be 'power'
```

**Verify**:
- [ ] Tier progress card shows "Power User" or disappears
- [ ] Progress bar at 100%
- [ ] Can access all 60 features
- [ ] Can access KP Astrology, Lal Kitab, Nadi

### Expected Results
✅ Tier progression works correctly  
✅ Progress card updates  
✅ Feature access changes by tier  
✅ Analytics tracks tier progression

---

## Test 3: Feature Lock System (10 min)

### Test Locked Feature (NEW User)
```typescript
// Reset to NEW tier
await resetEngagement();

// Try to access KP Astrology
router.push('/kp-astrology');
```

**Verify**:
- [ ] Lock modal appears immediately
- [ ] Shows "KP Astrology is Locked"
- [ ] Shows current tier (NEW)
- [ ] Shows required tier (POWER)
- [ ] Shows progress bar
- [ ] Shows requirements list
- [ ] Shows "Subscribe Now" button
- [ ] Auto-navigates back after closing modal

### Test Locked Feature (ENGAGED User)
```typescript
// Progress to ENGAGED tier
for (let i = 0; i < 6; i++) {
  await incrementSession();
}

// Try to access Lal Kitab
router.push('/lal-kitab');
```

**Verify**:
- [ ] Lock modal appears
- [ ] Shows current tier (ENGAGED)
- [ ] Shows progress to POWER tier
- [ ] Requirements updated

### Test Unlocked Feature (POWER User)
```typescript
// Progress to POWER tier
await setSubscription(true);

// Try to access Nadi
router.push('/nadi');
```

**Verify**:
- [ ] No lock modal appears
- [ ] Feature loads normally
- [ ] Can use all features

### Expected Results
✅ Lock modal shows for locked features  
✅ Modal shows correct tier info  
✅ Auto-navigate back works  
✅ Unlocked features accessible  
✅ Analytics tracks lock events

---

## Test 4: Analytics Tracking (5 min)

### Check Console Logs
Open browser/app console and verify these events:

**Session Events**:
```
[Analytics] Event: session_start
[Analytics] Event: session_time
```

**Onboarding Events**:
```
[Analytics] Event: onboarding (step 1)
[Analytics] Event: onboarding (step 2)
[Analytics] Event: onboarding (step 3)
[Analytics] Event: onboarding_complete
```

**Feature Events**:
```
[Analytics] Event: feature_usage (feature_id: horoscope)
[Analytics] Event: feature_locked (feature_id: kp-astrology)
```

**Tier Events**:
```
[Analytics] Event: tier_progression (from: new, to: engaged)
```

### Verify Analytics
- [ ] Session start tracked on app launch
- [ ] Screen views tracked on navigation
- [ ] Feature usage tracked on access
- [ ] Feature locks tracked on denial
- [ ] Tier progression tracked on upgrade
- [ ] Errors tracked on failures

### Expected Results
✅ All events logged in console  
✅ Event properties correct  
✅ User properties set  
✅ No analytics errors

---

## Test 5: A/B Testing (Optional - 5 min)

### Check Experiment Assignment
```typescript
import { abTesting, EXPERIMENTS } from '@/utils/ab-testing';

// Get variant for onboarding
const variant = await abTesting.getVariant(EXPERIMENTS.ONBOARDING_FLOW);
console.log('Onboarding variant:', variant); // 'control' or 'short'

// Get all active experiments
const active = abTesting.getActiveExperiments();
console.log('Active experiments:', active);

// Get user assignments
const assignments = abTesting.getUserAssignments();
console.log('User assignments:', assignments);
```

**Verify**:
- [ ] Variant assigned (control or short)
- [ ] Same variant on subsequent calls
- [ ] 4 experiments registered
- [ ] Assignments persisted

### Expected Results
✅ Experiments registered  
✅ Variants assigned consistently  
✅ Assignments persisted  
✅ Ready for A/B testing

---

## Test 6: Edge Cases (5 min)

### Test 1: Rapid Session Increments
```typescript
// Rapidly increment sessions
for (let i = 0; i < 20; i++) {
  await incrementSession();
}
```
**Verify**: No crashes, tier updates correctly

### Test 2: Reset During Usage
```typescript
// Use app, then reset
await resetEngagement();
```
**Verify**: App continues working, tier resets

### Test 3: Navigation Edge Cases
```typescript
// Try to access locked feature multiple times
router.push('/kp-astrology');
router.push('/lal-kitab');
router.push('/nadi');
```
**Verify**: Each shows lock modal, no crashes

### Test 4: Subscription Toggle
```typescript
// Toggle subscription on/off
await setSubscription(true);
await setSubscription(false);
await setSubscription(true);
```
**Verify**: Tier updates correctly each time

### Expected Results
✅ No crashes on edge cases  
✅ State management robust  
✅ Navigation handles errors  
✅ Subscription toggle works

---

## Test 7: Performance (Optional - 5 min)

### Check App Performance
- [ ] App launch time (should be <3 seconds)
- [ ] Onboarding animation smooth
- [ ] Tier progress card renders quickly
- [ ] Lock modal appears instantly
- [ ] No memory leaks (check DevTools)
- [ ] No console errors

### Check Analytics Performance
- [ ] Events tracked without delay
- [ ] No blocking on main thread
- [ ] Storage operations fast

### Expected Results
✅ App remains responsive  
✅ No performance degradation  
✅ Analytics don't block UI

---

## Automated Test Suite

Run the automated tests:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- __tests__/utils/progressive-disclosure.test.ts
npm test -- __tests__/utils/ab-testing.test.ts

# Run with coverage
npm test -- --coverage
```

**Expected**:
- [ ] 41/41 progressive disclosure tests pass
- [ ] 30+ A/B testing tests pass
- [ ] 80+ total tests pass
- [ ] No test failures

---

## Testing Checklist Summary

### Core Functionality
- [ ] Onboarding flow works
- [ ] Tier progression works
- [ ] Feature locks work
- [ ] Analytics tracking works
- [ ] A/B testing works

### User Experience
- [ ] Smooth animations
- [ ] Clear messaging
- [ ] Intuitive navigation
- [ ] No crashes
- [ ] No errors

### Edge Cases
- [ ] Rapid actions handled
- [ ] Reset works correctly
- [ ] Multiple locks handled
- [ ] Subscription toggle works

### Performance
- [ ] Fast load times
- [ ] Smooth animations
- [ ] No memory leaks
- [ ] No blocking operations

---

## Issues Found During Testing

Document any issues here:

### Issue 1: [Title]
- **Description**: 
- **Steps to reproduce**: 
- **Expected**: 
- **Actual**: 
- **Severity**: Critical / High / Medium / Low
- **Status**: Open / Fixed

### Issue 2: [Title]
...

---

## Test Results

**Date**: ___________  
**Tester**: ___________  
**Environment**: Development / Staging / Production

### Summary
- Tests Passed: _____ / _____
- Tests Failed: _____
- Issues Found: _____
- Critical Issues: _____

### Sign-off
- [ ] All critical tests passed
- [ ] No critical issues found
- [ ] Ready for staging deployment

**Approved by**: ___________  
**Date**: ___________

---

## Next Steps After Testing

1. ✅ **All tests passed** → Proceed to staging deployment
2. ⚠️ **Minor issues found** → Fix and retest
3. ❌ **Critical issues found** → Fix immediately, full retest

Check `DEPLOYMENT_GUIDE.md` for staging deployment instructions.

