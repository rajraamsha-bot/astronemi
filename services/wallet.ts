/**
 * Wallet Service - Production Ready
 *
 * Manages user wallet balance, transactions, and top-ups
 * with Supabase backend synchronization.
 *
 * React Native Best Practices:
 * - All balance operations go through server (Supabase RPC)
 * - Cache locally for offline viewing
 * - Use expo-secure-store for sensitive transaction data
 * - Implement proper rate limiting
 * - Use CSPRNG for all client-generated IDs
 *
 * Production Safety (HIGH-1 fix):
 * - Removed all `if (__DEV__)` branches that mutate state when
 *   Supabase is not configured. State mutation in production is
 *   money correctness, not "service unavailable".
 * - If Supabase is not configured, every balance-affecting function
 *   returns an error. The dev-mode in-memory mock is only available
 *   when `EXPO_PUBLIC_USE_MOCK_API=true` is explicitly set.
 */

import { errorReporting } from './error-reporting';
import { secureStorage } from './secure-storage';
import { RateLimiter } from './rate-limiter';
import { Logger } from './logger';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type WalletTransactionSource =
  | 'topup'
  | 'razorpay'
  | 'refund'
  | 'referral'
  | 'consultation'
  | 'call'
  | 'question'
  | 'subscription'
  | 'product_order'
  | 'pooja_booking'
  | 'tip'
  | 'gift'
  | 'signup_bonus'
  | 'system'
  | 'other';

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  source: WalletTransactionSource;
  referenceId?: string;
  paymentId?: string;
  description: string;
  createdAt: Date;
}

export interface TopupOption {
  amount: number;
  popular?: boolean;
}

// NOTE: no bonus fields. The server credits exactly the paid amount
// (mark_payment_completed_v2); earlier bonus numbers here were dead config
// that promised credit the backend never applied.
export const TOPUP_OPTIONS: TopupOption[] = [
  { amount: 100 },
  { amount: 250 },
  { amount: 500, popular: true },
  { amount: 1000 },
  { amount: 2000 },
  { amount: 5000 },
];

const WALLET_KEY = 'astrofusion_wallet';
// H6 fix: 60 s was too long for an in-flight consultation — a debit landing
// right after a cache read showed the user stale funds. 5 s bounds staleness
// while still absorbing burst reads.
const CACHE_TTL_MS = 5 * 1000; // 5 seconds

// Business timezone is IST (UTC+5:30) - the app's primary market. Month
// boundaries for "monthly spending" must be computed in IST, not the
// device's local timezone, otherwise transactions around the month boundary
// are bucketed into the wrong month.
const BUSINESS_TZ_OFFSET_MS = 5.5 * 60 * 60 * 1000; // IST, UTC+5:30
const businessMonthStartIso = (now: Date): string => {
  const ist = new Date(now.getTime() + BUSINESS_TZ_OFFSET_MS);
  const startUtcMs = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - BUSINESS_TZ_OFFSET_MS;
  return new Date(startUtcMs).toISOString();
};

/**
 * Delete the locally cached balance for a user so the next read hits the
 * server. Wallet.tsx calls this after a successful top-up so the user sees
 * the new balance immediately instead of waiting out the TTL.
 */
export const invalidateWalletCache = async (userId: string): Promise<void> => {
  try {
    await secureStorage.removeItem(`${WALLET_KEY}_balance_${userId}`);
  } catch (e) {
    Logger.warn('Failed to invalidate wallet cache', { error: e });
  }
};

/**
 * HIGH-1 fix: explicit opt-in to dev mock. Set
 * `EXPO_PUBLIC_USE_MOCK_API=true` in .env.development to enable.
 * Default is OFF, even in dev — money code never fakes state.
 */
const ALLOW_DEV_MOCK =
  process.env.EXPO_PUBLIC_USE_MOCK_API === 'true' && __DEV__;

/**
 * Get wallet balance. Reads from secure local cache first, then syncs
 * with the server. Returns the cached balance on error.
 */
