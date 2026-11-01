import { useQuery } from '@tanstack/react-query';
import { getWalletTransactions } from '@/services/payment';
import { Logger } from '@/services/logger';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  time: string;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
}

export function useTransactions(userId: string | undefined, fallback: Transaction[] = []) {
  return useQuery({
    queryKey: ['transactions', userId],
    queryFn: async () => {
      if (!userId) return fallback;

      try {
        const txns = await getWalletTransactions(userId);
        if (txns && txns.length > 0) {
          const mapped: Transaction[] = txns.map((t: Record<string, unknown>) => {
            const type = (t.type as string) || 'credit';
            const createdAt = (t.created_at as string) || new Date().toISOString();
            return {
              id: String(t.id ?? ''),
              type: type === 'debit' ? 'debit' : 'credit',
              amount: Number(t.amount ?? 0),
              description: String(t.description ?? (type === 'credit' ? 'Wallet Top-Up' : 'Payment')),
              // M2 fix: 'en-IN' emits DD/MM/YYYY while other screens show
              // 'X Aug 2026'; use 'en-GB' day-month-year which matches the
              // wallet screen format and is unambiguous across locales.
              date: new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
              time: new Date(createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              // The wallet ledger is written atomically with the balance
              // change (credit_wallet/debit_wallet RPCs), so every row in
              // wallet_transactions is settled by construction. The previous
              // code read a `payment_status` column that does not exist on
              // this table — it always coerced to 'completed' while looking
              // like real status mapping.
              status: 'completed' as const,
              reference: String(t.payment_id ?? t.reference_id ?? ''),
            };
          });
          return mapped;
        }
        return fallback;
      } catch (e) {
        Logger.error('Failed to fetch transactions:', e);
        return fallback;
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}
