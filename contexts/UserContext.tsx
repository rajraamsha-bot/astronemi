import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';
import { UserProfile, SavedKundli, NotificationSettings, Subscription, Review } from '@/types/user';
import { generateUUID, generateReferralCode } from '@/utils/crypto';
import { getUserStorageKey, performLogoutStorageSweep } from '@/utils/user-storage-keys';
import { initializeNotifications } from '@/utils/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface UserContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  
  // Auth
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  
  // Profile
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateBirthDetails: (details: UserProfile['birthDetails']) => Promise<void>;
  
  // Saved Kundlis
  savedKundlis: SavedKundli[];
  addSavedKundli: (kundli: Omit<SavedKundli, 'id' | 'createdAt'>) => Promise<void>;
  removeSavedKundli: (id: string) => Promise<void>;
  getSavedKundli: (id: string) => SavedKundli | undefined;
  
  // Notifications
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  
  // Subscription
  currentSubscription: Subscription | null;
  refreshSubscription: () => Promise<void>;
  subscribe: (plan: Subscription['plan']) => Promise<boolean>;
  cancelSubscription: () => Promise<void>;
  
  // Referral
  referralCode: string;
  referralStats: { total: number; earned: number };
  applyReferralCode: (code: string) => Promise<boolean>;
  
  // Reviews
  userReviews: Review[];
  addReview: (review: Omit<Review, 'id' | 'userId' | 'createdAt' | 'helpful'> & { consultationId: string }) => Promise<void>;
}

