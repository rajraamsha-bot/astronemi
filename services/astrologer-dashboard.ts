/**
 * Astrologer Dashboard Service
 *
 * All API calls for the astrologer console: consultations, earnings,
 * availability, reviews, and profile management.
 *
 * Security: every function expects the caller to be authenticated
 * as an astrologer. Row Level Security (RLS) on Supabase enforces
 * this server-side.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from '@/services/logger';
import { errorReporting } from '@/services/error-reporting';
import { prefixedSecureId } from '@/utils/secure-random';
import type {
  AstrologerConsultation,
  AstrologerEarning,
  AvailabilitySlot,
  TimeOff,
  RatingBreakdown,
  Review,
  AstrologerProfile,
  ConsultationStatus,
} from '@/types/astrologer-dashboard';

// Simple TTL cache
const cache = new Map<string, { value: unknown; expires: number }>();
const CACHE_TTL_MS = 30_000;
function getCached<T>(key: string): T | null {
  const e = cache.get(key);
  if (!e || Date.now() > e.expires) return null;
  return e.value as T;
}
function setCache<T>(key: string, value: T): void {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}
function invalidateCache(prefix?: string): void {
  if (!prefix) { cache.clear(); return; }
  for (const k of Array.from(cache.keys())) if (k.startsWith(prefix)) cache.delete(k);
}

// ─── Mock data (dev only) ─────────────────────────────────────────────────
// Fake earnings/consultations must NEVER reach a real astrologer in
// production. Mocks are only served when the team explicitly opts in via
// `EXPO_PUBLIC_USE_MOCK_API=true` in development; otherwise a missing or
// misbehaving backend fails loudly (throw / empty list) instead of painting
// a fabricated dashboard over real money data.
const ALLOW_DEV_MOCK =
  process.env.EXPO_PUBLIC_USE_MOCK_API === 'true' && __DEV__;

const MOCK_PROFILE: AstrologerProfile = {
  id: 'astrologer_1',
  name: 'Acharya Sharma',
  email: 'sharma@astronemi.app',
  phone: '+919876543210',
  bio: 'Vedic astrologer with 15+ years of experience.',
  experienceYears: 15,
  specializations: ['Vedic', 'Marriage', 'Career', 'Remedies'],
  languages: ['English', 'Hindi', 'Sanskrit'],
  pricePerMinuteChat: 25,
  pricePerMinuteVoice: 30,
  pricePerMinuteVideo: 35,
  isVerified: true,
  isOnline: true,
  isAvailableForChat: true,
  isAvailableForVoice: true,
  isAvailableForVideo: true,
  stats: {
    totalEarnings: 487500, thisMonthEarnings: 32400,
    thisWeekEarnings: 8450, todayEarnings: 1200,
    totalConsultations: 487, thisMonthConsultations: 32,
    averageRating: 4.8, totalReviews: 312,
    responseTimeMinutes: 2, completionRate: 0.96, repeatClientRate: 0.42,
  },
  ratingBreakdown: { 5: 245, 4: 52, 3: 11, 2: 3, 1: 1 } as RatingBreakdown,
  payoutMethod: { type: 'bank', bankName: 'HDFC Bank', accountLast4: '4521', ifscLast4: '0001', isVerified: true },
  totalUnpaidEarnings: 8450,
};

function buildMockConsultations(): AstrologerConsultation[] {
  const now = Date.now();
  return [
    { id: 'c_001', userId: 'u_101', userName: 'Priya Sharma', userQuestion: 'Marriage compatibility question for next month', type: 'chat', status: 'pending', pricePerMinute: 25, durationMinutes: 0, totalAmount: 0, createdAt: new Date(now - 5 * 60 * 1000).toISOString() },
    { id: 'c_002', userId: 'u_102', userName: 'Rahul Verma', userQuestion: 'Career change decision', type: 'voice', status: 'accepted', pricePerMinute: 30, scheduledAt: new Date(now + 30 * 60 * 1000).toISOString(), durationMinutes: 0, totalAmount: 0, createdAt: new Date(now - 15 * 60 * 1000).toISOString() },
    { id: 'c_003', userId: 'u_103', userName: 'Anjali Patel', userQuestion: 'Health concerns as per horoscope', type: 'video', status: 'active', pricePerMinute: 35, startedAt: new Date(now - 8 * 60 * 1000).toISOString(), durationMinutes: 8, totalAmount: 280, createdAt: new Date(now - 12 * 60 * 1000).toISOString() },
    { id: 'c_004', userId: 'u_104', userName: 'Vikram Singh', type: 'chat', status: 'completed', pricePerMinute: 25, startedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(), endedAt: new Date(now - 1.5 * 60 * 60 * 1000).toISOString(), durationMinutes: 28, totalAmount: 700, rating: 5, review: 'Excellent guidance! Very accurate predictions.', createdAt: new Date(now - 2.5 * 60 * 60 * 1000).toISOString() },
    { id: 'c_005', userId: 'u_105', userName: 'Sneha Reddy', type: 'chat', status: 'completed', pricePerMinute: 25, startedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(), endedAt: new Date(now - 4.7 * 60 * 60 * 1000).toISOString(), durationMinutes: 18, totalAmount: 450, rating: 4, review: 'Good insights, would consult again.', createdAt: new Date(now - 5.2 * 60 * 60 * 1000).toISOString() },
  ];
}

function buildMockEarnings(): AstrologerEarning[] {
  const now = Date.now();
  return [
    { id: 'e_001', consultationId: 'c_004', userName: 'Vikram Singh', grossAmount: 700, platformFee: 210, netAmount: 490, status: 'pending', createdAt: new Date(now - 1.5 * 60 * 60 * 1000).toISOString() },
    { id: 'e_002', consultationId: 'c_005', userName: 'Sneha Reddy', grossAmount: 450, platformFee: 135, netAmount: 315, status: 'pending', createdAt: new Date(now - 4.7 * 60 * 60 * 1000).toISOString() },
    { id: 'e_003', consultationId: 'c_old1', userName: 'Amit Kumar', grossAmount: 1200, platformFee: 360, netAmount: 840, status: 'paid', paidAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'e_004', consultationId: 'c_old2', userName: 'Pooja Singh', grossAmount: 850, platformFee: 255, netAmount: 595, status: 'paid', paidAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString() },
  ];
}

const MOCK_AVAILABILITY: AvailabilitySlot[] = [
  { id: 'av_1', dayOfWeek: 1, startTime: '09:00', endTime: '13:00', isRecurring: true },
  { id: 'av_2', dayOfWeek: 1, startTime: '17:00', endTime: '21:00', isRecurring: true },
  { id: 'av_3', dayOfWeek: 2, startTime: '09:00', endTime: '13:00', isRecurring: true },
  { id: 'av_4', dayOfWeek: 2, startTime: '17:00', endTime: '21:00', isRecurring: true },
  { id: 'av_5', dayOfWeek: 3, startTime: '09:00', endTime: '21:00', isRecurring: true },
  { id: 'av_6', dayOfWeek: 4, startTime: '09:00', endTime: '13:00', isRecurring: true },
  { id: 'av_7', dayOfWeek: 5, startTime: '09:00', endTime: '21:00', isRecurring: true },
  { id: 'av_8', dayOfWeek: 6, startTime: '10:00', endTime: '18:00', isRecurring: true },
];

function buildMockReviews(): Review[] {
  const now = Date.now();
  return [
    { id: 'r_001', userName: 'Vikram Singh', rating: 5, comment: 'Excellent guidance! Very accurate predictions. Acharya ji was patient and answered all my questions.', consultationType: 'chat', createdAt: new Date(now - 1.5 * 60 * 60 * 1000).toISOString() },
    { id: 'r_002', userName: 'Sneha Reddy', rating: 4, comment: 'Good insights about my health concerns. Would have liked more detail on remedies.', consultationType: 'chat', createdAt: new Date(now - 4.7 * 60 * 60 * 1000).toISOString() },
    { id: 'r_003', userName: 'Amit Kumar', rating: 5, comment: 'Best astrologer I have consulted. Highly recommended for career guidance.', consultationType: 'voice', createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString() },
    { id: 'r_004', userName: 'Pooja Singh', rating: 5, comment: 'Very knowledgeable. Gave me clarity on my marriage prospects.', consultationType: 'chat', createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString() },
  ];
}

// ─── Service ──────────────────────────────────────────────────────────────
export const astrologerDashboard = {
  /**
   * Get the full profile of the currently-authenticated astrologer,
   * including stats, rating breakdown, and payout method.
   */
  async getProfile(): Promise<AstrologerProfile> {
    const cacheKey = 'astrologer:profile';
    const cached = getCached<AstrologerProfile>(cacheKey);
    if (cached) return cached;

    if (!isSupabaseConfigured()) {
      if (!ALLOW_DEV_MOCK) throw new Error('Astrologer profile unavailable');
      setCache(cacheKey, MOCK_PROFILE);
      return MOCK_PROFILE;
    }
    try {
      // FIX: filter by user_id. astrologers.id is the PROFILE id, not the
      // auth user id; without this filter .single() returned the first
      // public astrologer row (or failed when the table had 0 or 2+ rows).
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('astrologers')
        // Explicit column list: `SELECT *` fails under the column-level
        // grants on this table (bank_account/upi_id/payout_*/total_earnings
        // are excluded from client roles — financial PII).
        .select(`id, name, avatar_url, bio, expertise, experience_years,
                 specializations, languages, price_per_minute,
                 price_per_minute_chat, price_per_minute_voice,
                 price_per_minute_video, is_verified, is_online,
                 is_available, is_available_for_chat, is_available_for_voice,
                 is_available_for_video, last_seen_at, created_at, updated_at,
                 reviews:reviews(*)`)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      
      const { data: statsData } = await supabase
        .from('astrologer_dashboard_stats')
        .select('*')
        .eq('astrologer_id', data.id)
        .single();

      const profile = { ...data, stats: statsData } as unknown as AstrologerProfile;
      setCache(cacheKey, profile);
      return profile;
    } catch (err) {
      errorReporting.captureException(err as Error, { tags: { service: 'astrologer-dashboard' } });
      if (!ALLOW_DEV_MOCK) throw err instanceof Error ? err : new Error('Failed to load profile');
      Logger.warn('Falling back to mock astrologer profile');
      return MOCK_PROFILE;
    }
  },

  /**
   * List consultations for the current astrologer, optionally filtered
   * by status. Sorted by created_at descending.
   */
  async listConsultations(opts: { status?: ConsultationStatus | 'all'; limit?: number } = {}): Promise<AstrologerConsultation[]> {
    const { status = 'all', limit = 50 } = opts;
    const cacheKey = `astrologer:consultations:${status}:${limit}`;
    const cached = getCached<AstrologerConsultation[]>(cacheKey);
    if (cached) return cached;

    if (!isSupabaseConfigured()) {
      if (!ALLOW_DEV_MOCK) return [];
      let result = buildMockConsultations();
      if (status !== 'all') result = result.filter(c => c.status === status);
      setCache(cacheKey, result);
      return result;
    }
    try {
      let query = supabase
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      const { data, error } = await query;
      if (error) throw error;
      const list = (data || []) as unknown as AstrologerConsultation[];
      setCache(cacheKey, list);
      return list;
    } catch (err) {
      errorReporting.captureException(err as Error, { tags: { service: 'astrologer-dashboard' } });
      if (!ALLOW_DEV_MOCK) throw err instanceof Error ? err : new Error('Failed to load consultations');
      return buildMockConsultations();
    }
  },

  /**
   * Accept a pending consultation request. Atomically transitions the
   * status from 'pending' to 'accepted'.
   */
  async acceptConsultation(consultationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        if (!ALLOW_DEV_MOCK) return { success: false, error: 'Service unavailable' };
        invalidateCache('astrologer:consultations');
        return { success: true };
      }
      const { data, error } = await supabase.rpc('accept_consultation', {
        p_consultation_id: consultationId,
      });
      if (error) throw error;
      const result = (Array.isArray(data) ? data[0] : data) as
        | { success?: boolean; message?: string; status?: string }
        | null;
      if (!result?.success) {
        return { success: false, error: result?.message || 'Failed to accept consultation' };
      }
      invalidateCache('astrologer:consultations');
      Logger.info('Consultation accepted', { consultationId });
      return { success: true };
    } catch (err) {
      errorReporting.captureException(err as Error, { tags: { service: 'astrologer-dashboard' } });
      return { success: false, error: 'Failed to accept consultation' };
    }
  },

  /**
   * Decline a pending consultation request.
   */
  async declineConsultation(consultationId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        if (!ALLOW_DEV_MOCK) return { success: false, error: 'Service unavailable' };
        invalidateCache('astrologer:consultations');
        return { success: true };
      }
      const { data, error } = await supabase.rpc('decline_consultation', {
        p_consultation_id: consultationId,
        p_reason: reason ?? null,
      });
      if (error) throw error;
      const result = (Array.isArray(data) ? data[0] : data) as
        | { success?: boolean; message?: string; status?: string }
        | null;
      if (!result?.success) {
        return { success: false, error: result?.message || 'Failed to decline consultation' };
      }
      invalidateCache('astrologer:consultations');
      Logger.info('Consultation declined', { consultationId });
      return { success: true };
    } catch (err) {
      errorReporting.captureException(err as Error, { tags: { service: 'astrologer-dashboard' } });
      return { success: false, error: 'Failed to decline consultation' };
    }
  },

  /**
   * Mark an active consultation as completed. Triggers the
   * earnings record and wallet debit on the server.
   */
  async completeConsultation(consultationId: string, durationMinutes: number): Promise<{ success: boolean; error?: string; newBalance?: number; netEarned?: number }> {
    try {
      if (!isSupabaseConfigured()) {
        if (!ALLOW_DEV_MOCK) return { success: false, error: 'Service unavailable' };
        invalidateCache('astrologer:consultations');
        invalidateCache('astrologer:earnings');
        return { success: true };
      }
      const { data, error } = await supabase.rpc('complete_consultation', {
        p_consultation_id: consultationId,
        // Retained for the deployed function signature; migration 032 ignores
        // this client value and derives earnings from trusted server state.
        p_duration_minutes: durationMinutes,
      });
      if (error) throw error;
      const result = (Array.isArray(data) ? data[0] : data) as
        | { success?: boolean; message?: string; net_earnings?: number }
        | null;
      if (!result?.success) {
        return { success: false, error: result?.message || 'Failed to complete (already done?)' };
      }
      invalidateCache('astrologer:consultations');
      invalidateCache('astrologer:earnings');
      Logger.info('Consultation completed', { consultationId, durationMinutes, net: result.net_earnings });
      return {
        success: true,
        netEarned: result.net_earnings == null ? undefined : Number(result.net_earnings),
      };
    } catch (err) {
      errorReporting.captureException(err as Error, { tags: { service: 'astrologer-dashboard' } });
      return { success: false, error: 'Failed to complete consultation' };
    }
  },

  /**
   * List earnings (paid + pending payouts).
   */
  async listEarnings(opts: { status?: 'all' | 'pending' | 'paid' | 'processing'; limit?: number } = {}): Promise<AstrologerEarning[]> {
    const { status = 'all', limit = 50 } = opts;
    const cacheKey = `astrologer:earnings:${status}`;
    const cached = getCached<AstrologerEarning[]>(cacheKey);
    if (cached) return cached;

    if (!isSupabaseConfigured()) {
      if (!ALLOW_DEV_MOCK) return [];
      let result = buildMockEarnings();
      if (status !== 'all') result = result.filter(e => e.status === status);
      setCache(cacheKey, result);
      return result;
    }
    try {
      let query = supabase
        .from('astrologer_earnings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (status !== 'all') query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      const list = (data || []) as unknown as AstrologerEarning[];
      setCache(cacheKey, list);
      return list;
    } catch (err) {
      errorReporting.captureException(err as Error, { tags: { service: 'astrologer-dashboard' } });
      if (!ALLOW_DEV_MOCK) throw err instanceof Error ? err : new Error('Failed to load earnings');
      return buildMockEarnings();
    }
  },

  /**
   * Request a payout of all pending earnings.
   */
  async requestPayout(): Promise<{ success: boolean; payoutId?: string; amount?: number; error?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        if (!ALLOW_DEV_MOCK) return { success: false, error: 'Payout service unavailable' };
        return { success: true, payoutId: prefixedSecureId('payout', 12) };
      }
      const { data, error } = await supabase.rpc('request_astrologer_payout');
      if (error) throw error;
      // SQL returns TABLE(payout_id, amount). Extract first row.
      const payoutRow = (Array.isArray(data) ? data[0] : data) as
        | { payout_id: string; amount: number }
        | undefined;
      if (!payoutRow) {
        return { success: false, error: 'No payout was created' };
      }
      invalidateCache('astrologer:earnings');
      Logger.info('Payout requested', { payoutId: payoutRow.payout_id, amount: payoutRow.amount });
      return { success: true, payoutId: payoutRow.payout_id, amount: Number(payoutRow.amount) };
    } catch (err) {
      errorReporting.captureException(err as Error, { tags: { service: 'astrologer-dashboard' } });
      return { success: false, error: 'Failed to request payout' };
    }
  },

  /**
   * Get the astrologer's weekly availability schedule.
   */
  async getAvailability(): Promise<AvailabilitySlot[]> {
    const cacheKey = 'astrologer:availability';
    const cached = getCached<AvailabilitySlot[]>(cacheKey);
    if (cached) return cached;

    if (!isSupabaseConfigured()) {
      if (!ALLOW_DEV_MOCK) return [];
      setCache(cacheKey, MOCK_AVAILABILITY);
      return MOCK_AVAILABILITY;
    }
    try {
      // FIX: scope to the caller's own slots. availability_slots has a
      // public-read policy, so without the astrologer_id filter this
      // returned every astrologer's availability.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: profile } = await supabase
        .from('astrologers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!profile) throw new Error('Astrologer profile not found');
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('astrologer_id', profile.id)
        .order('day_of_week', { ascending: true });
      if (error) throw error;
      const list = (data || []) as unknown as AvailabilitySlot[];
      setCache(cacheKey, list);
      return list;
    } catch (err) {
      errorReporting.captureException(err as Error, { tags: { service: 'astrologer-dashboard' } });
      if (!ALLOW_DEV_MOCK) throw err instanceof Error ? err : new Error('Failed to load availability');
      return MOCK_AVAILABILITY;
    }
  },

  /**
   * Replace the astrologer's full weekly availability with a new set of slots.
   * The server is expected to delete all existing slots in a single transaction
   * and insert the new ones.
   */
  async setAvailability(slots: Omit<AvailabilitySlot, 'id'>[]): Promise<{ success: boolean; error?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        if (!ALLOW_DEV_MOCK) return { success: false, error: 'Service unavailable' };
        invalidateCache('astrologer:availability');
        return { success: true };
      }
      const { error } = await supabase.rpc('set_astrologer_availability', {
        p_slots: slots.map((s) => ({
          day_of_week: s.dayOfWeek,
          start_time: s.startTime,
          end_time: s.endTime,
          is_recurring: s.isRecurring,
        })),
      });
      if (error) throw error;
      invalidateCache('astrologer:availability');
      Logger.info('Availability updated', { slotCount: slots.length });
      return { success: true };
    } catch (err) {
      errorReporting.captureException(err as Error, { tags: { service: 'astrologer-dashboard' } });
      return { success: false, error: 'Failed to update availability' };
    }
  },

  /**
   * Add a one-off time-off block (vacation, festival, illness, etc.).
   */
  async addTimeOff(timeOff: Omit<TimeOff, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const id = prefixedSecureId('timeoff', 8);
      if (!isSupabaseConfigured()) {
        if (!ALLOW_DEV_MOCK) return { success: false, error: 'Service unavailable' };
        return { success: true, id };
      }
      // FIX: astrologer_time_off.astrologer_id is NOT NULL and references
      // astrologers.id — the old insert omitted it and always failed the
      // NOT NULL constraint. Resolve the caller's profile id first.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: profile } = await supabase
        .from('astrologers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!profile) throw new Error('Astrologer profile not found');
      const { error } = await supabase.from('astrologer_time_off').insert({
        id,
        astrologer_id: profile.id,
        start_date: timeOff.startDate,
        end_date: timeOff.endDate,
        reason: timeOff.reason || null,
      });
      if (error) throw error;
      return { success: true, id };
    } catch (err) {
      errorReporting.captureException(err as Error, { tags: { service: 'astrologer-dashboard' } });
      return { success: false, error: 'Failed to add time off' };
    }
  },

  /**
   * List recent reviews left by users.
   */
  async listReviews(opts: { limit?: number } = {}): Promise<Review[]> {
    const { limit = 20 } = opts;
    const cacheKey = `astrologer:reviews:${limit}`;
    const cached = getCached<Review[]>(cacheKey);
    if (cached) return cached;

    if (!isSupabaseConfigured()) {
      if (!ALLOW_DEV_MOCK) return [];
      const list = buildMockReviews().slice(0, limit);
      setCache(cacheKey, list);
      return list;
    }
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      const list = (data || []) as unknown as Review[];
      setCache(cacheKey, list);
      return list;
    } catch (err) {
      errorReporting.captureException(err as Error, { tags: { service: 'astrologer-dashboard' } });
      if (!ALLOW_DEV_MOCK) throw err instanceof Error ? err : new Error('Failed to load reviews');
      return buildMockReviews().slice(0, limit);
    }
  },

  /**
   * Update editable fields on the astrologer's profile.
   */
  async updateProfile(updates: {
    bio?: string;
    pricePerMinuteChat?: number;
    pricePerMinuteVoice?: number;
    pricePerMinuteVideo?: number;
    isAvailableForChat?: boolean;
    isAvailableForVoice?: boolean;
    isAvailableForVideo?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        if (!ALLOW_DEV_MOCK) return { success: false, error: 'Service unavailable' };
        invalidateCache('astrologer:profile');
        return { success: true };
      }
      // FIX: filter by user_id (astrologers.id is the profile id, which is
      // never the auth user id). The old filter silently matched zero rows.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('astrologers')
        .update({
          bio: updates.bio,
          price_per_minute_chat: updates.pricePerMinuteChat,
          price_per_minute_voice: updates.pricePerMinuteVoice,
          price_per_minute_video: updates.pricePerMinuteVideo,
          is_available_for_chat: updates.isAvailableForChat,
          is_available_for_voice: updates.isAvailableForVoice,
          is_available_for_video: updates.isAvailableForVideo,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      if (error) throw error;
      invalidateCache('astrologer:profile');
      Logger.info('Profile updated');
      return { success: true };
    } catch (err) {
      errorReporting.captureException(err as Error, { tags: { service: 'astrologer-dashboard' } });
      return { success: false, error: 'Failed to update profile' };
    }
  },

  /**
   * Set the astrologer's online/offline status. When offline, no new
   * consultation requests will be routed to them.
   */
  async setOnlineStatus(online: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        if (!ALLOW_DEV_MOCK) return { success: false, error: 'Service unavailable' };
        return { success: true };
      }
      // FIX: filter by user_id (see updateProfile).
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('astrologers')
        .update({ is_online: online, last_seen_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;
      invalidateCache('astrologer:profile');
      return { success: true };
    } catch (err) {
      errorReporting.captureException(err as Error, { tags: { service: 'astrologer-dashboard' } });
      return { success: false, error: 'Failed to update online status' };
    }
  },
};

export default astrologerDashboard;
