/**
 * Secure Storage Utility
 * 
 * Uses expo-secure-store for sensitive data encryption at rest.
 * Falls back to AsyncStorage for non-sensitive data or when SecureStore is unavailable.
 * 
 * Sensitive data that should use SecureStore:
 * - User authentication tokens
 * - Wallet balance (financial data)
 * - Personal user information (phone, email, birth details)
 * - Session data
 * 
 * Non-sensitive data that can use AsyncStorage:
 * - User preferences
 * - Cache data
 * - UI state
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Track SecureStore availability: null = not checked yet, true/false = checked
let secureStoreAvailable: boolean | null = null;
let availabilityCheckPromise: Promise<boolean> | null = null;

/**
 * Check if SecureStore is available (not available on all platforms)
 * Uses a cached result to avoid repeated checks
 */
const checkSecureStoreAvailability = async (): Promise<boolean> => {
  // Return cached result if available
  if (secureStoreAvailable !== null) {
    return secureStoreAvailable;
  }
  
  // If a check is already in progress, wait for it
  if (availabilityCheckPromise) {
    return availabilityCheckPromise as Promise<boolean>;
  }
  
  // Start a new check
  availabilityCheckPromise = (async () => {
    try {
      // Test if SecureStore is available by trying to read/write a test value
      await SecureStore.setItemAsync('__secure_store_test__', 'test');
      await SecureStore.deleteItemAsync('__secure_store_test__');
      secureStoreAvailable = true;
      return true;
    } catch {
      // Transient failure (OS permission prompt dismissed, storage temporarily
      // unavailable). Reset to null so a LATER call retries instead of being
      // permanently locked out of SecureStore — which would silently write
      // sensitive data to plaintext AsyncStorage forever.
      secureStoreAvailable = null;
      return false;
    } finally {
    availabilityCheckPromise = null;
  }
  })();
  
  return availabilityCheckPromise as Promise<boolean>;
};

// Start the availability check immediately when module loads
checkSecureStoreAvailability();

const SENSITIVE_KEY_EXACT = new Set([
  'user',           // User profile data
  'auth_token',     // Authentication tokens
  'wallet_data',    // Financial data
  'session',        // Session information
  'push_token',     // Push notification token
]);

/**
 * A key counts as sensitive if it exactly matches a known key, OR it's the
 * Supabase session token (named `sb-<project>-auth-token`), OR any key that
 * *contains* 'auth-token' so future variants don't fall through to plaintext.
 * Previously only exact matches were treated as sensitive, dropping the
 * Supabase session into AsyncStorage in the clear.
 */
const isSensitiveKey = (key: string): boolean =>
  SENSITIVE_KEY_EXACT.has(key) || key.startsWith('sb-') || key.includes('auth-token');

/**
 * Securely store a value
 * Uses SecureStore for sensitive data, AsyncStorage for non-sensitive
 */
export const secureSetItem = async (key: string, value: string): Promise<void> => {
  const isSensitive = isSensitiveKey(key);
  
  // Wait for availability check to complete if not yet determined
  const isAvailable = secureStoreAvailable !== null 
    ? secureStoreAvailable 
    : await checkSecureStoreAvailability();
  
  if (isSensitive && isAvailable) {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return;
    } catch (err) {
      // SECURITY: falling back to plaintext AsyncStorage for sensitive data
      // must be loud, not silent. If SecureStore fails, escalate visibility.
      console.warn(`[SecureStorage] SecureStore write failed for sensitive key "${key}"; falling back to AsyncStorage (at-rest encryption lost).`, err);
      // Fall through to AsyncStorage
    }
  }
  
  // Use AsyncStorage for non-sensitive data or as fallback
  await AsyncStorage.setItem(key, value);
};

/**
 * Retrieve a securely stored value
 */
export const secureGetItem = async (key: string): Promise<string | null> => {
  const isSensitive = isSensitiveKey(key);
  
  // Wait for availability check to complete if not yet determined
  const isAvailable = secureStoreAvailable !== null 
    ? secureStoreAvailable 
    : await checkSecureStoreAvailability();
  
  if (isSensitive && isAvailable) {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value !== null) {
        return value;
      }
      // If not found in SecureStore, check AsyncStorage (might be from older version)
    } catch {
      // Fall through to AsyncStorage
    }
  }
  
  return AsyncStorage.getItem(key);
};

/**
 * Remove a securely stored value
 */
export const secureRemoveItem = async (key: string): Promise<void> => {
  const isSensitive = isSensitiveKey(key);
  
  // Wait for availability check to complete if not yet determined
  const isAvailable = secureStoreAvailable !== null 
    ? secureStoreAvailable 
    : await checkSecureStoreAvailability();
  
  // Remove from both stores to ensure complete cleanup
  if (isSensitive && isAvailable) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore errors on delete
    }
  }
  
  await AsyncStorage.removeItem(key);
};

/**
 * Clear all sensitive data from secure storage
 */
export const clearSecureStorage = async (): Promise<void> => {
  // Wait for availability check to complete if not yet determined
  const isAvailable = secureStoreAvailable !== null 
    ? secureStoreAvailable 
    : await checkSecureStoreAvailability();
  
  // Clear SecureStore
  if (isAvailable) {
    for (const key of SENSITIVE_KEY_EXACT) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Ignore errors
      }
    }
  }

  // Clear from AsyncStorage as well. Also purge any Supabase session token
  // (`sb-*-auth-token`) which would otherwise leak past logout.
  for (const key of SENSITIVE_KEY_EXACT) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  }
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const authTokenKeys = allKeys.filter(k => k.includes('auth-token') || k.startsWith('sb-'));
    if (authTokenKeys.length > 0) {
      await AsyncStorage.multiRemove(authTokenKeys);
    }
  } catch {
    // Ignore errors
  }
};

/**
 * Migrate data from AsyncStorage to SecureStore
 * Call this once when the app updates to use secure storage
 */
export const migrateToSecureStorage = async (): Promise<void> => {
  // Wait for availability check to complete if not yet determined
  const isAvailable = secureStoreAvailable !== null 
    ? secureStoreAvailable 
    : await checkSecureStoreAvailability();
  
if (!isAvailable) {
    return;
  }
  
  for (const key of SENSITIVE_KEY_EXACT) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
        // Remove from AsyncStorage after successful migration
        await AsyncStorage.removeItem(key);
      }
    } catch {
      // Ignore errors
    }
  }
};

export default {
  setItem: secureSetItem,
  getItem: secureGetItem,
  removeItem: secureRemoveItem,
  clearAll: clearSecureStorage,
  migrate: migrateToSecureStorage,
};