export const getWalletBalance = async (userId: string): Promise<number> => {
  try {
    // Check local cache first
    const cached = await secureStorage.getItem(`${WALLET_KEY}_balance_${userId}`);
    if (cached) {
      const { balance, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        return balance;
      }
    }

    // Sync with server
    return await syncWalletWithServer(userId);
  } catch (error) {
    errorReporting.captureException(error as Error, { tags: { service: 'wallet' } });
    // Return last known balance on error
    const cached = await secureStorage.getItem(`${WALLET_KEY}_balance_${userId}`);
    return cached ? JSON.parse(cached).balance : 0;
  }
};

/**
 * Sync wallet balance from Supabase. Throws on error.
 */
const syncWalletWithServer = async (userId: string): Promise<number> => {
  if (!isSupabaseConfigured() && !ALLOW_DEV_MOCK) {
    throw new Error('Wallet service unavailable');
  }

  if (!isSupabaseConfigured() && ALLOW_DEV_MOCK) {
    const cached = await secureStorage.getItem(`${WALLET_KEY}_balance_${userId}`);
    return cached ? JSON.parse(cached).balance : 0;
  }

  const { data, error } = await supabase
    .from('users')
    .select('wallet_balance')
    .eq('id', userId)
    .single();

  if (error) {
    Logger.error('Failed to fetch wallet balance', error, { userId });
    throw error;
  }

  const balance = data?.wallet_balance ?? 0;
  await secureStorage.setItem(
    `${WALLET_KEY}_balance_${userId}`,
    JSON.stringify({ balance, timestamp: Date.now() })
  );
  return balance;
};

/**
 * Get transaction history with pagination.
 */
export const getTransactionHistory = async (
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<WalletTransaction[]> => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        Logger.error('Failed to fetch transactions', error, { userId });
      } else if (data) {
        const transactions = data.map(mapDbTransaction);
        // Only the first page may be cached. Caching a deeper page overwrote
        // the cache with rows starting at `offset`, and the offline fallback
        // below then sliced by `offset` a second time — so an offline reader
        // silently skipped 2x the intended number of transactions.
        if (offset === 0) {
          await secureStorage.setItem(
            `${WALLET_KEY}_transactions_${userId}`,
            JSON.stringify(transactions)
          );
        }
        return transactions;
      }
    }

    // Fallback to cache (cache always represents the list from offset 0)
    const cachedTransactions = await secureStorage.getItem(`${WALLET_KEY}_transactions_${userId}`);
    if (cachedTransactions) {
      return JSON.parse(cachedTransactions).slice(offset, offset + limit);
    }

    return [];
  } catch (error) {
    errorReporting.captureException(error as Error, { tags: { service: 'wallet' } });
    return [];
  }
};

/**
 * Top up wallet via payment gateway.
 * HIGH-1 fix: the dev-mock path no longer mutates state. It simply
 * returns an error so the operator must configure Supabase.
 */
/**
 * Top up wallet. SECURITY FIX: this NO LONGER credits the wallet directly.
 * Crediting money with no payment verification was a money-printing bug.
 * The real top-up flow is:
 *   1. Create a Razorpay order (payment.ts createOrder)
 *   2. User pays via gateway
 *   3. Server verifies the signature (verify-payment Edge Function, service_role)
 *   4. The WEBHOOK credits the wallet server-side.
 * This function only validates input and records an intent. Credit must come
 * from the verified webhook. Use `payment.service.startWalletTopup()` for the
 * real flow.
 *
 * @deprecated Use PaymentService.startWalletTopup() which goes through the
 * verified gateway + webhook. Kept for backward-compatible tests only.
 */
export const topupWallet = async (
  userId: string,
  amount: number
): Promise<{ success: boolean; message: string; newBalance?: number }> => {
  try {
    const rateCheck = await RateLimiter.checkRateLimit('payment', userId);
    if (rateCheck.isLimited) {
      return {
        success: false,
        message: 'Too many payment attempts. Please try again later.',
      };
    }

    if (!Number.isFinite(amount) || amount < 10 || amount > 50000) {
      return { success: false, message: 'Amount must be between \u20b910 and \u20b950,000' };
    }

    await RateLimiter.recordAttempt('payment', userId);

    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Wallet service unavailable' };
    }

    // Do NOT credit here. Money is only credited by the verified webhook.
    return {
      success: false,
      message:
        'Direct wallet crediting is disabled for security. Complete payment through the checkout; your wallet is credited automatically after the payment is verified.',
    };
  } catch (error) {
    errorReporting.captureException(error as Error, { tags: { service: 'wallet' } });
    return { success: false, message: 'Top-up failed. Please try again.' };
  }
};

