/**
 * Feature Flags Service Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Import service after mocks
import { FeatureFlags, FeatureFlag } from '@/services/feature-flags';

describe('Feature Flags Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  describe('isEnabled', () => {
    it('should return true for enabled feature', async () => {
      const result = await FeatureFlags.isEnabled('video_calls');
      expect(result).toBe(true);
    });

    it('should return false for disabled feature', async () => {
      // ai_recommendations is disabled by default
      const result = await FeatureFlags.isEnabled('ai_recommendations');
      expect(result).toBe(false);
    });

    it('should ignore AI overrides when the AI master switch is off', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'feature_flags_override'
          ? Promise.resolve(JSON.stringify({ ai_recommendations: true }))
          : Promise.resolve(null)
      );

      const result = await FeatureFlags.isEnabled('ai_recommendations');

      expect(result).toBe(false);
    });

    it('should respect override false', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'feature_flags_override'
          ? Promise.resolve(JSON.stringify({ video_calls: false }))
          : Promise.resolve(null)
      );

      const result = await FeatureFlags.isEnabled('video_calls');

      expect(result).toBe(false);
    });

    it('should work with user ID for rollout', async () => {
      const result = await FeatureFlags.isEnabled('video_calls', 'user123');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getFlagConfig', () => {
    it('should return default config for feature', async () => {
      const config = await FeatureFlags.getFlagConfig('video_calls');
      
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('rolloutPercentage');
    });

    it('should return stored config merged with defaults', async () => {
      const storedFlags = {
        video_calls: { enabled: false, rolloutPercentage: 50 },
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedFlags));
      
      const config = await FeatureFlags.getFlagConfig('video_calls');
      
      expect(config.enabled).toBe(false);
      expect(config.rolloutPercentage).toBe(50);
    });

    it('should return default config for missing feature', async () => {
      const config = await FeatureFlags.getFlagConfig('video_calls');
      
      expect(config.enabled).toBe(true);
      expect(config.rolloutPercentage).toBe(100);
    });
  });

  describe('Override Management', () => {
    it('should set override', async () => {
      await FeatureFlags.setOverride('ai_recommendations', true);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'feature_flags_override',
        expect.stringContaining('ai_recommendations')
      );
    });

    it('should get override', async () => {
      const overrides = { ai_recommendations: true };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(overrides));
      
      const result = await FeatureFlags.getOverride('ai_recommendations');
      
      expect(result).toBe(true);
    });

    it('should return null for missing override', async () => {
      const result = await FeatureFlags.getOverride('video_calls');
      
      expect(result).toBeNull();
    });

    it('should clear override', async () => {
      const overrides = { ai_recommendations: true, video_calls: false };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(overrides));
      
      await FeatureFlags.clearOverride('ai_recommendations');
      
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should clear all overrides', async () => {
      await FeatureFlags.clearAllOverrides();
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('feature_flags_override');
    });
  });

  describe('updateFromServer', () => {
    it('should update flags from server', async () => {
      const flags = {
        video_calls: { enabled: false, rolloutPercentage: 50 },
        ai_recommendations: { enabled: true, rolloutPercentage: 100 },
      };
      
      await FeatureFlags.updateFromServer(flags);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'feature_flags',
        JSON.stringify(flags)
      );
    });
  });

  describe('getEnabledFeatures', () => {
    it('should get all enabled features', async () => {
      const enabled = await FeatureFlags.getEnabledFeatures();
      
      expect(Array.isArray(enabled)).toBe(true);
      expect(enabled.length).toBeGreaterThan(0);
    });

    it('should include video_calls in enabled features', async () => {
      const enabled = await FeatureFlags.getEnabledFeatures();
      
      expect(enabled).toContain('video_calls');
    });

    it('should not include ai_recommendations by default', async () => {
      const enabled = await FeatureFlags.getEnabledFeatures();
      
      expect(enabled).not.toContain('ai_recommendations');
    });
  });

  describe('getAllFlags', () => {
    it('should get all flags with status', async () => {
      const flags = await FeatureFlags.getAllFlags();
      
      expect(typeof flags).toBe('object');
      expect(flags['video_calls']).toBe(true);
    });

    it('should return boolean for each flag', async () => {
      const flags = await FeatureFlags.getAllFlags();
      
      for (const key of Object.keys(flags)) {
        expect(typeof flags[key as FeatureFlag]).toBe('boolean');
      }
    });
  });

  describe('hashUserId', () => {
    it('should return a number', () => {
      const hash = FeatureFlags.hashUserId('user123');
      
      expect(typeof hash).toBe('number');
    });

    it('should return consistent hash for same user', () => {
      const hash1 = FeatureFlags.hashUserId('user123');
      const hash2 = FeatureFlags.hashUserId('user123');
      
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different users', () => {
      const hash1 = FeatureFlags.hashUserId('user123');
      const hash2 = FeatureFlags.hashUserId('user456');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should return positive number', () => {
      const hash = FeatureFlags.hashUserId('user123');
      
      expect(hash).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Rollout Percentage', () => {
    it('should handle 100% rollout', async () => {
      // video_calls has 100% rollout
      const result = await FeatureFlags.isEnabled('video_calls');
      
      expect(result).toBe(true);
    });

    it('should handle partial rollout consistently', async () => {
      // Test that same user gets consistent results
      const userId = 'test_user_123';
      
      const result1 = await FeatureFlags.isEnabled('video_calls', userId);
      const result2 = await FeatureFlags.isEnabled('video_calls', userId);
      
      expect(result1).toBe(result2);
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors gracefully in isEnabled', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));
      
      // Should not throw
      const result = await FeatureFlags.isEnabled('video_calls');
      
      expect(typeof result).toBe('boolean');
    });

    it('should handle AsyncStorage errors in getFlagConfig', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));
      
      // Should not throw
      const config = await FeatureFlags.getFlagConfig('video_calls');
      
      expect(config).toHaveProperty('enabled');
    });

    it('should handle AsyncStorage errors in setOverride', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw even when AsyncStorage fails
      await expect(FeatureFlags.setOverride('video_calls', false)).resolves.not.toThrow();
    });

    it('should handle invalid JSON in overrides', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('invalid json');
      
      // Should not throw
      const result = await FeatureFlags.getOverride('video_calls');
      
      expect(result).toBeNull();
    });
  });

  describe('Feature Flag Types', () => {
    it('should support core features', async () => {
      const coreFeatures: FeatureFlag[] = [
        'video_calls',
        'live_streaming',
        'ai_chatbot',
        'community',
        'courses',
        'shop',
        'podcasts',
        'videos',
        'blog',
      ];
      
      for (const feature of coreFeatures) {
        const config = await FeatureFlags.getFlagConfig(feature);
        expect(config).toBeDefined();
      }
    });

    it('should support astrology features', async () => {
      const astrologyFeatures: FeatureFlag[] = [
        'kp_astrology',
        'jaimini_astrology',
        'ashtakvarga',
        'shadbala',
        'nadi_astrology',
        'western_astrology',
        'chinese_astrology',
        'medical_astrology',
        'financial_astrology',
        'child_astrology',
        'pet_astrology',
      ];
      
      for (const feature of astrologyFeatures) {
        const config = await FeatureFlags.getFlagConfig(feature);
        expect(config).toBeDefined();
      }
    });

    it('should support payment features', async () => {
      const paymentFeatures: FeatureFlag[] = [
        'wallet',
        'subscription',
        'gift_cards',
        'referral_program',
      ];
      
      for (const feature of paymentFeatures) {
        const config = await FeatureFlags.getFlagConfig(feature);
        expect(config).toBeDefined();
      }
    });

    it('should support experimental features', async () => {
      const experimentalFeatures: FeatureFlag[] = [
        'dark_mode',
        'hindi_language',
        'tamil_language',
        'telugu_language',
        'offline_mode',
        'push_notifications',
        'ai_recommendations',
        'social_login',
        'biometric_auth',
      ];
      
      for (const feature of experimentalFeatures) {
        const config = await FeatureFlags.getFlagConfig(feature);
        expect(config).toBeDefined();
      }
    });
  });

  describe('Multiple Overrides', () => {
    it('should handle multiple overrides', async () => {
      // Set multiple overrides
      await FeatureFlags.setOverride('ai_recommendations', true);
      await FeatureFlags.setOverride('video_calls', false);
      
      // Both should be stored
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });

    it('should preserve existing overrides when adding new one', async () => {
      const existingOverrides = { ai_recommendations: true };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingOverrides));
      
      await FeatureFlags.setOverride('video_calls', false);
      
      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const storedData = JSON.parse(setItemCall[1]);
      
      expect(storedData['ai_recommendations']).toBe(true);
      expect(storedData['video_calls']).toBe(false);
    });
  });
});
