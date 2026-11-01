/**
 * Feature Flags Service
 * 
 * Manage feature toggles for gradual rollout and A/B testing
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Logger } from '@/services/logger';
import { isAIFeaturesEnabled } from '@/config/ai-features';

// Feature flag types
export type FeatureFlag = 
  // Core features
  | 'video_calls'
  | 'live_streaming'
  | 'ai_chatbot'
  | 'community'
  | 'courses'
  | 'shop'
  | 'podcasts'
  | 'videos'
  | 'blog'
  
  // Astrology features
  | 'kp_astrology'
  | 'jaimini_astrology'
  | 'ashtakvarga'
  | 'shadbala'
  | 'nadi_astrology'
  | 'western_astrology'
  | 'chinese_astrology'
  | 'medical_astrology'
  | 'financial_astrology'
  | 'child_astrology'
  | 'pet_astrology'
  
  // Divination
  | 'tarot_reading'
  | 'numerology'
  | 'dream_interpretation'
  
  // Payment features
  | 'wallet'
  | 'subscription'
  | 'gift_cards'
  | 'referral_program'
  
  // Experimental
  | 'dark_mode'
  | 'hindi_language'
  | 'tamil_language'
  | 'telugu_language'
  | 'offline_mode'
  | 'push_notifications'
  | 'ai_recommendations'
  | 'social_login'
  | 'biometric_auth';

// Feature flag configuration
interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage: number;
  userSegments?: string[];
  minVersion?: string;
  maxVersion?: string;
  platforms?: ('ios' | 'android' | 'web')[];
  dependencies?: FeatureFlag[];
}

// Default feature flags
const DEFAULT_FLAGS: Record<FeatureFlag, FeatureFlagConfig> = {
  // Core features
  video_calls: { enabled: true, rolloutPercentage: 100 },
  live_streaming: { enabled: true, rolloutPercentage: 100 },
  ai_chatbot: { enabled: true, rolloutPercentage: 100 },
  community: { enabled: true, rolloutPercentage: 100 },
  // Courses UI is a stub with no purchase/entitlement flow; hidden for v1.
  courses: { enabled: false, rolloutPercentage: 0 },
  shop: { enabled: true, rolloutPercentage: 100 },
  podcasts: { enabled: true, rolloutPercentage: 100 },
  videos: { enabled: true, rolloutPercentage: 100 },
  blog: { enabled: true, rolloutPercentage: 100 },
  
  // Astrology features
  kp_astrology: { enabled: true, rolloutPercentage: 100 },
  jaimini_astrology: { enabled: true, rolloutPercentage: 100 },
  ashtakvarga: { enabled: true, rolloutPercentage: 100 },
  shadbala: { enabled: true, rolloutPercentage: 100 },
  nadi_astrology: { enabled: true, rolloutPercentage: 100 },
  western_astrology: { enabled: true, rolloutPercentage: 100 },
  chinese_astrology: { enabled: true, rolloutPercentage: 100 },
  medical_astrology: { enabled: true, rolloutPercentage: 100 },
  financial_astrology: { enabled: true, rolloutPercentage: 100 },
  child_astrology: { enabled: true, rolloutPercentage: 100 },
  pet_astrology: { enabled: true, rolloutPercentage: 100 },
  
  // Divination
  tarot_reading: { enabled: true, rolloutPercentage: 100 },
  numerology: { enabled: true, rolloutPercentage: 100 },
  dream_interpretation: { enabled: true, rolloutPercentage: 100 },
  
  // Payment features
  wallet: { enabled: true, rolloutPercentage: 100 },
  subscription: { enabled: true, rolloutPercentage: 100 },
  // Gift-card issuance/redemption is not implemented; hidden for v1.
  gift_cards: { enabled: false, rolloutPercentage: 0 },
  referral_program: { enabled: true, rolloutPercentage: 100 },
  
  // Experimental
  dark_mode: { enabled: true, rolloutPercentage: 100 },
  hindi_language: { enabled: true, rolloutPercentage: 100 },
  tamil_language: { enabled: true, rolloutPercentage: 100 },
  telugu_language: { enabled: true, rolloutPercentage: 100 },
  offline_mode: { enabled: true, rolloutPercentage: 100 },
  push_notifications: { enabled: true, rolloutPercentage: 100 },
  ai_recommendations: { enabled: false, rolloutPercentage: 50 },
  social_login: { enabled: true, rolloutPercentage: 100 },
  biometric_auth: { enabled: true, rolloutPercentage: 100 },
};

// Storage key
const STORAGE_KEY = 'feature_flags';
const OVERRIDE_KEY = 'feature_flags_override';

// Feature flags service
export const FeatureFlags = {
  /**
   * Check if a feature is enabled
   */
  async isEnabled(flag: FeatureFlag, userId?: string): Promise<boolean> {
    // AI surfaces are hard-off in builds without the master switch, even if
    // a stale local override or old env flag says otherwise.
    if ((flag === 'ai_chatbot' || flag === 'ai_recommendations') && !isAIFeaturesEnabled()) {
      return false;
    }

    // Check for local override first
    const override = await this.getOverride(flag);
    if (override !== null) {
      return override;
    }
    
    // Get flag config
    const config = await this.getFlagConfig(flag);
    
    // Check if globally disabled
    if (!config.enabled) {
      return false;
    }
    
    // Check platform
    if (config.platforms) {
      const platform = this.getPlatform();
      if (!config.platforms.includes(platform)) {
        return false;
      }
    }
    
    // Check dependencies
    if (config.dependencies) {
      for (const dep of config.dependencies) {
        const depEnabled = await this.isEnabled(dep, userId);
        if (!depEnabled) {
          return false;
        }
      }
    }
    
    // Check rollout percentage
    if (config.rolloutPercentage < 100) {
      const hash = this.hashUserId(userId || 'anonymous');
      const userPercentage = (hash % 100) + 1;
      return userPercentage <= config.rolloutPercentage;
    }
    
    return true;
  },

  /**
   * Get flag configuration
   */
  async getFlagConfig(flag: FeatureFlag): Promise<FeatureFlagConfig> {
    const base = DEFAULT_FLAGS[flag] || { enabled: false, rolloutPercentage: 0 };

    if ((flag === 'ai_chatbot' || flag === 'ai_recommendations') && !isAIFeaturesEnabled()) {
      return { ...base, enabled: false };
    }

    const envKey1 = `EXPO_PUBLIC_ENABLE_${flag.toUpperCase()}`;
    const envKey2 = `EXPO_PUBLIC_${flag.toUpperCase()}`;
    const envVal = process.env[envKey1] ?? process.env[envKey2];
    let envEnabled = base.enabled;
    if (envVal === 'false' || envVal === '0') {
      envEnabled = false;
    } else if (envVal === 'true' || envVal === '1') {
      envEnabled = true;
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const flags = JSON.parse(stored);
        if (flags[flag]) {
          return { ...base, enabled: envEnabled, ...flags[flag] };
        }
      }
    } catch (error) {
      Logger.error('[FeatureFlags] Failed to get flag config:', error);
    }
    
    return { ...base, enabled: envEnabled };
  },

  /**
   * Get local override
   */
  async getOverride(flag: FeatureFlag): Promise<boolean | null> {
    try {
      const stored = await AsyncStorage.getItem(OVERRIDE_KEY);
      if (stored) {
        const overrides = JSON.parse(stored);
        return overrides[flag] ?? null;
      }
    } catch (error) {
      Logger.error('[FeatureFlags] Failed to get override:', error);
    }
    
    return null;
  },

  /**
   * Set local override (for testing)
   */
  async setOverride(flag: FeatureFlag, enabled: boolean): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(OVERRIDE_KEY);
      const overrides = stored ? JSON.parse(stored) : {};
      overrides[flag] = enabled;
      await AsyncStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides));
    } catch (error) {
      Logger.error('[FeatureFlags] Failed to set override:', error);
    }
  },

  /**
   * Clear local override
   */
  async clearOverride(flag: FeatureFlag): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(OVERRIDE_KEY);
      if (stored) {
        const overrides = JSON.parse(stored);
        delete overrides[flag];
        await AsyncStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides));
      }
    } catch (error) {
      Logger.error('[FeatureFlags] Failed to clear override:', error);
    }
  },

  /**
   * Clear all overrides
   */
  async clearAllOverrides(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OVERRIDE_KEY);
    } catch (error) {
      Logger.error('[FeatureFlags] Failed to clear all overrides:', error);
    }
  },

  /**
   * Update flags from server
   */
  async updateFromServer(flags: Partial<Record<FeatureFlag, FeatureFlagConfig>>): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch (error) {
      Logger.error('[FeatureFlags] Failed to update from server:', error);
    }
  },

  /**
   * Get all enabled features
   */
  async getEnabledFeatures(userId?: string): Promise<FeatureFlag[]> {
    const enabled: FeatureFlag[] = [];
    
    for (const flag of Object.keys(DEFAULT_FLAGS) as FeatureFlag[]) {
      const isEnabled = await this.isEnabled(flag, userId);
      if (isEnabled) {
        enabled.push(flag);
      }
    }
    
    return enabled;
  },

  /**
   * Get all flags with status
   */
  async getAllFlags(userId?: string): Promise<Record<FeatureFlag, boolean>> {
    const result: Record<FeatureFlag, boolean> = {} as Record<FeatureFlag, boolean>;
    
    for (const flag of Object.keys(DEFAULT_FLAGS) as FeatureFlag[]) {
      result[flag] = await this.isEnabled(flag, userId);
    }
    
    return result;
  },

  /**
   * Hash user ID for consistent rollout
   */
  hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  },

  /**
   * Get current platform
   */
  getPlatform(): 'ios' | 'android' | 'web' {
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
    return 'web';
  },
};

