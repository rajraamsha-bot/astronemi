import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User as DbUser } from '@/lib/database.types';
import { secureGetItem, secureSetItem, secureRemoveItem } from '@/utils/secure-storage';
import { RateLimiter } from '@/services/rate-limiter';
import { generateUUID, generateReferralCode } from '@/utils/crypto';
import { performLogoutStorageSweep } from '@/utils/user-storage-keys';
import { Logger } from '@/services/logger';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authService } from '@/services/auth-service';
import { queryClient } from '@/lib/query-client';


// Configurable country code from environment variable
// Set EXPO_PUBLIC_COUNTRY_CODE in .env (e.g., '+91' for India, '+1' for US)
const DEFAULT_COUNTRY_CODE = process.env.EXPO_PUBLIC_COUNTRY_CODE || '+91';

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  birthLat?: number;
  birthLng?: number;
  zodiacSign?: string;
  nakshatra?: string;
  referralCode?: string;
  referredBy?: string;
  role?: string;
  walletBalance: number;
  subscriptionTier: 'free' | 'basic' | 'premium' | 'gold';
  subscriptionEndsAt?: string;
  language: 'en' | 'hi' | 'ta' | 'te' | 'kn';
  notificationsEnabled: boolean;
  createdAt: number;
}

function mapDbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    phone: dbUser.phone || '',
    name: dbUser.name || undefined,
    email: dbUser.email || undefined,
    avatarUrl: dbUser.avatar_url || undefined,
    // Support both column naming conventions for backward compatibility
    birthDate: dbUser.birth_date || undefined,
    birthTime: dbUser.birth_time || undefined,
    birthPlace: dbUser.birth_place || undefined,
    birthLat: dbUser.birth_lat || undefined,
    birthLng: dbUser.birth_lng || undefined,
    zodiacSign: dbUser.zodiac_sign || undefined,
    nakshatra: dbUser.nakshatra || undefined,
    referralCode: dbUser.referral_code,
    referredBy: dbUser.referred_by || undefined,
    role: (dbUser as { role?: string }).role,
    walletBalance: dbUser.wallet_balance,
    subscriptionTier: dbUser.subscription_tier || 'free',
    subscriptionEndsAt: dbUser.subscription_ends_at || undefined,
    language: dbUser.language as 'en' | 'hi' | 'ta' | 'te' | 'kn',
    notificationsEnabled: dbUser.notifications_enabled,
    createdAt: new Date(dbUser.created_at).getTime(),
  };
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // M1: true until getSession() resolves on boot. Route guards must wait
  // for this — otherwise the SecureStore-cached profile flashes an
  // authenticated session for a dead/deleted identity.
  const [isHydrating, setIsHydrating] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  // SECURITY: lastSentOTP removed to prevent OTP exposure via React DevTools
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // effect:audited — Securely retrieve or generate a unique Device ID for binding
  // M3: fail CLOSED. deviceId is required by bind_device (verifyOTP passes
  // 'unknown-device' otherwise, which collapses every broken install into
  // one shared id and defeats the 2-device cap). If SecureStore is
  // unavailable, fall back to an in-memory UUID for this session only and
  // warn loudly — never silently share an id across devices.
  const [deviceInitFailed, setDeviceInitFailed] = useState(false);
  useEffect(() => {
    const initDevice = async () => {
      try {
        let id = await SecureStore.getItemAsync('app_device_id');
        if (!id) {
          id = generateUUID();
          try {
            await SecureStore.setItemAsync('app_device_id', id);
          } catch (persistError) {
            Logger.error('Device ID persist failed — session-only id in use', persistError);
            setDeviceInitFailed(true);
          }
        }
        setDeviceId(id);
      } catch (e) {
        Logger.error('Device ID init failed', e);
        // Session-only UUID: unique per install-run, never the shared
        // 'unknown-device' sentinel.
        setDeviceId(generateUUID());
        setDeviceInitFailed(true);
      }
    };
    initDevice();
  }, []);

  const useSupabase = isSupabaseConfigured();

  // Load user from secure storage on mount
  const localLoadUserFromStorage = useCallback(async () => {
    try {
      const stored = await secureGetItem('user');
      if (stored) {
        const userData = JSON.parse(stored);
        setUser(userData);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      Logger.error('Error loading user from storage:', error);
      return false;
    }
  }, []);

  // Fetch user profile from Supabase
  const fetchUserProfile = useCallback(async (authUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, phone, email, name, display_name, avatar_url, birth_date, birth_time, birth_place, birth_lat, birth_lng, zodiac_sign, nakshatra, role, wallet_balance, subscription_tier, subscription_ends_at, referral_code, referred_by, notifications_enabled, language, created_at, updated_at')
        .eq('id', authUser.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const newReferralCode = generateReferralCode();
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              phone: authUser.phone || pendingPhone,
              referral_code: newReferralCode,
              // wallet_balance defaults to 0 via DB default — signup bonus is applied server-side
              subscription_tier: 'free',
              language: 'en',
              notifications_enabled: true,
            })
            .select()
            .single();

          if (createError) {
            Logger.error('Error creating user profile:', createError);
            return null;
          }

          const user = mapDbUserToUser(newUser as unknown as DbUser);
          setUser(user);
          setIsAuthenticated(true);
          await secureSetItem('user', JSON.stringify(user));
          return user;
        }
        // SECURITY FIX: Any other error should return null, not leave stale cache
        Logger.error('Error fetching user profile:', error);
        return null;
      }

      // SECURITY FIX: Verify data exists before mapping
      if (!data) {
        Logger.error('User profile not found for authenticated user:', authUser.id);
        return null;
      }

      const user = mapDbUserToUser(data as unknown as DbUser);
      setUser(user);
      setIsAuthenticated(true);
      await secureSetItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      Logger.error('Error fetching user profile:', error);
      return null;
    }
  }, [pendingPhone]);

  const refreshUserProfile = useCallback(async () => {
    if (!user || !useSupabase) return;
    
    try {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (sbUser) {
        await fetchUserProfile(sbUser);
      }
    } catch (error) {
      Logger.error('Error refreshing profile:', error);
    }
  }, [user, useSupabase]);

  // Send OTP
  // M2 (safe default, explicit product decision): the AsyncStorage rate
  // limits below are CLIENT-ONLY abuse friction — clearing app data,
  // reinstalling, or a doctored build resets them. The authoritative
  // per-phone throttle is Supabase Auth's own OTP rate limiting on the
  // signInWithOtp endpoint (plus the service_role-gated check_rate_limit
  // RPC on the wallet/auth Edge paths). Do NOT treat the client limiter
  // as a security boundary; it exists to stop accidental double-taps.
  const sendOTP = useCallback(async (phone: string) => {
    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      return { success: false, message: 'Please enter a valid 10-digit mobile number' };
    }

    const rateCheck = await RateLimiter.checkRateLimit('otp_request', phone);
    if (rateCheck.isLimited) {
      return { 
        success: false, 
        message: `Too many OTP requests. Please try again.` 
      };
    }

    const attemptResult = await RateLimiter.recordAttempt('otp_request', phone);
    if (attemptResult.blocked) {
      return { 
        success: false, 
        message: 'Too many attempts. Please try again later.' 
      };
    }

    setOtpLoading(true);
    setPendingPhone(phone);

    try {
      if (useSupabase) {
        const { error } = await supabase.auth.signInWithOtp({
          phone: `${DEFAULT_COUNTRY_CODE}${phone}`,
          options: { channel: 'sms' },
        });

        if (error) {
          Logger.info('Supabase OTP error, using service fallback:', { message: error.message });
          return await authService.sendOTP(phone);
        }

        setOtpSent(true);
        return { success: true, message: `OTP sent to ${DEFAULT_COUNTRY_CODE} ${phone}` };
      } else {
        return await authService.sendOTP(phone);
      }
    } catch (error) {
      Logger.error('Error sending OTP:', error);
      return { success: false, message: 'Failed to send OTP. Please try again.' };
    } finally {
      setOtpLoading(false);
    }
  }, [useSupabase]);

  // Verify OTP
  const verifyOTP = useCallback(async (phone: string, otp: string) => {
    if (!pendingPhone || pendingPhone !== phone) {
      return { success: false, message: 'No OTP found for this phone number' };
    }

    const rateCheck = await RateLimiter.checkRateLimit('otp_verify', phone);
    if (rateCheck.isLimited) {
      return { 
        success: false, 
        message: `Too many verification attempts. Please try again.` 
      };
    }

    const attemptResult = await RateLimiter.recordAttempt('otp_verify', phone);
    if (attemptResult.blocked) {
      return { 
        success: false, 
        message: 'Too many attempts. Please try again later.' 
      };
    }

    setVerifyLoading(true);

    try {
      if (useSupabase) {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: `${DEFAULT_COUNTRY_CODE}${phone}`,
          token: otp,
          type: 'sms',
        });

        if (error) {
          const result = await authService.verifyOTP(phone, otp);
          if (result.success && result.user) {
            setUser(result.user);
            setIsAuthenticated(true);
            await secureSetItem('user', JSON.stringify(result.user));
          }
          return { success: result.success, message: result.message };
        }

        if (data.user) {
          // M3: never bind the shared 'unknown-device' sentinel — it would
          // merge distinct broken installs into one device row and defeat
          // the 2-device cap. deviceId is always a UUID after the M3
          // init fix above; block login if it is somehow still missing.
          if (!deviceId) {
            Logger.error('Device ID unavailable — blocking login (fail closed)');
            await supabase.auth.signOut();
            return {
              success: false,
              message: 'Device verification failed. Please restart the app and try again.'
            };
          }
          if (deviceInitFailed) {
            Logger.warn('Device ID is session-only (SecureStore unavailable); binding continues with a one-session id');
          }
          try {
            const deviceName = `${Platform.OS} - ${Constants.deviceName || 'Unknown'}`;
            const { data: bindingResult, error: bindError } = await supabase.rpc('bind_device', {
              p_device_id: deviceId,
              p_device_name: deviceName,
              p_os: Platform.OS,
            });

            if (bindError) {
              Logger.error('Device binding RPC failed', bindError);
              await supabase.auth.signOut();
              return {
                success: false,
                message: 'Device binding failed. Please try again.'
              };
            }

            const row = (Array.isArray(bindingResult) ? bindingResult[0] : bindingResult) as
              | { success?: boolean; message?: string }
              | null;
            if (row && row.success === false) {
              await supabase.auth.signOut();
              return {
                success: false,
                message: row.message || 'Access denied: Device limit exceeded.'
              };
            }
          } catch (e) {
            Logger.error('Device binding failed', e);
            // Block login on binding failure to enforce device limit
            await supabase.auth.signOut();
            return {
              success: false,
              message: 'Device verification failed. Please try again.'
            };
          }
        }

        // SECURITY FIX: Verify profile fetch succeeded before returning success
        if (data.user) {
          const profile = await fetchUserProfile(data.user);
          if (!profile) {
            // Profile fetch/create failed - clear session and fail login
            await supabase.auth.signOut();
            return {
              success: false,
              message: 'Failed to load user profile. Please try again.'
            };
          }
        }

        return { success: true, message: 'Login successful!' };
      } else {
        const result = await authService.verifyOTP(phone, otp);
        if (result.success && result.user) {
          setUser(result.user);
          setIsAuthenticated(true);
          await secureSetItem('user', JSON.stringify(result.user));
        }
        return { success: result.success, message: result.message };
      }
    } catch (error) {
      Logger.error('Error verifying OTP:', error);
      return { success: false, message: 'Failed to verify OTP. Please try again.' };
    } finally {
      setVerifyLoading(false);
    }
  }, [useSupabase, deviceId, deviceInitFailed]);

  // Apply referral code
  // SECURITY: All wallet-affecting logic is server-side via apply_referral_code RPC.
  // The client never mutates walletBalance locally — it only reflects the
  // server-authoritative state returned by the RPC.
  const REFERRAL_BONUS_AMOUNT = 100; // For display/UI messaging only

  const applyReferralCode = useCallback(async (code: string) => {
    if (!user) {
      return { success: false, message: 'Please login first' };
    }

    if (user.referredBy) {
      return { success: false, message: 'You have already applied a referral code' };
    }

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return { success: false, message: 'Please enter a valid referral code' };
    }

    const sanitizedCode = code.trim();

    try {
      if (useSupabase) {
        // Server-side: call the atomic apply_referral_code RPC which:
        //  1. Validates the referral code exists
        //  2. Verifies the user hasn't already been referred
        //  3. Atomically writes the referrer's UUID into referred_by (C4 fix —
        //     the previous version stored the raw code string and crashed on
        //     the users.referred_by → users.id FK declared in 001)
        //  4. Credits the bonus via the server-side wallet credit flow
        //  5. Returns the updated wallet_balance for the client to cache
        const { data, error } = await supabase.rpc('apply_referral_code', {
          p_user_id: user.id,
          p_referral_code: sanitizedCode,
        });

        if (error) {
          Logger.error('apply_referral_code RPC failed', error);
          return { success: false, message: 'Failed to apply referral code' };
        }

        const raw = (Array.isArray(data) ? data[0] : data ?? {}) as {
          success?: boolean;
          message?: string;
          error?: string;
          new_balance?: number;
          bonus?: number;
        };

        if (!raw.success) {
          return { success: false, message: raw.message || raw.error || 'Invalid referral code' };
        }

        // Server is authoritative — update local cache from server response
        const serverBalance = typeof raw.new_balance === 'number'
          ? raw.new_balance
          : (typeof raw.bonus === 'number' ? Number(user.walletBalance ?? 0) + raw.bonus : user.walletBalance);
        const updatedUser = {
          ...user,
          referredBy: sanitizedCode,
          walletBalance: serverBalance,
        };
        setUser(updatedUser);
        await secureSetItem('user', JSON.stringify(updatedUser));
        return { success: true, message: raw.message || `Referral code applied! You received ₹${REFERRAL_BONUS_AMOUNT} bonus.` };
      } else {
        // Supabase not configured — block the operation. We never credit
        // wallet on the client because that would be a security hole
        // (any attacker could grant themselves balance offline).
        Logger.warn('applyReferralCode called without Supabase configured; refusing to credit wallet client-side');
        return {
          success: false,
          message: 'Referral service is temporarily unavailable. Please try again later.',
        };
      }
    } catch (error) {
      Logger.error('Error applying referral code:', error);
      return { success: false, message: 'Failed to apply referral code' };
    }
  }, [user, useSupabase]);

  // Update user profile
  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) {
      return { success: false, message: 'Please login first' };
    }

    try {
      if (useSupabase) {
        const { error } = await supabase
          .from('users')
          .update({
            name: updates.name,
            email: updates.email,
            birth_date: updates.birthDate,
            birth_time: updates.birthTime,
            birth_place: updates.birthPlace,
            birth_lat: updates.birthLat,
            birth_lng: updates.birthLng,
            zodiac_sign: updates.zodiacSign,
            nakshatra: updates.nakshatra,
            language: updates.language,
            notifications_enabled: updates.notificationsEnabled,
          })
          .eq('id', user.id);

        if (error) {
          // The DB is the source of truth — a failed write must not be
          // masked by a success toast while local state shows new values.
          Logger.error('Error updating user profile:', error);
          return { success: false, message: 'Failed to update profile on server' };
        }
      }

      // Persist locally only after the server write succeeded (or when
      // running without Supabase).
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      await secureSetItem('user', JSON.stringify(updatedUser));

      return { success: true, message: 'Profile updated successfully' };
    } catch (error) {
      Logger.error('Error updating user:', error);
      return { success: false, message: 'Failed to update profile' };
    }
  }, [user, useSupabase]);

  // Logout
  const logout = useCallback(async () => {
    try {
      setUser(null);
      setIsAuthenticated(false);
      setOtpSent(false);
      await secureRemoveItem('user');

      // Purge every cached query: user-scoped keys would otherwise survive
      // into the next session on a shared device (24h gcTime) and bleed
      // account A's wallet/history into account B's UI.
      queryClient.clear();

      // Purge every per-user AsyncStorage surface (cart, addresses incl.
      // shipping PII, orders, kundlis, reviews). This is the ONE logout used
      // by every screen: previously Settings signed out but left this data
      // behind, while Profile cleared data but never signed out.
      await performLogoutStorageSweep();

      if (useSupabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      Logger.error('Error logging out:', error);
    }
  }, [useSupabase]);

  // Initial load
  useEffect(() => {
    // Holds the auth-state subscription so we can tear it down on cleanup.
    // Declared outside the async function so the synchronous cleanup returned
    // to React can always reach it — returning the cleanup from inside the
    // async `initialize()` (previous code) meant React never received it and
    // the subscription leaked on every re-render.
    let authSubscription: { unsubscribe: () => void } | null = null;
    let cancelled = false;

    const initialize = async () => {
      try {
      // 1. Try to load from secure storage first (fastest)
      const locallyAuthenticated = await localLoadUserFromStorage();

      // Guard against the effect being torn down while awaiting.
      if (cancelled) return;

      // 2. If using Supabase, check for existing session
      if (useSupabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (session?.user) {
          // SECURITY FIX: Verify profile fetch succeeds, clear stale cache if not
          const profile = await fetchUserProfile(session.user);
          if (!profile) {
            // Profile fetch failed for existing session - clear everything
            Logger.warn('Failed to fetch profile for existing session, clearing auth state');
            setIsAuthenticated(false);
            setUser(null);
            await secureRemoveItem('user');
            await performLogoutStorageSweep();
          }
        } else {
          // No valid server session — the locally cached profile must NOT
          // keep the user authenticated. Previously, when a cached profile
          // existed but the Supabase session was gone (expired refresh
          // token, signed out elsewhere, account deleted), the app stayed
          // logged in with a stale identity.
          setIsAuthenticated(false);
          setUser(null);
          if (locallyAuthenticated) {
            await secureRemoveItem('user');
          }
          // A stale local profile must not leave account-scoped cart,
          // address, order, or profile caches available to the next session.
          await performLogoutStorageSweep();
        }

        if (cancelled) return;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (cancelled) return;
          if (session?.user) {
            const profile = await fetchUserProfile(session.user);
            // SECURITY FIX: Clear auth state if profile fetch fails
            if (!profile) {
              setIsAuthenticated(false);
              setUser(null);
              await performLogoutStorageSweep();
            }
          } else {
            setIsAuthenticated(false);
            setUser(null);
            await performLogoutStorageSweep();
          }
        });

        authSubscription = subscription;
      }
      } finally {
        // M1: boot hydration is over either way (incl. no-Supabase dev and
        // early-return paths) so guards never hang on the splash screen.
        if (!cancelled) setIsHydrating(false);
      }
    };

    initialize();

    // Synchronous cleanup — React actually receives this return value, so
    // the subscription is properly removed when the effect re-runs or the
    // component unmounts.
    return () => {
      cancelled = true;
      authSubscription?.unsubscribe();
      authSubscription = null;
    };
  }, [useSupabase, localLoadUserFromStorage, fetchUserProfile]);

  return {
    user,
    isAuthenticated,
    isHydrating,
    otpSent,
    otpLoading,
    verifyLoading,
    pendingPhone,
    sendOTP,
    verifyOTP,
    updateUser,
    logout,
    refreshUserProfile,
    applyReferralCode,
  };
});
