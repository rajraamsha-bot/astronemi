/**
 * Payment Service
 *
 * Server-authoritative payment entry point. Wraps the payment gateway
 * integrations (Razorpay, Stripe), wallet operations, and subscription
 * plan management for the AstroNemi consultation platform.
 *
 * ARCHITECTURE
 * - All amounts are in MINOR UNITS (paise, cents) end-to-end to avoid
 *   floating-point precision loss. Convert to major units only at the
 *   display boundary via `formatAmount` (see services/payment.ts).
 * - Razorpay order creation goes through the create-razorpay-order Edge
 *   Function (service-role key on the server, never the client secret).
 * - Stripe is stubbed for international expansion; the integration is
 *   in_progress and not yet production-ready.
 * - Wallet balance and transaction queries go through Edge Functions
 *   that derive the user from the verified JWT.
 *
 * SECURITY
 * - Payment verification is server-side (Razorpay signature check inside
 *   the verify-payment Edge Function). Never trust client-side
 *   payment success.
 * - For SUBSCRIPTION_PLANS, this client file exposes price metadata for
 *   UI display only. Tier entitlement is enforced by the server-side
 *   activate_subscription() RPC (see supabase/migrations/012).
 */

import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from '@/services/logger';

/**
 * Explicit opt-in to the offline dev mock, matching the convention used by
 * services/wallet.ts and services/auth-service.ts. Set
 * `EXPO_PUBLIC_USE_MOCK_API=true` in .env.development to enable.
 *
 * Without this gate, a missing Supabase config caused order ids and Stripe
 * client secrets to be fabricated on the spot. Handing a synthetic order id
 * to the real gateway, or a synthetic client secret to a caller that treats
 * it as proof of an initialized payment, is a money-correctness bug — a
 * misconfigured production build must fail loudly instead.
 */
const allowDevMock = (): boolean =>
  process.env.EXPO_PUBLIC_USE_MOCK_API === 'true' && __DEV__;

// Re-export shared types from the underlying payment module.
export type PaymentOptions = {
  amount: number;        // Minor units (paise/cents)
  currency: string;      // 'INR' | 'USD' | ...
  description: string;
  orderId?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  metadata?: Record<string, any>;
};

export type PaymentError = {
  code: string;          // e.g. 'INIT_ERROR', 'PAYMENT_FAILED', 'NETWORK'
  description: string;
  reason?: string;
};

export type PaymentResult = {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  clientSecret?: string;  // Stripe-specific
  error?: PaymentError;
};

export type SubscriptionPlan = {
  id: string;            // e.g. 'basic_monthly', 'premium_yearly'
  name: string;
  description: string;
  price: number;         // Major units (rupees) for UI display
  currency: 'INR';
  duration: number;      // Days
  features: string[];
  isPopular?: boolean;
  discount?: number;     // Percent off
};

/**
 * Subscription plan catalog. Source of truth for UI display.
 * Server enforces tier entitlement via activate_subscription() RPC.
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic_monthly',
    name: 'Basic',
    description: 'Daily horoscope, basic panchang, and limited AI chat.',
    price: 199,
    currency: 'INR',
    duration: 30,
    features: [
      'Daily horoscope',
      'Basic panchang',
      'AI chat (limited)',
      'View astrologer profiles',
    ],
  },
  {
    id: 'premium_monthly',
    name: 'Premium',
    description: 'Full chat and voice consultations with verified astrologers.',
    price: 499,
    currency: 'INR',
    duration: 30,
    isPopular: true,
    discount: 20,
    features: [
      'Everything in Basic',
      'Chat with astrologers',
      'Voice consultations (5/mo)',
      'Priority queue',
    ],
  },
  {
    id: 'premium_yearly',
    name: 'Premium Annual',
    description: 'All Premium features, billed yearly. Best value.',
    // Keep in sync with supabase/functions/create-razorpay-order PLAN_PRICES
    // (server-authoritative) and YEARLY_DISCOUNT (40%) in subscription.ts.
    price: 3593,
    currency: 'INR',
    duration: 365,
    discount: 40,
    features: [
      'Everything in Premium',
      'Unlimited consultations',
      'Personalized birth chart reports',
      'Family member profiles (up to 4)',
    ],
  },
  {
    id: 'gold_monthly',
    name: 'Gold',
    description: 'Top-tier: live video consultations and dedicated astrologer.',
    price: 999,
    currency: 'INR',
    duration: 30,
    features: [
      'Everything in Premium',
      'Live video consultations (unlimited)',
      'Dedicated astrologer',
      'Festival pooja bookings',
    ],
  },
];

/**
 * PaymentService — static-style class for payment operations.
 * In a future refactor this could be an instance with injected deps,
 * but the current tests and call sites expect static methods.
 */
