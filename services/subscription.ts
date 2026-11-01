/**
 * Subscription Management Service
 * 
 * Handles subscription plans, payments, and benefits
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { processSubscriptionPayment } from './payment';
import { Logger } from './logger';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  duration: 'monthly' | 'yearly';
  features: string[];
  highlighted?: boolean;
  popular?: boolean;
  color: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  paymentId?: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
}

interface DbSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  payment_id?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

// Available subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    originalPrice: 0,
    duration: 'monthly',
    features: [
      'Daily Horoscope',
      'Basic Panchang',
      'AI Chat Trial (5 messages)',
      'View Astrologer Profiles',
    ],
    color: '#9E9E9E',
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 199,
    originalPrice: 299,
    duration: 'monthly',
    features: [
      'All Free Features',
      'Weekly & Monthly Horoscopes',
      'AI Chat (10/day)',
      '5 Free Consultation Minutes',
      'Save Multiple Kundlis',
      'Ad-free Experience',
    ],
    popular: true,
    color: '#6B46C1',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 499,
    originalPrice: 799,
    duration: 'monthly',
    features: [
      'All Basic Features',
      'Yearly Predictions',
      'Transit Reports (Gochar)',
      '20 Free Consultation Minutes',
      'AI Chat (25/day)',
      'Priority Astrologer Access',
      'PDF Report Downloads',
      'Professional Precision Engine (KP)',
      'Professional Gemstone Recommendations',
      'Exclusive Remedies',
    ],
    highlighted: true,
    color: '#9F7AEA',
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 999,
    originalPrice: 1499,
    duration: 'monthly',
    features: [
      'All Premium Features',
      'Unlimited Consultations*',
      'AI Guru Insights (50/day)',
      'Daily Transit (Gochar) Dashboard',
      'VIP Astrologer Access',
      'Personalized Daily Guidance',
      'Sade Sati & Transit Alerts',
      'Family Kundli Storage (5)',
      'Priority Support 24/7',
      'Exclusive Events Access',
      'Soulmate Synthesis (AI)',
    ],
    color: '#FFD700',
  },
];

// Yearly discount percentage
export const YEARLY_DISCOUNT = 40;

/**
 * Get all available plans
 */
export const getPlans = (): SubscriptionPlan[] => {
  return SUBSCRIPTION_PLANS;
};

/**
 * Get plan by ID
 */
export const getPlanById = (planId: string): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS.find(p => p.id === planId);
};

/**
 * Calculate yearly price
 */
export const calculateYearlyPrice = (monthlyPrice: number): number => {
  const yearlyFullPrice = monthlyPrice * 12;
  const discountedPrice = yearlyFullPrice * (1 - YEARLY_DISCOUNT / 100);
  return Math.round(discountedPrice);
};

/**
 * Get user's current subscription
 */
export const getCurrentSubscription = async (userId: string): Promise<UserSubscription | null> => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No active subscription
          return null;
        }
        Logger.error('Error fetching subscription:', error);
        return null;
      }

      return mapDbSubscription(data);
    }

    return null;
  } catch (error) {
    Logger.error('Error in getCurrentSubscription:', error);
    return null;
  }
};

/**
 * Get subscription history
 */
export const getSubscriptionHistory = async (userId: string): Promise<UserSubscription[]> => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        Logger.error('Error fetching subscription history:', error);
        return [];
      }

      return data.map(mapDbSubscription);
    }

    return [];
  } catch (error) {
    Logger.error('Error in getSubscriptionHistory:', error);
    return [];
  }
};

/**
 * Subscribe to a plan
 */
export const subscribeToPlan = async (
  userId: string,
  planId: string,
  duration: 'monthly' | 'yearly'
): Promise<{ success: boolean; message: string; subscription?: UserSubscription }> => {
  try {
    const plan = getPlanById(planId);
    if (!plan) {
      return { success: false, message: 'Invalid plan selected' };
    }

    if (planId === 'free') {
      // Free plan doesn't require payment
      return { success: true, message: 'You are on the free plan' };
    }

    const amount = duration === 'yearly' 
      ? calculateYearlyPrice(plan.price) 
      : plan.price;

    // Process payment
    const paymentResult = await processSubscriptionPayment({
      planId,
      amount,
      duration,
      userId,
    });

    if (!paymentResult.success) {
      return { success: false, message: paymentResult.error || 'Payment failed' };
    }

    // Payment successful - subscription record is created in payment service
    const subscription = await getCurrentSubscription(userId);

    return {
      success: true,
      message: `Successfully subscribed to ${plan.name} plan!`,
      subscription: subscription || undefined,
    };
  } catch (error) {
    Logger.error('Error in subscribeToPlan:', error);
    return { success: false, message: 'Subscription failed. Please try again.' };
  }
};

/**
 * Cancel subscription
 *
 * Routes through the cancel-subscription Edge Function which:
 *   1. Marks the subscription row inactive (service-role, bypasses RLS)
 *   2. Resets subscription_tier to 'free' via activate_subscription RPC
 *      (service-role-only; cannot be called directly by authenticated).
 *
 * The previous direct `supabase.from('users').update({ subscription_tier ... })`
 * was a P0 privilege escalation — any authenticated user could set their own
 * tier. Migration 017 blocks that path at the DB level; this client change
 * routes through the correct server-authoritative path.
 */
export const cancelSubscription = async (
  subscriptionId: string,
  _userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Database not configured' };
    }

    const { data, error } = await supabase.functions.invoke('cancel-subscription', {
      body: { subscriptionId },
    });

    if (error) {
      Logger.error('Cancel subscription failed', error);
      return { success: false, message: error.message };
    }

    return {
      success: data?.success ?? false,
      message: data?.message ?? 'Failed to cancel subscription',
    };
  } catch (error) {
    Logger.error('Error in cancelSubscription:', error);
    return { success: false, message: 'Failed to cancel subscription' };
  }
};

