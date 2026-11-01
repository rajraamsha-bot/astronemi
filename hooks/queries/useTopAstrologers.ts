import { useQuery } from '@tanstack/react-query';
import { astrologersApi } from '@/services/api';
import { UiAstrologer } from '@/lib/database.types';

export function useTopAstrologers(pageSize: number = 5) {
  return useQuery({
    queryKey: ['astrologers', 'top', pageSize],
    queryFn: async (): Promise<UiAstrologer[]> => {
      const response = await astrologersApi.getAll({ pageSize });

      // C7 fix: astrologersApi.getAll() already transforms DB rows into
      // UiAstrologer via transformAstrologer() (see services/api.ts). Re-mapping
      // here with snake_case fallbacks (apiAstrologer.avatar_url etc.) broke
      // every field because the data is already camelCase — producing
      // stock-photo images and "Expert Astrologer" bios on the home screen.
      // Just use the transformed data as-is; only fill a minimal image
      // fallback for rows that legitimately have no avatar.
      if (response.data?.data && response.data.data.length > 0) {
        return response.data.data.map((a) => ({
          ...a,
          image:
            a.image ||
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
        }));
      }

      // L4 fix: do NOT silently substitute mock astrologers when the API
      // succeeds but the result set is empty (e.g. strict filters) — that
      // surfaced astrologers who don't exist in the database. Mocks are a
      // dev offline aid only; when unconfigured/unreachable the API layer
      // returns an error (handled below by React Query consumers), so an
      // empty list here is a truthful "no astrologers" state.
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}
