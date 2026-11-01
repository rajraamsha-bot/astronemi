/**
 * API Service
 *
 * Centralized API service for all backend calls.
 * NOTE: Authorization is enforced by Supabase Row Level Security (RLS)
 * on the server. Client-side auth checks are intentionally omitted
 * because they can be bypassed and provide false security.
 */

import { supabase } from '@/lib/supabase';
import { Logger } from '@/services/logger';
import {
  sanitizeInput,
  sanitizeProfileUpdate,
  sanitizeConsultationData,
  sanitizeReviewData,
} from '@/utils/validation';
import { transformAstrologer } from '@/lib/database.types';
import { isAIFeaturesEnabled } from '@/config/ai-features';
import type {
  Database,
  User as DbUser,
  Astrologer as DbAstrologer,
  UiAstrologer,
  Kundli as DbKundli,
  Consultation as DbConsultation,
  Subscription as DbSubscription,
  WalletTransaction as DbWalletTransaction,
  KundliMatch as DbKundliMatch,
  Horoscope as DbHoroscope,
  Review as DbReview,
  AstrologerAvailability as DbAvailability,
} from '@/lib/database.types';

type SupabaseError = { message: string } | null;

// Types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// AUTH HELPERS
// ============================================

/**
 * Get current authenticated user ID.
 * Returns null if not authenticated.
 *
 * The live session is the source of truth. (Previously an id was cached for
 * 5 minutes, which let an id survive sign-out / account switch when the
 * auth-state listener failed to fire. supabase's getSession() is a cheap
 * local read, so no cache is kept — this is race-free by construction.)
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// ============================================
// API REQUEST HANDLER
// ============================================

/**
 * Generic API request handler with consistent error handling and logging
 */
export async function apiRequest<T>(
  request: () => Promise<{ data: T | null; error: SupabaseError | string | null }>
): Promise<ApiResponse<T>> {
  try {
    const { data, error } = await request();

    if (error) {
      const errorMessage =
        typeof error === 'string' ? error : error?.message || 'An error occurred';
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? (error as Record<string, unknown>).code as string : null;

      // M1 fix: preserve auth-related statuses instead of collapsing them to
      // 500. React Query / route guards depend on distinguishing "token
      // expired" (401 — retry after refresh) from "server bug" (500) and
      // "RLS denied" (403).
      const lowerMsg = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : '';
      const isAuthFailure =
        /jwt|token|auth|unauthorized|expired/.test(lowerMsg) ||
        code === 'PGRST301' ||
        code === 'PGRST302';
      const status =
        code === 'PGRST116' ? 404
        : code === '23505' ? 409
        : code === '42501' ? 403
        : isAuthFailure ? 401
        : 500;
      Logger.error('API request failed', { error: errorMessage, code });
      return {
        data: null,
        error: errorMessage,
        status,
      };
    }

    return {
      data,
      error: null,
      status: 200,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Network error';
    Logger.error('API Request failed', err);
    return {
      data: null,
      error: errorMessage,
      status: 500,
    };
  }
}

// ============================================
// HOROSCOPE API
// ============================================

export const horoscopeApi = {
  /**
   * Get horoscope for a zodiac sign
   */
  async getHoroscope(
    sign: string,
    timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily'
  ): Promise<ApiResponse<DbHoroscope>> {
    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('horoscopes')
        .select('*')
        .eq('sign', sign.toLowerCase())
        .eq('period', timeframe)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return { data: null, error: error || { message: 'No horoscope found' } };
      }

      const raw = data as Record<string, any>;
      const formatted: DbHoroscope = {
        ...raw,
        rating: typeof raw.overall_rating === 'number' ? raw.overall_rating : (typeof raw.rating === 'number' ? raw.rating : 5),
        luck_color: raw.lucky_color ?? raw.luck_color ?? null,
        luck_number: Array.isArray(raw.lucky_numbers) && raw.lucky_numbers.length > 0
          ? String(raw.lucky_numbers[0])
          : (typeof raw.luck_number === 'string' ? raw.luck_number : null),
      } as DbHoroscope;

      return { data: formatted, error };
    });
  },
};

// ============================================
// PRODUCTS API
// ============================================

export interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  images: string[] | null;
  category: string | null;
  stock: number | null;
  is_available: boolean | null;
  rating: number | null;
  total_reviews: number | null;
}