/**
 * Check if user has access to a feature
 */
export const hasFeatureAccess = (
  subscriptionTier: string,
  feature: string
): boolean => {
  const tierLevel = { free: 0, basic: 1, premium: 2, gold: 3 };
  const userLevel = tierLevel[subscriptionTier as keyof typeof tierLevel] || 0;

  const featureRequirements: Record<string, number> = {
    'daily_horoscope': 0,
    'basic_panchang': 0,
    'ai_chat_limited': 0,
    'view_astrologers': 0,
    'weekly_horoscope': 1,
    'monthly_horoscope': 1,
    'ai_chat_unlimited': 1,
    'free_consultation_5min': 1,
    'save_kundlis': 1,
    'ad_free': 1,
    'yearly_predictions': 2,
    'transit_reports': 2,
    'free_consultation_20min': 2,
    'priority_astrologer': 2,
    'pdf_reports': 2,
    'exclusive_remedies': 2,
    'unlimited_consultations': 3,
    'vip_astrologer': 3,
    'daily_guidance': 3,
    'transit_alerts': 3,
    'personal_kundli': 3,
    'priority_support': 3,
    'exclusive_events': 3,
    'professional_accuracy': 2,
    'ai_guru_insights': 3,
    'gemstone_recommendations': 2,
    'transit_dashboard': 3,
    'manglik_analysis': 2,
    'soulmate_synthesis': 3,
    'dasha_depth': 3,
    'sade_sati_detail': 2,
    'sacred_remedies': 3,
  };

  const requiredLevel = featureRequirements[feature] ?? 0;
  return userLevel >= requiredLevel;
};

/**
 * Get consultation minutes included in plan
 */
export const getIncludedConsultationMinutes = (subscriptionTier: string): number => {
  const minutes: Record<string, number> = {
    free: 0,
    basic: 5,
    premium: 20,
    gold: 999, // Unlimited
  };

  return minutes[subscriptionTier] || 0;
};

/**
 * Check if subscription is expiring soon
 */
export const isSubscriptionExpiringSoon = (
  endDate: Date,
  daysThreshold: number = 7
): boolean => {
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold;
};

/**
 * Get days until subscription expires
 */
export const getDaysUntilExpiry = (endDate: Date): number => {
  const now = new Date();
  return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

// Helper function
const mapDbSubscription = (dbSubscription: DbSubscription): UserSubscription => ({
  id: dbSubscription.id,
  userId: dbSubscription.user_id,
  planId: dbSubscription.plan_id,
  planName: dbSubscription.plan_name,
  amount: dbSubscription.amount,
  currency: dbSubscription.currency,
  paymentId: dbSubscription.payment_id,
  paymentStatus: dbSubscription.payment_status,
  startDate: new Date(dbSubscription.start_date),
  endDate: new Date(dbSubscription.end_date),
  isActive: dbSubscription.is_active,
  createdAt: new Date(dbSubscription.created_at),
});

// ============================================
// BACKWARDS-COMPATIBLE SHIM (added by fix-all script)
// ============================================
// The plan format here matches the legacy test expectations.
// Plan IDs use `<tier>_<period>` format, duration is days (number),
// and each plan declares `currency: 'INR'`, `description`, optional
// `isPopular` and `discount` (percentage).

export interface LegacySubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  duration: number; // days
  features: string[];
  isPopular?: boolean;
  discount?: number;
  color?: string;
}

export const SUBSCRIPTION_PLANS_V2: LegacySubscriptionPlan[] = [
  {
    id: 'basic_monthly',
    name: 'Basic',
    description: 'Everything you need to get started with daily astrology.',
    price: 199,
    originalPrice: 299,
    currency: 'INR',
    duration: 30,
    features: [
      'Weekly & Monthly Horoscopes',
      'AI Chat (10/day)',
      '5 Free Consultation Minutes',
      'Save Multiple Kundlis',
      'Ad-free Experience',
    ],
    discount: 33,
    color: '#6B46C1',
  },
  {
    id: 'premium_monthly',
    name: 'Premium',
    description: 'Advanced astrology with priority astrologer access.',
    price: 499,
    originalPrice: 799,
    currency: 'INR',
    duration: 30,
    features: [
      'Yearly Predictions',
      'Transit Reports (Gochar)',
      '20 Free Consultation Minutes',
      'AI Chat (25/day)',
      'Priority Astrologer Access',
      'PDF Report Downloads',
    ],
    isPopular: true,
    discount: 20,
    color: '#9F7AEA',
  },
  {
    id: 'premium_yearly',
    name: 'Premium (Yearly)',
    description: 'Save 40% with annual billing on Premium features.',
    // Keep in sync with supabase/functions/create-razorpay-order PLAN_PRICES
    // (server-authoritative) and YEARLY_DISCOUNT (40%).
    price: 3593,
    originalPrice: 5999,
    currency: 'INR',
    duration: 365,
    features: [
      'All Premium Monthly Features',
      'Best Value — saves 40% annually',
      'Priority support all year',
      'Annual PDF report pack',
    ],
    isPopular: true,
    discount: 40,
    color: '#7C3AED',
  },
  {
    id: 'gold_monthly',
    name: 'Gold',
    description: 'Top-tier unlimited consultations and AI Guru access.',
    price: 999,
    originalPrice: 1499,
    currency: 'INR',
    duration: 30,
    features: [
      'Unlimited Consultations',
      'AI Guru Insights (50/day)',
      'Daily Transit (Gochar) Dashboard',
      'VIP Astrologer Access',
      'Personalized Daily Guidance',
    ],
    discount: 33,
    color: '#FFD700',
  },
];
