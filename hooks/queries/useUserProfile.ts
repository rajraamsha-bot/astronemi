import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, consultationsApi, walletApi, subscriptionsApi } from '@/services/api';
import { offlineStorage } from '@/services/offline-storage';
import { Logger } from '@/services/logger';
import { getUserStorageKey } from '@/utils/user-storage-keys';
import {
  UserProfile,
  Consultation,
  WalletTransaction
} from '@/types/entities';

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user', 'profile', userId],
    queryFn: async () => {
      const storageKey = getUserStorageKey('user_profile', userId);
      try {
        const response = await userApi.getProfile(userId);
        
        if (response.error) {
          const cachedData = await offlineStorage.get<UserProfile>(storageKey);
          if (cachedData) {
            return cachedData;
          }
          throw new Error(response.error);
        }

        const profile = response.data;
        await offlineStorage.save(storageKey, profile);
        
        return profile;
      } catch (error) {
        const cachedData = await offlineStorage.get<UserProfile>(storageKey);
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) => {
      const response = await userApi.updateProfile(userId, updates);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', variables.userId] });
      const storageKey = getUserStorageKey('user_profile', variables.userId);
      offlineStorage.save(storageKey, data).catch(err =>
        Logger.warn('Failed to persist user profile offline', err)
      );
    },
  });
}

export function useUserConsultations(userId: string) {
  return useQuery({
    queryKey: ['user', 'consultations', userId],
    queryFn: async () => {
      const storageKey = getUserStorageKey('user_consultations', userId);
      try {
        const response = await consultationsApi.getAll(userId);
        
        if (response.error) {
          const cachedData = await offlineStorage.get<Consultation[]>(storageKey);
          if (cachedData) {
            return cachedData;
          }
          throw new Error(response.error);
        }

        const consultations = response.data || [];
        await offlineStorage.save(storageKey, consultations);
        
        return consultations;
      } catch (error) {
        const cachedData = await offlineStorage.get<Consultation[]>(storageKey);
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateConsultation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (consultation: Partial<Consultation>) => {
      const response = await consultationsApi.create(consultation);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_data, variables) => {
      if (variables.user_id) {
        queryClient.invalidateQueries({ queryKey: ['user', 'consultations', variables.user_id] });
      }
    },
  });
}

export function useWalletBalance(userId: string) {
  return useQuery({
    queryKey: ['user', 'wallet', userId],
    queryFn: async () => {
      const storageKey = getUserStorageKey('wallet_balance', userId);
      try {
        const response = await userApi.getWalletBalance(userId);
        
        if (response.error) {
          const cachedData = await offlineStorage.get<number>(storageKey);
          if (cachedData !== null) {
            return cachedData;
          }
          throw new Error(response.error);
        }

        const balance = response.data || 0;
        await offlineStorage.save(storageKey, balance);
        
        return balance;
      } catch (error) {
        const cachedData = await offlineStorage.get<number>(storageKey);
        if (cachedData !== null) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useWalletTransactions(userId: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['user', 'wallet', 'transactions', userId, page, pageSize],
    queryFn: async () => {
      const storageKey = getUserStorageKey('wallet_transactions', userId);
      try {
        const response = await walletApi.getTransactions(userId, page, pageSize);
        
        if (response.error) {
          const cachedData = await offlineStorage.get<WalletTransaction[]>(storageKey);
          if (cachedData) {
            return { data: cachedData, hasMore: false };
          }
          throw new Error(response.error);
        }

        const transactions = response.data?.data || [];
        if (page === 1) {
          await offlineStorage.save(storageKey, transactions);
        }
        
        return {
          data: transactions,
          hasMore: response.data?.hasMore || false,
        };
      } catch (error) {
        const cachedData = await offlineStorage.get<WalletTransaction[]>(storageKey);
        if (cachedData) {
          return { data: cachedData, hasMore: false };
        }
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useActiveSubscription(userId: string) {
  return useQuery({
    queryKey: ['user', 'subscription', userId],
    queryFn: async () => {
      const storageKey = getUserStorageKey('active_subscription', userId);
      try {
        const response = await subscriptionsApi.getActive(userId);
        
        if (response.error) {
          const cachedData = await offlineStorage.get<Record<string, unknown>>(storageKey);
          if (cachedData) {
            return cachedData;
          }
          return null;
        }

        const subscription = response.data;
        if (subscription) {
          await offlineStorage.save(storageKey, subscription);
        }
        
        return subscription;
      } catch (error) {
        const cachedData = await offlineStorage.get<Record<string, unknown>>(storageKey);
        if (cachedData) {
          return cachedData;
        }
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}