export const PaymentService = {
  // ---------------------------------------------------------------------------
  // Razorpay
  // ---------------------------------------------------------------------------

  /**
   * Create a Razorpay order. Calls the create-razorpay-order Edge Function
   * which holds the key secret server-side and returns only the order id.
   */
  createRazorpayOrder: async (
    amount: number,
    currency: string = 'INR',
    metadata?: Record<string, any>,
  ): Promise<{ orderId: string; amount: number } | null> => {
    if (!isSupabaseConfigured()) {
      if (!allowDevMock()) {
        Logger.error('Supabase is not configured. Cannot create a Razorpay order.');
        return null;
      }
      // Opt-in dev fallback: a mock order id matching Razorpay's format so
      // the flow can be exercised offline.
      return {
        orderId: `order_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        amount,
      };
    }

    const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
      body: { amount, currency, metadata },
    });

    if (error || !data) return null;
    return { orderId: data.id, amount: data.amount };
  },

  /**
   * Open Razorpay native checkout. Returns INIT_ERROR if the native module
   * is not linked (e.g. running in a non-RN environment or with an
   * incomplete build).
   */
  payWithRazorpay: async (options: PaymentOptions): Promise<PaymentResult> => {
    try {
      const order = await PaymentService.createRazorpayOrder(options.amount, options.currency, options.metadata);
      if (!order) {
        return {
          success: false,
          error: {
            code: 'ORDER_FAILED',
            description: 'Failed to create Razorpay order',
          },
        };
      }

      // Lazy-load the native module via synchronous require so the failure
      // path is fast (no Promise/import overhead). `require` inside a
      // function is supported in both Metro and Jest bundlers.
      let RazorpayCheckout: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        RazorpayCheckout = require('react-native-razorpay').default;
      } catch {
        RazorpayCheckout = null;
      }

      if (!RazorpayCheckout) {
        return {
          success: false,
          error: {
            code: 'INIT_ERROR',
            description: 'react-native-razorpay is not installed or not linked',
          },
        };
      }

      const response = await RazorpayCheckout.open({
        description: options.description,
        currency: options.currency,
        amount: options.amount,
        order_id: order.orderId,
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
        name: 'AstroNemi',
        prefill: {
          email: options.customerEmail || '',
          contact: options.customerPhone || '',
          name: options.customerName || '',
        },
        theme: { color: '#8B5CF6' },
      });

      return {
        success: true,
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          description: err instanceof Error ? err.message : 'Razorpay checkout failed',
        },
      };
    }
  },

  // ---------------------------------------------------------------------------
  // Stripe (international — not yet production-ready)
  // ---------------------------------------------------------------------------

  createStripePaymentIntent: async (
    options: PaymentOptions,
  ): Promise<{ clientSecret: string; amount: number } | null> => {
    // Stripe is deliberately NOT wired: no create-stripe-intent Edge Function
    // exists in this repo and @stripe/stripe-react-native is not a
    // dependency. The previous implementation invoked a function that could
    // never exist — and the dev mock fabricated client secrets — so this path
    // failed at runtime while looking implemented. Fail honestly (no mock, no
    // exception) until the integration actually ships.
    void options;
    Logger.warn('createStripePaymentIntent: Stripe is not available yet');
    return null;
  },

  payWithStripe: async (options: PaymentOptions): Promise<PaymentResult> => {
    try {
      const intent = await PaymentService.createStripePaymentIntent(options);
      if (!intent) {
        return {
          success: false,
          error: { code: 'INTENT_FAILED', description: 'Failed to create Stripe intent' },
        };
      }

      let Stripe: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        Stripe = require('@stripe/stripe-react-native').default;
      } catch {
        Stripe = null;
      }

      if (!Stripe) {
        return {
          success: false,
          error: { code: 'INIT_ERROR', description: '@stripe/stripe-react-native is not installed' },
        };
      }

      const { error } = await Stripe.confirmPayment(intent.clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        return {
          success: false,
          error: { code: 'PAYMENT_FAILED', description: error.message || 'Stripe payment failed' },
        };
      }
      return { success: true, clientSecret: intent.clientSecret };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          description: err instanceof Error ? err.message : 'Stripe payment failed',
        },
      };
    }
  },

  // ---------------------------------------------------------------------------
  // Native pay availability
  // ---------------------------------------------------------------------------

  isApplePayAvailable: async (): Promise<boolean> => {
    // Apple Pay only on iOS in production. Return false if not iOS, or if
    // the native module is not installed.
    if (Platform.OS !== 'ios') return false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react-native-passkit');
      return true;
    } catch {
      return false;
    }
  },

  isGooglePayAvailable: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react-native-google-pay');
      return true;
    } catch {
      return false;
    }
  },

  // ---------------------------------------------------------------------------
  // Wallet
  // ---------------------------------------------------------------------------

  // Wallet reads go straight through RLS — users.wallet_balance and
  // wallet_transactions are owner-readable (001/027 policies). The previous
  // implementations invoked 'get-wallet-balance' / 'get-transactions' Edge
  // Functions that do not exist, so these getters always returned 0 / [].
  getWalletBalance: async (): Promise<number> => {
    if (!isSupabaseConfigured()) return 0;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data, error } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();
    if (error || !data) return 0;
    return typeof data.wallet_balance === 'number' ? data.wallet_balance : 0;
  },

  getTransactions: async (limit: number = 50): Promise<{ transactions: any[]; total: number }> => {
    if (!isSupabaseConfigured()) return { transactions: [], total: 0 };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { transactions: [], total: 0 };
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return { transactions: [], total: 0 };
    return { transactions: data, total: data.length };
  },
};
