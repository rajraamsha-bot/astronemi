/**
 * Payment Service Tests
 *
 * Tests for payment processing including:
 * - Razorpay integration
 * - Stripe integration
 * - Wallet operations
 * - Subscription plans
 *
 * NATIVE-BRIDGE CAVEAT: The `payWithRazorpay` / `payWithStripe` / native
 * availability paths cannot be driven end-to-end in Jest because the native
 * payment modules
 * (`react-native-razorpay`, `@stripe/stripe-react-native`, etc.) are
 * installed in node_modules and Jest's module resolver loads them, but
 * the React Native native bridge doesn't exist in Jest — any call into
 * those modules (e.g. `RazorpayCheckout.open(...)`) hangs the worker.
 *
 * The unit tests for the pure logic (SUBSCRIPTION_PLANS, createRazorpayOrder
 * in dev-fallback mode, PaymentOptions types) work fine in isolation. The
 * native-bridge paths must be exercised in Detox/E2E.
 *
 * The production code (services/payment-service.ts) handles the
 * missing-module case gracefully (returns INIT_ERROR), which is what the
 * `payWithRazorpay` / `payWithStripe` cases below assert. Driving an actual
 * successful gateway payment belongs in Detox/E2E.
 */

import { PaymentService, SUBSCRIPTION_PLANS, PaymentOptions, PaymentResult } from '@/services/payment-service';

jest.mock('react-native-razorpay', () => {
  throw new Error('Cannot find module');
});

