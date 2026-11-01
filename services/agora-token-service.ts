/**
 * Agora Token Service
 * 
 * SECURITY: Token generation should ALWAYS be done server-side.
 * This service provides the client-side interface for fetching tokens
 * from your backend API.
 * 
 * Why server-side token generation?
 * - App Certificate must NEVER be exposed in client code
 * - Tokens should have limited validity (e.g., 24 hours)
 * - Server can enforce rate limiting and access control
 * 
 * Setup:
 * 1. Deploy the Supabase Edge Function: supabase/functions/agora-token/index.ts
 * 2. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE in Supabase secrets
 * 3. Call getTokenFromServer() before joining a channel
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from '@/services/logger';

export interface AgoraTokenConfig {
  channelName: string;
  astrologerId?: string; // Required by server to check wallet balance and pricing
  uid?: number;
  role?: 'publisher' | 'subscriber';
  expireTime?: number; // Token validity in seconds (default: 24 hours)
}

export interface AgoraTokenResponse {
  token: string;
  channelName: string;
  uid: number;
  expireAt: number;
}

// Token cache to reduce API calls
const tokenCache = new Map<string, { token: string; expireAt: number }>();

/**
 * Get Agora token from server
 * This should be called before joining a video call or live stream
 */
export const getAgoraToken = async (config: AgoraTokenConfig): Promise<AgoraTokenResponse | null> => {
  const { channelName, astrologerId = 'unknown', uid = 0, role = 'publisher', expireTime = 86400 } = config;
  
  // Check cache first
  const cacheKey = `${channelName}:${uid}:${role}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expireAt > Date.now() + 60000) {
    // Return cached token if it has more than 1 minute validity
    return {
      token: cached.token,
      channelName,
      uid,
      expireAt: cached.expireAt,
    };
  }
  
  if (!isSupabaseConfigured()) {
    Logger.warn('Agora token generation requires Supabase configuration');
    return null;
  }
  
  try {
    // Call Supabase Edge Function to generate token
    const { data, error } = await supabase.functions.invoke('agora-token', {
      body: {
        channelName,
        astrologerId,
        uid,
        role,
        expireTime,
      },
    });
    
    if (error) {
      Logger.error('Error generating Agora token:', error.message);
      return null;
    }
    
    if (data?.token) {
      // Cache the token
      tokenCache.set(cacheKey, {
        token: data.token,
        expireAt: data.expireAt || Date.now() + expireTime * 1000,
      });
      
      return {
        token: data.token,
        channelName,
        uid: data.uid || uid,
        expireAt: data.expireAt,
      };
    }
    
    return null;
  } catch (error) {
    Logger.error('Error fetching Agora token:', error);
    return null;
  }
};

/**
 * Clear token cache (call on logout)
 */
export const clearAgoraTokenCache = (): void => {
  tokenCache.clear();
};

/**
 * Check if Agora is configured
 */
export const isAgoraConfigured = (): boolean => {
  const appId = process.env.EXPO_PUBLIC_AGORA_APP_ID;
  return Boolean(appId && appId.length > 0 && !appId.includes('your-agora'));
};

/**
 * Get Agora App ID (safe to expose on client)
 */
export const getAgoraAppId = (): string => {
  return process.env.EXPO_PUBLIC_AGORA_APP_ID || '';
};

export default {
  getToken: getAgoraToken,
  clearCache: clearAgoraTokenCache,
  isConfigured: isAgoraConfigured,
  getAppId: getAgoraAppId,
};