const defaultNotificationSettings: NotificationSettings = {
  dailyHoroscope: true,
  dailyHoroscopeTime: '08:00',
  festivalReminders: true,
  muhuratAlerts: true,
  transitAlerts: true,
  walletLowBalance: true,
  promotionalOffers: false,
  astrologerMessages: true,
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedKundlis, setSavedKundlis] = useState<SavedKundli[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [referralStats, setReferralStats] = useState<{ total: number; earned: number }>({
    total: 0,
    earned: 0,
  });

  // effect:audited — Sync user identity from AuthContext
  useEffect(() => {
    if (auth.user) {
      setUser((prev: UserProfile | null) => {
        if (prev?.id === auth.user?.id) return prev;
        return {
          id: auth.user!.id,
          name: auth.user!.name || auth.user!.phone || 'User',
          email: auth.user!.email || '',
          birthDetails: {
            name: auth.user!.name || '',
            birthDate: auth.user!.birthDate || '',
            birthTime: auth.user!.birthTime || '',
            birthPlace: auth.user!.birthPlace || '',
          },
          savedKundlis: prev?.savedKundlis || [],
          referralCode: auth.user!.referralCode || generateReferralCode(),
          walletBalance: auth.user!.walletBalance ?? 0,
          notifications: prev?.notifications || defaultNotificationSettings,
          createdAt: new Date(auth.user!.createdAt),
        } as UserProfile;
      });
    } else {
      setUser(null);
    }
  }, [auth.user]);

  // Load supplementary data only after AuthContext has established the
  // active account. Reading the old global keys here allowed account B to
  // inherit account A's profile cache, kundlis, subscription, and reviews.
  useEffect(() => {
    const userId = auth.user?.id;
    let cancelled = false;
    setSavedKundlis([]);
    setCurrentSubscription(null);
    setUserReviews([]);

    if (!userId) {
      setIsLoading(false);
      return () => { cancelled = true; };
    }

    setIsLoading(true);
    loadUserData(userId)
      .catch(err => Logger.error('Error in loadUserData:', err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [auth.user?.id]);

  // effect:audited — Event-driven: Initialize notifications when settings or user changes
  // This reacts to state changes and triggers side effects
  useEffect(() => {
    if (!isLoading) {
      // Calculate a default zodiac or use from birthDetails if we add it
      // For now we pass 'Aries' as default or look it up
      initializeNotifications(notificationSettings, user?.name || 'User')
        .catch(err => Logger.error('Error initializing notifications:', err));
    }
  }, [notificationSettings, user, isLoading]);

  const loadServerSubscription = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, plan_id, start_date, end_date')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        Logger.warn('Could not load server subscription', { error });
        return;
      }
      if (!data) {
        setCurrentSubscription(null);
        await AsyncStorage.removeItem(getUserStorageKey('subscription', userId));
        return;
      }

      const rawPlan = String(data.plan_id ?? 'free').split('_')[0];
      const plan = (['free', 'basic', 'premium', 'gold'] as const).includes(
        rawPlan as Subscription['plan'],
      )
        ? (rawPlan as Subscription['plan'])
        : 'free';
      const mapped: Subscription = {
        id: String(data.id),
        plan,
        startDate: new Date(data.start_date ?? Date.now()),
        endDate: new Date(data.end_date ?? Date.now()),
        autoRenew: false,
        features: [],
      };
      setCurrentSubscription(mapped);
      await AsyncStorage.setItem(
        getUserStorageKey('subscription', userId),
        JSON.stringify(mapped),
      );
    } catch (error) {
      Logger.warn('Failed to refresh server subscription', { error });
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!auth.user?.id) {
      setCurrentSubscription(null);
      return;
    }
    await loadServerSubscription(auth.user.id);
  }, [auth.user?.id, loadServerSubscription]);

  const loadUserData = async (userId: string) => {
    try {
      const [kundlisData, notifData, subData, reviewsData] = await Promise.all([
        AsyncStorage.getItem(getUserStorageKey('savedKundlis', userId)),
        AsyncStorage.getItem(getUserStorageKey('notificationSettings', userId)),
        AsyncStorage.getItem(getUserStorageKey('subscription', userId)),
        AsyncStorage.getItem(getUserStorageKey('userReviews', userId)),
      ]);

      if (kundlisData) {
        try {
          setSavedKundlis(JSON.parse(kundlisData));
        } catch (parseError) {
          Logger.error('Error parsing kundlis data, clearing corrupted entry:', parseError);
          await AsyncStorage.removeItem(getUserStorageKey('savedKundlis', userId));
        }
      }
      if (notifData) {
        try {
          setNotificationSettings(JSON.parse(notifData));
        } catch (parseError) {
          Logger.error('Error parsing notification settings, clearing corrupted entry:', parseError);
          await AsyncStorage.removeItem(getUserStorageKey('notificationSettings', userId));
        }
      }
      if (subData) {
        try {
          setCurrentSubscription(JSON.parse(subData));
        } catch (parseError) {
          Logger.error('Error parsing subscription data, clearing corrupted entry:', parseError);
          await AsyncStorage.removeItem(getUserStorageKey('subscription', userId));
        }
      }
      if (reviewsData) {
        try {
          setUserReviews(JSON.parse(reviewsData));
        } catch (parseError) {
          Logger.error('Error parsing reviews data, clearing corrupted entry:', parseError);
          await AsyncStorage.removeItem(getUserStorageKey('userReviews', userId));
        }
      }

      // Server state is authoritative; the AsyncStorage copy is only a cache.
      await loadServerSubscription(userId);
    } catch (error) {
      Logger.error('Error loading user data:', error);
    }
  };

  const saveUserData = async (userData: UserProfile | null) => {
    const userId = auth.user?.id ?? userData?.id;
    if (userId) {
      const key = getUserStorageKey('userProfile', userId);
      if (userData) {
        await AsyncStorage.setItem(key, JSON.stringify(userData));
      } else {
        await AsyncStorage.removeItem(key);
      }
    }
    setUser(userData);
  };

  // Auth is handled by AuthContext. Use useAuth() for login/logout.
  // SECURITY: login() and signup() were removed — they created users
  // entirely client-side with fabricated wallet balances.

  const logout = async () => {
    // Clear both in-memory state and every persisted per-user data surface so
    // the next login (possibly a different user on a shared device) never
    // sees the previous user's kundlis / subscription / reviews.
    //
    // Delegates to AuthContext.logout for supabase.auth.signOut(), the React
    // Query purge and the shared storage sweep. The Profile-tab logout
    // previously ONLY cleared local keys — the Supabase session stayed valid
    // in SecureStore, leaving a live identity behind after "logout".
    setUser(null);
    setSavedKundlis([]);
    setCurrentSubscription(null);
    setUserReviews([]);

    await performLogoutStorageSweep();
    await auth.logout?.();
  };

  // Referral stats come from the referrals ledger (RLS: owner-selectable,
  // migration 002; rows written by apply_referral_code in 031). The value
  // used to be hardcoded to {0,0}, making the referral UI decorative even
  // though the server records every redemption.
  useEffect(() => {
    const referrerId = auth.user?.id;
    if (!referrerId || !isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('referrals')
          .select('reward_amount')
          .eq('referrer_id', referrerId);
        if (cancelled || error || !data) {
          if (error) Logger.warn('referralStats query failed', { error });
          return;
        }
        setReferralStats({
          total: data.length,
          earned: data.reduce((sum, row) => sum + Number((row as { reward_amount?: number }).reward_amount ?? 0), 0),
        });
      } catch (err) {
        Logger.warn('referralStats fetch failed', { error: err });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.user]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (user) {
      // Server-first persistence: previously this only wrote AsyncStorage,
      // so profile edits silently vanished on reinstall / other devices
      // while the UI showed "Profile updated". Phone is deliberately NOT
      // written — it is owned by Supabase Auth (OTP login identity).
      //
      // Migration 052: route through update_user_profile RPC (migration
      // 049). The RPC allowlists display columns and rejects any other
      // key, so a malformed UI payload can no longer touch role/wallet/
      // tier through this code path.
      if (isSupabaseConfigured()) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const patch: Record<string, unknown> = {};
          if (updates.name !== undefined) patch.name = updates.name;
          if (updates.email !== undefined) patch.email = updates.email;
          if (updates.avatar !== undefined) patch.avatar_url = updates.avatar;
          const bd = updates.birthDetails;
          if (bd) {
            // Canonical users columns (migration 057): birth_date, NOT
            // date_of_birth — the RPC accepts both, but send canonical.
            if (bd.birthDate !== undefined) patch.birth_date = bd.birthDate;
            if (bd.birthTime !== undefined) patch.birth_time = bd.birthTime;
            if (bd.birthPlace !== undefined) patch.birth_place = bd.birthPlace;
            if (bd.latitude !== undefined) patch.birth_lat = bd.latitude;
            if (bd.longitude !== undefined) patch.birth_lng = bd.longitude;
          }
          if (Object.keys(patch).length > 0) {
            const { error } = await supabase.rpc('update_user_profile', {
              p_user_id: authUser.id,
              p_updates: patch,
            });
            if (error) throw error; // callers (profile.tsx) surface this to the user
          }
        }
      }
      const updated = { ...user, ...updates };
      await saveUserData(updated);
    }
  };

  const updateBirthDetails = async (details: UserProfile['birthDetails']) => {
    // Route through updateProfile so birth details persist to the users
    // table server-side too (they previously only reached AsyncStorage).
    await updateProfile({ birthDetails: details });
  };

  const addSavedKundli = async (kundli: Omit<SavedKundli, 'id' | 'createdAt'>) => {
    const newKundli: SavedKundli = {
      ...kundli,
      id: generateUUID(),
      createdAt: new Date(),
    };
    const updated = [...savedKundlis, newKundli];
    setSavedKundlis(updated);
    if (!auth.user?.id) return;
    await AsyncStorage.setItem(getUserStorageKey('savedKundlis', auth.user.id), JSON.stringify(updated));
  };

  const removeSavedKundli = async (id: string) => {
    const updated = savedKundlis.filter(k => k.id !== id);
    setSavedKundlis(updated);
    if (!auth.user?.id) return;
    await AsyncStorage.setItem(getUserStorageKey('savedKundlis', auth.user.id), JSON.stringify(updated));
  };

  const getSavedKundli = (id: string) => {
    return savedKundlis.find(k => k.id === id);
  };

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    const updated = { ...notificationSettings, ...settings };
    setNotificationSettings(updated);
    if (auth.user?.id) {
      await AsyncStorage.setItem(
        getUserStorageKey('notificationSettings', auth.user.id),
        JSON.stringify(updated),
      );
    }
  };

  // Subscription: server-side only via SubscriptionService.subscribeToPlan().
  // Client-side subscription creation was removed — it fabricated records
  // in AsyncStorage without payment verification.

  // Referral: delegated to AuthContext which calls the server-side
  // apply_referral_code RPC. Client-side wallet mutation removed.

  // ── Reviews: server-backed via public.reviews ────────────────────────────
  // The table already existed (011/019) with a strict INSERT policy — a
  // review must reference one of the caller's own consultations with the
  // reviewed astrologer. addReview writes through to the server and keeps
  // the AsyncStorage copy as an offline cache; reviews load on login.
  useEffect(() => {
    const uid = auth.user?.id;
    if (!uid || !isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(100);
        if (cancelled || error || !data) {
          if (error) Logger.warn('reviews query failed', { error });
          return;
        }
        const mapped = (data as Array<Record<string, unknown>>).map(r => ({
          id: String(r.id),
          astrologerId: String(r.astrologer_id),
          userId: String(r.user_id),
          userName: String(r.user_name ?? ''),
          rating: Number(r.rating),
          comment: String(r.comment ?? ''),
          consultationType: (r.consultation_type ?? 'chat') as Review['consultationType'],
          createdAt: new Date(String(r.created_at)),
          helpful: 0,
        }));
        setUserReviews(mapped);
        if (auth.user?.id) {
          await AsyncStorage.setItem(
            getUserStorageKey('userReviews', auth.user.id),
            JSON.stringify(mapped),
          );
        }
      } catch (err) {
        Logger.warn('reviews fetch failed', { error: err });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.user]);

  const addReview = async (
    review: Omit<Review, 'id' | 'userId' | 'createdAt' | 'helpful'> & { consultationId: string }
  ): Promise<void> => {
    if (!user) return;
    const now = new Date();

    if (isSupabaseConfigured()) {
      // Server-authoritative path: the strict INSERT policy verifies the
      // consultation belongs to us and is bound to this astrologer.
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          consultation_id: review.consultationId,
          user_id: user.id,
          astrologer_id: review.astrologerId,
          rating: review.rating,
          comment: review.comment,
          user_name: review.userName,
          consultation_type: review.consultationType,
        })
        .select()
        .single();

      if (!error && data) {
        const saved: Review = {
          id: data.id,
          astrologerId: data.astrologer_id,
          userId: data.user_id,
          userName: review.userName,
          rating: data.rating,
          comment: review.comment,
          consultationType: review.consultationType,
          createdAt: new Date(data.created_at),
          helpful: 0,
        };
        const updated = [saved, ...userReviews];
        setUserReviews(updated);
        if (auth.user?.id) {
          await AsyncStorage.setItem(
            getUserStorageKey('userReviews', auth.user.id),
            JSON.stringify(updated),
          );
        }
        return;
      }
      if (error) {
        Logger.warn('review insert rejected', { error });
        throw new Error(error.message || 'Failed to save review');
      }
    }

    // Offline/dev fallback: local-only record (never pretends to be synced).
    const localReview: Review = {
      ...review,
      id: generateUUID(),
      userId: user.id,
      createdAt: now,
      helpful: 0,
    };
    const updated = [...userReviews, localReview];
    setUserReviews(updated);
    if (auth.user?.id) {
      await AsyncStorage.setItem(
        getUserStorageKey('userReviews', auth.user.id),
        JSON.stringify(updated),
      );
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        login: async () => { Logger.warn('UserContext.login is deprecated'); return false; },
        signup: async () => { Logger.warn('UserContext.signup is deprecated'); return false; },
        logout,
        updateProfile,
        updateBirthDetails,
        savedKundlis,
        addSavedKundli,
        removeSavedKundli,
        getSavedKundli,
        notificationSettings,
        updateNotificationSettings,
        currentSubscription,
        refreshSubscription,
        subscribe: async () => { Logger.warn('UserContext.subscribe is deprecated'); return false; },
        cancelSubscription: async () => { Logger.warn('UserContext.cancelSubscription is deprecated'); },
        referralCode: user?.referralCode || '',
        referralStats,
        applyReferralCode: async () => { Logger.warn('UserContext.applyReferralCode is deprecated — use AuthContext'); return false; },
        userReviews,
        addReview,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
