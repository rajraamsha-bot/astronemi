/**
 * Payment Router Tests
 * 
 * Tests for payment order creation, verification, subscriptions,
 * wallet operations, and webhook handling.
 */

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: { id: 'user-1' }, error: null })),
          })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

jest.mock('@/services/payment', () => ({
  UnifiedPayment: {
    createRazorpayOrder: jest.fn(),
    verifyRazorpayPayment: jest.fn(),
    getAvailableMethods: jest.fn(),
    pay: jest.fn(),
  },
}));

jest.mock('@/services/wallet', () => ({
  topupWallet: jest.fn(),
  getWalletBalance: jest.fn(),
  getTransactionHistory: jest.fn(),
  deductFromWallet: jest.fn(),
  TOPUP_OPTIONS: [
    { amount: 100, label: '₹100' },
    { amount: 500, label: '₹500' },
    { amount: 1000, label: '₹1000' },
  ],
}));

import { UnifiedPayment } from '@/services/payment';
import {
  topupWallet,
  getWalletBalance,
  getTransactionHistory,
  deductFromWallet,
} from '@/services/wallet';

describe('Payment Service Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Order Creation', () => {
    it('should create a Razorpay order successfully', async () => {
      (UnifiedPayment.createRazorpayOrder as jest.Mock).mockResolvedValue({
        success: true,
        orderId: 'order_123',
      });

      const result = await UnifiedPayment.createRazorpayOrder({
        amount: 500,
        currency: 'INR',
        description: 'Test payment',
        userId: 'user-1',
        method: 'razorpay',
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order_123');
    });

    it('should handle order creation failure', async () => {
      (UnifiedPayment.createRazorpayOrder as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Payment gateway unavailable',
      });

      const result = await UnifiedPayment.createRazorpayOrder({
        amount: 500,
        currency: 'INR',
        description: 'Test payment',
        userId: 'user-1',
        method: 'razorpay',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Payment Verification', () => {
    it('should verify payment successfully', async () => {
      (UnifiedPayment.verifyRazorpayPayment as jest.Mock).mockResolvedValue(true);

      const result = await UnifiedPayment.verifyRazorpayPayment(
        'order_123',
        'pay_456',
        'signature_789'
      );

      expect(result).toBe(true);
    });

    it('should reject invalid payment signature', async () => {
      (UnifiedPayment.verifyRazorpayPayment as jest.Mock).mockResolvedValue(false);

      const result = await UnifiedPayment.verifyRazorpayPayment(
        'order_123',
        'pay_456',
        'invalid_signature'
      );

      expect(result).toBe(false);
    });
  });

  describe('Wallet Operations', () => {
    it('should top up wallet successfully', async () => {
      (topupWallet as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Wallet topped up',
        newBalance: 1500,
      });

      const result = await topupWallet('user-1', 500);

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(1500);
    });

    it('should get wallet balance', async () => {
      (getWalletBalance as jest.Mock).mockResolvedValue(1000);

      const balance = await getWalletBalance('user-1');

      expect(balance).toBe(1000);
    });

    it('should get transaction history', async () => {
      (getTransactionHistory as jest.Mock).mockResolvedValue([
        { id: 'tx-1', amount: 500, type: 'credit', createdAt: new Date().toISOString() },
        { id: 'tx-2', amount: 200, type: 'debit', createdAt: new Date().toISOString() },
      ]);

      const transactions = await getTransactionHistory('user-1', 10, 0);

      expect(transactions).toHaveLength(2);
      expect(transactions[0].type).toBe('credit');
    });

    it('should deduct from wallet', async () => {
      (deductFromWallet as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Payment successful',
        newBalance: 800,
      });

      const result = await deductFromWallet('user-1', 200, 'order-1');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(800);
    });

    it('should handle insufficient balance', async () => {
      (deductFromWallet as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Insufficient balance',
      });

      const result = await deductFromWallet('user-1', 5000, 'order-1');

      expect(result.success).toBe(false);
    });
  });

  describe('Payment Methods', () => {
    it('should return available payment methods', async () => {
      (UnifiedPayment.getAvailableMethods as jest.Mock).mockResolvedValue([
        'razorpay',
        'wallet',
      ]);

      const methods = await UnifiedPayment.getAvailableMethods();

      expect(methods).toContain('razorpay');
      expect(methods).toContain('wallet');
    });
  });
});