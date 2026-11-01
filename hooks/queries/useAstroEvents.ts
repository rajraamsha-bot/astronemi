import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listAstroEvents,
  toggleEventBookmark,
  type AstroEvent,
  type AstroEventKind,
} from '@/services/astro-events';

export function useAstroEvents(
  options: { kind?: AstroEventKind | 'all'; includePast?: boolean; userId?: string } = {},
) {
  return useQuery<AstroEvent[]>({
    queryKey: [
      'astro-events',
      options.kind ?? 'all',
      options.includePast ?? false,
      options.userId ?? 'anon',
    ],
    staleTime: 60 * 1000,
    queryFn: () => listAstroEvents(options),
  });
}

export function useToggleEventBookmark(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!userId) throw new Error('Sign in to bookmark events');
      const r = await toggleEventBookmark(userId, eventId);
      if (!r) throw new Error('Could not update bookmark');
      return { eventId, ...r };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['astro-events'] }),
  });
}
