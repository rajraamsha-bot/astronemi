/**
 * usePagination Hook
 * 
 * Reusable hook for paginated data loading
 * Eliminates duplicate pagination logic across screens
 */

import { useState, useCallback, useMemo } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  total?: number;
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 20,
}: UsePaginationOptions = {}) {
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    pageSize: initialPageSize,
    total: undefined,
  });
  const [loading, setLoading] = useState(false);

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page: Math.max(1, page) }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize: Math.max(1, pageSize),
      page: 1, // Reset to first page when page size changes
    }));
  }, []);

  const setTotal = useCallback((total: number | undefined) => {
    setPagination(prev => ({ ...prev, total }));
  }, []);

  const nextPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: prev.page + 1 }));
  }, []);

  const previousPage = useCallback(() => {
    setPagination(prev => ({ 
      ...prev, 
      page: Math.max(1, prev.page - 1) 
    }));
  }, []);

  const goToFirstPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const goToLastPage = useCallback(() => {
    if (pagination.total !== undefined) {
      const lastPage = Math.ceil(pagination.total / pagination.pageSize);
      setPagination(prev => ({ ...prev, page: lastPage }));
    }
  }, [pagination.total, pagination.pageSize]);

  const reset = useCallback(() => {
    setPagination({ 
      page: initialPage, 
      pageSize: initialPageSize,
      total: undefined,
    });
  }, [initialPage, initialPageSize]);

  const hasNextPage = useMemo(() => {
    if (pagination.total === undefined) return true;
    return pagination.page * pagination.pageSize < pagination.total;
  }, [pagination.page, pagination.pageSize, pagination.total]);

  const hasPreviousPage = useMemo(() => {
    return pagination.page > 1;
  }, [pagination.page]);

  const totalPages = useMemo(() => {
    if (pagination.total === undefined) return undefined;
    return Math.ceil(pagination.total / pagination.pageSize);
  }, [pagination.total, pagination.pageSize]);

  const offset = useMemo(() => {
    return (pagination.page - 1) * pagination.pageSize;
  }, [pagination.page, pagination.pageSize]);

  return {
    // State
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    loading,
    setLoading,
    
    // Navigation
    setPage,
    setPageSize,
    setTotal,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    reset,
    
    // Computed
    hasNextPage,
    hasPreviousPage,
    totalPages,
    offset,
  };
}

export default usePagination;