// React hook for feature flags
export function useFeatureFlag(flag: FeatureFlag, userId?: string): {
  isEnabled: boolean;
  isLoading: boolean;
} {
  const [isEnabled, setIsEnabled] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    const checkFlag = async () => {
      try {
        const enabled = await FeatureFlags.isEnabled(flag, userId);
        if (mounted) {
          setIsEnabled(enabled);
          setIsLoading(false);
        }
      } catch (error) {
        Logger.error('[FeatureFlags] Error checking flag:', error);
        if (mounted) {
          setIsEnabled(false);
          setIsLoading(false);
        }
      }
    };

    checkFlag();

    return () => {
      mounted = false;
    };
  }, [flag, userId]);

  return { isEnabled, isLoading };
}

// HOC for feature-gated components
export function withFeatureFlag<P extends object>(
  flag: FeatureFlag,
  FallbackComponent?: React.ComponentType<P>
) {
  return function (WrappedComponent: React.ComponentType<P>) {
    return function FeatureGatedComponent(props: P) {
      const { isEnabled, isLoading } = useFeatureFlag(flag);

      if (isLoading) {
        return null;
      }

      if (!isEnabled) {
        if (FallbackComponent) {
          return React.createElement(FallbackComponent, props);
        }
        return null;
      }

      return React.createElement(WrappedComponent, props);
    };
  };
}

export default FeatureFlags;
