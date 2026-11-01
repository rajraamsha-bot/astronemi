/**
 * React Query hooks for live streams + reminders.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listLiveStreams,
  listUserReminders,
  toggleStreamReminder,
  type LiveStream,
} from '@/services/live-streams';

export function useLiveStreams(options: { onlyUpcoming?: boolean; limit?: number } = {}) {
  return useQuery<LiveStream[]>({
    queryKey: ['live-streams', options.onlyUpcoming ?? false, options.limit ?? 50],
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: () => listLiveStreams(options),
  });
}

export function useUserStreamReminders(userId: string | undefined) {
  return useQuery<string[]>({
    queryKey: ['stream-reminders', userId ?? 'anon'],
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    queryFn: () => (userId ? listUserReminders(userId) : Promise.resolve([])),
  });
}

export function useToggleStreamReminder(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (streamId: string) => {
      if (!userId) throw new Error('You must be signed in to set a reminder');
      const result = await toggleStreamReminder(userId, streamId);
      if (!result) throw new Error('Could not update reminder');
      return { streamId, ...result };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stream-reminders', userId] });
    },
  });
}