export const productsApi = {
  /**
   * Catalog listing against the real `products` table (publicly readable via
   * RLS, migration 008). The shop screen previously faked this with a
   * hardcoded empty response — then overwrote the offline cache with that
   * empty list, so the shop rendered permanently empty.
   */
  async getProducts(params?: {
    category?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<DbProduct>>> {
    return apiRequest(async () => {
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('products')
        .select(
          'id, name, description, price, discount_price, images, category, stock, is_available, rating, total_reviews',
          { count: 'exact' }
        )
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (params?.category) {
        query = query.eq('category', params.category);
      }

      const { data, error, count } = await query;
      if (error) {
        return { data: null, error };
      }

      const total = count ?? 0;
      return {
        data: {
          data: (data ?? []) as DbProduct[],
          total,
          page,
          pageSize,
          hasMore: to + 1 < total,
        },
        error: null,
      };
    });
  },
};

// ============================================
// USER API
// ============================================

export const userApi = {
  /**
   * Get current user profile.
   * RLS ensures users can only read their own row.
   */
  async getProfile(userId: string): Promise<ApiResponse<DbUser>> {
    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone, email, avatar_url, birth_date, birth_time, birth_place, language, subscription_tier, subscription_ends_at, wallet_balance, referral_code, notifications_enabled, created_at')
        .eq('id', userId)
        .single();
      return { data: data as any, error };
    });
  },

  /**
   * Update user profile.
   * RLS ensures users can only update their own row.
   */
  async updateProfile(
    userId: string,
    updates: Partial<Database['public']['Tables']['users']['Update']>
  ): Promise<ApiResponse<DbUser>> {
    const sanitizedUpdates = sanitizeProfileUpdate(updates);

    // Route through update_user_profile RPC (migration 049). It allowlists
    // the columns the client can change and rejects anything else, so the
    // caller can't smuggle role/wallet/tier through the JSON payload. We
    // re-fetch the row afterwards so the API contract still returns the
    // canonical profile shape.
    //
    // The RPC accepts canonical users columns plus documented aliases
    // (migration 057: `name`, NOT full_name; `birth_date`, NOT
    // date_of_birth; `notifications_enabled`, NOT push_notifications_
    // enabled). Map between the two and drop anything the RPC does not
    // recognise, so the RPC's own allowlist is the final word.
    const RPC_KEYS: Record<string, string> = {
      avatarUrl: 'avatar_url',
      birthPlace: 'birth_place',
      notificationsEnabled: 'notifications_enabled',
    };
    const rpcUpdates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(sanitizedUpdates)) {
      rpcUpdates[RPC_KEYS[k] ?? k] = v;
    }
    return apiRequest(async () => {
      const { error: rpcError } = await supabase.rpc('update_user_profile', {
        p_user_id: userId,
        p_updates: rpcUpdates,
      });
      if (rpcError) {
        return { data: null, error: rpcError };
      }
      const { data, error } = await supabase
        .from('users')
        .select('id, phone, email, name, display_name, avatar_url, birth_date, birth_time, birth_place, birth_lat, birth_lng, zodiac_sign, nakshatra, role, wallet_balance, subscription_tier, subscription_ends_at, referral_code, referral_earnings, referred_by, notifications_enabled, language, created_at, updated_at')
        .eq('id', userId)
        .single();
      return { data, error };
    });
  },

  /**
   * Get user wallet balance.
   * RLS ensures users can only access their own wallet.
   */
  async getWalletBalance(userId: string): Promise<ApiResponse<number>> {
    const result = await apiRequest<{ wallet_balance: number }>(async () => {
      const { data, error } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', userId)
        .single();
      return { data, error };
    });

    return {
      data: result.data?.wallet_balance ?? 0,
      error: result.error,
      status: result.status,
    };
  },
};

// ============================================
// ASTROLOGERS API
// ============================================

