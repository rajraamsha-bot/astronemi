import { Platform } from 'react-native';
import type { Purchase } from 'expo-iap';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from '@/services/logger';

export type IapPlatform = 'ios' | 'android';
export type IapProductKind =
  | 'credits'
  | 'subscription'
  | 'astrologer_subscription'
  | 'course'
  | 'gift_card';

export interface IapProduct {
  platform: IapPlatform;
  productId: string;
  kind: IapProductKind;
  planId: string | null;
  durationDays: number | null;
  title: string | null;
  creditInr: number;
  bonusInr: number;
  displayOrder: number;
}

export interface IapVerificationResult {
  success: boolean;
  kind?: string;
  planId?: string | null;
  endsAt?: string | null;
  credited?: number;
  balance?: number;
  alreadyProcessed?: boolean;
  error?: string;
}

/**
 * Digital goods (credits, subscription passes, AstroPro passes) are only sold
 * through Apple IAP / Google Play Billing. Set this to true only after the store
 * products, server secrets, and verification function are configured. When
 * false, existing credits remain spendable but purchases are unavailable
 * instead of falling back to Razorpay.
 */
export const IAP_ENABLED = process.env.EXPO_PUBLIC_ENABLE_IAP === 'true';

export const getIapPlatform = (): IapPlatform | null => {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return null;
};

export const getIapProducts = async (
  kind: IapProductKind = 'credits',
): Promise<IapProduct[]> => {
  if (!IAP_ENABLED || !isSupabaseConfigured()) return [];
  const platform = getIapPlatform();
  if (!platform) return [];

  const { data, error } = await supabase
    .from('iap_products')
    .select('platform, product_id, kind, plan_id, duration_days, title, credit_inr, bonus_inr, display_order')
    .eq('platform', platform)
    .eq('kind', kind)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    Logger.error('Failed to load IAP products', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    platform: row.platform as IapPlatform,
    productId: row.product_id,
    kind: row.kind as IapProductKind,
    planId: row.plan_id ?? null,
    durationDays: row.duration_days == null ? null : Number(row.duration_days),
    title: row.title ?? null,
    creditInr: Number(row.credit_inr ?? 0),
    bonusInr: Number(row.bonus_inr ?? 0),
    displayOrder: Number(row.display_order ?? 0),
  }));
};

export const verifyIapPurchase = async (
  purchase: Purchase,
  userId: string,
): Promise<IapVerificationResult> => {
  const platform = getIapPlatform();
  if (!platform) {
    return { success: false, error: 'In-app purchases are unavailable on this platform' };
  }

  if (platform === 'ios') {
    const accountToken = (purchase as Purchase & { appAccountToken?: string | null }).appAccountToken;
    if (accountToken && accountToken !== userId) {
      return { success: false, error: 'This purchase belongs to a different account' };
    }
  }
  if (platform === 'android') {
    const accountId = (purchase as Purchase & { obfuscatedAccountIdAndroid?: string | null })
      .obfuscatedAccountIdAndroid;
    if (accountId && accountId !== userId) {
      return { success: false, error: 'This purchase belongs to a different account' };
    }
  }

  const transactionId =
    (purchase as Purchase & { transactionId?: string | null }).transactionId ?? purchase.id;
  const purchaseToken = purchase.purchaseToken ?? '';

  if (platform === 'ios' && !transactionId) {
    return { success: false, error: 'Apple transaction ID is missing' };
  }
  if (platform === 'android' && !purchaseToken) {
    return { success: false, error: 'Google purchase token is missing' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('verify-iap-purchase', {
      body: {
        platform,
        productId: purchase.productId,
        transactionId,
        purchaseToken,
      },
    });

    if (error) {
      Logger.error('IAP verification request failed', error);
      return { success: false, error: 'Could not verify the purchase. Please retry.' };
    }
    if (!data?.success) {
      return { success: false, error: data?.error || 'Purchase verification failed' };
    }

    return {
      success: true,
      kind: data.kind,
      planId: data.planId ?? null,
      endsAt: data.endsAt ?? null,
      credited: Number(data.credited ?? 0),
      balance: Number(data.balance ?? 0),
      alreadyProcessed: data.alreadyProcessed === true,
    };
  } catch (error) {
    Logger.error('IAP verification error', error);
    return { success: false, error: 'Could not verify the purchase. Please retry.' };
  }
};