/**
 * Deduct from wallet for consultation.
 */
export const deductFromWallet = async (
  userId: string,
  amount: number,
  consultationId: string,
  description?: string
): Promise<{ success: boolean; message: string; newBalance?: number }> => {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Wallet service unavailable' };
    }

    // Do not read the balance before debiting. That separate read is only a
    // hint and creates a TOCTOU race when two screens charge concurrently;
    // deduct-wallet/debit_wallet is the atomic authority.
    const { data, error } = await supabase.functions.invoke('deduct-wallet', {
      body: {
        amount,
        source: 'consultation',
        referenceId: consultationId,
        description: description ?? `Consultation payment \u20b9${amount}`,
      },
    });

    const responseMessage = typeof data?.message === 'string' ? data.message : '';
    if (error || data?.success !== true) {
      const errorMessage = /insufficient/i.test(responseMessage)
        ? 'Insufficient wallet balance'
        : responseMessage || 'Payment failed. Please try again.';
      Logger.error('Wallet debit RPC failed', error, { userId, amount });
      return { success: false, message: errorMessage };
    }

    const newBalance = Number(data?.newBalance);
    if (Number.isFinite(newBalance)) {
      await secureStorage.setItem(
        `${WALLET_KEY}_balance_${userId}`,
        JSON.stringify({ balance: newBalance, timestamp: Date.now() })
      );
    }

    return {
      success: true,
      message: 'Payment successful',
      ...(Number.isFinite(newBalance) ? { newBalance } : {}),
    };
  } catch (error) {
    errorReporting.captureException(error as Error, { tags: { service: 'wallet' } });
    return { success: false, message: 'Payment failed' };
  }
};

/**
 * Charge one consultation minute through the server-owned idempotency RPC.
 * The caller supplies only a sequential minute number; the RPC derives the
 * rate, verifies the participant, and serializes the wallet debit.
 */
export const debitConsultationMinute = async (
  userId: string,
  consultationId: string,
  billingMinute: number,
  source: 'consultation' | 'call' = 'consultation',
): Promise<{ success: boolean; message: string; newBalance?: number; alreadyProcessed?: boolean }> => {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Wallet service unavailable' };
    }
    if (!Number.isInteger(billingMinute) || billingMinute < 1) {
      return { success: false, message: 'Invalid billing minute' };
    }

    const { data, error } = await supabase.rpc('debit_consultation_minute', {
      p_consultation_id: consultationId,
      p_billing_minute: billingMinute,
      p_source: source,
    });
    const result = (Array.isArray(data) ? data[0] : data) as {
      success?: boolean;
      message?: string;
      new_balance?: number;
      already_processed?: boolean;
    } | null;

    if (error || result?.success !== true) {
      Logger.error('Consultation minute debit failed', error, {
        userId,
        consultationId,
        billingMinute,
      });
      return {
        success: false,
        message: result?.message || error?.message || 'Payment failed. Please try again.',
      };
    }

    const newBalance = Number(result.new_balance);
    if (Number.isFinite(newBalance)) {
      await secureStorage.setItem(
        `${WALLET_KEY}_balance_${userId}`,
        JSON.stringify({ balance: newBalance, timestamp: Date.now() })
      );
    }

    return {
      success: true,
      message: 'Payment successful',
      ...(Number.isFinite(newBalance) ? { newBalance } : {}),
      alreadyProcessed: result.already_processed === true,
    };
  } catch (error) {
    errorReporting.captureException(error as Error, { tags: { service: 'wallet' } });
    return { success: false, message: 'Payment failed' };
  }
};

