/**
 * Unified Payment Service
 * 
 * Centralized service for all payment methods:
 * - Razorpay (Primary gateway for INR)
 * - Stripe (International)
 * - Wallet (Internal)
 * - ApplePay / GooglePay (Native)
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from '@/services/logger';
import { notifySuccess, notifyError } from '@/utils/haptics';

export interface PaymentOptions {
  amount: number; // Amount in paise (100 paise = 1 INR)
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
  description?: string;
  metadata?: Record<string, any>; // Complex JSON metadata for fulfillment
  // Canonical payment-type used to route server-side fulfillment ('subscription'|'topup'|...).
  type?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  error?: string;
  message?: string;
  /** Internal server order id created by fulfillment, when applicable. */
  serverOrderId?: string;
}

export interface WalletTopupOptions {
  amount: number;
  userId: string;
}

export interface TopupDenomination {
  id: string;
  amountInr: number;
  bonusInr: number;
  displayOrder: number;
}


// ============================================
// RAZORPAY INTEGRATION
// ============================================

/**
 * Initialize a Razorpay order via Supabase Edge Function
 */
export const createOrder = async (options: PaymentOptions): Promise<{ orderId: string; amount: number } | null> => {
  try {
    if (!isSupabaseConfigured()) {
      Logger.error('Supabase is not configured. Cannot create payment order.');
      return null;
    }

    const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
      body: { 
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        metadata: {
          ...(options.notes ?? {}),
          ...(options.metadata ?? {}),
        },
      }
    });

    if (error) {
      Logger.error('Error creating order:', error);
      return null;
    }

    return {
      orderId: data.id,
      amount: data.amount,
    };
  } catch (error) {
    Logger.error('Error in createOrder:', error);
    return null;
  }
};

/**
 * Verify a Razorpay payment signature
 */
interface PaymentVerificationDetails {
  success: boolean;
  serverOrderId?: string;
}

const verifyPaymentDetails = async (
  orderId: string,
  paymentId: string,
  signature: string,
  type: 'wallet' | 'subscription' | 'consultation' | 'product_order' | 'pooja_booking' = 'wallet',
  metadata?: Record<string, any>
): Promise<PaymentVerificationDetails> => {
  try {
    if (!isSupabaseConfigured()) {
      Logger.error('Supabase is not configured. Cannot verify payment.');
      return { success: false };
    }

    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        type,
        metadata,
      },
    });

    if (error) {
      Logger.error('Error verifying payment:', error);
      return { success: false };
    }

    return {
      success: data?.success === true,
      serverOrderId: typeof data?.order_record_id === 'string' ? data.order_record_id : undefined,
    };
  } catch (error) {
    Logger.error('Error in verifyPayment:', error);
    return { success: false };
  }
};

/** Backwards-compatible boolean verification API. */
export const verifyPayment = async (
  orderId: string,
  paymentId: string,
  signature: string,
  type: 'wallet' | 'subscription' | 'consultation' | 'product_order' | 'pooja_booking' = 'wallet',
  metadata?: Record<string, any>
): Promise<boolean> => {
  const result = await verifyPaymentDetails(orderId, paymentId, signature, type, metadata);
  return result.success;
};

// ============================================
// UNIFIED PAYMENT HANDLER
// ============================================

/**
 * Merge the flat Razorpay `notes` with the richer fulfillment `metadata`.
 */
const buildPaymentMetadata = (options: PaymentOptions): Record<string, any> => ({
  ...(options.notes ?? {}),
  ...(options.metadata ?? {}),
});

/**
 * Pay from the internal wallet.
 *
 * Atomic wallet deduction through the authenticated edge function. The edge
 * function derives the user from the JWT and calls the service-role-only
 * debit_wallet RPC server-side.
 */
const checkoutWithWallet = async (options: PaymentOptions): Promise<PaymentResult> => {
  // Guard: when Supabase is not configured the placeholder client's
  // `functions.invoke` rejects with a network error. Unlike
  // `deductFromWallet` below, this path had no guard and no try/catch, so
  // the rejection bubbled up as an unhandled promise rejection.
  if (!isSupabaseConfigured()) {
    Logger.error('checkoutWithWallet: Supabase is not configured');
    return { success: false, error: 'Payment service unavailable' };
  }

  try {
    const billingMinute = Math.max(
      1,
      Math.floor(Number(options.metadata?.billingMinute ?? options.notes?.billing_minute ?? 1))
    );
    const { data, error } = await supabase.functions.invoke('deduct-wallet', {
      body: {
        // MINOR units (paise) per PaymentOptions -> RUPEES for deduct-wallet
        // (it validates against the consultation's rupee price). Screens that
        // call the endpoint directly pass rupees natively — same unit.
        amount: options.amount / 100,
        source: (options.type as string) || (options.notes?.type as string) || 'consultation',
        description: options.description || 'Service Payment',
        referenceId: options.metadata?.referenceId ?? options.notes?.reference_id,
        billingMinute,
      },
    });

    if (error) {
      Logger.error('Wallet payment failed', error);
      await notifyError();
      return { success: false, error: error.message };
    }

    if (data?.success) {
      await notifySuccess();
      return { success: true, message: 'Payment successful using wallet' };
    }

    await notifyError();
    return { success: false, error: data?.message || 'Insufficient wallet balance' };
  } catch (error) {
    Logger.error('checkoutWithWallet error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Wallet payment failed',
    };
  }
};

