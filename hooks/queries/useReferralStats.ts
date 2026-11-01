/**
 * useReferralStats — React Query wrapper around the referral service.
 */

import { useQuery } from '@tanstack/react-query';
import { getReferralStats, type ReferralStatsData } from '@/services/referral';

export function useReferralStats(userId: string | undefined, referralCode: string) {
  return useQuery<ReferralStatsData>({
    queryKey: ['referralStats', userId ?? 'anon', referralCode],
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!userId) {
        return {
          referralCode,
          totalReferrals: 0,
          successfulReferrals: 0,
          pendingReferrals: 0,
          totalEarned: 0,
          currentMonthEarned: 0,
          referralHistory: [],
        };
      }
      return getReferralStats(userId, referralCode);
    },
  });
}
