# Protect Premium Features - Quick Guide

## Features Protected ✅

1. ✅ `app/kp-astrology.tsx` - KP Astrology (POWER tier, subscription required)
2. ✅ `app/lal-kitab.tsx` - Lal Kitab (POWER tier, subscription required)

## Remaining Features to Protect

### POWER Tier (Subscription Required)

Apply this pattern to each file:

```typescript
// 1. Add imports at top
import { useEffect } from 'react'; // Add if not present
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useUserEngagement } from '@/contexts/UserEngagementContext';
import FeatureLockModal from '@/components/FeatureLockModal';

// 2. Add hooks in component
const { checkAccess, showLockModal, lockedFeature, closeLockModal } = useFeatureAccess();
const { currentTier, engagement, tierProgress } = useUserEngagement();

// 3. Add access check
useEffect(() => {
  if (!checkAccess('feature-id')) {
    setTimeout(() => router.back(), 100);
  }
}, []);

// 4. Add modal before closing tag
<FeatureLockModal
  visible={showLockModal}
  onClose={closeLockModal}
  featureName={lockedFeature?.name || ''}
  featureDescription={lockedFeature?.description}
  requiredTier={lockedFeature?.tier || currentTier}
  currentTier={currentTier}
  requiresSubscription={lockedFeature?.requiresSubscription}
  tierProgress={tierProgress}
/>
```

### Files to Protect:

#### Advanced Astrology Systems
- [ ] `app/nadi.tsx` - feature-id: `'nadi'`
- [ ] `app/jaimini.tsx` - feature-id: `'jaimini'`
- [ ] `app/prashna.tsx` - feature-id: `'prashna'`
- [ ] `app/ashtakvarga.tsx` - feature-id: `'ashtakvarga'`
- [ ] `app/shadbala.tsx` - feature-id: `'shadbala'`
- [ ] `app/varshphal.tsx` - feature-id: `'varshphal'`

#### Specialized Features
- [ ] `app/medical-astrology.tsx` - feature-id: `'medical-astrology'`
- [ ] `app/financial-astrology.tsx` - feature-id: `'financial-astrology'`
- [ ] `app/electional.tsx` - feature-id: `'electional'`
- [ ] `app/chart-comparison.tsx` - feature-id: `'chart-comparison'`

### ENGAGED Tier (Subscription Required)
- [ ] `app/video-consultation.tsx` - feature-id: `'video-consultation'`

## Quick Copy-Paste Template

### For POWER Tier Features:

```typescript
// At top of file
import { useEffect } from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useUserEngagement } from '@/contexts/UserEngagementContext';
import FeatureLockModal from '@/components/FeatureLockModal';

// In component
export default function YourScreen() {
  const { checkAccess, showLockModal, lockedFeature, closeLockModal } = useFeatureAccess();
  const { currentTier, engagement, tierProgress } = useUserEngagement();
  
  // ... your existing state ...

  useEffect(() => {
    if (!checkAccess('your-feature-id')) {
      setTimeout(() => router.back(), 100);
    }
  }, []);

  return (
    <View>
      {/* Your existing JSX */}
      
      <FeatureLockModal
        visible={showLockModal}
        onClose={closeLockModal}
        featureName={lockedFeature?.name || ''}
        featureDescription={lockedFeature?.description}
        requiredTier={lockedFeature?.tier || currentTier}
        currentTier={currentTier}
        requiresSubscription={lockedFeature?.requiresSubscription}
        tierProgress={tierProgress}
      />
    </View>
  );
}
```

## Feature IDs Reference

Match these IDs with `utils/progressive-disclosure.ts`:

- `kp-astrology` ✅
- `lal-kitab` ✅
- `nadi`
- `jaimini`
- `prashna`
- `ashtakvarga`
- `shadbala`
- `varshphal`
- `western`
- `chinese-astrology`
- `tarot`
- `medical-astrology`
- `financial-astrology`
- `child-astrology`
- `pet-astrology`
- `electional`
- `chart-comparison`
- `video-consultation`

## Testing

After protecting each feature:

1. Reset engagement: `await resetEngagement()`
2. Navigate to feature
3. Should see lock modal
4. Should auto-navigate back
5. Subscribe or progress to POWER tier
6. Feature should be accessible

## Bulk Protection Script

If you want to protect all at once, you can use this pattern:

```bash
# For each file, add the 4 steps above
# Estimated time: 5 minutes per file
# Total: ~60 minutes for all 12 files
```

## Priority Order

Protect in this order based on user demand:

1. ✅ KP Astrology (most requested)
2. ✅ Lal Kitab (most requested)
3. Nadi (high demand)
4. Medical Astrology (high demand)
5. Financial Astrology (high demand)
6. Jaimini (medium demand)
7. Prashna (medium demand)
8. Others (lower priority)

## Notes

- All POWER tier features require subscription
- ENGAGED tier features (like video-consultation) also require subscription
- Feature IDs must match exactly with `utils/progressive-disclosure.ts`
- Modal will show automatically when access is denied
- User will be navigated back after 100ms delay