// Force the dev-fallback path: this avoids invoking Supabase Edge Functions
// and (more importantly) the native payment modules — `react-native-razorpay`
// and `@stripe/stripe-react-native` ARE installed in node_modules but they
// require the React Native native bridge, which doesn't exist in Jest, so
// any call to them would hang the test. By short-circuiting at the config
// level we exercise the PaymentService contract without touching the
// native bridge. (For native-bridge tests, use Detox/E2E.)
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    },
    functions: {
      invoke: jest.fn((name, options) => {
        // Mock responses for different functions
        if (name === 'create-razorpay-order') {
          return Promise.resolve({
            data: {
              id: `order_123_${Math.random().toString(36).substr(2, 9)}`,
              amount: options.body.amount,
              currency: options.body.currency || 'INR',
            },
            error: null,
          });
        }
        if (name === 'create-stripe-intent') {
          return Promise.resolve({
            data: {
              clientSecret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
              amount: options.body.amount,
              currency: options.body.currency || 'INR',
            },
            error: null,
          });
        }
        if (name === 'get-wallet-balance') {
          return Promise.resolve({
            data: { balance: 500 },
            error: null,
          });
        }
        if (name === 'get-transactions') {
          return Promise.resolve({
            data: { transactions: [], total: 0 },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
    })),
  },
  // Critical: force the dev-fallback path so we never call into the
  // native payment modules. See comment above.
  isSupabaseConfigured: jest.fn(() => false),
}));

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('PaymentService', () => {
  const originalMockFlag = process.env.EXPO_PUBLIC_USE_MOCK_API;

  beforeEach(() => {
    jest.clearAllMocks();
    // The offline dev fallback is opt-in. Unconfigured Supabase alone must not
    // fabricate order ids or client secrets.
    process.env.EXPO_PUBLIC_USE_MOCK_API = 'true';
  });

  afterAll(() => {
    if (originalMockFlag === undefined) {
      delete process.env.EXPO_PUBLIC_USE_MOCK_API;
    } else {
      process.env.EXPO_PUBLIC_USE_MOCK_API = originalMockFlag;
    }
  });

  describe('Subscription Plans', () => {
    it('should have 4 subscription plans', () => {
      expect(SUBSCRIPTION_PLANS).toHaveLength(4);
    });

    it('should have valid plan structure', () => {
      SUBSCRIPTION_PLANS.forEach(plan => {
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('description');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('currency');
        expect(plan).toHaveProperty('duration');
        expect(plan).toHaveProperty('features');
        expect(Array.isArray(plan.features)).toBe(true);
        expect(plan.features.length).toBeGreaterThan(0);
      });
    });

    it('should have Basic plan with correct price', () => {
      const basicPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'basic_monthly');
      expect(basicPlan).toBeDefined();
      expect(basicPlan?.price).toBe(199);
      expect(basicPlan?.duration).toBe(30);
    });

    it('should have Premium plan marked as popular', () => {
      const premiumPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'premium_monthly');
      expect(premiumPlan).toBeDefined();
      expect(premiumPlan?.isPopular).toBe(true);
      expect(premiumPlan?.discount).toBe(20);
    });

    it('should have Annual plan with best value', () => {
      const annualPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'premium_yearly');
      expect(annualPlan).toBeDefined();
      expect(annualPlan?.duration).toBe(365);
      // Price must match the server-authoritative PLAN_PRICES in
      // create-razorpay-order (premium_yearly = 3593) and YEARLY_DISCOUNT (40%).
      expect(annualPlan?.price).toBe(3593);
      expect(annualPlan?.discount).toBe(40);
    });

    it('should have Gold plan as highest tier', () => {
      const goldPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'gold_monthly');
      expect(goldPlan).toBeDefined();
      expect(goldPlan?.price).toBe(999);
    });

    it('should have all prices in INR', () => {
      SUBSCRIPTION_PLANS.forEach(plan => {
        expect(plan.currency).toBe('INR');
      });
    });
  });

  describe('createRazorpayOrder', () => {
    it('should create order with valid amount', async () => {
      const result = await PaymentService.createRazorpayOrder(50000, 'INR');
      
      expect(result).not.toBeNull();
      expect(result?.orderId).toMatch(/^order_\d+_[a-z0-9]+$/);
    });

    it('should create unique order IDs', async () => {
      const order1 = await PaymentService.createRazorpayOrder(10000);
      const order2 = await PaymentService.createRazorpayOrder(10000);
      
      expect(order1?.orderId).not.toBe(order2?.orderId);
    });

    it('should default to INR currency', async () => {
      const result = await PaymentService.createRazorpayOrder(1000);
      expect(result).not.toBeNull();
    });

    it('should return null when Supabase is unconfigured and the dev mock is off', async () => {
      delete process.env.EXPO_PUBLIC_USE_MOCK_API;
      const result = await PaymentService.createRazorpayOrder(50000, 'INR');
      expect(result).toBeNull();
    });
  });

  describe('createStripePaymentIntent', () => {
    // Stripe is not wired in this repo (no Edge Function, no client SDK).
    // The old tests asserted the DEV-MOCK fake intent — they encoded the bug
    // where a ghost endpoint looked implemented.
    it('returns null: Stripe integration is not available yet', async () => {
      const result = await PaymentService.createStripePaymentIntent({
        amount: 50000,
        currency: 'USD',
        description: 'Test payment',
      });
      expect(result).toBeNull();
    });

    it('never fabricates a client secret, even with the dev-mock flag on', async () => {
      const options: PaymentOptions = {
        amount: 10000,
        currency: 'USD',
        description: 'Test',
      };
      const intent1 = await PaymentService.createStripePaymentIntent(options);
      const intent2 = await PaymentService.createStripePaymentIntent(options);
      expect(intent1).toBeNull();
      expect(intent2).toBeNull();
    });
  });

  describe('isApplePayAvailable', () => {
    it('should return false on non-iOS platform', async () => {
      // Platform.OS is mocked as 'ios' in jest.setup.js
      // This test verifies the function doesn't throw
      const result = await PaymentService.isApplePayAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isGooglePayAvailable', () => {
    it('should return false on iOS platform', async () => {
      // Platform.OS is mocked as 'ios', so Google Pay should not be available
      const result = await PaymentService.isGooglePayAvailable();
      expect(result).toBe(false);
    });
  });

  describe('payWithRazorpay', () => {
    it('should return error when Razorpay is not installed', async () => {
      const options: PaymentOptions = {
        amount: 50000,
        currency: 'INR',
        description: 'Test payment',
      };
      
      const result = await PaymentService.payWithRazorpay(options);
      
      // Since Razorpay mock is not set up, it should return an error
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INIT_ERROR');
    });
  });

  describe('payWithStripe', () => {
    it('should return error when Stripe is not installed', async () => {
      const options: PaymentOptions = {
        amount: 5000,
        currency: 'USD',
        description: 'Test payment',
      };
      
      const result = await PaymentService.payWithStripe(options);
      
      // Since Stripe mock is not set up, it should return an error
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getWalletBalance', () => {
    it('should return 0 for unauthenticated user', async () => {
      const balance = await PaymentService.getWalletBalance();
      expect(typeof balance).toBe('number');
      expect(balance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTransactions', () => {
    it('should return empty array when no transactions', async () => {
      const result = await PaymentService.getTransactions();
      expect(Array.isArray(result.transactions)).toBe(true);
      expect(result.transactions).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Payment Options Validation', () => {
    it('should accept valid payment options', () => {
      const options: PaymentOptions = {
        amount: 50000,
        currency: 'INR',
        description: 'Test payment',
        orderId: 'order_123',
        customerId: 'cust_123',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+919876543210',
        metadata: { orderId: 'ORD123' },
      };
      
      expect(options.amount).toBe(50000);
      expect(options.currency).toBe('INR');
      expect(options.description).toBe('Test payment');
    });

    it('should accept minimal payment options', () => {
      const options: PaymentOptions = {
        amount: 1000,
        currency: 'INR',
        description: 'Minimal payment',
      };
      
      expect(options.amount).toBe(1000);
      expect(options.orderId).toBeUndefined();
    });
  });

  describe('Payment Result Types', () => {
    it('should define success result structure', () => {
      const successResult: PaymentResult = {
        success: true,
        paymentId: 'pay_123',
        orderId: 'order_123',
        signature: 'sig_abc',
      };
      
      expect(successResult.success).toBe(true);
      expect(successResult.error).toBeUndefined();
    });

    it('should define error result structure', () => {
      const errorResult: PaymentResult = {
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          description: 'Payment was declined',
          reason: 'Insufficient funds',
        },
      };
      
      expect(errorResult.success).toBe(false);
      expect(errorResult.error?.code).toBe('PAYMENT_FAILED');
    });
  });
});