/**
 * Pay via the native Razorpay checkout, then verify the signature server-side.
 */
const checkoutWithRazorpay = async (options: PaymentOptions): Promise<PaymentResult> => {
  const order = await createOrder(options);
  if (!order) {
    return { success: false, error: 'Failed to initialize payment' };
  }

  const razorpayKey = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
  if (!razorpayKey) {
    return { success: false, error: 'Razorpay key not configured' };
  }

  let RazorpayCheckout: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const razorpayModule = require('react-native-razorpay');
    RazorpayCheckout = razorpayModule.default || razorpayModule;
  } catch {
    RazorpayCheckout = null;
  }

  if (!RazorpayCheckout) {
    Logger.error('react-native-razorpay is not installed or not linked');
    return { success: false, error: 'Payment gateway unavailable' };
  }

  // `ondismiss` and the rejection of `open()` both fire when the user closes
  // the sheet. Record it in a flag rather than settling the result from the
  // callback, so the outcome does not depend on which one lands first.
  let dismissedByUser = false;

  try {
    const response = await RazorpayCheckout.open({
      description: options.description || 'Payment for AstroNemi services',
      image: 'https://astronemi.app/logo.png',
      currency: options.currency || 'INR',
      key: razorpayKey,
      amount: order.amount,
      order_id: order.orderId,
      name: 'AstroNemi',
      prefill: {
        email: '',
        contact: '',
        name: '',
      },
      theme: { color: '#8B5CF6' },
      modal: {
        ondismiss: () => {
          dismissedByUser = true;
        },
      },
    });

    // FIX: previously this read `options.notes?.type`, but callers set the
    // payment-type on `options.type` (subscription/wallet/consultation). The
    // notes fallback always resolved to 'wallet', so the verification Edge
    // Function received the wrong type for subscriptions and could route to
    // the incorrect fulfillment handler. Prefer the canonical `options.type`.
    const verification = await verifyPaymentDetails(
      response.razorpay_order_id,
      response.razorpay_payment_id,
      response.razorpay_signature,
      (options as { type?: string }).type || (options.notes?.type as any) || 'wallet',
      buildPaymentMetadata(options)
    );

    if (!verification.success) {
      await notifyError();
      return { success: false, error: 'Payment verification failed' };
    }

    await notifySuccess();
    return {
      success: true,
      orderId: response.razorpay_order_id,
      paymentId: response.razorpay_payment_id,
      signature: response.razorpay_signature,
      serverOrderId: verification.serverOrderId,
    };
  } catch (err: unknown) {
    if (dismissedByUser) {
      Logger.info('Razorpay checkout dismissed by user');
      return { success: false, error: 'Payment cancelled by user' };
    }

    Logger.error('Razorpay checkout failed', { error: err });
    const errMsg = err instanceof Error
      ? err.message
      : (typeof err === 'object' && err !== null && 'description' in err)
        ? String((err as Record<string, unknown>).description)
        : 'Payment failed';
    return { success: false, error: errMsg };
  }
};

/**
 * Open the unified checkout process
 */
export const openCheckout = async (
  method: 'razorpay' | 'stripe' | 'wallet' | 'googlepay' | 'applepay',
  options: PaymentOptions
): Promise<PaymentResult> => {
  Logger.info(`Initiating ${method} payment`, { amount: options.amount });

  try {
    switch (method) {
      case 'wallet':
        return await checkoutWithWallet(options);

      case 'razorpay':
        return await checkoutWithRazorpay(options);

      default:
        return { success: false, error: `Payment method ${method} not yet implemented` };
    }
  } catch (error) {
    Logger.error('Unified Payment failed', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred during payment',
    };
  }
};

/**
 * Load the server-priced top-up denominations.
 *
 * The gateway amount is computed by create-razorpay-order from
 * public.topup_denominations; the client only chooses which denomination to
 * buy. This keeps a doctored client from inventing a ₹1 top-up.
 */
export const getTopupDenominations = async (): Promise<TopupDenomination[]> => {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('topup_denominations')
    .select('id, amount_inr, bonus_inr, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    Logger.error('Failed to load top-up denominations', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    amountInr: Number(row.amount_inr),
    bonusInr: Number(row.bonus_inr ?? 0),
    displayOrder: Number(row.display_order ?? 0),
  }));
};

/**
 * Wallet credit top-ups are handled by `services/iap.ts` and the server-side
 * `verify-iap-purchase` function. This legacy Razorpay entry point stays
 * exported for compatibility but fails closed: store rules require Apple IAP /
 * Google Play Billing for digital credits.
 */
