/**
 * Transaction Entity Types
 * 
 * Consolidated transaction and payment-related type definitions
 * Extends database types with computed fields and API variants
 */

import type { Database } from '@/lib/database.types';

// Base wallet transaction type from database
export type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row'];
export type WalletTransactionInsert = Database['public']['Tables']['wallet_transactions']['Insert'];
export type WalletTransactionUpdate = Database['public']['Tables']['wallet_transactions']['Update'];

// Transaction types
export type TransactionType = 'credit' | 'debit';

// Transaction sources
export type TransactionSource = 'topup' | 'refund' | 'referral' | 'consultation' | 'subscription';

// Payment status
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// Payment methods
export type PaymentMethod = 'razorpay' | 'wallet' | 'upi' | 'card' | 'netbanking' | 'paytm' | 'phonepe' | 'gpay';

// Extended transaction with computed fields
export interface TransactionDetails extends WalletTransaction {
  // Computed display fields
  formattedAmount: string;
  formattedDate: string;
  formattedTime: string;
  statusLabel: string;
  typeLabel: string;
  sourceLabel: string;
  
  // Additional metadata
  canRefund: boolean;
  canDownloadReceipt: boolean;
  isRecent: boolean; // within last 24 hours
}

// Transaction summary for listings
export interface TransactionSummary extends Pick<WalletTransaction,
  'id' | 'type' | 'amount' | 'balance_after' | 'source' | 'description' | 'created_at'
> {
  formattedAmount: string;
  formattedDate: string;
  formattedTime: string;
  statusIcon: string;
  statusColor: string;
  canViewDetails: boolean;
}

// Wallet information
export interface WalletInfo {
  balance: number;
  pendingBalance: number;
  totalAdded: number;
  totalSpent: number;
  formattedBalance: string;
  formattedPendingBalance: string;
  lastTransaction: TransactionSummary | null;
  canTopup: boolean;
  minTopupAmount: number;
  maxTopupAmount: number;
}

// Top-up request
export interface TopUpRequest {
  amount: number;
  paymentMethod: PaymentMethod;
  promoCode?: string;
}

// Payment order
export interface PaymentOrder {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  expiresAt: string;
}

// Razorpay payment options
export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  image: string;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
}

// Payment verification request
export interface PaymentVerificationRequest {
  orderId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

// Payment verification response
export interface PaymentVerificationResponse {
  success: boolean;
  transactionId: string;
  newBalance: number;
  message: string;
}

// Transaction filters
export interface TransactionFilters {
  userId?: string;
  type?: TransactionType;
  source?: TransactionSource;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  status?: PaymentStatus;
  sortBy?: 'created_at' | 'amount' | 'balance_after';
  sortOrder?: 'asc' | 'desc';
}

// Transaction statistics
export interface TransactionStats {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  netAmount: number;
  averageTransaction: number;
  largestCredit: number;
  largestDebit: number;
  mostCommonSource: TransactionSource;
  monthlyTrend: Array<{
    month: string;
    credits: number;
    debits: number;
    net: number;
  }>;
  sourceDistribution: Record<TransactionSource, {
    count: number;
    amount: number;
    percentage: number;
  }>;
}

// Refund request
export interface RefundRequest {
  transactionId: string;
  reason: string;
  amount?: number; // Partial refund amount
  notes?: string;
}

// Refund response
export interface RefundResponse {
  success: boolean;
  refundId: string;
  refundAmount: number;
  estimatedDays: number;
  message: string;
}

// Promo code
export interface PromoCode {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minAmount: number;
  maxDiscount?: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  description: string;
}

// Promo code validation
export interface PromoCodeValidation {
  isValid: boolean;
  discount: number;
  finalAmount: number;
  message: string;
  promoCode?: PromoCode;
}

// Transaction receipt
export interface TransactionReceipt {
  transactionId: string;
  orderId?: string;
  amount: number;
  type: TransactionType;
  source: TransactionSource;
  paymentMethod?: PaymentMethod;
  date: string;
  time: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  tax?: number;
  discount?: number;
  promoCode?: string;
  referenceNumber?: string;
  customerInfo: {
    name: string;
    email?: string;
    phone?: string;
  };
  companyInfo: {
    name: string;
    address: string;
    gstin?: string;
    support: string;
  };
}

// Subscription transaction
export interface SubscriptionTransaction extends TransactionDetails {
  subscriptionId: string;
  planName: string;
  planDuration: string;
  features: string[];
  autoRenew: boolean;
  nextBillingDate?: string;
}

// Consultation transaction
export interface ConsultationTransaction extends TransactionDetails {
  consultationId: string;
  astrologerId: string;
  astrologerName: string;
  consultationType: 'chat' | 'call' | 'video';
  duration: number; // in minutes
  ratePerMinute: number;
}