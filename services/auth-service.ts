/**
 * Auth Service - Production Ready
 *
 * Centralized authentication with Supabase Auth, secure OTP handling,
 * device binding, and fallback mechanisms.
 *
 * Security:
 * - Uses cryptographically secure CSPRNG (expo-crypto) for all
 *   device IDs and referral codes to prevent guessability.
 * - Stores OTP hashes server-side only (via Edge Function)
 * - Uses expo-secure-store for tokens
 * - Implements proper rate limiting
 *
 * Production Safety (HIGH-2, HIGH-3 fixes):
 * - Removed hardcoded `walletBalance: 100` signup bonus — it is now
 *   credited server-side via the `apply_signup_bonus` RPC in
 *   migration 012.
 * - Removed `__DEV__` branches that mutate state. The dev mock is
 *   only available when `EXPO_PUBLIC_USE_MOCK_API=true`.
 * - Referral bonus is now credited server-side via the
 *   `apply_referral_bonus` RPC.
 */

import { Platform } from 'react-native';
import { errorReporting } from './error-reporting';
import { secureStorage } from './secure-storage';
import { RateLimiter } from './rate-limiter';
import { Logger } from './logger';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { User } from '@/contexts/AuthContext';
import { prefixedSecureId, generateSecureReferralCode } from '@/utils/secure-random';

export const _getDeviceCountryCode = (): string => {
  if (process.env.EXPO_PUBLIC_COUNTRY_CODE) {
    return process.env.EXPO_PUBLIC_COUNTRY_CODE;
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      if (tz.startsWith('Asia/Kolkata')) return '+91';
      if (tz.startsWith('America/')) return '+1';
      if (tz.startsWith('Europe/London')) return '+44';
      if (tz.startsWith('Australia/')) return '+61';
    }
  } catch {
    // Ignore and fallback
  }
  return '+91'; // Safe default
};

const DEFAULT_COUNTRY_CODE = _getDeviceCountryCode();
const ALLOW_DEV_MOCK =
  process.env.EXPO_PUBLIC_USE_MOCK_API === 'true' && __DEV__;

