/**
 * Supabase Client Configuration
 * 
 * Setup Instructions:
 * 1. Create a project at https://supabase.com
 * 2. Go to Project Settings > API
 * 3. Copy your Project URL and anon/public key
 * 4. Add to .env:
 *    EXPO_PUBLIC_SUPABASE_URL=your-project-url
 *    EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 */

import { createClient } from '@supabase/supabase-js';
import { secureGetItem, secureSetItem, secureRemoveItem } from '@/utils/secure-storage';
import { Database } from '@/lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Custom storage wrapper for Supabase Auth to use our secure utilities
const SecureAuthStorage = {
  getItem: (key: string) => secureGetItem(key),
  setItem: (key: string, value: string) => secureSetItem(key, value),
  removeItem: (key: string) => secureRemoveItem(key),
};

// Validate configuration - throw error in production if not configured
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && 
  !supabaseUrl.includes('your-project') && 
  !supabaseAnonKey.includes('your-anon-key'));

// Use __DEV__ instead of NODE_ENV for Expo/RN reliability
// __DEV__ is set by Metro bundler and is always reliable in Expo builds
if (!isConfigured && !__DEV__) {
  throw new Error(
    'Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.'
  );
}

// Use generic client to avoid type issues with database schema
export const supabase = isConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: SecureAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        storage: {
          getItem: async () => null,
          setItem: async () => {},
          removeItem: async () => {},
        },
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

// Helper to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return isConfigured;
};

// Real-time subscription helpers
export const subscribeToChat = (
  consultationId: string,
  onMessage: (message: Database['public']['Tables']['chat_messages']['Row']) => void
) => {
  return supabase
    .channel(`chat:${consultationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `consultation_id=eq.${consultationId}`,
      },
      (payload: { new: Database['public']['Tables']['chat_messages']['Row'] }) => onMessage(payload.new)
    )
    .subscribe();
};

export const subscribeToNotifications = (
  userId: string,
  onNotification: (notification: Database['public']['Tables']['notifications']['Row']) => void
) => {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload: { new: Database['public']['Tables']['notifications']['Row'] }) => onNotification(payload.new)
    )
    .subscribe();
};

export const subscribeToConsultationStatus = (
  consultationId: string,
  onStatusChange: (consultation: Database['public']['Tables']['consultations']['Row']) => void
) => {
  return supabase
    .channel(`consultation:${consultationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'consultations',
        filter: `id=eq.${consultationId}`,
      },
      (payload: { new: Database['public']['Tables']['consultations']['Row'] }) => onStatusChange(payload.new)
    )
    .subscribe();
};
