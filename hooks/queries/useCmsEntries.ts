/**
 * React Query wrapper around the CMS service. All content screens
 * (blog, news, videos, podcasts, courses, meditations, mantras) use
 * this hook so they share caching, pagination, and search semantics.
 */

import { useQuery } from '@tanstack/react-query';
import { listCmsEntries, type CmsEntry, type CmsKind } from '@/services/cms';

export interface UseCmsEntriesOptions {
  category?: string;
  limit?: number;
  onlyFeatured?: boolean;
  search?: string;
  enabled?: boolean;
}

export function useCmsEntries(kind: CmsKind, options: UseCmsEntriesOptions = {}) {
  const { category, limit, onlyFeatured, search, enabled = true } = options;

  return useQuery<CmsEntry[]>({
    queryKey: ['cms', kind, category ?? 'all', limit ?? 50, onlyFeatured ?? false, search ?? ''],
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
    queryFn: () => listCmsEntries({ kind, category, limit, onlyFeatured, search }),
  });
}
