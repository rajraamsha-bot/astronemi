import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';

/**
 * Custom hook for managing AsyncStorage with React state
 * 
 * This hook provides a useState-like interface for AsyncStorage,
 * automatically loading the initial value on mount and providing
 * a setter that persists to storage.
 * 
 * @param key - AsyncStorage key
 * @param initialValue - Default value if nothing is stored
 * @returns [value, setValue, isLoading] tuple
 * 
 * @example
 * ```typescript
 * const [theme, setTheme, isLoading] = useAsyncStorage('theme', 'light');
 * 
 * // Update theme (automatically persists)
 * setTheme('dark');
 * ```
 */
export function useAsyncStorage<T>(
  key: string,
  initialValue: T
): [T, (newValue: T | ((prev: T) => T)) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  // effect:audited — Initialization: Load value from AsyncStorage on mount
  // This MUST be a useEffect because it reads from persistent storage
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then(stored => {
        if (cancelled) return;
        if (stored !== null) {
          try {
            setValue(JSON.parse(stored));
          } catch (error) {
            Logger.error(`Error parsing stored value for ${key}:`, error);
            // Keep initial value on parse error
          }
        }
      })
      .catch(error => {
        if (!cancelled) Logger.error(`Error loading ${key} from AsyncStorage:`, error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [key]);

  // Update value and persist to AsyncStorage. Accepts both the raw value and
  // a functional updater (like useState) so concurrent updates don't each
  // serialize a stale snapshot over the other.
  const updateValue = useCallback(async (newValue: T | ((prev: T) => T)) => {
    const resolved = typeof newValue === 'function' ? (newValue as (p: T) => T)(value) : newValue;
    setValue(resolved);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(resolved));
    } catch (error) {
      Logger.error(`Error saving ${key} to AsyncStorage:`, error);
      throw error;
    }
  }, [key, value]);

  return [value, updateValue, isLoading];
}

/**
 * Custom hook for loading data from AsyncStorage without state management
 * 
 * Use this when you only need to load data once without automatic persistence.
 * 
 * @param key - AsyncStorage key
 * @param initialValue - Default value if nothing is stored
 * @returns [value, isLoading, reload] tuple
 * 
 * @example
 * ```typescript
 * const [onboardingComplete, isLoading, reload] = useAsyncStorageLoad('onboarding', false);
 * ```
 */
export function useAsyncStorageLoad<T>(
  key: string,
  initialValue: T
): [T, boolean, () => void] {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  
  // effect:audited — Initialization: Load value from AsyncStorage
  // This MUST be a useEffect because it reads from persistent storage
  useEffect(() => {
    setIsLoading(true);
    AsyncStorage.getItem(key)
      .then(stored => {
        if (stored !== null) {
          try {
            setValue(JSON.parse(stored));
          } catch (error) {
            Logger.error(`Error parsing stored value for ${key}:`, error);
          }
        }
      })
      .catch(error => {
        Logger.error(`Error loading ${key} from AsyncStorage:`, error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [key, reloadTrigger]);
  
  const reload = useCallback(() => {
    setReloadTrigger(prev => prev + 1);
  }, []);
  
  return [value, isLoading, reload];
}
