/**
 * Real-time Chat Service for Astrologer Consultations
 * 
 * Uses Supabase Realtime for live message updates
 * Falls back to polling when Supabase is not configured
 */

import { supabase, isSupabaseConfigured, subscribeToChat } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';
import { isAIFeaturesEnabled } from '@/config/ai-features';

const BLOCKS_KEY = '@user_blocks';

export interface ChatMessage {
  id: string;
  consultationId: string;
  senderType: 'user' | 'astrologer';
  senderId: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface Consultation {
  id: string;
  userId: string;
  astrologerId: string;
  type: 'chat' | 'call' | 'video';
  status: 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled' | 'declined';
  startTime?: Date;
  endTime?: Date;
  /** When the user booked a session for a future slot (scheduled bookings). */
  scheduledAt?: Date;
  durationMinutes: number;
  totalAmount: number;
  userRating?: number;
  userReview?: string;
  createdAt: Date;
}

export interface Astrologer {
  id: string;
  name: string;
  avatarUrl?: string;
  expertise: string;
  specializations: string[];
  languages: string[];
  experienceYears: number;
  rating: number;
  totalReviews: number;
  pricePerMinute: number;
  isVerified: boolean;
  isOnline: boolean;
  isAvailable: boolean;
  isAi: boolean;
  bio?: string;
}

type ChatSubscriptionEntry = {
  subscription: { unsubscribe: () => void };
  listeners: Set<(message: ChatMessage) => void>;
};

const chatSubscriptions: Map<string, ChatSubscriptionEntry> = new Map();

// Mocks are only served when the team opts in explicitly for development
// (EXPO_PUBLIC_USE_MOCK_API=true and __DEV__). In production a missing
// backend must fail loudly — fabricating consultations/messages that were
// never persisted would let a user "chat" and "book" with no record.
const ALLOW_DEV_MOCK =
  process.env.EXPO_PUBLIC_USE_MOCK_API === 'true' && __DEV__;

export const createConsultation = async (
  userId: string,
  astrologerId: string,
  type: 'chat' | 'call' | 'video',
  scheduledFor?: Date
): Promise<Consultation | null> => {
  try {
    if (isSupabaseConfigured()) {
      // Use secure RPC for server-authoritative creation. p_scheduled_at is
      // only included for scheduled bookings so the call still resolves on a
      // database where migration 029 (the 3-arg signature) is not applied.
      const params: Record<string, unknown> = {
        p_astrologer_id: astrologerId,
        p_type: type,
      };
      if (scheduledFor) {
        params.p_scheduled_at = scheduledFor.toISOString();
      }
      const { data, error } = await supabase.rpc('secure_create_consultation', params);

      if (error) {
        Logger.error('Chat service error:', error);
        return null;
      }

      if (!data || !data.success) {
        Logger.warn('Booking refused by server:', data?.message);
        throw new Error(data?.message || 'Booking failed');
      }

      // Fetch the newly created record
      const { data: consultation, error: fetchError } = await supabase
        .from('consultations')
        .select('id, user_id, astrologer_id, type, status, start_time, end_time, scheduled_at, duration_minutes, total_amount, user_rating, user_review, created_at')
        .eq('id', data.id)
        .single();
      
      if (fetchError) {
        // Log error to monitoring service
        // error-reporting-service.logError(fetchError);
        return null;
      }

      return mapDbConsultation(consultation);
    }

    // Mock fallback for development (opt-in only)
    if (ALLOW_DEV_MOCK) {
      return {
        id: `consultation_${Date.now()}`,
        userId,
        astrologerId,
        type,
        status: 'pending',
        scheduledAt: scheduledFor,
        durationMinutes: 0,
        totalAmount: 0,
        createdAt: new Date(),
      };
    }
    Logger.error('createConsultation: Supabase is not configured');
    return null;
  } catch (error) {
    // Log error to monitoring service
    // error-reporting-service.logError(error);
    return null
  }
};

/**
 * Start a consultation (change status to active).
 *
 * SECURITY: Uses the accept_consultation RPC for the astrologer side
 * and a secure update for the user side. The start_time is set
 * server-side to prevent client clock manipulation.
 */
export const startConsultation = async (consultationId: string): Promise<boolean> => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.rpc('accept_consultation', {
        p_consultation_id: consultationId,
      });

