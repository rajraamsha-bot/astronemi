/**
 * React Query wrappers for the admin analytics RPCs.
 * Each hook has a short staleTime so refresh gives fresh numbers.
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchAdminOverview,
  fetchRecentActivity,
  fetchRevenueTimeseries,
  fetchTopAstrologers,
  type AdminActivity,
  type AdminOverview,
  type RevenuePoint,
  type TopAstrologer,
} from '@/services/admin-analytics';

const STALE_MS = 30 * 1000;

export function useAdminOverview(enabled = true) {
  return useQuery<AdminOverview | null>({
    queryKey: ['admin-overview'],
    staleTime: STALE_MS,
    queryFn: fetchAdminOverview,
    enabled,
  });
}

export function useRevenueTimeseries(days = 14, enabled = true) {
  return useQuery<RevenuePoint[]>({
    queryKey: ['admin-revenue-timeseries', days],
    staleTime: STALE_MS,
    queryFn: () => fetchRevenueTimeseries(days),
    enabled,
  });
}

export function useRecentActivity(limit = 15, enabled = true) {
  return useQuery<AdminActivity[]>({
    queryKey: ['admin-recent-activity', limit],
    staleTime: STALE_MS,
    queryFn: () => fetchRecentActivity(limit),
    enabled,
  });
}

export function useTopAstrologers(limit = 5, enabled = true) {
  return useQuery<TopAstrologer[]>({
    queryKey: ['admin-top-astrologers', limit],
    staleTime: STALE_MS,
    queryFn: () => fetchTopAstrologers(limit),
    enabled,
  });
}
