import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';

/**
 * Custom hook for debounced persistence to AsyncStorage
 * 
 * This hook automatically saves data to AsyncStorage with debouncing to prevent
 * excessive write operations. Perfect for frequently changing state that needs
 * to be persisted (cart items, user preferences, etc.)
 * 
 * @param key - AsyncStorage key
 * @param value - Value to persist (will be JSON stringified)
 * @param debounceMs - Debounce delay in milliseconds (default: 500ms)
 * 
 * @example
 * ```typescript
 * const [items, setItems] = useState<CartItem[]>([]);
 * usePersist('cart_items', items, 500);
 * ```
 */
export function usePersist<T>(key: string, value: T, debounceMs = 500, options?: { enabled?: boolean }) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabled = options?.enabled ?? true;

  // effect:audited — Persistence: Debounced AsyncStorage write
  // This MUST be a useEffect because it performs side effects (AsyncStorage write)
  // Debouncing prevents excessive writes when state changes rapidly.
  // `enabled: false` lets callers skip writes until their initial hydration has
  // finished, so a fresh `[]` state never clobbers the stored cart/profile on
  // cold start.
  useEffect(() => {
    if (!enabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      AsyncStorage.setItem(key, JSON.stringify(value)).catch(error => {
        Logger.error(`Error persisting ${key}:`, error);
      });
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [key, value, debounceMs, enabled]);
}

/**
 * Custom hook for immediate (non-debounced) persistence to AsyncStorage
 * 
 * Use this when you need immediate persistence without debouncing.
 * Useful for critical data that must be saved immediately.
 * 
 * @param key - AsyncStorage key
 * @param value - Value to persist (will be JSON stringified)
 * 
 * @example
 * ```typescript
 * const [authToken, setAuthToken] = useState<string | null>(null);
 * usePersistImmediate('auth_token', authToken);
 * ```
 */
export function usePersistImmediate<T>(key: string, value: T) {
  // effect:audited — Persistence: Immediate AsyncStorage write
  // This MUST be a useEffect because it performs side effects (AsyncStorage write)
  useEffect(() => {
    AsyncStorage.setItem(key, JSON.stringify(value)).catch(error => {
      Logger.error(`Error persisting ${key}:`, error);
    });
  }, [key, value]);
}