      if (error) {
        Logger.error('startConsultation RPC error:', error);
        return false;
      }
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) {
        Logger.warn('startConsultation refused by server:', result?.message);
        return false;
      }
    }

    return true;
  } catch (error) {
    Logger.error('startConsultation error:', error);
    return false;
  }
};

/**
 * End a consultation.
 *
 * SECURITY: totalAmount and durationMinutes are NOT accepted from the
 * client. The server derives the billed amount from the astrologer's
 * price_per_minute × elapsed duration.  The client may only signal
 * that the session is finished; pricing is server-authoritative.
 */
export const endConsultation = async (
  consultationId: string,
): Promise<boolean> => {
  try {
    if (isSupabaseConfigured()) {
      // Server-authoritative: the end_consultation RPC (migration 024)
      // verifies the caller is the booking user or assigned astrologer,
      // derives duration from the trusted start_time, keeps any amount the
      // billing meter already accumulated, and writes the earnings record.
      //
      // The previous implementation computed duration × price on the CLIENT
      // and issued a direct table update — which the
      // validate_consultation_status_change trigger rejects for non-
      // astrologers, so user-side ends always failed.
      const { data, error } = await supabase.rpc('end_consultation', {
        p_consultation_id: consultationId,
      });

      if (error) {
        Logger.error('endConsultation RPC error:', error);
        return false;
      }
      if (!data || data.success !== true) {
        Logger.warn('endConsultation refused by server:', data?.message);
        return false;
      }
    }

    return true;
  } catch (error) {
    Logger.error('endConsultation error:', error);
    return false;
  }
};

/**
 * End a consultation WITHOUT touching duration/amount.
 * Used by the astrologer side, where the authoritative duration + amount are
 * written by the user's per-minute billing meter. Avoids clobbering the
 * billed total with a zero.
 */
export const closeConsultation = async (consultationId: string): Promise<boolean> => {
  try {
    if (isSupabaseConfigured()) {
      // Go through the complete_consultation RPC (migration 011). The
      // previous direct UPDATE bypassed it, so NO astrologer_earnings row
      // or stats bump was ever created — astrologers were never paid for
      // sessions they ended themselves.
      const { data, error } = await supabase.rpc('complete_consultation', {
        p_consultation_id: consultationId,
      });
      if (error) {
        Logger.error('closeConsultation RPC error', error);
        return false;
      }
      if (!data || data.success !== true) {
        Logger.warn('closeConsultation refused by server:', data?.message);
        return false;
      }
    }
    return true;
  } catch (error) {
    Logger.error('closeConsultation exception', error);
    return false;
  }
};

/**
 * Send a chat message
 */
export const sendMessage = async (
  consultationId: string,
  senderType: 'user' | 'astrologer',
  senderId: string,
  message: string
): Promise<ChatMessage | null> => {
  try {
    if (isSupabaseConfigured()) {
      // The RPC derives sender_id and sender_type from auth.uid(). The legacy
      // arguments remain in this public signature for callers, but are never
      // sent to the database and cannot impersonate the other participant.
      void senderType;
      void senderId;
      const { data, error } = await supabase.rpc('send_consultation_message', {
        p_consultation_id: consultationId,
        p_message: message,
      });

      if (error) {
        Logger.error('Chat service error:', error);
        return null;
      }

      const result = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
      if (!result?.success) {
        Logger.warn('Message rejected by server:', result?.message);
        return null;
      }

      return mapDbMessage({
        id: String(result.id),
        consultation_id: String(result.consultation_id ?? consultationId),
        sender_id: String(result.sender_id),
        sender_type: result.sender_type === 'astrologer' ? 'astrologer' : 'user',
        message: String(result.message ?? ''),
        is_read: result.is_read === true,
        created_at: String(result.created_at ?? new Date().toISOString()),
      } as Database['public']['Tables']['chat_messages']['Row']);
    }

    // Fallback: Return mock message (opt-in dev mode only)
    if (ALLOW_DEV_MOCK) {
      return {
        id: `msg_${Date.now()}`,
        consultationId,
        senderType,
        senderId,
        message,
        isRead: false,
        createdAt: new Date(),
      };
    }
    Logger.error('sendMessage: Supabase is not configured');
    return null;
  } catch (error) {
    Logger.error('sendMessage error:', error);
    return null;
  }
};

