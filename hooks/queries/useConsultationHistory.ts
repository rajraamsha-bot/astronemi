import { useQuery } from '@tanstack/react-query';
import { getConsultationHistory } from '@/services/chat';
import { ConsultationSummary } from '@/types/entities';

export function useConsultationHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['consultations', userId],
    queryFn: async () => {
      if (!userId) return [];

      const history = await getConsultationHistory(userId);
      const mapped: ConsultationSummary[] = history.map((c: any) => {
        return {
          id: c.id as string,
          type: c.type as 'chat' | 'call' | 'video',
          status: (c.status === 'pending' || c.status === 'active' ? 'upcoming' : c.status) as any,
          start_time: c.createdAt as string,
          end_time: c.endedAt as string,
          duration_minutes: c.durationMinutes as number,
          total_amount: c.totalAmount as number,
          user_rating: c.userRating as number,
          created_at: c.createdAt as string,
          astrologerName: (c.astrologerName || 'Astrologer') as string,
          astrologerAvatar: (c.astrologerImage || 'https://via.placeholder.com/100') as string,
          formattedDate: new Date(c.createdAt as string).toLocaleDateString(),
          formattedTime: new Date(c.createdAt as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          formattedDuration: `${c.durationMinutes} mins`,
          statusLabel: c.status === 'pending' || c.status === 'active' ? 'upcoming' : c.status as string,
          canJoin: c.status === 'active',
          canRate: c.status === 'completed' && !c.userRating,
        };
      });
      return mapped;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}