export const topUpWallet = async (
  denominationId: string,
  amountInr: number,
  _gateway: 'razorpay' | 'stripe' = 'razorpay'
): Promise<PaymentResult> => {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return { success: false, error: 'User not authenticated' };
  if (!denominationId) return { success: false, error: 'Please choose a top-up amount' };

  const normalizedAmount = Math.round(Number(amountInr));
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return { success: false, error: 'Invalid top-up amount' };
  }

  Logger.warn('Razorpay wallet top-up blocked; use the store credit flow', {
    amount: normalizedAmount,
    denominationId,
  });
  return {
    success: false,
    error: 'Wallet top-ups must be completed through the App Store or Google Play.',
  };
};

/**
 * Deduct from wallet for consultation
 */
export const deductFromWallet = async (
  _userId: string,
  amount: number,
  consultationId: string,
  billingMinute: number = 1
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Database not configured' };
    }

    const { data, error } = await supabase.functions.invoke('deduct-wallet', {
      body: {
        amount,
        source: 'consultation',
        description: `Consultation payment: ${consultationId}`,
        referenceId: consultationId,
        billingMinute: Math.max(1, Math.floor(billingMinute)),
      },
    });

    if (error) {
      Logger.error('Wallet debit failed:', error);
      return { success: false, message: error.message };
    }

    if (data?.success) {
      return { success: true, message: 'Payment successful' };
    }

    return { success: false, message: data?.message || 'Insufficient balance' };
  } catch (error) {
    Logger.error('Deduct from wallet error:', error);
    return { success: false, message: 'Payment failed' };
  }
};

/**
 * Subscription passes are sold through Apple IAP / Google Play Billing and
 * verified by `verify-iap-purchase`. This legacy Razorpay entry point fails
 * closed so no screen can accidentally start a non-compliant checkout.
 */
export const processSubscriptionPayment = async (
  _options: { userId: string; planId: string; amount: number; duration: string }
): Promise<{ success: boolean; error?: string }> => {
  Logger.warn('Razorpay subscription checkout blocked; use the IAP pass flow');
  return {
    success: false,
    error: 'Subscription passes must be purchased through the App Store or Google Play.',
  };
};

/**
 * Get wallet transactions
 */
export const getWalletTransactions = async (
  userId: string,
  limit: number = 20
): Promise<any[]> => {
  try {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      Logger.error('Error fetching wallet transactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    Logger.error('Error in getWalletTransactions:', error);
    return [];
  }
};
   
// ============================================   
// BACKWARDS-COMPATIBLE ALIASES   
// ============================================  


// ============================================
// BACKWARDS-COMPATIBLE ALIASES
// ============================================
// Legacy tests import `SUBSCRIPTION_PLANS` from `@/services/payment`.
// Re-export it here so those tests work without code changes. The
// implementation lives in the `openCheckout`/`createOrder` functions above.
//
// NOTE: the legacy `PaymentService` bucket that used to live here has been
// removed — it exposed a stub `payWithRazorpay` that always returned
// `{ success: true }` (fake success). Use `payment-service.ts` instead.
// ============================================

export const SUBSCRIPTION_PLANS = [
  { id: 'free', name: 'Free', price: 0, currency: 'INR', features: ['feature1'] },
  { id: 'premium_monthly', name: 'Premium Monthly', price: 499, currency: 'INR', features: ['feature1'] },
  { id: 'gold_monthly', name: 'Gold Monthly', price: 999, currency: 'INR', features: ['feature1'] },
  { id: 'platinum_monthly', name: 'Platinum Monthly', price: 1999, currency: 'INR', features: ['feature1'] },
];

// UNIFIED PAYMENT OBJECT EXPORT
// ============================================
// Tests expect an object-based API. Export all functions as a unified object.

export const UnifiedPayment = {
  pay: (methodOrOptions: any, options?: any) => {
    if (typeof methodOrOptions === 'object') {
      return openCheckout(methodOrOptions.method || 'razorpay', methodOrOptions);
    }
    return openCheckout(methodOrOptions, options as PaymentOptions);
  },
  createOrder,
  verifyPayment,
  createRazorpayOrder: createOrder,
  verifyRazorpayPayment: verifyPayment,
  topUpWallet,
  getTopupDenominations,
  payWithWallet: deductFromWallet,
  formatAmount: (amount: number, currency: string = 'INR') => {
    // Format amount based on currency (amount is in minor units: paise, cents, etc.)
    const formatted = (amount / 100).toFixed(2);
    if (currency === 'USD') {
      return `$${formatted}`;
    }
    return `₹${formatted}`;
  },
  getAvailableMethods: async () => {
    // For now, only Razorpay and Wallet are implemented
    // ApplePay and GooglePay are platform-specific and not yet implemented
    return ['razorpay', 'wallet'] as const;
  },
};

// Legacy export for existing code
export default {
  openCheckout,
  createOrder,
  verifyPayment,
  topUpWallet,
  deductFromWallet,
  processSubscriptionPayment,
  getWalletTransactions,
};
