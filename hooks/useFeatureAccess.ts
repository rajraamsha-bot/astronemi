/**
 * useFeatureAccess Hook
 * 
 * Convenient hook for checking feature access and showing lock modal
 */

import { useState, useCallback } from 'react';
import { useUserEngagement } from '@/contexts/UserEngagementContext';
import { 
  canAccessFeature, 
  ALL_FEATURES, 
  FeatureAccess 
} from '@/utils/progressive-disclosure';
import { analytics } from '@/utils/analytics-tracker';

interface UseFeatureAccessReturn {
  canAccess: (featureId: string) => boolean;
  checkAccess: (featureId: string) => boolean;
  showLockModal: boolean;
  lockedFeature: FeatureAccess | null;
  closeLockModal: () => void;
}

export function useFeatureAccess(): UseFeatureAccessReturn {
  const { currentTier, engagement } = useUserEngagement();
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<FeatureAccess | null>(null);

  /**
   * Check if user can access a feature (silent check)
   */
  const canAccess = useCallback((featureId: string): boolean => {
    return canAccessFeature(featureId, currentTier, engagement.hasSubscription);
  }, [currentTier, engagement.hasSubscription]);

  /**
   * Check access and show modal if locked
   */
  const checkAccess = useCallback((featureId: string): boolean => {
    const hasAccess = canAccessFeature(featureId, currentTier, engagement.hasSubscription);

    if (!hasAccess) {
      const feature = ALL_FEATURES.find(f => f.id === featureId);
      if (feature) {
        setLockedFeature(feature);
        setShowLockModal(true);

        // Track feature lock event
        analytics.track('feature_locked', {
          feature_id: featureId,
          feature_name: feature.name,
          current_tier: currentTier,
          required_tier: feature.tier,
          requires_subscription: feature.requiresSubscription,
        });
      }
    } else {
      // Track feature access
      analytics.trackFeatureUsage(featureId, 'access');
    }

    return hasAccess;
  }, [currentTier, engagement.hasSubscription]);

  const closeLockModal = useCallback(() => {
    setShowLockModal(false);
    setLockedFeature(null);
  }, []);

  return {
    canAccess,
    checkAccess,
    showLockModal,
    lockedFeature,
    closeLockModal,
  };
}

export default useFeatureAccess;