export const astrologersApi = {
  /**
   * Get all astrologers with filters and sophisticated ranking
   */
  async getAll(params?: {
    search?: string;
    specialization?: string;
    language?: string;
    minRating?: number;
    sortBy?: 'rating' | 'priceLow' | 'priceHigh' | 'experience';
    isOnline?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<UiAstrologer>>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // NOTE: `specialization` (singular) does not exist on astrologers — the
    // column is `specializations` (TEXT[]). Selecting a non-existent column
    // makes PostgREST return PGRST204 and every list request error out.
    let query = supabase.from('astrologers').select('id, name, avatar_url, specializations, experience_years, rating, total_reviews, price_per_minute, languages, bio, is_online, is_verified, is_available, is_ai, created_at', { count: 'exact' });

    // Apply filters
    if (params?.search) {
      query = query.ilike('name', `%${params.search}%`);
    }
    if (params?.specialization) {
      query = query.contains('specializations', [params.specialization]);
    }
    if (params?.language) {
      query = query.contains('languages', [params.language]);
    }
    if (params?.minRating) {
      query = query.gte('rating', params.minRating);
    }
    if (params?.isOnline !== undefined) {
      query = query.eq('is_online', params.isOnline);
    }

    // Apply Sophisticated Ranking (AstroTalk Style)
    // 0. AI astrologers surface first only in AI-enabled builds. In v1
    //    production they are excluded from discovery entirely.
    if (isAIFeaturesEnabled()) {
      query = query.order('is_ai', { ascending: false });
    } else {
      query = query.eq('is_ai', false);
    }
    // 1. Online status next
    query = query.order('is_online', { ascending: false });

    // 2. Primary sort criteria
    const sortBy = params?.sortBy || 'rating';
    switch (sortBy) {
      case 'priceLow':
        query = query.order('price_per_minute', { ascending: true });
        break;
      case 'priceHigh':
        query = query.order('price_per_minute', { ascending: false });
        break;
      case 'experience':
        query = query.order('experience_years', { ascending: false });
        break;
      case 'rating':
      default:
        query = query.order('rating', { ascending: false });
        break;
    }

    // 3. Tie-breakers: total_reviews and then total_consultations
    query = query.order('total_reviews', { ascending: false });
    query = query.order('total_consultations', { ascending: false });

    try {
      const { data, error, count } = await query.range(from, to);

      if (error) {
        throw error;
      }

      // Offline Caching logic for first page updates
      if (page === 1) {
        const { offlineStorage } = await import('@/services/offline-storage');
        await offlineStorage.saveAstrologers(data || []);
      }

      return {
        data: {
          data: ((data || []) as unknown as DbAstrologer[]).map(transformAstrologer),
          total: count || 0,
          page,
          pageSize,
          hasMore: (count || 0) > to + 1,
        },
        error: null,
        status: 200,
      };
    } catch (err: unknown) {
      // Fallback to offline cache
      if (page === 1) {
        const { offlineStorage } = await import('@/services/offline-storage');
        const cachedAstrologers = await offlineStorage.getAstrologers();
        // Old caches may contain the AI persona from a previous build.
        const visibleCache = (cachedAstrologers ?? []).filter((row) => {
          if (isAIFeaturesEnabled()) return true;
          // Raw DB rows use snake_case; older caches may use UiAstrologer.
          const cached = row as { is_ai?: boolean; isAi?: boolean };
          return !cached.is_ai && !cached.isAi;
        });
        if (visibleCache.length > 0) {
          return {
            data: {
              data: visibleCache as any,
              total: visibleCache.length,
              page: 1,
              pageSize: visibleCache.length,
              hasMore: false,
            },
            error: null,
            status: 200,
          };
        }
      }

      const errorMessage = err instanceof Error ? err.message : 'Error fetching astrologers';
      return {
        data: null,
        error: errorMessage,
        status: 500,
      };
    }
  },

  /**
   * Get astrologer by ID
   */
  async getById(astrologerId: string): Promise<ApiResponse<DbAstrologer>> {
    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('astrologers')
        .select('id, name, avatar_url, specializations, experience_years, rating, total_reviews, price_per_minute, languages, bio, is_online, is_verified, is_ai, created_at')
        .eq('id', astrologerId)
        .single();
      return { data: data as any, error };
    });
  },

  /**
   * Get astrologer availability
   */
  async getAvailability(astrologer_id: string): Promise<ApiResponse<DbAvailability[]>> {
    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('astrologer_availability')
        .select('id, astrologer_id, day_of_week, start_time, end_time, is_available')
        .eq('astrologer_id', astrologer_id);
      return { data, error };
    });
  },
};

// ============================================
// REVIEWS API
// ============================================

export const reviewsApi = {
  /**
   * Get reviews for an astrologer
   */
  async getByAstrologerId(astrologerId: string): Promise<ApiResponse<DbReview[]>> {
    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, user_id, astrologer_id, rating, comment, created_at')
        .eq('astrologer_id', astrologerId)
        .order('created_at', { ascending: false });
      return { data: data as any, error };
    });
  },
};

// ============================================
// KUNDLI API
// ============================================

export const kundliApi = {
  async getAll(userId: string): Promise<ApiResponse<DbKundli[]>> {
    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('kundlis')
        .select('id, user_id, name, birth_date, birth_time, birth_place, kundli_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return { data: data as any, error };
    });
  },

  async getById(kundliId: string): Promise<ApiResponse<DbKundli>> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { data: null, error: 'Authentication required', status: 401 };
    }

    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('kundlis')
        .select('id, user_id, name, birth_date, birth_time, birth_place, kundli_data, created_at')
        .eq('id', kundliId)
        .eq('user_id', userId)
        .single();
      return { data: data as any, error };
    });
  },

  async save(
    kundli: Partial<Database['public']['Tables']['kundlis']['Insert']>
  ): Promise<ApiResponse<DbKundli>> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { data: null, error: 'Authentication required', status: 401 };
    }

    const sanitizedKundli = {
      ...kundli,
      user_id: userId,
      name: sanitizeInput(kundli.name || '', { maxLength: 100 }),
      birth_place: sanitizeInput(kundli.birth_place || '', { maxLength: 200 }),
    };

    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('kundlis')
        .insert(sanitizedKundli)
        .select()
        .single();
      return { data, error };
    });
  },

  async delete(kundliId: string): Promise<ApiResponse<void>> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { data: null, error: 'Authentication required', status: 401 };
    }

    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('kundlis')
        .delete()
        .eq('id', kundliId)
        .eq('user_id', userId);
      return { data, error };
    });
  },

  async saveMatch(
    match: Partial<Database['public']['Tables']['kundli_matches']['Insert']>
  ): Promise<ApiResponse<DbKundliMatch>> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { data: null, error: 'Authentication required', status: 401 };
    }

    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('kundli_matches')
        .insert({ ...match, user_id: userId })
        .select()
        .single();
      return { data, error };
    });
  },
};