export const authService = {
  /**
   * Send OTP via Supabase Auth (phone provider).
   */
  async sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
    try {
      const validation = this.validatePhoneNumber(phone);
      if (!validation.valid) {
        return { success: false, message: validation.message || 'Invalid phone number' };
      }

      const rateCheck = await RateLimiter.checkRateLimit('otp_request', phone);
      if (rateCheck.isLimited) {
        return { success: false, message: 'Too many OTP requests. Please try again later.' };
      }

      const fullPhone = `${DEFAULT_COUNTRY_CODE}${phone}`;

      if (!isSupabaseConfigured()) {
        return { success: false, message: 'Authentication service unavailable.' };
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: {
          channel: 'sms',
        },
      });

      if (error) {
        const maskedPhone = fullPhone.replace(/.(?=.{4})/g, '*');
        Logger.error('Supabase OTP send failed', error, { phone: maskedPhone });
        return { success: false, message: 'Failed to send OTP. Please try again.' };
      }

      await RateLimiter.recordAttempt('otp_request', phone);
      return { success: true, message: `OTP sent to ${DEFAULT_COUNTRY_CODE} ${phone}` };
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { service: 'auth' } });
      return { success: false, message: 'Failed to send OTP. Please try again.' };
    }
  },

  /**
   * Verify OTP using Supabase Auth.
   * On success, applies the signup bonus via the server-side RPC
   * (HIGH-3 fix).
   */
  async verifyOTP(
    phone: string,
    otp: string
  ): Promise<{ success: boolean; message: string; user?: User; session?: boolean }> {
    try {
      const rateCheck = await RateLimiter.checkRateLimit('otp_verify', phone);
      if (rateCheck.isLimited) {
        return { success: false, message: 'Too many verification attempts. Please try again later.' };
      }

      const fullPhone = `${DEFAULT_COUNTRY_CODE}${phone}`;

      if (!isSupabaseConfigured()) {
        return { success: false, message: 'Authentication service unavailable.' };
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp,
        type: 'sms',
      });

      if (error || !data.session) {
        await RateLimiter.recordAttempt('otp_verify', phone);
        return { success: false, message: 'Invalid OTP. Please try again.' };
      }

      // Store session securely
      await secureStorage.setItem('supabase_session', JSON.stringify(data.session));

      // Create or fetch user profile
      const user = await this.createOrFetchUser(phone, data.user?.id);

      // The device limit is only meaningful if a failed binding actually
      // blocks the login. Previously the result was discarded, so a user over
      // the limit was signed in anyway and the check did nothing.
      const binding = await this.bindDevice(user.id, await this.getDeviceId());
      if (!binding.success) {
        await this.logout();
        return {
          success: false,
          message: binding.message || 'Device binding failed',
        };
      }

      // HIGH-3 fix: server-side signup bonus credit. Idempotent.
      if (data.user?.id) {
        try {
          await supabase.rpc('apply_signup_bonus', { p_user_id: data.user.id });
        } catch (e) {
          // Don't fail login if the bonus can't be applied — log and move on.
          Logger.warn('Signup bonus RPC failed', { error: String(e) });
        }
      }

      return { success: true, message: 'Login successful!', user, session: true };
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { service: 'auth' } });
      return { success: false, message: 'Verification failed. Please try again.' };
    }
  },

  /**
   * Bind device for security (max 2 devices).
   *
   * Server-enforced: the device registry and the 2-device cap live in the
   * public.devices table + bind_device() RPC (migration 036). The client only
   * calls the RPC; it no longer keeps a local device list that can be cleared
   * to bypass the limit. The caller's user id is ignored here because the RPC
   * derives the owner from the authenticated JWT (auth.uid()).
   */
  async bindDevice(_userId: string, deviceId: string): Promise<{ success: boolean; message?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        return { success: false, message: 'Device binding unavailable' };
      }
      const { data, error } = await supabase.rpc('bind_device', {
        p_device_id: deviceId,
        p_device_name: `${Platform.OS} - ${Platform.Version}`,
        p_os: Platform.OS,
      });
      if (error) {
        errorReporting.captureException(error as Error, { tags: { service: 'auth' } });
        return { success: false, message: 'Device binding failed' };
      }
      const row = (Array.isArray(data) ? data[0] : data) as
        | { success?: boolean; message?: string }
        | undefined;
      if (!row?.success) {
        return { success: false, message: row?.message || 'Device binding failed' };
      }
      return { success: true };
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { service: 'auth' } });
      return { success: false, message: 'Device binding failed' };
    }
  },

  /**
   * Revoke a previously bound device (server-enforced via revoke_device() RPC).
   */
  async revokeDevice(deviceId: string): Promise<{ success: boolean; message?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        return { success: false, message: 'Device management unavailable' };
      }
      const { data, error } = await supabase.rpc('revoke_device', { p_device_id: deviceId });
      if (error) {
        errorReporting.captureException(error as Error, { tags: { service: 'auth' } });
        return { success: false, message: 'Device revocation failed' };
      }
      const row = (Array.isArray(data) ? data[0] : data) as
        | { success?: boolean; message?: string }
        | undefined;
      return { success: !!row?.success, message: row?.message };
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { service: 'auth' } });
      return { success: false, message: 'Device revocation failed' };
    }
  },

  /**
   * List the current user's active (non-revoked) bound devices.
   */
  async listDevices(): Promise<Array<{ device_id: string; device_name: string | null; os: string | null; bound_at: string; last_seen_at: string | null }>> {
    try {
      if (!isSupabaseConfigured()) {
        return [];
      }
      const { data, error } = await supabase
        .from('devices')
        .select('device_id, device_name, os, bound_at, last_seen_at')
        .is('revoked_at', null)
        .order('bound_at', { ascending: true });
      if (error) {
        errorReporting.captureException(error as Error, { tags: { service: 'auth' } });
        return [];
      }
      return (data ?? []) as Array<{ device_id: string; device_name: string | null; os: string | null; bound_at: string; last_seen_at: string | null }>;
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { service: 'auth' } });
      return [];
    }
  },

  /**
   * Load current user from secure storage or Supabase session
   */
  async loadUser(): Promise<User | null> {
    try {
      if (isSupabaseConfigured()) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const userData = await secureStorage.getItem('user');
          if (userData) {
            return JSON.parse(userData) as User;
          }
        }
      }

      const userData = await secureStorage.getItem('user');
      if (userData) {
        return JSON.parse(userData) as User;
      }
      return null;
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { service: 'auth' } });
      return null;
    }
  },

  /**
   * Logout - clear all auth data
   */
  async logout(): Promise<void> {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
      await secureStorage.removeItem('supabase_session');
      await secureStorage.removeItem('user');
      Logger.info('User logged out');
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { service: 'auth' } });
    }
  },

  /**
   * Get or generate a stable device ID using a CSPRNG.
   */
  async getDeviceId(): Promise<string> {
    let deviceId = await secureStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = prefixedSecureId(Platform.OS);
      await secureStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  },

  /**
   * Create or fetch user profile from Supabase.
   * HIGH-3 fix: walletBalance is 0 here. The signup bonus is credited
   * by the server after this returns, via the apply_signup_bonus RPC.
   */
  async createOrFetchUser(phone: string, authUserId?: string): Promise<User> {
    // Only reuse the cached profile if it actually belongs to the account
    // logging in. Previously any cached user was returned unconditionally,
    // so a second person logging in on the same device was handed the
    // previous account's profile (and its referral code, settings, etc.).
    const existingUser = await this.loadUser();
    if (
      existingUser &&
      existingUser.phone === phone &&
      (!authUserId || existingUser.id === authUserId)
    ) {
      return existingUser;
    }
    if (existingUser) {
      await secureStorage.removeItem('user');
    }

    const user: User = {
      id: authUserId || (ALLOW_DEV_MOCK ? `dev_${phone}` : ''),
      phone,
      name: undefined,
      email: undefined,
      avatarUrl: undefined,
      birthDate: undefined,
      birthTime: undefined,
      birthPlace: undefined,
      birthLat: undefined,
      birthLng: undefined,
      zodiacSign: undefined,
      nakshatra: undefined,
      referralCode: this.generateReferralCode(),
      referredBy: undefined,
      walletBalance: 0,
      subscriptionTier: 'free',
      subscriptionEndsAt: undefined,
      language: 'en',
      notificationsEnabled: true,
      createdAt: new Date().getTime(),
    };

    // Store locally
    await secureStorage.setItem('user', JSON.stringify(user));

    if (isSupabaseConfigured() && authUserId) {
      // Insert only if the row does not exist. The previous upsert sent
      // wallet_balance: 0 with onConflict:'id', which OVERWROTE an existing
      // user's balance (and profile fields) with defaults on every login
      // from a fresh install — silently wiping real money.
      const { data: existingRow } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUserId)
        .maybeSingle();

      if (!existingRow) {
        const { error } = await supabase.from('users').insert({
          id: authUserId,
          phone,
          referral_code: user.referralCode,
          wallet_balance: user.walletBalance,
          subscription_tier: user.subscriptionTier,
          language: user.language,
          notifications_enabled: user.notificationsEnabled,
          created_at: new Date().toISOString(),
        });

        if (error) {
          Logger.error('Failed to sync user to Supabase', error, { userId: authUserId });
        }
      }
    } else if (!isSupabaseConfigured() && !ALLOW_DEV_MOCK) {
      Logger.error('Supabase not configured. User data will not persist.');
    }

    return user;
  },

  /**
   * Generate a cryptographically secure, human-readable referral code.
   */
  generateReferralCode(): string {
    return generateSecureReferralCode();
  },

  /**
   * Apply a referral code via the server-side RPC (HIGH-3 fix).
   */
  async applyReferralCode(userId: string, code: string): Promise<{ success: boolean; message: string; newBalance?: number }> {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Referral service unavailable' };
    }

    try {
      const { data, error } = await supabase.rpc('apply_referral_bonus', {
        p_user_id: userId,
        p_referral_code: code,
      });

      if (error) {
        Logger.error('apply_referral_bonus RPC failed', error, { userId, code });
        return { success: false, message: 'Failed to apply referral code' };
      }

      const result = data as { success: boolean; message: string; new_balance: number } | null;
      if (!result || !result.success) {
        return { success: false, message: result?.message ?? 'Invalid referral code' };
      }

      return {
        success: true,
        message: 'Referral code applied! You received \u20b9100 bonus.',
        newBalance: result.new_balance,
      };
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { service: 'auth' } });
      return { success: false, message: 'Failed to apply referral code' };
    }
  },

  validatePhoneNumber(phone: string): { valid: boolean; message?: string } {
    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      return { valid: false, message: 'Please enter a valid 10-digit mobile number' };
    }
    return { valid: true };
  },
};

export default authService;