/**
 * Get chat messages for a consultation
 */
export const getMessages = async (consultationId: string): Promise<ChatMessage[]> => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, consultation_id, sender_type, sender_id, message, is_read, created_at')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true });

      if (error) {
        Logger.error('Chat service error:', error);
        return [];
      }

      return (data as unknown as Database['public']['Tables']['chat_messages']['Row'][]).map(mapDbMessage);
    }

    return [];
  } catch (error) {
    // Log error to monitoring service
    // error-reporting-service.logError(error);
    return [];
  }
};

/**
 * Subscribe to real-time chat updates
 *
 * Tracks subscriptions per-consultation in a Map so opening two chat screens
 * at the same time (inbox + thread, or background thread) doesn't silently
 * tear down the other subscription.
 */
export const subscribeToChatMessages = (
  consultationId: string,
  onNewMessage: (message: ChatMessage) => void
): (() => void) => {
  if (!isSupabaseConfigured()) {
    Logger.warn('Chat realtime unavailable — Supabase is not configured');
    return () => {};
  }

  let entry = chatSubscriptions.get(consultationId);
  if (!entry) {
    const listeners = new Set<(message: ChatMessage) => void>();
    const subscription = subscribeToChat(consultationId, (newMessage) => {
      const mapped = mapDbMessage(newMessage);
      // Snapshot the set so a listener can safely unsubscribe during a
      // callback without skipping another active chat screen.
      for (const listener of Array.from(listeners)) listener(mapped);
    });
    entry = { subscription, listeners };
    chatSubscriptions.set(consultationId, entry);
  }

  entry.listeners.add(onNewMessage);
  let unsubscribed = false;
  return () => {
    if (unsubscribed) return;
    unsubscribed = true;
    const current = chatSubscriptions.get(consultationId);
    if (!current) return;
    current.listeners.delete(onNewMessage);
    if (current.listeners.size === 0) {
      current.subscription.unsubscribe();
      chatSubscriptions.delete(consultationId);
    }
  };
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  consultationId: string,
  _senderType: 'user' | 'astrologer'
): Promise<boolean> => {
  try {
    if (isSupabaseConfigured()) {
      // The server derives the caller and marks only messages sent by the
      // other participant. The old client update trusted sender_type and is
      // no longer permitted after migration 041.
      const { data, error } = await supabase.rpc('mark_consultation_messages_read', {
        p_consultation_id: consultationId,
      });
      if (error) {
        Logger.error('markMessagesAsRead error:', error);
        return false;
      }
      return typeof data === 'number' || Array.isArray(data) || data === null;
    }

    return true;
  } catch (error) {
    Logger.error('markMessagesAsRead error:', error);
    return false;
  }
};

/**
 * Get consultation details
 */
export const getConsultation = async (consultationId: string): Promise<Consultation | null> => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('consultations')
        .select('id, user_id, astrologer_id, type, status, start_time, end_time, scheduled_at, duration_minutes, total_amount, user_rating, user_review, created_at')
        .eq('id', consultationId)
        .single();

      if (error) {
        Logger.error('Chat service error:', error);
        return null;
      }

      return mapDbConsultation(data);
    }

    return null;
  } catch (error) {
    // Log error to monitoring service
    // error-reporting-service.logError(error);
    return null;
  }
};

