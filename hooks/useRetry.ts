/**
 * Retry Utility with Exponential Backoff
 * 
 * Provides retry logic with configurable backoff for failed operations
 */

import { useCallback, useEffect, useRef, useState } from 'react';

type TimeoutId = ReturnType<typeof setTimeout>;

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export interface RetryState {
  attempts: number;
  isRetrying: boolean;
  lastError: unknown | null;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
};

/**
 * Hook for retrying failed operations with exponential backoff
 */
export function useRetry<T extends (...args: unknown[]) => Promise<unknown>>(
  callback: T,
  options: RetryOptions = {}
) {
  const opts = { ...defaultOptions, ...options };
  const [state, setState] = useState<RetryState>({
    attempts: 0,
    isRetrying: false,
    lastError: null,
  });
  
  const timeoutRef = useRef<TimeoutId | null>(null);
  const abortRef = useRef(false);

  const calculateDelay = useCallback(
    (attempt: number) => {
      const delay = opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt);
      return Math.min(delay, opts.maxDelay);
    },
    [opts.initialDelay, opts.backoffMultiplier, opts.maxDelay]
  );

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<{ success: boolean; data?: unknown; error?: unknown }> => {
      abortRef.current = false;
      
      for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
        if (abortRef.current) {
          return { success: false, error: 'Aborted' };
        }

        setState({ attempts: attempt + 1, isRetrying: attempt > 0, lastError: null });

        try {
          const result = await callback(...args);
          return { success: true, data: result };
        } catch (error) {
          setState(prev => ({ ...prev, lastError: error }));
          
          // Check if we should retry
          if (attempt === opts.maxAttempts - 1 || !opts.shouldRetry(error)) {
            return { success: false, error };
          }

          // Wait before next attempt
          const delay = calculateDelay(attempt);
          await new Promise(resolve => {
            timeoutRef.current = setTimeout(resolve, delay) as unknown as ReturnType<typeof setTimeout>;
          });
        }
      }

      return { success: false, error: state.lastError };
    },
    [callback, opts.maxAttempts, opts.shouldRetry, calculateDelay, state.lastError]
  );

  const abort = useCallback(() => {
    abortRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState(prev => ({ ...prev, isRetrying: false }));
  }, []);

  // effect:audited — Clean up pending retries on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    abort();
    setState({ attempts: 0, isRetrying: false, lastError: null });
  }, [abort]);

  return {
    execute,
    abort,
    reset,
    ...state,
  };
}

/**
 * Simple retry function for one-off operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === opts.maxAttempts - 1 || !opts.shouldRetry(error)) {
        throw error;
      }
      
      const delay = opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt);
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, opts.maxDelay)));
    }
  }
  
  throw new Error('Retry failed');
}

export default useRetry;
