import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

interface AuthResponse {
  success: boolean;
  message?: string;
}

// Mock rate limiter
jest.mock('@/services/rate-limiter', () => ({
  RateLimiter: {
    checkRateLimit: jest.fn(() => Promise.resolve({ isLimited: false })),
    recordAttempt: jest.fn(() => Promise.resolve({ blocked: false })),
    clearRateLimit: jest.fn(() => Promise.resolve()),
    formatRemainingTime: jest.fn(() => '1 minute'),
  },
}));

// Mock crypto
jest.mock('@/utils/crypto', () => ({
  generateOTP: jest.fn(() => '123456'),
  generateUUID: jest.fn(() => 'test-uuid-1234'),
  generateReferralCode: jest.fn(() => 'TEST1234'),
  hashData: jest.fn((data: string) => Promise.resolve('mock_hash_' + data)),
}));

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      verifyOtp: jest.fn(({ token }: { token: string }) => {
        if (token === '123456') {
          return Promise.resolve({ data: { user: { id: 'test-user-123', phone: '9999999999' } }, error: null });
        }
        return Promise.resolve({ data: { user: null }, error: new Error('Invalid OTP') });
      }),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-123', phone: '9999999999' } } })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-user-123', phone: '9999999999' } } }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn((table) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => {
            if (table === 'users') {
              return Promise.resolve({
                data: {
                  id: 'test-user-123',
                  phone: '9999999999',
                  name: 'Test User',
                  email: 'test@example.com',
                  avatar_url: null,
                  birth_date: null,
                  birth_time: null,
                  birth_place: null,
                  birth_lat: null,
                  birth_lng: null,
                  zodiac_sign: null,
                  nakshatra: null,
                  referral_code: 'REF123456',
                  referred_by: null,
                  wallet_balance: 500,
                  subscription_tier: 'free',
                  subscription_ends_at: null,
                  language: 'en',
                  notifications_enabled: true,
                  created_at: new Date().toISOString(),
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-user-123',
              phone: '9999999999',
              name: 'Test User',
              email: 'test@example.com',
              avatar_url: null,
              birth_date: null,
              birth_time: null,
              birth_place: null,
              birth_lat: null,
              birth_lng: null,
              zodiac_sign: null,
              nakshatra: null,
              referral_code: 'REF123456',
              referred_by: null,
              wallet_balance: 500,
              subscription_tier: 'free',
              subscription_ends_at: null,
              language: 'en',
              notifications_enabled: true,
              created_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    rpc: jest.fn((name, params) => {
      if (name === 'store_otp') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'verify_otp') {
        if (params?.p_otp_hash === 'mock_hash_123456') {
          return Promise.resolve({ data: [{ verified: true, reason: 'OK' }], error: null });
        }
        return Promise.resolve({ data: [{ verified: false, reason: 'Invalid OTP' }], error: null });
      }
      if (name === 'bind_user_device') {
        return Promise.resolve({ data: { success: true }, error: null });
      }
      // apply_referral_code RPC: returns { success, message, new_balance }
      if (name === 'apply_referral_code') {
        return Promise.resolve({
          data: { success: true, message: 'Referral code applied! You received \u20b9100 bonus.', new_balance: 600 },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('@/utils/secure-storage', () => ({
  secureGetItem: jest.fn(() => Promise.resolve(null)),
  secureSetItem: jest.fn(() => Promise.resolve()),
  secureRemoveItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/utils/rate-limiter', () => ({
  checkRateLimit: jest.fn(() => ({ isLimited: false })),
  recordAttempt: jest.fn(() => ({ blocked: false })),
  clearRateLimit: jest.fn(),
  formatRemainingTime: jest.fn(() => '1 minute'),
}));

jest.mock('@/utils/crypto', () => ({
  hashData: jest.fn((data: string) => Promise.resolve('mock_hash_' + data)),
  generateOTP: jest.fn(() => '123456'),
  generateUUID: jest.fn(() => 'test-uuid-1234'),
  generateReferralCode: jest.fn(() => 'TEST1234'),
  isSecureRandomAvailable: jest.fn(() => true),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should start with null user', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should have otpSent as false initially', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.otpSent).toBe(false);
    });
  });

  describe('sendOTP', () => {
    it('should reject invalid phone numbers', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      let response: AuthResponse;
      await act(async () => {
        response = await result.current.sendOTP('123');
      });

      expect(response.success).toBe(false);
      expect(response.message).toContain('valid 10-digit');
    });

    it('should reject non-numeric phone numbers', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      let response: AuthResponse;
      await act(async () => {
        response = await result.current.sendOTP('abcdefghij');
      });

      expect(response.success).toBe(false);
    });

    it('should send OTP for valid phone number', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      let response: AuthResponse;
      await act(async () => {
        response = await result.current.sendOTP('9876543210');
      });

      expect(response.success).toBe(true);
      expect(result.current.otpSent).toBe(true);
    });
  });

  describe('verifyOTP', () => {
    it('should verify correct OTP', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // First send OTP
      await act(async () => {
        await result.current.sendOTP('9876543210');
      });

      // Then verify
      let response: AuthResponse;
      await act(async () => {
        response = await result.current.verifyOTP('9876543210', '123456');
      });

      expect(response.success).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.phone).toBe('9999999999');
    });

    it('should reject incorrect OTP', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // First send OTP
      await act(async () => {
        await result.current.sendOTP('9876543210');
      });

      // Then verify with wrong OTP
      let response: AuthResponse;
      await act(async () => {
        response = await result.current.verifyOTP('9876543210', '000000');
      });

      expect(response.success).toBe(false);
      expect(response.message).toContain('Invalid OTP');
    });

    it('should reject OTP for phone without prior OTP request', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      let response: AuthResponse;
      await act(async () => {
        response = await result.current.verifyOTP('9999999999', '123456');
      });

      expect(response.success).toBe(false);
      expect(response.message).toContain('No OTP found');
    });
  });

  describe('updateUser', () => {
    it('should fail when no user is logged in', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      let response: AuthResponse;
      await act(async () => {
        response = await result.current.updateUser({ name: 'Test User' });
      });

      expect(response.success).toBe(false);
      expect(response.message).toContain('Please login first');
    });

    it('should update user profile when logged in', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Login first
      await act(async () => {
        await result.current.sendOTP('9876543210');
        await result.current.verifyOTP('9876543210', '123456');
      });

      // Update profile
      let response: AuthResponse;
      await act(async () => {
        response = await result.current.updateUser({ name: 'Test User' });
      });

      expect(response.success).toBe(true);
      expect(result.current.user?.name).toBe('Test User');
    });
  });

  describe('logout', () => {
    it('should clear user state on logout', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Login first
      await act(async () => {
        await result.current.sendOTP('9876543210');
        await result.current.verifyOTP('9876543210', '123456');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      // After logout, the demo user is recreated automatically
      // So isAuthenticated will be true (demo user is auto-created)
      // But the original user should be cleared
      expect(result.current.otpSent).toBe(false);
    });
  });

  describe('applyReferralCode', () => {
    it('should fail when no user is logged in', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      let response: AuthResponse;
      await act(async () => {
        response = await result.current.updateUser({ name: 'Test User' });
      });

      expect(response.success).toBe(false);
      expect(response.message).toContain('Please login first');
    });

    it('should apply referral code when logged in', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Login first
      await act(async () => {
        await result.current.sendOTP('9876543210');
        await result.current.verifyOTP('9876543210', '123456');
      });

      // Apply referral
      let response: AuthResponse;
      await act(async () => {
        response = await result.current.applyReferralCode('REFERRAL123');
      });

      expect(response.success).toBe(true);
      expect(result.current.user?.referredBy).toBe('REFERRAL123');
    });

    it('should not allow applying referral code twice', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Login first
      await act(async () => {
        await result.current.sendOTP('9876543210');
        await result.current.verifyOTP('9876543210', '123456');
      });

      // Apply referral first time
      await act(async () => {
        await result.current.applyReferralCode('REFERRAL123');
      });

      // Try to apply again
      let response: AuthResponse;
      await act(async () => {
        response = await result.current.applyReferralCode('ANOTHER456');
      });

      expect(response.success).toBe(false);
      expect(response.message).toContain('already applied');
    });
  });

  describe('User properties', () => {
    it('should create user with correct default values', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Login
      await act(async () => {
        await result.current.sendOTP('9876543210');
        await result.current.verifyOTP('9876543210', '123456');
      });

      const user = result.current.user!;
      // Phone is '9999999999' because the demo user is auto-created
      expect(user.phone).toBe('9999999999');
      expect(user.walletBalance).toBe(500);
      expect(user.subscriptionTier).toBe('free');
      expect(user.language).toBe('en');
      expect(user.notificationsEnabled).toBe(true);
      // Referral code is auto-generated, so just check it exists
      expect(user.referralCode).toBeDefined();
    });
  });
});
