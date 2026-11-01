import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineStorage } from '@/services/offline-storage';
import { secureStorage } from '@/services/secure-storage';

export const USER_SCOPED_STORAGE_PREFIX = 'astrofusion:user:';

/** Build a storage key that can never be shared between authenticated users. */
export const getUserStorageKey = (key: string, userId: string): string =>
  `${USER_SCOPED_STORAGE_PREFIX}${userId}:${key}`;

/**
 * Legacy global keys are retained in the sweep for cleanup of installations
 * created before account scoping was introduced. New code must use
 * getUserStorageKey() and must not read these global names.
 * 
 * SECURITY FIX: Added pending_actions and offline_queue to prevent
 * cross-account contamination. These queues were global and not cleared
 * on logout, allowing old account operations to replay after account switch.
 */
export const USER_SCOPED_STORAGE_KEYS = [
  'cart_items',
  'addresses',
  'orders',
  'userProfile',
  'savedKundlis',
  'subscription',
  'userReviews',
  'notificationSettings',
  // SECURITY FIX: Clear pending actions to prevent cross-account replay
  'pending_actions',
  'offline_queue',
] as const;

/**
 * Remove every per-user storage surface, including dynamic account-scoped
 * keys. This is also called when a persisted auth session is found to be
 * stale, not only when the user taps Logout.
 */
export const performLogoutStorageSweep = async (): Promise<void> => {
  // H4: also purge the offline-cache layer (services/offline-storage.ts
  // `offline_*` keys + its in-memory Map) and the per-user wallet-balance
  // file (services/secure-storage `astrofusion_<os>_astrofusion_wallet_
  // balance_<userId>`). Neither matches the sweep prefix/legacy list, so
  // without this they survive logout at rest and in memory — stale data
  // at best, cross-account bleed on shared devices at worst. Best-effort:
  // a failed removal must never block sign-out.
  try {
    await offlineStorage.clearAll().catch((error: unknown) => {
      console.warn('[logout] failed to clear offline cache', error);
    });
  } catch (error) {
    console.warn('[logout] offline-storage unavailable during sweep', error);
  }
  try {
    await secureStorage.clear().catch((error: unknown) => {
      console.warn('[logout] failed to clear secure wallet cache', error);
    });
  } catch (error) {
    console.warn('[logout] secure-storage unavailable during sweep', error);
  }

  let namespacedKeys: string[] = [];
  try {
    const getAllKeys = (AsyncStorage as typeof AsyncStorage & {
      getAllKeys?: () => Promise<readonly string[]>;
    }).getAllKeys;
    if (getAllKeys) {
      const allKeys = await getAllKeys();
      namespacedKeys = allKeys
        .filter(key => key.startsWith(USER_SCOPED_STORAGE_PREFIX));
    }
  } catch (error) {
    console.warn('[logout] failed to enumerate account-scoped keys', error);
  }

  const keys = [...new Set([...USER_SCOPED_STORAGE_KEYS, ...namespacedKeys])];
  await Promise.all(keys.map(key =>
    AsyncStorage.removeItem(key).catch(error => {
      // A failed removal must never block sign-out; log-and-continue.
      console.warn(`[logout] failed to clear "${key}"`, error);
    })
  ));
};
