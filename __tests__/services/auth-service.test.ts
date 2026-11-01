/**
 * Auth Service Tests
 *
 * Tests OTP flow, device binding, rate limiting, and Supabase integration.
 */

import { authService } from '@/services/auth-service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { secureStorage } from '@/services/secure-storage';

// Mock dependencies
jest.mock('@/services/secure-storage');
jest.mock('@/services/rate-limiter', () => ({
  RateLimiter: {
    checkRateLimit: jest.fn().mockResolvedValue({ isLimited: false }),
    recordAttempt: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    (secureStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.getItem as jest.Mock).mockResolvedValue(null);
    (secureStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('validatePhoneNumber', () => {
    it('should accept valid 10-digit numbers', () => {
      expect(authService.validatePhoneNumber('9876543210')).toEqual({ valid: true });
      expect(authService.validatePhoneNumber('7000000000')).toEqual({ valid: true });
    });

    it('should reject non-10-digit numbers', () => {
      expect(authService.validatePhoneNumber('12345')).toEqual({
        valid: false,
        message: 'Please enter a valid 10-digit mobile number',
      });
    });

    it('should reject alphabetic input', () => {
      expect(authService.validatePhoneNumber('abcdefghij')).toEqual({
        valid: false,
        message: 'Please enter a valid 10-digit mobile number',
      });
    });
  });

  describe('sendOTP', () => {
    it('should return error for invalid phone', async () => {
      const result = await authService.sendOTP('123');
      expect(result.success).toBe(false);
      expect(result.message).toContain('valid 10-digit');
    });

    it('should return error when rate limited', async () => {
      const { RateLimiter } = require('@/services/rate-limiter');
      RateLimiter.checkRateLimit.mockResolvedValueOnce({ isLimited: true });
      const result = await authService.sendOTP('9876543210');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Too many');
    });

    it('should send OTP via Supabase when configured', async () => {
      const mockSignInWithOtp = jest.fn().mockResolvedValue({ error: null });
      (supabase.auth.signInWithOtp as jest.Mock) = mockSignInWithOtp;

      const result = await authService.sendOTP('9876543210');
      expect(result.success).toBe(true);
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        phone: '+919876543210',
        options: { channel: 'sms' },
      });
    });

    it('should handle Supabase errors gracefully', async () => {
      const mockSignInWithOtp = jest.fn().mockResolvedValue({
        error: new Error('SMS provider down'),
      });
      (supabase.auth.signInWithOtp as jest.Mock) = mockSignInWithOtp;

      const result = await authService.sendOTP('9876543210');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to send OTP');
    });
  });

  describe('verifyOTP', () => {
    it('should reject when rate limited', async () => {
      const { RateLimiter } = require('@/services/rate-limiter');
      RateLimiter.checkRateLimit.mockResolvedValueOnce({ isLimited: true });
      const result = await authService.verifyOTP('9876543210', '123456');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Too many');
    });

    it('should verify OTP via Supabase and create user', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: [{ success: true }], error: null });
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { session: { access_token: 'token123' }, user: { id: 'user-123' } },
        error: null,
      });

      const result = await authService.verifyOTP('9876543210', '123456');
      expect(result.success).toBe(true);
      expect(result.session).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.phone).toBe('9876543210');
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        'supabase_session',
        expect.any(String)
      );
    });

    it('should reject invalid OTP', async () => {
      const mockVerifyOtp = jest.fn().mockResolvedValue({
        data: { session: null },
        error: new Error('Invalid token'),
      });
      (supabase.auth.verifyOtp as jest.Mock) = mockVerifyOtp;

      const result = await authService.verifyOTP('9876543210', '000000');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid OTP');
    });
  });

  describe('bindDevice', () => {
    it('should call bind_device RPC and succeed', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [{ success: true, message: 'Device bound', device_count: 1 }],
        error: null,
      });
      const result = await authService.bindDevice('user-1', 'device-1');
      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('bind_device', {
        p_device_id: 'device-1',
        p_device_name: 'ios - 16.0',
        p_os: 'ios',
      });
    });

    it('should forward server device-limit rejection', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [{ success: false, message: 'Device limit exceeded. Please revoke a device first.', device_count: 2 }],
        error: null,
      });
      const result = await authService.bindDevice('user-1', 'device-3');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Device limit exceeded');
    });

    it('should fail when the RPC errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'boom' } });
      const result = await authService.bindDevice('user-1', 'device-1');
      expect(result.success).toBe(false);
    });

    it('should fail when the RPC returns no row', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null });
      const result = await authService.bindDevice('user-1', 'device-1');
      expect(result.success).toBe(false);
    });
  });

  describe('revokeDevice', () => {
    it('should call revoke_device RPC and succeed', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [{ success: true, message: 'Device revoked' }],
        error: null,
      });
      const result = await authService.revokeDevice('device-1');
      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('revoke_device', { p_device_id: 'device-1' });
    });

    it('should return failure when the device is not found', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [{ success: false, message: 'Device not found' }],
        error: null,
      });
      const result = await authService.revokeDevice('device-99');
      expect(result.success).toBe(false);
    });
  });

  describe('listDevices', () => {
    it('should return active devices', async () => {
      const rows = [
        { device_id: 'device-1', device_name: 'ios - 16.0', os: 'ios', bound_at: '2026-01-01T00:00:00Z', last_seen_at: null },
      ];
      const chain: any = {
        select: jest.fn(() => chain),
        is: jest.fn(() => chain),
        order: jest.fn(() => chain),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: rows, error: null }).then(resolve),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);
      const result = await authService.listDevices();
      expect(result).toHaveLength(1);
      expect(result[0].device_id).toBe('device-1');
    });
  });

  describe('logout', () => {
    it('should clear all auth data', async () => {
      await authService.logout();
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(secureStorage.removeItem).toHaveBeenCalledWith('supabase_session');
      expect(secureStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('generateReferralCode', () => {
    it('should generate 8-character code', () => {
      const code = authService.generateReferralCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(authService.generateReferralCode());
      }
      expect(codes.size).toBe(100);
    });
  });

  describe('applyReferralCode', () => {
    it('returns the server balance on success', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: 'ok', new_balance: 600 },
        error: null,
      });
      const result = await authService.applyReferralCode('user-1', 'FRIEND42');
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(600);
    });

    it('maps an RPC failure to a friendly failure', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: new Error('invalid code'),
      });
      const result = await authService.applyReferralCode('user-1', 'NOPE');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to apply referral code');
    });

    it('surfaces the server rejection message', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: false, message: 'Code already used' },
        error: null,
      });
      const result = await authService.applyReferralCode('user-1', 'USED12');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Code already used');
    });

    it('fails closed when Supabase is unconfigured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValueOnce(false);
      const result = await authService.applyReferralCode('user-1', 'FRIEND42');
      expect(result.success).toBe(false);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('createOrFetchUser', () => {
    // The HIGH-2-era bug this pins: the old upsert reset wallet_balance to 0
    // on every login from a fresh install, wiping real money.
    const chainExisting = (existing: unknown, insertError: unknown = null) => {
      const insert = jest.fn(() => Promise.resolve({ error: insertError }));
      const maybeSingle = jest.fn(() => Promise.resolve({ data: existing, error: null }));
      const eq = jest.fn(() => ({ maybeSingle }));
      const select = jest.fn(() => ({ eq }));
      (supabase.from as jest.Mock).mockImplementation((table: string) =>
        table === 'users' ? { select, insert } : {}
      );
      return { insert };
    };

    it('inserts a profile row for a first-time auth user', async () => {
      const { insert } = chainExisting(null);
      const user = await authService.createOrFetchUser('9876500000', 'auth-uuid-1');
      expect(user.id).toBe('auth-uuid-1');
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'auth-uuid-1', phone: '9876500000' })
      );
    });

    it('never rewrites an existing profile row (no balance/profile wipe)', async () => {
      const { insert } = chainExisting({ id: 'auth-uuid-1' });
      const user = await authService.createOrFetchUser('9876500000', 'auth-uuid-1');
      expect(insert).not.toHaveBeenCalled();
      expect(user.walletBalance).toBe(0);
    });

    it('resolves even when the insert fails (error is logged, not thrown)', async () => {
      chainExisting(null, new Error('RLS violation'));
      const user = await authService.createOrFetchUser('9876500000', 'auth-uuid-2');
      expect(user.id).toBe('auth-uuid-2');
    });
  });

  describe('_getDeviceCountryCode', () => {
    const originalEnv = process.env;
    const originalDateTimeFormat = Intl.DateTimeFormat;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
      Intl.DateTimeFormat = originalDateTimeFormat;
    });

    it('should return env var if defined', () => {
      process.env.EXPO_PUBLIC_COUNTRY_CODE = '+44';
      const { _getDeviceCountryCode } = require('@/services/auth-service');
      expect(_getDeviceCountryCode()).toBe('+44');
    });

    it('should return +91 for Asia/Kolkata timezone', () => {
      delete process.env.EXPO_PUBLIC_COUNTRY_CODE;
      const mockResolvedOptions = jest.fn().mockReturnValue({ timeZone: 'Asia/Kolkata' });
      Intl.DateTimeFormat = jest.fn().mockImplementation(() => ({
        resolvedOptions: mockResolvedOptions,
      })) as any;

      const { _getDeviceCountryCode } = require('@/services/auth-service');
      expect(_getDeviceCountryCode()).toBe('+91');
    });

    it('should return +1 for America/New_York timezone', () => {
      delete process.env.EXPO_PUBLIC_COUNTRY_CODE;
      const mockResolvedOptions = jest.fn().mockReturnValue({ timeZone: 'America/New_York' });
      Intl.DateTimeFormat = jest.fn().mockImplementation(() => ({
        resolvedOptions: mockResolvedOptions,
      })) as any;

      const { _getDeviceCountryCode } = require('@/services/auth-service');
      expect(_getDeviceCountryCode()).toBe('+1');
    });

    it('should return +44 for Europe/London timezone', () => {
      delete process.env.EXPO_PUBLIC_COUNTRY_CODE;
      const mockResolvedOptions = jest.fn().mockReturnValue({ timeZone: 'Europe/London' });
      Intl.DateTimeFormat = jest.fn().mockImplementation(() => ({
        resolvedOptions: mockResolvedOptions,
      })) as any;

      const { _getDeviceCountryCode } = require('@/services/auth-service');
      expect(_getDeviceCountryCode()).toBe('+44');
    });

    it('should return +61 for Australia/Sydney timezone', () => {
      delete process.env.EXPO_PUBLIC_COUNTRY_CODE;
      const mockResolvedOptions = jest.fn().mockReturnValue({ timeZone: 'Australia/Sydney' });
      Intl.DateTimeFormat = jest.fn().mockImplementation(() => ({
        resolvedOptions: mockResolvedOptions,
      })) as any;

      const { _getDeviceCountryCode } = require('@/services/auth-service');
      expect(_getDeviceCountryCode()).toBe('+61');
    });

    it('should fallback to +91 on error or unknown timezone', () => {
      delete process.env.EXPO_PUBLIC_COUNTRY_CODE;
      Intl.DateTimeFormat = jest.fn().mockImplementation(() => {
        throw new Error('Intl error');
      }) as any;

      const { _getDeviceCountryCode } = require('@/services/auth-service');
      expect(_getDeviceCountryCode()).toBe('+91');
    });
  });
});
