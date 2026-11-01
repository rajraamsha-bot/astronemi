/**
 * Custom Hooks Index
 * 
 * Central export for all custom hooks
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Dimensions, Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';

// Re-export new domain-specific hooks
export { useFilters, type FilterOption } from './useFilters';
export { usePagination, type PaginationState } from './usePagination';
export { useApi, useApiList, type ApiState } from './useApi';
export { useInfiniteScroll, type UseInfiniteScrollOptions } from './useInfiniteScroll';
export { useKeyboard, type KeyboardState } from './useKeyboard';
export { useDebounce as useDebounceCallback, useDebouncedCallback } from './useDebounce';
export { useRetry, retry, type RetryOptions, type RetryState } from './useRetry';

// Re-export persistence hooks
export { usePersist, usePersistImmediate } from './usePersist';
export { useAsyncStorage, useAsyncStorageLoad } from './useAsyncStorage';

// ============================================
// USE TOGGLE
// ============================================
export function useToggle(initialValue: boolean = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => setValue(v => !v), []);
  const set = useCallback((v: boolean) => setValue(v), []);
  
  return [value, toggle, set];
}

// ============================================
// USE DEBOUNCE
// ============================================
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

// ============================================
// USE THROTTLE
// ============================================
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());
  
  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdated.current >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    }
  }, [value, interval]);
  
  return throttledValue;
}

// ============================================
// USE PREVIOUS
// ============================================
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

// ============================================
// USE WINDOW DIMENSIONS
// ============================================
export function useWindowDimensions() {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    
    return () => subscription.remove();
  }, []);
  
  return dimensions;
}

// ============================================
// USE ORIENTATION
// ============================================
export function useOrientation() {
  const { width, height } = useWindowDimensions();
  
  return useMemo(() => ({
    isPortrait: height >= width,
    isLandscape: width > height,
    width,
    height,
  }), [width, height]);
}

// ============================================
// USE PLATFORM
// ============================================
export function usePlatform() {
  return useMemo(() => ({
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    isWeb: Platform.OS === 'web',
    os: Platform.OS,
    version: Platform.Version,
  }), []);
}

// ============================================
// USE APP STATE
// ============================================
export function useAppState() {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  
  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    
    return () => subscription.remove();
  }, []);
  
  return {
    appState,
    isActive: appState === 'active',
    isBackground: appState === 'background',
    isInactive: appState === 'inactive',
  };
}

// ============================================
// USE MOUNT
// ============================================
export function useMount(callback: () => void) {
  useEffect(() => {
    callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ============================================
// USE UNMOUNT
// ============================================
export function useUnmount(callback: () => void) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => callback, []);
}

// ============================================
// USE INTERVAL
// ============================================
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (delay === null) return;
    
    const id = setInterval(() => savedCallback.current(), delay);
    
    return () => clearInterval(id);
  }, [delay]);
}

// ============================================
// USE TIMEOUT
// ============================================
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (delay === null) return;
    
    const id = setTimeout(() => savedCallback.current(), delay);
    
    return () => clearTimeout(id);
  }, [delay]);
}

// ============================================
// USE COUNTER
// ============================================
export function useCounter(initialValue: number = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);
  const set = useCallback((value: number) => setCount(value), []);
  
  return { count, increment, decrement, reset, set };
}

// ============================================
// USE BOOLEAN
// ============================================
export function useBoolean(initialValue: boolean = false) {
  const [value, setValue] = useState(initialValue);
  
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  const toggle = useCallback(() => setValue(v => !v), []);
  
  return { value, setValue, setTrue, setFalse, toggle };
}

// ============================================
// USE ASYNC
// ============================================
interface UseAsyncState<T> {
  loading: boolean;
  error: Error | null;
  data: T | null;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true
): UseAsyncState<T> & { execute: () => Promise<void> } {
  const [state, setState] = useState<UseAsyncState<T>>({
    loading: immediate,
    error: null,
    data: null,
  });
  
  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await asyncFunction();
      setState({ loading: false, error: null, data });
    } catch (error) {
      setState({ loading: false, error: error as Error, data: null });
    }
  }, [asyncFunction]);
  
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);
  
  return { ...state, execute };
}

// ============================================
// USE FETCH
// ============================================
interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useFetch<T>(url: string, options?: RequestInit): UseFetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  
  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [url, options]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { ...state, refetch: fetchData };
}

// ============================================
// USE LOCAL STORAGE (AsyncStorage bridge for React Native)
// ============================================
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((item) => {
        if (item !== null) {
          setStoredValue(JSON.parse(item));
        }
      })
      .catch(() => {});
  }, [key]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      AsyncStorage.setItem(key, JSON.stringify(valueToStore)).catch((err) => {
        Logger.error('AsyncStorage save error:', err);
      });
    } catch (error) {
      Logger.error('useLocalStorage error:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// ============================================
// USE CLIPBOARD
// ============================================
export function useClipboard() {
  const [hasCopied, setHasCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      const Clipboard = require('@react-native-clipboard/clipboard').default;
      Clipboard.setString(text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (error) {
      Logger.error('Failed to copy:', error);
    }
  }, []);

  return { copy, hasCopied };
}

// ============================================
// USE FOCUS
// ============================================
export function useFocus(onFocus: () => void, onBlur: () => void) {
  const { isActive } = useAppState();
  const wasActive = useRef(isActive);
  
  useEffect(() => {
    if (isActive && !wasActive.current) {
      onFocus();
    } else if (!isActive && wasActive.current) {
      onBlur();
    }
    wasActive.current = isActive;
  }, [isActive, onFocus, onBlur]);
}

// ============================================
// EXPORT ALL
// ============================================
export default {
  useToggle,
  useDebounce,
  useThrottle,
  usePrevious,
  useWindowDimensions,
  useOrientation,
  usePlatform,
  useAppState,
  useMount,
  useUnmount,
  useInterval,
  useTimeout,
  useCounter,
  useBoolean,
  useAsync,
  useFetch,
  useLocalStorage,
  useClipboard,
  useFocus,
};