// ============================================
// CONSULTATIONS API
// ============================================

export const consultationsApi = {
  async getAll(userId: string): Promise<ApiResponse<DbConsultation[]>> {
    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          id, user_id, astrologer_id, type, status, start_time, end_time, duration_minutes, total_amount, user_rating, created_at,
          astrologer:astrologers(name, avatar_url)
        `)
        .eq('user_id', userId)
        // List-screen feed: hard cap. Older history loads via dedicated
        // pagination rather than shipping the entire consultation history
        // on every mount.
        .limit(200)
        .order('created_at', { ascending: false });
      return { data: data as any, error };
    });
  },

  async getById(consultationId: string): Promise<ApiResponse<DbConsultation>> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { data: null, error: 'Authentication required', status: 401 };
    }

    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          id, user_id, astrologer_id, type, status, start_time, end_time, duration_minutes, total_amount, user_rating, created_at,
          astrologer:astrologers(id, name, avatar_url, specializations, price_per_minute)
        `)
        .eq('id', consultationId)
        .eq('user_id', userId)
        .single();
      return { data: data as any, error };
    });
  },

  async create(
    consultation: Partial<Database['public']['Tables']['consultations']['Insert']>
  ): Promise<ApiResponse<DbConsultation>> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { data: null, error: 'Authentication required', status: 401 };
    }

    const sanitizedConsultation = sanitizeConsultationData(consultation);

    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('consultations')
        .insert({ ...sanitizedConsultation, user_id: userId })
        .select()
        .single();
      return { data, error };
    });
  },

  async updateStatus(
    consultationId: string,
    status: Database['public']['Tables']['consultations']['Row']['status']
  ): Promise<ApiResponse<DbConsultation>> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { data: null, error: 'Authentication required', status: 401 };
    }

    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('consultations')
        .update({ status })
        .eq('id', consultationId)
        .eq('user_id', userId)
        .select()
        .single();
      return { data, error };
    });
  },

  async submitReview(
    consultationId: string,
    review: {
      rating: number;
      comment: string;
    }
  ): Promise<ApiResponse<DbReview>> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { data: null, error: 'Authentication required', status: 401 };
    }

    const { data: consultation } = await supabase
      .from('consultations')
      .select('user_id, astrologer_id')
      .eq('id', consultationId)
      .single();

    if (!consultation || consultation.user_id !== userId) {
      return { data: null, error: 'Unauthorized', status: 403 };
    }
    if (!consultation.astrologer_id) {
      return { data: null, error: 'Consultation has no astrologer', status: 409 };
    }

    const sanitizedReview = sanitizeReviewData(review);

    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          consultation_id: consultationId,
          user_id: userId,
          // astrologer_id is NOT NULL on reviews — the previous payload
          // omitted it, so every submit failed server-side.
          astrologer_id: consultation.astrologer_id,
          ...sanitizedReview,
        })
        .select()
        .single();
      return { data, error };
    });
  },
};

// ============================================
// WALLET API
// ============================================

export const walletApi = {
  async getTransactions(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<DbWalletTransaction>>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, type, amount, description, reference_id, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    return {
      data: {
        data: (data || []) as any,
        total: count || 0,
        page,
        pageSize,
        hasMore: (count || 0) > to + 1,
      },
      error: null,
      status: 200,
    };
  },
};

// ============================================
// SUBSCRIPTIONS API
// ============================================

export const subscriptionsApi = {
  async getActive(userId: string): Promise<ApiResponse<DbSubscription>> {
    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, user_id, plan_id, plan_name, amount, currency, start_date, end_date, is_active, payment_id, created_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      return { data: data as any, error };
    });
  },

  async getHistory(userId: string): Promise<ApiResponse<DbSubscription[]>> {
    return apiRequest(async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, user_id, plan_id, plan_name, amount, currency, start_date, end_date, is_active, payment_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return { data: data as any, error };
    });
  },
};
