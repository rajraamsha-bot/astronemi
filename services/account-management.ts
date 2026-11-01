/**
 * Account Management Service
 * 
 * Handles account deletion with cascading deletes and data export.
 * Implements GDPR/CCPA compliance for user data rights.
 */

import { supabase } from '@/lib/supabase';
import { errorReporting, ErrorSeverity } from './error-reporting';

export interface UserDataExport {
  profile: Record<string, unknown> | null;
  kundlis: Record<string, unknown>[];
  consultations: Record<string, unknown>[];
  chatMessages: Record<string, unknown>[];
  horoscopes: Record<string, unknown>[];
  walletTransactions: Record<string, unknown>[];
  subscriptions: Record<string, unknown>[];
  reviews: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  orders: Record<string, unknown>[];
  referrals: Record<string, unknown>[];
  supportTickets: Record<string, unknown>[];
}

/**
 * Page through a table in bounded batches. GDPR exports must be COMPLETE
 * (no silent .limit() truncation) but a single unbounded select of every
 * row can time out / exhaust memory on large accounts — so fetch fixed-size
 * ordered pages until a short page arrives, with a hard safety cap.
 */
const EXPORT_PAGE_SIZE = 500;
const EXPORT_MAX_ROWS = 100_000;

async function fetchAllPages(
  table: string,
  applyFilters: (query: any) => any,
  orderColumn: string = 'created_at'
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const to = from + EXPORT_PAGE_SIZE - 1;
    const { data, error } = await applyFilters(
      supabase.from(table).select('*')
    )
      .order(orderColumn, { ascending: true })
      .range(from, to);

    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as Record<string, unknown>[];
    all.push(...rows);
    if (rows.length < EXPORT_PAGE_SIZE) return all;
    if (all.length > EXPORT_MAX_ROWS) {
      throw new Error(`${table}: export exceeded the ${EXPORT_MAX_ROWS}-row safety cap`);
    }
  }
}

export const accountService = {
  async exportUserData(userId: string): Promise<UserDataExport | null> {
    try {
      const [
        { data: profile },
        kundlis,
        consultations,
        chatMessages,
        horoscopes,
        walletTransactions,
        subscriptions,
        reviews,
        notifications,
        orders,
        referrals,
        supportTickets,
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        fetchAllPages('kundlis', q => q.eq('user_id', userId)),
        fetchAllPages('consultations', q => q.eq('user_id', userId)),
        // chat_messages has no user_id column; fetch via consultation_ids.
        (async () => {
          const myConsultations = await fetchAllPages(
            'consultations',
            (q) => q.select('id').eq('user_id', userId),
          );
          const ids = (myConsultations ?? []).map((c: unknown) => (c as { id: string }).id);
          if (ids.length === 0) return [];
          return fetchAllPages('chat_messages', (q) => q.in('consultation_id', ids));
        })(),
        // horoscopes is a public calendar; not user-scoped.
        (async () => fetchAllPages('horoscopes', (q) => q.limit(0)))(),
        fetchAllPages('wallet_transactions', q => q.eq('user_id', userId)),
        fetchAllPages('subscriptions', q => q.eq('user_id', userId)),
        fetchAllPages('reviews', q => q.eq('user_id', userId)),
        fetchAllPages('notifications', q => q.eq('user_id', userId)),
        fetchAllPages('orders', q => q.eq('user_id', userId)),
        fetchAllPages('referrals', q =>
          q.or(`referrer_id.eq.${userId},referred_id.eq.${userId}`)
        ),
        fetchAllPages('support_tickets', q => q.eq('user_id', userId)),
      ]);

      // SECURITY FIX: Check if profile was actually fetched
      if (!profile) {
        errorReporting.captureMessage('Export failed: profile not found', ErrorSeverity.ERROR, {
          tags: { operation: 'data_export' },
          extra: { userId },
        });
        return null;
      }

      return {
        profile,
        kundlis,
        consultations,
        chatMessages,
        horoscopes,
        walletTransactions,
        subscriptions,
        reviews,
        notifications,
        orders,
        referrals,
        supportTickets,
      };
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { operation: 'data_export' } });
      return null;
    }
  },

  async deleteAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== userId) {
        return { success: false, error: 'Unauthorized' };
      }

      // SECURITY FIX: Use server-provided deletion flow with 30-day grace period
      // instead of attempting admin.deleteUser (which requires service role key)
      // Migration 014 provides request_account_deletion() RPC
      const { data, error } = await supabase.rpc('request_account_deletion');

      if (error) {
        errorReporting.captureException(error as Error, {
          tags: { operation: 'request_account_deletion' },
        });
        return { success: false, error: `Failed to request account deletion: ${error.message}` };
      }

      const result = (Array.isArray(data) ? data[0] : data) as { success?: boolean; message?: string } | null;
      
      if (result && result.success === false) {
        return { success: false, error: result.message || 'Deletion request failed' };
      }

      errorReporting.captureMessage('Account deletion requested', ErrorSeverity.INFO, {
        tags: { operation: 'request_account_deletion' },
        extra: { userId },
      });

      // Return success with message about 30-day grace period
      return { 
        success: true, 
        error: undefined 
      };
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { operation: 'request_account_deletion' } });
      return { success: false, error: 'An unexpected error occurred' };
    }
  },
};

export default accountService;