/**
 * Credit wallet (for top-ups, refunds, referrals, signup bonus).
 * HIGH-1 fix: production code path is server-side only.
 */
export const creditWallet = async (
  userId: string,
  amount: number,
  source: WalletTransaction['source'],
  _description: string,
  _referenceId?: string
): Promise<{ success: boolean; message: string; newBalance?: number }> => {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Wallet service unavailable' };
    }

    // SECURITY: never allow the client to credit arbitrary money to an
    // arbitrary user. The server must scope credits to the calling user.
    const { data: authData } = await supabase.auth.getUser();
    const callerId = authData.user?.id;
    if (!callerId) {
      return { success: false, message: 'Not authenticated' };
    }
    if (callerId !== userId) {
      Logger.error('Blocked cross-user wallet credit attempt', undefined, { callerId, userId });
      return { success: false, message: 'Cannot credit another user\'s wallet' };
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 50000) {
      return { success: false, message: 'Invalid amount' };
    }

    // Wallet credits are server-authoritative only. The credit_wallet RPC is
    // revoked from authenticated (migration 023) and additionally guarded by
    // __assert_service_role() (migration 031), so a client call can never
    // succeed. Credits happen exclusively server-side via Edge Functions
    // (verify-payment / razorpay-webhook) or SECURITY DEFINER RPCs
    // (apply_signup_bonus / apply_referral_code / send_tip).
    Logger.warn('Client-side creditWallet() is disabled by design', { userId, amount, source });
    return { success: false, message: 'Wallet credits are processed server-side only.' };
  } catch (error) {
    errorReporting.captureException(error as Error, { tags: { service: 'wallet' } });
    return { success: false, message: 'Failed to credit wallet' };
  }
};

/**
 * Record a wallet transaction locally. Uses a CSPRNG for the ID.
 * The server is the source of truth for real transactions; this is
 * only used for offline dev-mode caching.
 */
/**
 * Check if user has sufficient balance
 */
export const hasSufficientBalance = async (userId: string, amount: number): Promise<boolean> => {
  const balance = await getWalletBalance(userId);
  return balance >= amount;
};

/**
 * Get monthly spending
 */
