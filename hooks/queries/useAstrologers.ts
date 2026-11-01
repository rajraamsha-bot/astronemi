import { useInfiniteQuery } from '@tanstack/react-query';
import { astrologersApi } from '@/services/api';
import { offlineStorage } from '@/services/offline-storage';
import type { UiAstrologer } from '@/lib/database.types';

interface UseAstrologersOptions {
  pageSize?: number;
  filters?: {
    search?: string;
    specialization?: string;
    sortBy?: 'rating' | 'priceLow' | 'priceHigh' | 'experience';
  };
}

export function useAstrologers(options: UseAstrologersOptions = {}) {
  const { pageSize = 20, filters } = options;
  // Destructure filters to primitives so an inline `{ search: q }` literal at
  // the call site doesn't produce a fresh queryKey identity every render and
  // reset the infinite query.
  const search = filters?.search ?? '';
  const specialization = filters?.specialization ?? '';
  const sortBy = filters?.sortBy ?? '';

  return useInfiniteQuery({
    queryKey: ['astrologers', 'list', pageSize, search, specialization, sortBy],
    queryFn: async ({ pageParam = 1 }) => {
      try {
          const response = await astrologersApi.getAll({
            page: pageParam,
            pageSize,
            search,
            specialization,
            sortBy: sortBy || undefined,
          });

        if (response.error) {
          // Offline fallback: last successfully-fetched list.
          const cachedData = await offlineStorage.get<UiAstrologer[]>('astrologers_list');
          if (cachedData) {
            return { data: cachedData, hasMore: false, page: pageParam };
          }
          // NEVER fall back to mocks/astrologers.ts here: these are
          // fabricated "verified" profiles that users could start REAL paid
          // consultations with. An honest empty list lets the screen render
          // its no-results state.
          return { data: [] as UiAstrologer[], hasMore: false, page: pageParam };
        }

        // Data is already transformed by astrologersApi.getAll(), no need to transform again
        const newAstrologers = (response.data?.data || []) as UiAstrologer[];

        // Cache the data
        if (pageParam === 1) {
          await offlineStorage.save('astrologers_list', newAstrologers);
        }


        return {
          data: newAstrologers as UiAstrologer[],
          hasMore: response.data?.hasMore || false,
          page: pageParam,
        };
      } catch {
        const cachedData = await offlineStorage.get<UiAstrologer[]>('astrologers_list');
        if (cachedData) {
          return { data: cachedData, hasMore: false, page: pageParam };
        }
        return { data: [] as UiAstrologer[], hasMore: false, page: pageParam };
      }

    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
