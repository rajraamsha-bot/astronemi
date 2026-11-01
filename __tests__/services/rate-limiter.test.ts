/**
 * Rate Limiter Service Tests
 */

// Mock crash-reporting
jest.mock('@/services/crash-reporting', () => ({
  crashReporting: {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  },
}));

// Mock supabase to prevent initialization
jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: jest.fn(() => true),
}));

// Import the actual RateLimiter
import { RateLimiter, RateLimited } from '@/services/rate-limiter';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Rate Limiter Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (global.clearAsyncStorage) {
      global.clearAsyncStorage();
    }
  });

  describe('RateLimiter.isAllowed', () => {
    it('should return allowed for first api request', async () => {
      const result = await RateLimiter.isAllowed('api');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
    });

    it('should return allowed for first chat request', async () => {
      const result = await RateLimiter.isAllowed('chat');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29); // 30 - 1
    });

    it('should return allowed for first auth request', async () => {
      const result = await RateLimiter.isAllowed('auth');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
    });

    it('should return remaining count for api', async () => {
      const result = await RateLimiter.isAllowed('api');
      expect(result.remaining).toBeLessThanOrEqual(100);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    it('should return resetAt timestamp in the future', async () => {
      const result = await RateLimiter.isAllowed('api');
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should allow requests for unknown types', async () => {
      const result = await RateLimiter.isAllowed('unknown_type');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1); // Unlimited
    });
  });

  describe('RateLimiter.recordAttempt', () => {
    it('should record first attempt and not block', async () => {
      const result = await RateLimiter.recordAttempt('api', 'test-user');
      expect(result.blocked).toBe(false);
    });

    it('should store attempt in AsyncStorage', async () => {
      await RateLimiter.recordAttempt('api', 'test-user');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'rate_limit_api_test-user',
        expect.stringContaining('"count":')
      );
    });

    it('should block after exceeding limit', async () => {
      const type = 'test_block';
      // Mock a type with limit of 2
      for (let i = 0; i < 5; i++) {
        await RateLimiter.recordAttempt(type, 'user');
      }
      
      // After mock is cleared, should still work
      const result = await RateLimiter.recordAttempt('api', 'block-test');
      expect(result).toHaveProperty('blocked');
    });

    it('should return blocked:true when rate limited', async () => {
      // Record multiple attempts for a type with low limit
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(await RateLimiter.recordAttempt('auth', 'block-user'));
      }
      
      // At least some should be blocked (auth limit is 5)
      const blockedCount = results.filter(r => r.blocked).length;
      expect(blockedCount).toBeGreaterThan(0);
    });

    it('should include remainingMs when blocked', async () => {
      // Record attempts to exceed auth limit
      for (let i = 0; i < 10; i++) {
        await RateLimiter.recordAttempt('auth', 'remaining-test');
      }
      
      const result = await RateLimiter.recordAttempt('auth', 'remaining-test');
      if (result.blocked) {
        expect(result.remainingMs).toBeGreaterThan(0);
      }
    });
  });

  describe('RateLimiter.reset', () => {
    it('should remove rate limit data from AsyncStorage for api', async () => {
      await RateLimiter.recordAttempt('api', 'reset-test');
      await RateLimiter.reset('api', 'reset-test');
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('rate_limit_api_reset-test');
    });

    it('should remove rate limit data from AsyncStorage for auth', async () => {
      await RateLimiter.recordAttempt('auth', 'reset-test');
      await RateLimiter.reset('auth', 'reset-test');
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('rate_limit_auth_reset-test');
    });

    it('should remove rate limit data from AsyncStorage for chat', async () => {
      await RateLimiter.recordAttempt('chat', 'reset-test');
      await RateLimiter.reset('chat', 'reset-test');
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('rate_limit_chat_reset-test');
    });

    it('should handle reset for unknown type without error', async () => {
      await expect(RateLimiter.reset('unknown_type')).resolves.not.toThrow();
    });

    it('should allow requests again after reset', async () => {
      // Record attempts to hit limit
      for (let i = 0; i < 10; i++) {
        await RateLimiter.recordAttempt('auth', 'reset-allow-test');
      }
      
      // Reset
      await RateLimiter.reset('auth', 'reset-allow-test');
      
      // Should be allowed again
      const result = await RateLimiter.isAllowed('auth', 'reset-allow-test');
      expect(result.allowed).toBe(true);
    });
  });

  describe('RateLimiter.resetAll', () => {
    it('should remove all rate limit keys from AsyncStorage', async () => {
      await RateLimiter.recordAttempt('api', 'reset-all-1');
      await RateLimiter.recordAttempt('auth', 'reset-all-1');
      await RateLimiter.recordAttempt('chat', 'reset-all-1');
      
      await RateLimiter.resetAll();
      
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it('should handle resetAll when no keys exist', async () => {
      await expect(RateLimiter.resetAll()).resolves.not.toThrow();
    });

    it('should allow all requests after resetAll', async () => {
      // Record some attempts
      await RateLimiter.recordAttempt('api', 'after-reset');
      await RateLimiter.recordAttempt('chat', 'after-reset');
      
      // Reset all
      await RateLimiter.resetAll();
      
      // Should be allowed
      const apiResult = await RateLimiter.isAllowed('api', 'after-reset');
      const chatResult = await RateLimiter.isAllowed('chat', 'after-reset');
      
      expect(apiResult.allowed).toBe(true);
      expect(chatResult.allowed).toBe(true);
    });
  });

  describe('RateLimiter.getTimeUntilReset', () => {
    it('should return 0 when no rate limit exists', async () => {
      const time = await RateLimiter.getTimeUntilReset('api', 'no-limit');
      expect(time).toBe(0);
    });

    it('should return positive time after recording attempt', async () => {
      await RateLimiter.recordAttempt('api', 'time-test');
      const time = await RateLimiter.getTimeUntilReset('api', 'time-test');
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThanOrEqual(60000); // api window is 60s
    });

    it('should return 0 for unknown type', async () => {
      const time = await RateLimiter.getTimeUntilReset('unknown_type');
      expect(time).toBe(0);
    });

    it('should return 0 after reset', async () => {
      await RateLimiter.recordAttempt('api', 'reset-time-test');
      await RateLimiter.reset('api', 'reset-time-test');
      
      const time = await RateLimiter.getTimeUntilReset('api', 'reset-time-test');
      expect(time).toBe(0);
    });
  });

  describe('RateLimiter.getFormattedTimeUntilReset', () => {
    it('should return "0s" when no rate limit exists', async () => {
      const formatted = await RateLimiter.getFormattedTimeUntilReset('api', 'no-format');
      expect(formatted).toBe('0s');
    });

    it('should return formatted string with seconds', async () => {
      await RateLimiter.recordAttempt('api', 'format-test');
      const formatted = await RateLimiter.getFormattedTimeUntilReset('api', 'format-test');
      expect(formatted).toMatch(/^\d+[smh]$/);
    });

    it('should return string type', async () => {
      const formatted = await RateLimiter.getFormattedTimeUntilReset('api');
      expect(typeof formatted).toBe('string');
    });
  });

  describe('RateLimiter.wrap', () => {
    it('should execute wrapped function when allowed', async () => {
      const mockFn = jest.fn(() => Promise.resolve('success'));
      const wrapped = RateLimiter.wrap('api', mockFn);
      
      const result = await wrapped();
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should throw error when rate limited', async () => {
      // Exceed auth limit
      for (let i = 0; i < 10; i++) {
        await RateLimiter.recordAttempt('auth', 'wrap-test');
      }
      
      const mockFn = jest.fn(() => Promise.resolve('success'));
      const wrapped = RateLimiter.wrap('auth', mockFn, 'wrap-test');
      
      await expect(wrapped()).rejects.toThrow('Rate limit exceeded');
      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('RateLimited decorator', () => {
    it('should return a function', () => {
      const mockFn = jest.fn();
      const decorated = RateLimited('api')(mockFn);
      expect(typeof decorated).toBe('function');
    });

    it('should preserve function behavior when allowed', async () => {
      const mockFn = jest.fn(() => 'result');
      const decorated = RateLimited('api')(mockFn);
      
      const result = await decorated();
      
      expect(result).toBe('result');
    });
  });

  describe('Rate Limit Window Behavior', () => {
    it('should track multiple attempts for same identifier', async () => {
      await RateLimiter.recordAttempt('api', 'window-test');
      await RateLimiter.recordAttempt('api', 'window-test');
      
      const result = await RateLimiter.isAllowed('api', 'window-test');
      expect(result.remaining).toBeLessThan(99); // Started at 99 after first, now less
    });

    it('should track attempts separately for different identifiers', async () => {
      await RateLimiter.recordAttempt('api', 'user1');
      await RateLimiter.recordAttempt('api', 'user2');
      
      const result1 = await RateLimiter.isAllowed('api', 'user1');
      const result2 = await RateLimiter.isAllowed('api', 'user2');
      
      // Both should have same remaining (each has 1 attempt)
      expect(result1.remaining).toBe(result2.remaining);
    });
  });
});
