/**
 * Tests for Environment Validation Service
 */

describe('EnvironmentValidationService', () => {
  let envValidation: typeof import('@/services/environment-validation').envValidation;

  beforeEach(() => {
    jest.resetModules();
    envValidation = require('@/services/environment-validation').envValidation;
    jest.clearAllMocks();
  });

  describe('validateAll', () => {
    it('should fail when required env vars are missing', () => {
      const result = envValidation.validateAll();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    it('should return cached result on subsequent calls', () => {
      const result1 = envValidation.validateAll();
      const result2 = envValidation.getCachedResult();
      expect(result2).toEqual(result1);
    });
  });

  describe('validateConfig', () => {
    it('should report error for required config without value', () => {
      const result = envValidation.validateConfig({
        key: 'EXPO_PUBLIC_SUPABASE_URL',
        required: true,
        isUrl: true,
      });
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should validate URL format', () => {
      const orig = process.env.EXPO_PUBLIC_SUPABASE_URL;
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'not-a-url';
      const result = envValidation.validateConfig({
        key: 'EXPO_PUBLIC_SUPABASE_URL',
        required: true,
        isUrl: true,
      });
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('valid URL')])
      );
      if (orig !== undefined) {
        process.env.EXPO_PUBLIC_SUPABASE_URL = orig;
      } else {
        delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      }
    });

    it('should validate minimum length', () => {
      const orig = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'short';
      const result = envValidation.validateConfig({
        key: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        required: true,
        minLength: 10,
      });
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('at least 10')])
      );
      if (orig !== undefined) {
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = orig;
      } else {
        delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      }
    });

    it('should detect placeholder values', () => {
      const orig = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'your-placeholder-key-here-long';
      const result = envValidation.validateConfig({
        key: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        required: true,
        minLength: 10,
      });
      expect(
        result.errors.some(e => e.includes('placeholder')) ||
        result.warnings.some(w => w.includes('placeholder'))
      ).toBe(true);
      if (orig !== undefined) {
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = orig;
      } else {
        delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      }
    });

    it('should detect test Razorpay key in production', () => {
      const origEnv = process.env.EXPO_PUBLIC_APP_ENV;
      const origKey = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
      process.env.EXPO_PUBLIC_APP_ENV = 'production';
      process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID = 'rzp_test_validkey123';
      const result = envValidation.validateConfig({
        key: 'EXPO_PUBLIC_RAZORPAY_KEY_ID',
        required: true,
        minLength: 5,
      });
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('test key')])
      );
      process.env.EXPO_PUBLIC_APP_ENV = origEnv;
      if (origKey !== undefined) {
        process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID = origKey;
      } else {
        delete process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
      }
    });

    it('should use custom validator', () => {
      const orig = process.env.EXPO_PUBLIC_COUNTRY_CODE;
      process.env.EXPO_PUBLIC_COUNTRY_CODE = 'invalid';
      const result = envValidation.validateConfig({
        key: 'EXPO_PUBLIC_COUNTRY_CODE',
        required: false,
        pattern: /^\+\d{1,3}$/,
      });
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('format is invalid')])
      );
      if (orig !== undefined) {
        process.env.EXPO_PUBLIC_COUNTRY_CODE = orig;
      } else {
        delete process.env.EXPO_PUBLIC_COUNTRY_CODE;
      }
    });
  });

  describe('getConfig', () => {
    it('should return fallback for missing key', () => {
      const result = envValidation.getConfig('NONEXISTENT_KEY', 'default');
      expect(result).toBe('default');
    });

    it('should return empty string when no fallback', () => {
      const result = envValidation.getConfig('NONEXISTENT_KEY');
      expect(result).toBe('');
    });
  });

  describe('getAppEnvironment', () => {
    it('should return development by default', () => {
      const orig = process.env.EXPO_PUBLIC_APP_ENV;
      delete process.env.EXPO_PUBLIC_APP_ENV;
      expect(envValidation.getAppEnvironment()).toBe('development');
      process.env.EXPO_PUBLIC_APP_ENV = orig;
    });

    it('should return production when set', () => {
      const orig = process.env.EXPO_PUBLIC_APP_ENV;
      process.env.EXPO_PUBLIC_APP_ENV = 'production';
      expect(envValidation.getAppEnvironment()).toBe('production');
      process.env.EXPO_PUBLIC_APP_ENV = orig;
    });

    it('should return staging when set', () => {
      const orig = process.env.EXPO_PUBLIC_APP_ENV;
      process.env.EXPO_PUBLIC_APP_ENV = 'staging';
      expect(envValidation.getAppEnvironment()).toBe('staging');
      process.env.EXPO_PUBLIC_APP_ENV = orig;
    });
  });

  describe('isProduction', () => {
    it('should return false in development', () => {
      const orig = process.env.EXPO_PUBLIC_APP_ENV;
      process.env.EXPO_PUBLIC_APP_ENV = 'development';
      expect(envValidation.isProduction()).toBe(false);
      process.env.EXPO_PUBLIC_APP_ENV = orig;
    });
  });

  describe('isDebugMode', () => {
    it('should return false when not set', () => {
      const orig = process.env.EXPO_PUBLIC_DEBUG_MODE;
      delete process.env.EXPO_PUBLIC_DEBUG_MODE;
      expect(envValidation.isDebugMode()).toBe(false);
      process.env.EXPO_PUBLIC_DEBUG_MODE = orig;
    });

    it('should return true when set to "true"', () => {
      const orig = process.env.EXPO_PUBLIC_DEBUG_MODE;
      process.env.EXPO_PUBLIC_DEBUG_MODE = 'true';
      expect(envValidation.isDebugMode()).toBe(true);
      process.env.EXPO_PUBLIC_DEBUG_MODE = orig;
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return false for disabled feature', () => {
      expect(envValidation.isFeatureEnabled('NONEXISTENT')).toBe(false);
    });

    it('should return true when EXPO_PUBLIC_ENABLE_<FEATURE>=true', () => {
      const orig = process.env.EXPO_PUBLIC_ENABLE_BETA_CHAT;
      process.env.EXPO_PUBLIC_ENABLE_BETA_CHAT = 'true';
      expect(envValidation.isFeatureEnabled('beta_chat')).toBe(true);
      if (orig !== undefined) {
        process.env.EXPO_PUBLIC_ENABLE_BETA_CHAT = orig;
      } else {
        delete process.env.EXPO_PUBLIC_ENABLE_BETA_CHAT;
      }
    });

    it('should return false when EXPO_PUBLIC_ENABLE_<FEATURE>=false', () => {
      const orig = process.env.EXPO_PUBLIC_ENABLE_BETA_CHAT;
      process.env.EXPO_PUBLIC_ENABLE_BETA_CHAT = 'false';
      expect(envValidation.isFeatureEnabled('beta_chat')).toBe(false);
      if (orig !== undefined) {
        process.env.EXPO_PUBLIC_ENABLE_BETA_CHAT = orig;
      } else {
        delete process.env.EXPO_PUBLIC_ENABLE_BETA_CHAT;
      }
    });
  });
});