/**
 * Get user's consultation history
 */
export const getConsultationHistory = async (userId: string): Promise<Consultation[]> => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          *,
          astrologer:astrologer_id (
            name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        Logger.error('Chat service error:', error);
        return [];
      }

      return data.map(item => ({
        ...mapDbConsultation(item),
        astrologerName: item.astrologer?.name,
        astrologerImage: item.astrologer?.avatar_url,
      }));
    }

    return [];
  } catch (error) {
    // Log error to monitoring service
    // error-reporting-service.logError(error);
    return [];
  }
};

/**
 * Rate a consultation
 */
export const rateConsultation = async (
  consultationId: string,
  rating: number,
  review?: string
): Promise<boolean> => {
  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.rpc('rate_consultation', {
        p_consultation_id: consultationId,
        p_user_rating: rating,
        p_user_review: review ?? null,
      });

      if (error) {
        Logger.error('rateConsultation RPC error:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    Logger.error('rateConsultation error:', error);
    return false;
  }
};

/**
 * Get available astrologers with advanced filtering and sorting
 */
export interface AstrologerQueryParams {
  specialization?: string;
  language?: string;
  minExperience?: number;
  maxPrice?: number;
  sortBy?: 'rating' | 'priceLow' | 'priceHigh' | 'experience';
}

export const getAvailableAstrologers = async (
  params?: AstrologerQueryParams
): Promise<Astrologer[]> => {
  try {
    const blockedIds = await getBlockedUsers();

    if (isSupabaseConfigured()) {
      let query = supabase
        .from('astrologers')
        .select('id, user_id, name, avatar_url, expertise, specializations, languages, experience_years, rating, total_reviews, total_consultations, price_per_minute, is_verified, is_online, is_available, is_ai, bio, available_from, available_to, created_at')
        .eq('is_online', true)
        .eq('is_available', true);

      // Exclude blocked astrologers
      if (blockedIds.length > 0) {
        query = query.not('id', 'in', `(${blockedIds.join(',')})`);
      }

      if (params?.maxPrice) {
        query = query.lte('price_per_minute', params.maxPrice);
      }

      const { data, error } = await query;
      if (error) return [];

      let astrologers = (data as unknown as Database['public']['Tables']['astrologers']['Row'][]).map(mapDbAstrologer);

      if (!isAIFeaturesEnabled()) {
        astrologers = astrologers.filter((a) => !a.isAi);
      }

      // Specialty filter
      if (params?.specialization) {
        astrologers = astrologers.filter(a => 
          a.specializations.some(s => s.toLowerCase().includes(params.specialization!.toLowerCase()))
        );
      }

      // Language filter
      if (params?.language) {
        astrologers = astrologers.filter(a => 
          a.languages.some(l => l.toLowerCase() === params.language!.toLowerCase())
        );
      }

      // Sorting
      if (params?.sortBy) {
        astrologers.sort((a, b) => {
          if (params.sortBy === 'rating') return b.rating - a.rating;
          if (params.sortBy === 'priceLow') return a.pricePerMinute - b.pricePerMinute;
          if (params.sortBy === 'priceHigh') return b.pricePerMinute - a.pricePerMinute;
          if (params.sortBy === 'experience') return b.experienceYears - a.experienceYears;
          return 0;
        });
      }

      return astrologers;
    }

    return [];
  } catch (error) {
    return [];
  }
};

/**
 * SAFETY & MODERATION
 */

export const blockUser = async (userId: string): Promise<void> => {
  try {
    const blocks = await getBlockedUsers();
    if (!blocks.includes(userId)) {
      blocks.push(userId);
      await AsyncStorage.setItem(BLOCKS_KEY, JSON.stringify(blocks));
    }
  } catch (e) {
    Logger.error('Failed to block user:', e);
  }
};

export const getBlockedUsers = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem(BLOCKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export type ReportContext = 'profile' | 'chat' | 'review' | 'community' | 'other';

export const reportAstrologer = async (
  astrologerId: string,
  reason: string,
  context: ReportContext = 'profile',
): Promise<boolean> => {
  try {
    if (!isSupabaseConfigured()) {
      Logger.info(`[MOCK REPORT] Reporting astrologer ${astrologerId} for: ${reason}`);
      return true;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Logger.warn('Report requires an authenticated user');
      return false;
    }

    const trimmedReason = reason.trim().slice(0, 1000);
    if (trimmedReason.length < 3) return false;

    const { error } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: user.id,
        reported_astrologer_id: astrologerId,
        context,
        reason: trimmedReason,
      });

    if (error) {
      Logger.error('Failed to submit content report', error);
      return false;
    }
    return true;
  } catch (error) {
    Logger.error('Failed to submit content report', error);
    return false;
  }
};

