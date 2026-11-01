/**
 * AstrologerPro Service
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from '@/services/logger';
import { errorReporting } from '@/services/error-reporting';

export interface AstrologerPlan {
  id: string;
  slug: 'free' | 'pro' | 'elite';
  displayName: string;
  monthlyPriceInr: number;
  yearlyPriceInr: number;
  rankBoost: number;
  visibilityMultiplier: number;
  badgeColor: string;
  maxProfilePhotos: number;
  canSetCustomRate: boolean;
  canLivestream: boolean;
  prioritySupport: boolean;
  features: string[];
  isActive: boolean;
  displayOrder: number;
}

export interface AstrologerSubscription {
  id: string;
  astrologerId: string;
  planId: string;
  planSlug: 'free' | 'pro' | 'elite';
  planDisplayName: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  billingCycle: 'monthly' | 'yearly';
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  amountPaidInr: number;
  autoRenew: boolean;
}

interface PlanRow {
  id: string;
  slug: string;
  display_name: string;
  monthly_price_inr: number;
  yearly_price_inr: number;
  rank_boost: number;
  visibility_multiplier: number;
  badge_color: string;
  max_profile_photos: number;
  can_set_custom_rate: boolean;
  can_livestream: boolean;
  priority_support: boolean;
  features_json: unknown;
  is_active: boolean;
  display_order: number;
}

interface SubscriptionRow {
  id: string;
  astrologer_id: string;
  plan_id: string;
  status: AstrologerSubscription['status'];
  billing_cycle: 'monthly' | 'yearly';
  started_at: string;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  amount_paid_inr: number;
  auto_renew: boolean;
  astrologer_subscription_plans: PlanRow;
}

function mapPlan(row: PlanRow): AstrologerPlan {
  return {
    id: row.id,
    slug: row.slug as 'free' | 'pro' | 'elite',
    displayName: row.display_name,
    monthlyPriceInr: Number(row.monthly_price_inr),
    yearlyPriceInr: Number(row.yearly_price_inr),
    rankBoost: row.rank_boost,
    visibilityMultiplier: Number(row.visibility_multiplier),
    badgeColor: row.badge_color,
    maxProfilePhotos: row.max_profile_photos,
    canSetCustomRate: row.can_set_custom_rate,
    canLivestream: row.can_livestream,
    prioritySupport: row.priority_support,
    features: Array.isArray(row.features_json) ? row.features_json as string[] : [],
    isActive: row.is_active,
    displayOrder: row.display_order,
  };
}

function mapSubscription(row: SubscriptionRow): AstrologerSubscription {
  return {
    id: row.id,
    astrologerId: row.astrologer_id,
    planId: row.plan_id,
    planSlug: (row.astrologer_subscription_plans.slug as 'free' | 'pro' | 'elite'),
    planDisplayName: row.astrologer_subscription_plans.display_name,
    status: row.status,
    billingCycle: row.billing_cycle,
    startedAt: row.started_at,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelledAt: row.cancelled_at,
    amountPaidInr: Number(row.amount_paid_inr),
    autoRenew: row.auto_renew,
  };
}

export const astrologerProService = {
  async listPlans(): Promise<AstrologerPlan[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('astrologer_subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      Logger.error('Failed to list AstroPro plans', error);
      return [];
    }
    return (data as PlanRow[]).map(mapPlan);
  },

  async getCurrentSubscription(astrologerId: string): Promise<AstrologerSubscription | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('astrologer_subscriptions')
      .select('*, astrologer_subscription_plans(*)')
      .eq('astrologer_id', astrologerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      Logger.error('Failed to fetch current subscription', error, { astrologerId });
      return null;
    }
    if (!data) return null;
    return mapSubscription(data as SubscriptionRow);
  },

  async subscribe(
    astrologerId: string,
    planSlug: 'pro' | 'elite',
    billingCycle: 'monthly' | 'yearly',
    paymentId: string,
  ): Promise<{ success: boolean; message: string; subscriptionId?: string; endsAt?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Subscription service unavailable' };
    }

    // SECURITY FIX: Validate payment ID is provided (no free subscriptions)
    if (!paymentId || paymentId.trim().length === 0) {
      return { success: false, message: 'Payment verification required' };
    }

    try {
      // SECURITY FIX: Use secure payment-verified function instead of direct subscribe_astrologer
      // The secure function verifies payment completion, amount, type, and prevents reuse
      const { data, error } = await supabase.rpc('subscribe_astrologer_secure', {
        p_astrologer_id: astrologerId,
        p_plan_slug: planSlug,
        p_billing_cycle: billingCycle,
        p_payment_id: paymentId,
      });

      if (error) {
        Logger.error('subscribe_astrologer_secure RPC failed', error, { astrologerId, planSlug });
        return { success: false, message: 'Failed to activate subscription' };
      }

      const result = data as { success: boolean; message: string; subscription_id?: string; ends_at?: string };
      if (!result?.success) {
        return { success: false, message: result?.message ?? 'Subscription failed' };
      }

      return {
        success: true,
        message: result.message,
        subscriptionId: result.subscription_id,
        endsAt: result.ends_at,
      };
    } catch (e) {
      errorReporting.captureException(e as Error, { tags: { service: 'astrologer-pro' } });
      return { success: false, message: 'Subscription failed' };
    }
  },

  async cancel(
    astrologerId: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Subscription service unavailable' };
    }

    try {
      const { error } = await supabase.rpc('cancel_astrologer_subscription', {
        p_astrologer_id: astrologerId,
        p_reason: reason ?? null,
      });

      if (error) {
        Logger.error('cancel_astrologer_subscription RPC failed', error, { astrologerId });
        return { success: false, message: 'Failed to cancel subscription' };
      }

      return { success: true, message: 'Subscription cancelled. Access continues until period end.' };
    } catch (e) {
      errorReporting.captureException(e as Error, { tags: { service: 'astrologer-pro' } });
      return { success: false, message: 'Cancellation failed' };
    }
  },

  async getMarketplaceRanking(opts: {
    specialty?: string;
    language?: string;
    minRating?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<unknown[]> {
    if (!isSupabaseConfigured()) return [];

    let q = supabase
      .from('astrologer_marketplace_ranking')
      .select('*')
      .order('ranking_score', { ascending: false });

    if (opts.specialty) {
      q = q.contains('specialties', [opts.specialty]);
    }
    if (opts.language) {
      q = q.contains('languages', [opts.language]);
    }
    if (typeof opts.minRating === 'number') {
      q = q.gte('rating', opts.minRating);
    }
    if (opts.limit) {
      q = q.limit(opts.limit);
    }
    if (opts.offset) {
      q = q.range(opts.offset, opts.offset + (opts.limit ?? 20) - 1);
    }

    const { data, error } = await q;
    if (error) {
      Logger.error('Failed to fetch marketplace ranking', error);
      return [];
    }
    return data ?? [];
  },
};

export default astrologerProService;
