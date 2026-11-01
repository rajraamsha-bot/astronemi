/**
 * User Engagement Context
 * 
 * Tracks user engagement metrics for progressive disclosure:
 * - Session count
 * - Days since signup
 * - User tier
 * - Feature unlocks
 * - Onboarding completion
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';
import { UserRole } from '@/utils/rbac';
import { 
  UserTier, 
  UserEngagement, 
  getUserTier, 
  getTierProgress 
} from '@/utils/progressive-disclosure';
import { analytics } from '@/utils/analytics-tracker';

interface UserEngagementContextType {
  engagement: UserEngagement;
  currentTier: UserTier;
  tierProgress: ReturnType<typeof getTierProgress>;
  incrementSession: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setSubscription: (hasSubscription: boolean) => Promise<void>;
  resetEngagement: () => Promise<void>;
  isLoading: boolean;
}

const UserEngagementContext = createContext<UserEngagementContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SESSION_COUNT: '@user_engagement/session_count',
  SIGNUP_DATE: '@user_engagement/signup_date',
  HAS_SUBSCRIPTION: '@user_engagement/has_subscription',
  USER_ROLE: '@user_engagement/user_role',
  COMPLETED_ONBOARDING: '@user_engagement/completed_onboarding',
  LAST_SESSION_DATE: '@user_engagement/last_session_date',
};

interface UserEngagementProviderProps {
  children: ReactNode;
}

export function UserEngagementProvider({ children }: UserEngagementProviderProps) {
  const [engagement, setEngagement] = useState<UserEngagement>({
    sessionCount: 0,
    daysSinceSignup: 0,
    hasSubscription: false,
    userRole: UserRole.FREE,
    completedOnboarding: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load engagement data from storage
  useEffect(() => {
    loadEngagement();
  }, []);

  // Track session on mount
  useEffect(() => {
    if (!isLoading) {
      trackSession();
    }
  }, [isLoading]);

  const loadEngagement = async () => {
    try {
      const [
        sessionCount,
        signupDate,
        hasSubscription,
        userRole,
        completedOnboarding,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SESSION_COUNT),
        AsyncStorage.getItem(STORAGE_KEYS.SIGNUP_DATE),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_SUBSCRIPTION),
        AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE),
        AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_ONBOARDING),
      ]);

      // Calculate days since signup
      const signupTimestamp = signupDate ? parseInt(signupDate, 10) : Date.now();
      const daysSinceSignup = Math.floor((Date.now() - signupTimestamp) / (1000 * 60 * 60 * 24));

      // If no signup date, set it now
      if (!signupDate) {
        await AsyncStorage.setItem(STORAGE_KEYS.SIGNUP_DATE, Date.now().toString());
      }

      const newEngagement: UserEngagement = {
        sessionCount: sessionCount ? parseInt(sessionCount, 10) : 0,
        daysSinceSignup,
        hasSubscription: hasSubscription === 'true',
        userRole: (userRole as UserRole) || UserRole.FREE,
        completedOnboarding: completedOnboarding === 'true',
      };

      setEngagement(newEngagement);

      // Initialize analytics
      analytics.setUserProperties({
        userRole: newEngagement.userRole,
        userTier: getUserTier(newEngagement),
        sessionCount: newEngagement.sessionCount,
        daysSinceSignup: newEngagement.daysSinceSignup,
        hasSubscription: newEngagement.hasSubscription,
      });
    } catch (error) {
      Logger.error('[UserEngagement] Failed to load engagement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const trackSession = async () => {
    try {
      const lastSessionDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SESSION_DATE);
      const today = new Date().toDateString();

      // Only increment if it's a new day
      if (lastSessionDate !== today) {
        await incrementSession();
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_SESSION_DATE, today);
      }

      // Track session start
      analytics.trackSessionStart();
    } catch (error) {
      Logger.error('[UserEngagement] Failed to track session:', error);
    }
  };

  const incrementSession = async () => {
    try {
      // Use functional update so concurrent mutations (e.g. completeOnboarding
      // running in the same tick) don't each serialize `engagement` and clobber
      // each other's changes.
      let latest: UserEngagement | null = null;
      setEngagement(prev => {
        latest = { ...prev, sessionCount: prev.sessionCount + 1 };
        return latest;
      });
      // Allow React to flush the state before reading `latest` for side-effects.
      const snapshot = latest ?? { ...engagement, sessionCount: engagement.sessionCount + 1 };

      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_COUNT, snapshot.sessionCount.toString());

      const newTier = getUserTier(snapshot);
      if (newTier !== getUserTier(engagement)) {
        analytics.trackTierProgression(getUserTier(engagement), newTier);
      }

      analytics.setUserProperties({
        sessionCount: snapshot.sessionCount,
        userTier: newTier,
      });

      analytics.trackEngagement('session_increment', snapshot.sessionCount);
    } catch (error) {
      Logger.error('[UserEngagement] Failed to increment session:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      setEngagement(prev => ({ ...prev, completedOnboarding: true }));
      await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_ONBOARDING, 'true');
      analytics.trackOnboarding(3, 'complete', true);
      analytics.trackEngagement('onboarding_complete');
    } catch (error) {
      Logger.error('[UserEngagement] Failed to complete onboarding:', error);
    }
  };

  const setSubscription = async (hasSubscription: boolean) => {
    try {
      // Build the next snapshot from the current `engagement` so we don't
      // lose the ability to fire analytics/AsyncStorage side-effects after
      // setState. We then both setState and use `next` for the persistence
      // work in a single atomic closure.
      const previousTier = getUserTier(engagement);
      const next: UserEngagement = {
        ...engagement,
        hasSubscription,
        userRole: hasSubscription ? UserRole.PREMIUM : UserRole.FREE,
      };

      setEngagement(prev => ({ ...prev, hasSubscription, userRole: next.userRole }));

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.HAS_SUBSCRIPTION, hasSubscription.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, next.userRole),
      ]);

      const newTier = getUserTier(next);
      if (newTier !== previousTier) {
        analytics.trackTierProgression(previousTier, newTier);
      }

      analytics.setUserProperties({
        hasSubscription,
        userRole: next.userRole,
        userTier: newTier,
      });

      if (hasSubscription) {
        analytics.trackSubscription('complete');
      }
    } catch (error) {
      Logger.error('[UserEngagement] Failed to set subscription:', error);
    }
  };

  const resetEngagement = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.SESSION_COUNT),
        AsyncStorage.removeItem(STORAGE_KEYS.SIGNUP_DATE),
        AsyncStorage.removeItem(STORAGE_KEYS.HAS_SUBSCRIPTION),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE),
        AsyncStorage.removeItem(STORAGE_KEYS.COMPLETED_ONBOARDING),
        AsyncStorage.removeItem(STORAGE_KEYS.LAST_SESSION_DATE),
      ]);

      setEngagement({
        sessionCount: 0,
        daysSinceSignup: 0,
        hasSubscription: false,
        userRole: UserRole.FREE,
        completedOnboarding: false,
      });

      analytics.track('engagement_reset');
    } catch (error) {
      Logger.error('[UserEngagement] Failed to reset engagement:', error);
    }
  };

  const currentTier = getUserTier(engagement);
  const tierProgress = getTierProgress(engagement);

  const value: UserEngagementContextType = {
    engagement,
    currentTier,
    tierProgress,
    incrementSession,
    completeOnboarding,
    setSubscription,
    resetEngagement,
    isLoading,
  };

  return (
    <UserEngagementContext.Provider value={value}>
      {children}
    </UserEngagementContext.Provider>
  );
}

export function useUserEngagement() {
  const context = useContext(UserEngagementContext);
  if (context === undefined) {
    throw new Error('useUserEngagement must be used within a UserEngagementProvider');
  }
  return context;
}

export default UserEngagementContext;
