/**
 * useInfiniteScroll Hook
 * 
 * Reusable hook for infinite scrolling
 * Eliminates duplicate infinite scroll logic
 */

import { useCallback, useRef, useState } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

export interface UseInfiniteScrollOptions {
  threshold?: number; // pixels from bottom to trigger load
  initialLoad?: boolean;
}

export function useInfiniteScroll(
  fetchMore: () => Promise<void>,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 100, initialLoad: _initialLoad = true } = options;
  
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      await fetchMore();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [fetchMore, hasMore]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - threshold;

      if (isCloseToBottom && !loadingRef.current && hasMore) {
        loadMore();
      }
    },
    [loadMore, hasMore, threshold]
  );

  const reset = useCallback(() => {
    setHasMore(true);
    setError(null);
    loadingRef.current = false;
  }, []);

  const setHasMoreData = useCallback((value: boolean) => {
    setHasMore(value);
  }, []);

  return {
    loading,
    hasMore,
    error,
    handleScroll,
    loadMore,
    reset,
    setHasMore: setHasMoreData,
  };
}

export default useInfiniteScroll;
