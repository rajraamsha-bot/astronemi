/**
 * Payment Integration Tests
 *
 * End-to-end integration tests for payment flows.
 */

import { UnifiedPayment, SUBSCRIPTION_PLANS, getWalletTransactions } from '@/services/payment';
import { supabase } from '@/lib/supabase';
import { Logger } from '@/services/logger';

// Mock supabase functions and db
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        error: null
      })),
    },
    functions: {
      invoke: jest.fn((name) => {
        if (name === 'create-razorpay-order') {
          return Promise.resolve({
            data: { id: 'order_123_test', amount: 50000 },
            error: null,
          });
        }
        if (name === 'verify-payment') {
          return Promise.resolve({
            data: { success: true },
            error: null,
          });
        }
        if (name === 'deduct-wallet') {
          return Promise.resolve({
            data: { success: true },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        })),
      })),
    })),
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native-razorpay', () => {
  return {
    __esModule: true,
    default: {
      open: jest.fn().mockResolvedValue({
        razorpay_order_id: 'order_123_test',
        razorpay_payment_id: 'pay_test_123',
        razorpay_signature: 'sig_test_123'
      })
    }
  };
}, { virtual: true });

describe('Payment Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID = 'rzp_test_key';
    (require('@/lib/supabase').isSupabaseConfigured as jest.Mock).mockReturnValue(true);
  });

  describe('Complete Payment Flow', () => {
    it('should complete wallet top-up flow successfully', async () => {
      const denominationId = '00000000-0000-4000-8000-000000000001';
      const paymentResult = await UnifiedPayment.topUpWallet(denominationId, 500, 'razorpay');
      expect(paymentResult.success).toBe(true);
      expect(paymentResult.orderId).toBeDefined();
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'create-razorpay-order',
        expect.objectContaining({
          body: expect.objectContaining({
            metadata: expect.objectContaining({ denomination_id: denominationId }),
          }),
        }),
      );
    });

    it('should handle subscription purchase flow', async () => {
      const premiumPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'premium_monthly');
      expect(premiumPlan).toBeDefined();

      if (premiumPlan) {
        const result = await UnifiedPayment.pay('razorpay', {
          amount: premiumPlan.price * 100,
          currency: premiumPlan.currency,
          description: `Subscription: ${premiumPlan.name}`,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should handle consultation booking payment', async () => {
      const consultationAmount = 1500;

      const paymentResult = await UnifiedPayment.pay('razorpay', {
        amount: consultationAmount * 100,
        currency: 'INR',
        description: 'Astrologer consultation',
        metadata: {
          astrologerId: 'astrologer-123',
          duration: 15,
          type: 'video_call',
        },
      });

      expect(paymentResult.success).toBe(true);
    });
  });

  describe('Wallet Operations', () => {
    it('should list wallet transactions', async () => {
      const transactions = await getWalletTransactions('test-user-123');
      expect(Array.isArray(transactions)).toBe(true);
    });

    it('should handle wallet deduction', async () => {
      const result = await UnifiedPayment.payWithWallet('user-123', 500, 'consult-123');
      expect(result.success).toBe(true);
    });
  });

  describe('Subscription Management', () => {
    it('should list all subscription plans', () => {
      expect(SUBSCRIPTION_PLANS).toHaveLength(4);
      SUBSCRIPTION_PLANS.filter(plan => plan.id !== 'free').forEach(plan => {
        expect(plan.price).toBeGreaterThan(0);
      });
    });
  });

  afterAll(async () => {
    jest.clearAllTimers();
    await new Promise(resolve => setTimeout(resolve, 0));
  });
});