/**
 * Get astrologer by ID
 */
export const getAstrologer = async (astrologerId: string): Promise<Astrologer | null> => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('astrologers')
        .select('id, user_id, name, avatar_url, expertise, specializations, languages, experience_years, rating, total_reviews, total_consultations, price_per_minute, is_verified, is_online, is_available, is_ai, bio, available_from, available_to, created_at')
        .eq('id', astrologerId)
        .single();

      if (error) {
        Logger.error('Chat service error:', error);
        return null;
      }

      return mapDbAstrologer(data as unknown as Database['public']['Tables']['astrologers']['Row']);
    }

    return null;
  } catch (error) {
    // Log error to monitoring service
    // error-reporting-service.logError(error);
    return null;
  }
};

/**
 * Toggle the signed-in astrologer's online status. RLS ("Astrologers update
 * own") restricts this to their own row.
 */
export const setAstrologerOnline = async (
  astrologerId: string,
  isOnline: boolean,
): Promise<boolean> => {
  try {
    if (!isSupabaseConfigured()) return false;
    const { error } = await supabase
      .from('astrologers')
      .update({ is_online: isOnline, is_available: isOnline })
      .eq('id', astrologerId);
    if (error) {
      Logger.error('setAstrologerOnline error', error);
      return false;
    }
    return true;
  } catch (error) {
    Logger.error('setAstrologerOnline exception', error);
    return false;
  }
};

/**
 * ASTROLOGER-SIDE (console) helpers
 * Used by the practitioner app to receive and answer consultations.
 */

export interface AstrologerInbox {
  pending: Consultation[];
  active: Consultation[];
}

/**
 * Resolve the astrologer record for the currently signed-in user.
 * Returns null if the signed-in user is not an astrologer.
 */
export const getMyAstrologerProfile = async (userId: string): Promise<Astrologer | null> => {
  try {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('astrologers')
      .select('id, user_id, name, avatar_url, expertise, specializations, languages, experience_years, rating, total_reviews, total_consultations, price_per_minute, is_verified, is_online, is_available, is_ai, bio, available_from, available_to, created_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      Logger.error('getMyAstrologerProfile error', error);
      return null;
    }
    return data ? mapDbAstrologer(data as unknown as Database['public']['Tables']['astrologers']['Row']) : null;
  } catch (error) {
    Logger.error('getMyAstrologerProfile exception', error);
    return null;
  }
};

/**
 * Fetch the astrologer's inbox: pending (awaiting accept) + active sessions.
 */
export const getAstrologerInbox = async (astrologerId: string): Promise<AstrologerInbox> => {
  try {
    if (!isSupabaseConfigured()) return { pending: [], active: [] };

    const { data, error } = await supabase
      .from('consultations')
      .select('id, user_id, astrologer_id, type, status, start_time, end_time, scheduled_at, duration_minutes, total_amount, user_rating, user_review, created_at')
      .eq('astrologer_id', astrologerId)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: true });

    if (error) {
      Logger.error('getAstrologerInbox error', error);
      return { pending: [], active: [] };
    }

    const all = (data || []).map(mapDbConsultation);
    return {
      pending: all.filter(c => c.status === 'pending'),
      active: all.filter(c => c.status === 'active'),
    };
  } catch (error) {
    Logger.error('getAstrologerInbox exception', error);
    return { pending: [], active: [] };
  }
};

