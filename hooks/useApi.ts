/**
 * useApi Hook
 * 
 * Reusable hook for API calls with loading and error states
 * Eliminates duplicate API call logic across screens
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

export function useApi<T>(
  apiCall: (...args: unknown[]) => Promise<T>,
  options: UseApiOptions<T> = {}
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  // The default `options = {}` allocates a new object every render, which
  // poisoned `execute`'s useCallback deps and re-triggered every consumer's
  // useEffect into an infinite fetch loop. Destructure to primitives and keep
  // the callbacks in refs.
  const { onSuccess, onError } = options;
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const execute = useCallback(async (...args: unknown[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await apiCall(...args);
      setState({ data: result, loading: false, error: null });
      onSuccessRef.current?.(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setState({ data: null, loading: false, error: errorMessage });
      onErrorRef.current?.(errorMessage);
      return null;
    }
  }, [apiCall]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData: (data: T) => setState(prev => ({ ...prev, data })),
    setError: (error: string) => setState(prev => ({ ...prev, error, loading: false })),
  };
}

// Specific hook for list API calls with pagination
export function useApiList<T>(
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; total: number }>,
  initialPageSize = 20
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn(pageNum, pageSize);
      if (pageNum === 1) {
        setItems(result.data);
      } else {
        setItems(prev => [...prev, ...result.data]);
      }
      setTotal(result.total);
      setHasMore(pageNum * pageSize < result.total);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchFn, pageSize]);

  const refresh = useCallback(() => load(1), [load]);
  
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      load(page + 1);
    }
  }, [load, page, loading, hasMore]);

  return {
    items,
    loading,
    error,
    page,
    total,
    hasMore,
    refresh,
    loadMore,
    load,
  };
}

export default useApi;
