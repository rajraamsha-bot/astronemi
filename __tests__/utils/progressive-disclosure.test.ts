/**
 * Progressive Disclosure System Tests
 */

import {
  UserTier,
  UserEngagement,
  getUserTier,
  getAccessibleFeatures,
  canAccessFeature,
  getFeaturesByCategory,
  getLockedFeatures,
  getTierProgress,
  ALL_FEATURES,
} from '@/utils/progressive-disclosure';
import { UserRole } from '@/utils/rbac';

describe('Progressive Disclosure System', () => {
  describe('getUserTier', () => {
    it('should return NEW tier for new users', () => {
      const engagement: UserEngagement = {
        sessionCount: 0,
        daysSinceSignup: 0,
        hasSubscription: false,
        userRole: UserRole.FREE,
        completedOnboarding: false,
      };

      expect(getUserTier(engagement)).toBe(UserTier.NEW);
    });

    it('should return NEW tier for users with <6 sessions', () => {
      const engagement: UserEngagement = {
        sessionCount: 5,
        daysSinceSignup: 2,
        hasSubscription: false,
        userRole: UserRole.FREE,
        completedOnboarding: true,
      };

      expect(getUserTier(engagement)).toBe(UserTier.NEW);
    });

    it('should return ENGAGED tier for users with 6+ sessions', () => {
      const engagement: UserEngagement = {
        sessionCount: 6,
        daysSinceSignup: 3,
        hasSubscription: false,
        userRole: UserRole.FREE,
        completedOnboarding: true,
      };

      expect(getUserTier(engagement)).toBe(UserTier.ENGAGED);
    });

    it('should return ENGAGED tier for users with 3+ days', () => {
      const engagement: UserEngagement = {
        sessionCount: 3,
        daysSinceSignup: 3,
        hasSubscription: false,
        userRole: UserRole.FREE,
        completedOnboarding: true,
      };

      expect(getUserTier(engagement)).toBe(UserTier.ENGAGED);
    });

    it('should return POWER tier for users with 16+ sessions and 8+ days', () => {
      const engagement: UserEngagement = {
        sessionCount: 16,
        daysSinceSignup: 8,
        hasSubscription: false,
        userRole: UserRole.FREE,
        completedOnboarding: true,
      };

      expect(getUserTier(engagement)).toBe(UserTier.POWER);
    });

    it('should return POWER tier for subscribed users', () => {
      const engagement: UserEngagement = {
        sessionCount: 1,
        daysSinceSignup: 0,
        hasSubscription: true,
        userRole: UserRole.PREMIUM,
        completedOnboarding: false,
      };

      expect(getUserTier(engagement)).toBe(UserTier.POWER);
    });

    it('should return POWER tier for premium role users', () => {
      const engagement: UserEngagement = {
        sessionCount: 1,
        daysSinceSignup: 0,
        hasSubscription: false,
        userRole: UserRole.PREMIUM,
        completedOnboarding: false,
      };

      expect(getUserTier(engagement)).toBe(UserTier.POWER);
    });
  });

  describe('getAccessibleFeatures', () => {
    it('should return 9 features for NEW tier when AI is off', () => {
      const features = getAccessibleFeatures(UserTier.NEW, false);
      expect(features.length).toBe(9);
      expect(features.every(f => f.tier === UserTier.NEW)).toBe(true);
    });

    it('should return 28 features for ENGAGED tier when AI is off', () => {
      const features = getAccessibleFeatures(UserTier.ENGAGED, false);
      expect(features.length).toBe(28); // 9 NEW + 19 ENGAGED (1 requires subscription)
      expect(features.every(f => 
        f.tier === UserTier.NEW || f.tier === UserTier.ENGAGED
      )).toBe(true);
    });

    it('should exclude ai-chat when AI features are disabled', () => {
      const features = getAccessibleFeatures(UserTier.POWER, true);
      expect(features.some(f => f.id === 'ai-chat')).toBe(false);
    });

    it('should return all non-subscription features for POWER tier without subscription', () => {
      const features = getAccessibleFeatures(UserTier.POWER, false);
      expect(features.length).toBeGreaterThan(30);
      expect(features.every(f => !f.requiresSubscription)).toBe(true);
    });

    it('should return all non-AI features for POWER tier with subscription', () => {
      const features = getAccessibleFeatures(UserTier.POWER, true);
      expect(features.length).toBe(ALL_FEATURES.length - 1);
    });

    it('should not include subscription-required features for non-subscribers', () => {
      const features = getAccessibleFeatures(UserTier.ENGAGED, false);
      const hasSubscriptionFeatures = features.some(f => f.requiresSubscription);
      expect(hasSubscriptionFeatures).toBe(false);
    });
  });

  describe('canAccessFeature', () => {
    it('should allow NEW tier users to access NEW tier features', () => {
      expect(canAccessFeature('home', UserTier.NEW, false)).toBe(true);
      expect(canAccessFeature('horoscope', UserTier.NEW, false)).toBe(true);
      expect(canAccessFeature('kundli-basic', UserTier.NEW, false)).toBe(true);
    });

    it('should not allow NEW tier users to access ENGAGED tier features', () => {
      expect(canAccessFeature('kundli-matching', UserTier.NEW, false)).toBe(false);
      expect(canAccessFeature('muhurat', UserTier.NEW, false)).toBe(false);
    });

    it('should not allow NEW tier users to access POWER tier features', () => {
      expect(canAccessFeature('kp-astrology', UserTier.NEW, false)).toBe(false);
      expect(canAccessFeature('lal-kitab', UserTier.NEW, false)).toBe(false);
    });

    it('should allow ENGAGED tier users to access NEW and ENGAGED features', () => {
      expect(canAccessFeature('home', UserTier.ENGAGED, false)).toBe(true);
      expect(canAccessFeature('kundli-matching', UserTier.ENGAGED, false)).toBe(true);
    });

    it('should not allow non-subscribers to access subscription features', () => {
      expect(canAccessFeature('kp-astrology', UserTier.POWER, false)).toBe(false);
      expect(canAccessFeature('video-consultation', UserTier.ENGAGED, false)).toBe(false);
    });

    it('should allow subscribers to access subscription features', () => {
      expect(canAccessFeature('kp-astrology', UserTier.POWER, true)).toBe(true);
      expect(canAccessFeature('video-consultation', UserTier.ENGAGED, true)).toBe(true);
    });

    it('should deny ai-chat when AI features are disabled', () => {
      expect(canAccessFeature('ai-chat', UserTier.POWER, true)).toBe(false);
    });
  });

  describe('getFeaturesByCategory', () => {
    it('should group features by category', () => {
      const features = getFeaturesByCategory(UserTier.NEW, false);
      expect(features).toHaveProperty('core');
      expect(Array.isArray(features.core)).toBe(true);
    });

    it('should only include accessible features', () => {
      const features = getFeaturesByCategory(UserTier.NEW, false);
      const allFeatures = Object.values(features).flat();
      expect(allFeatures.length).toBe(9);
    });

    it('should include multiple categories for ENGAGED tier', () => {
      const features = getFeaturesByCategory(UserTier.ENGAGED, false);
      const categories = Object.keys(features);
      expect(categories.length).toBeGreaterThan(1);
    });
  });

  describe('getLockedFeatures', () => {
    it('should return locked features for NEW tier', () => {
      const locked = getLockedFeatures(UserTier.NEW, false);
      expect(locked.length).toBe(ALL_FEATURES.length - 9);
    });

    it('should return locked features for ENGAGED tier', () => {
      const locked = getLockedFeatures(UserTier.ENGAGED, false);
      expect(locked.length).toBe(ALL_FEATURES.length - 28); // Total - accessible
    });

    it('should return subscription features for POWER tier without subscription', () => {
      const locked = getLockedFeatures(UserTier.POWER, false);
      const subscriptionLocked = locked.filter(f => f.id !== 'ai-chat');
      expect(subscriptionLocked.every(f => f.requiresSubscription)).toBe(true);
      expect(locked.some(f => f.id === 'ai-chat')).toBe(true);
    });

    it('should only lock ai-chat for POWER tier with subscription when AI is off', () => {
      const locked = getLockedFeatures(UserTier.POWER, true);
      expect(locked.map(f => f.id)).toEqual(['ai-chat']);
    });
  });

  describe('getTierProgress', () => {
    it('should calculate progress from NEW to ENGAGED', () => {
      const engagement: UserEngagement = {
        sessionCount: 3,
        daysSinceSignup: 1,
        hasSubscription: false,
        userRole: UserRole.FREE,
        completedOnboarding: true,
      };

      const progress = getTierProgress(engagement);
      expect(progress.currentTier).toBe(UserTier.NEW);
      expect(progress.nextTier).toBe(UserTier.ENGAGED);
      expect(progress.progress).toBeGreaterThan(0);
      expect(progress.progress).toBeLessThan(100);
      expect(progress.requirements.length).toBeGreaterThan(0);
    });

    it('should calculate progress from ENGAGED to POWER', () => {
      const engagement: UserEngagement = {
        sessionCount: 10,
        daysSinceSignup: 5,
        hasSubscription: false,
        userRole: UserRole.FREE,
        completedOnboarding: true,
      };

      const progress = getTierProgress(engagement);
      expect(progress.currentTier).toBe(UserTier.ENGAGED);
      expect(progress.nextTier).toBe(UserTier.POWER);
      expect(progress.progress).toBeGreaterThan(0);
      expect(progress.progress).toBeLessThan(100);
    });

    it('should show 100% progress for POWER tier', () => {
      const engagement: UserEngagement = {
        sessionCount: 20,
        daysSinceSignup: 10,
        hasSubscription: true,
        userRole: UserRole.PREMIUM,
        completedOnboarding: true,
      };

      const progress = getTierProgress(engagement);
      expect(progress.currentTier).toBe(UserTier.POWER);
      expect(progress.nextTier).toBe(null);
      expect(progress.progress).toBe(100);
      expect(progress.requirements.length).toBe(0);
    });

    it('should include subscription option in requirements', () => {
      const engagement: UserEngagement = {
        sessionCount: 10,
        daysSinceSignup: 5,
        hasSubscription: false,
        userRole: UserRole.FREE,
        completedOnboarding: true,
      };

      const progress = getTierProgress(engagement);
      const hasSubscriptionOption = progress.requirements.some(req => 
        req.includes('subscribe')
      );
      expect(hasSubscriptionOption).toBe(true);
    });
  });

  describe('ALL_FEATURES', () => {
    it('should have 60 features mapped', () => {
      expect(ALL_FEATURES.length).toBe(60);
    });

    it('should have 10 NEW tier features', () => {
      const newFeatures = ALL_FEATURES.filter(f => f.tier === UserTier.NEW);
      expect(newFeatures.length).toBe(10);
    });

    it('should have 20 ENGAGED tier features', () => {
      const engagedFeatures = ALL_FEATURES.filter(f => f.tier === UserTier.ENGAGED);
      expect(engagedFeatures.length).toBe(20);
    });

    it('should have 30 POWER tier features', () => {
      const powerFeatures = ALL_FEATURES.filter(f => f.tier === UserTier.POWER);
      expect(powerFeatures.length).toBe(30);
    });

    it('should have unique feature IDs', () => {
      const ids = ALL_FEATURES.map(f => f.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ALL_FEATURES.length);
    });

    it('should have unique routes', () => {
      const routes = ALL_FEATURES.map(f => f.route);
      const uniqueRoutes = new Set(routes);
      expect(uniqueRoutes.size).toBe(ALL_FEATURES.length);
    });

    it('should have all required fields', () => {
      ALL_FEATURES.forEach(feature => {
        expect(feature).toHaveProperty('id');
        expect(feature).toHaveProperty('name');
        expect(feature).toHaveProperty('route');
        expect(feature).toHaveProperty('tier');
        expect(feature).toHaveProperty('category');
        expect(typeof feature.id).toBe('string');
        expect(typeof feature.name).toBe('string');
        expect(typeof feature.route).toBe('string');
        expect(typeof feature.category).toBe('string');
      });
    });

    it('should have subscription features only in ENGAGED and POWER tiers', () => {
      const newSubscriptionFeatures = ALL_FEATURES.filter(
        f => f.tier === UserTier.NEW && f.requiresSubscription
      );
      expect(newSubscriptionFeatures.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly 6 sessions (boundary)', () => {
      const engagement: UserEngagement = {
        sessionCount: 6,
        daysSinceSignup: 0,
        hasSubscription: false,
        userRole: UserRole.FREE,
        completedOnboarding: true,
      };

      expect(getUserTier(engagement)).toBe(UserTier.ENGAGED);
    });

    it('should handle exactly 16 sessions and 8 days (boundary)', () => {
      const engagement: UserEngagement = {
        sessionCount: 16,
        daysSinceSignup: 8,
        hasSubscription: false,
        userRole: UserRole.FREE,
        completedOnboarding: true,
      };

      expect(getUserTier(engagement)).toBe(UserTier.POWER);
    });

    it('should prioritize subscription over session count', () => {
      const engagement: UserEngagement = {
        sessionCount: 0,
        daysSinceSignup: 0,
        hasSubscription: true,
        userRole: UserRole.FREE,
        completedOnboarding: false,
      };

      expect(getUserTier(engagement)).toBe(UserTier.POWER);
    });

    it('should handle non-existent feature ID', () => {
      expect(canAccessFeature('non-existent', UserTier.POWER, true)).toBe(false);
    });
  });
});