/**
 * Accept a pending consultation (server-validates the caller is the assigned
 * astrologer via accept_consultation RPC). Flips status to active.
 */
export const acceptConsultation = async (
  consultationId: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    if (!isSupabaseConfigured()) return { success: false, message: 'Service unavailable' };

    const { data, error } = await supabase.rpc('accept_consultation', {
      p_consultation_id: consultationId,
    });

    if (error) {
      Logger.error('acceptConsultation error', error);
      return { success: false, message: 'Could not accept consultation' };
    }
    const result = data as { success: boolean; message?: string };
    return { success: result?.success ?? false, message: result?.message };
  } catch (error) {
    Logger.error('acceptConsultation exception', error);
    return { success: false, message: 'Could not accept consultation' };
  }
};

/**
 * Subscribe to NEW pending consultations for an astrologer so the console can
 * surface incoming requests in real time.
 */
export const subscribeToAstrologerRequests = (
  astrologerId: string,
  onChange: () => void
): (() => void) => {
  if (!isSupabaseConfigured()) return () => {};

  const channel = supabase
    .channel(`astrologer-inbox:${astrologerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'consultations',
        filter: `astrologer_id=eq.${astrologerId}`,
      },
      () => onChange()
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
};

const mapDbMessage = (dbMessage: Database['public']['Tables']['chat_messages']['Row']): ChatMessage => ({
  id: dbMessage.id,
  consultationId: dbMessage.consultation_id,
  senderType: dbMessage.sender_type,
  senderId: dbMessage.sender_id,
  message: dbMessage.message,
  isRead: dbMessage.is_read,
  createdAt: new Date(dbMessage.created_at),
});

const mapDbConsultation = (dbConsultation: Database['public']['Tables']['consultations']['Row']): Consultation => ({
  id: dbConsultation.id,
  userId: dbConsultation.user_id,
  astrologerId: dbConsultation.astrologer_id,
  type: dbConsultation.type,
  status: dbConsultation.status,
  startTime: dbConsultation.start_time ? new Date(dbConsultation.start_time) : undefined,
  endTime: dbConsultation.end_time ? new Date(dbConsultation.end_time) : undefined,
  scheduledAt: dbConsultation.scheduled_at ? new Date(dbConsultation.scheduled_at) : undefined,
  durationMinutes: dbConsultation.duration_minutes || 0,
  totalAmount: dbConsultation.total_amount || 0,
  userRating: dbConsultation.user_rating ?? undefined,
  userReview: dbConsultation.user_review ?? undefined,
  createdAt: new Date(dbConsultation.created_at),
});

const mapDbAstrologer = (dbAstrologer: Database['public']['Tables']['astrologers']['Row']): Astrologer => ({
  id: dbAstrologer.id,
  name: dbAstrologer.name,
  avatarUrl: dbAstrologer.avatar_url ?? undefined,
  expertise: dbAstrologer.expertise,
  specializations: dbAstrologer.specializations || [],
  languages: dbAstrologer.languages || [],
  experienceYears: dbAstrologer.experience_years,
  rating: dbAstrologer.rating || 0,
  totalReviews: dbAstrologer.total_reviews || 0,
  pricePerMinute: dbAstrologer.price_per_minute,
  isVerified: dbAstrologer.is_verified,
  isOnline: dbAstrologer.is_online,
  isAvailable: dbAstrologer.is_available,
  isAi: dbAstrologer.is_ai ?? false,
  bio: dbAstrologer.bio ?? undefined,
});