export const getMonthlySpending = async (userId: string): Promise<number> => {
  try {
    // FIX: aggregate on the server with a date filter instead of fetching
    // 1000 rows and filtering client-side (which silently truncated totals
    // once the user exceeded 1000 transactions).
    if (isSupabaseConfigured()) {
      const startOfMonth = businessMonthStartIso(new Date());
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'debit')
        .gte('created_at', startOfMonth);
      if (!error && data) {
        return data.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      }
      Logger.error('Failed to fetch monthly spending', error, { userId });
    }

    // Offline fallback: aggregate from the locally cached first page of
    // transactions (same cache getTransactionHistory() maintains), so an
    // offline user does not see ₹0 spending.
    const cached = await secureStorage.getItem(`${WALLET_KEY}_transactions_${userId}`);
    if (cached) {
      const istNow = new Date(Date.now() + BUSINESS_TZ_OFFSET_MS);
      const month = istNow.getUTCMonth();
      const year = istNow.getUTCFullYear();
      const transactions = JSON.parse(cached) as WalletTransaction[];
      return transactions
        .filter((t) => {
          const d = new Date(new Date(t.createdAt).getTime() + BUSINESS_TZ_OFFSET_MS);
          return (
            t.type === 'debit' &&
            !Number.isNaN(d.getTime()) &&
            d.getUTCMonth() === month &&
            d.getUTCFullYear() === year
          );
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    }

    return 0;
  } catch (error) {
    errorReporting.captureException(error as Error, { tags: { service: 'wallet' } });
    return 0;
  }
};

/**
 * Get spending breakdown by category
 */
export const getSpendingBreakdown = async (userId: string): Promise<Record<string, number>> => {
  try {
    // FIX: aggregate on the server rather than a capped client-side fetch.
    if (isSupabaseConfigured()) {
      // Bound the window: aggregate only the trailing 12 months so the
      // breakdown does not fetch (and then aggregate) an unbounded history.
      // Use a server-side aggregate RPC if an all-time view is required.
      const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('reference_type, amount')
        .eq('user_id', userId)
        .eq('type', 'debit')
        .gte('created_at', twelveMonthsAgo);
      if (!error && data) {
        const breakdown: Record<string, number> = {};
        data.forEach(row => {
          // `source` was the pre-migration name; retain a read-only fallback
          // for cached/mock rows while querying the real reference_type column.
          const legacyRow = row as unknown as { source?: unknown };
          const src = String(row.reference_type ?? legacyRow.source ?? 'other');
          breakdown[src] = (breakdown[src] || 0) + Number(row.amount || 0);
        });
        return breakdown;
      }
      Logger.error('Failed to fetch spending breakdown', error, { userId });
    }
    return {};
  } catch (error) {
    errorReporting.captureException(error as Error, { tags: { service: 'wallet' } });
    return {};
  }
};

/**
 * Calculate consultation cost
 */
export const calculateConsultationCost = (pricePerMinute: number, durationMinutes: number): number => {
  // Display-only quote (server billing is authoritative). Round to paise so
  // the UI never shows ₹49.9999999-style float artifacts (L2).
  return Math.round(pricePerMinute * durationMinutes * 100) / 100;
};

/**
 * Estimate max consultation duration
 */
export const estimateMaxDuration = (walletBalance: number, pricePerMinute: number): number => {
  if (pricePerMinute <= 0) return 0;
  return Math.floor(walletBalance / pricePerMinute);
};

const mapDbTransaction = (db: {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  reference_type?: string | null;
  reference_id?: string;
  payment_id?: string;
  description: string;
  created_at: string;
}): WalletTransaction => {
  const legacyRow = db as unknown as { source?: string | null };
  return {
    id: db.id,
    userId: db.user_id,
    type: db.type as WalletTransaction['type'],
    amount: db.amount,
    balanceAfter: db.balance_after,
    source: (db.reference_type ?? legacyRow.source ?? 'other') as WalletTransactionSource,
    referenceId: db.reference_id,
    paymentId: db.payment_id,
    description: db.description,
    createdAt: new Date(db.created_at),
  };
};

export default {
  getWalletBalance,
  getTransactionHistory,
  topupWallet,
  deductFromWallet,
  debitConsultationMinute,
  creditWallet,
  hasSufficientBalance,
  getMonthlySpending,
  getSpendingBreakdown,
  calculateConsultationCost,
  estimateMaxDuration,
  TOPUP_OPTIONS,
};


// ============================================
// BACKWARDS-COMPATIBLE SHIM (added by fix-all script)
// ============================================
// Test files expect a `walletService` class with methods. Provide a thin
// object wrapper that delegates to the standalone functions above.

export const walletService = {
  async getBalance(userId: string): Promise<number> {
    return getWalletBalance(userId);
  },
  async deductFromWallet(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): Promise<{ success: boolean; message: string; newBalance?: number }> {
    try {
      // FIX: removed the redundant client-side balance pre-check. The server
      // (deduct-wallet Edge Function) authoritatively checks balance, and the
      // separate client check created a TOCTOU double-deduction race.
      // Also: never substitute an empty string for a missing referenceId —
      // that broke idempotency keys. Fall back to the description.
      const result = await deductFromWallet(
        userId,
        amount,
        referenceId || description || 'wallet-debit',
        description
      );
      return { success: result.success, message: result.message, newBalance: result.newBalance };
    } catch (err) {
      return { success: false, message: String(err) };
    }
  },
  async creditWallet(
    userId: string,
    amount: number,
    source: string,
    description: string
  ): Promise<{ success: boolean; message: string; newBalance?: number }> {
    return creditWallet(userId, amount, source as WalletTransaction['source'], description);
  },
  async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    return hasSufficientBalance(userId, amount);
  },
  async getTransactions(userId: string, limit: number = 20): Promise<Record<string, unknown>[]> {
    return getTransactionHistory(userId, limit) as unknown as Record<string, unknown>[];
  },
};
