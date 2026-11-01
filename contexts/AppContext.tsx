import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
}

export const [AppProvider, useApp] = createContextHook(() => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // C3 fix: the old stub returned `walletBalance: 0` forever, so the wallet
  // header/consultation gates always showed ₹0 even when the user had money.
  // We now mirror the balance from AuthContext (users.wallet_balance on the
  // server) and fall back to a direct read for screens that mount AppContext
  // without AuthContext.
  const [walletBalance, setWalletBalance] = useState<number>(0);

  const loadProfileData = async () => {
    try {
      const stored = await AsyncStorage.getItem('profile');
      if (stored) {
        setUserProfile(JSON.parse(stored));
      }
    } catch (error) {
      Logger.error('Error loading profile data:', error);
    }
  };

  useEffect(() => {
    loadProfileData().catch(err => Logger.error('Error in loadProfileData:', err));

    // Hydrate walletBalance from the auth-protected users row. RLS ensures
    // we only see our own row. If the user isn't signed in (or the row
    // doesn't exist yet) this simply stays 0 — that's the true state.
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted || !user) return;
        const { data } = await supabase
          .from('users')
          .select('wallet_balance')
          .eq('id', user.id)
          .single();
        if (!mounted) return;
        setWalletBalance((data as { wallet_balance?: number } | null)?.wallet_balance ?? 0);
      } catch (e) {
        Logger.warn('AppContext: could not hydrate walletBalance', { error: e });
      }
    })();
    return () => { mounted = false; };
  }, []);

  const saveProfile = useCallback(async (profile: UserProfile) => {
    try {
      await AsyncStorage.setItem('profile', JSON.stringify(profile));
      setUserProfile(profile);
    } catch (error) {
      Logger.error('Error saving profile data:', error);
    }
  }, []);

  const updateProfile = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
    saveProfile(profile);
  }, [saveProfile]);

  // C3 fix: wallet state is read-mostly. Sever side mutation happens through
  // payment.ts (topUpWallet) / wallet.ts (debit_wallet RPC). These stubs only
  // adjust the local *display* value so the UI reflects a confirmed credit;
  // they NEVER persist to storage or the server.
  const addMoney = useCallback(async (amount: number = 0) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setWalletBalance(prev => Math.round((prev + amount) * 100) / 100);
  }, []);

  const deductMoney = useCallback((amount: number = 0) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setWalletBalance(prev => Math.max(0, Math.round((prev - amount) * 100) / 100));
  }, []);

  // Pull the authoritative balance from the server (used after a top-up
  // lands via webhook, so the UI doesn't show a stale pre-topup value).
  const refreshWalletBalance = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();
      const serverBalance = (data as { wallet_balance?: number } | null)?.wallet_balance;
      if (typeof serverBalance === 'number') {
        setWalletBalance(serverBalance);
      }
    } catch (e) {
      Logger.warn('AppContext: refreshWalletBalance failed', { error: e });
    }
  }, []);

  return {
    userProfile,
    isLoading: false,
    updateProfile,
    addMoney,
    deductMoney,
    walletBalance,
    refreshWalletBalance,
    transactions: [],
  };
});
