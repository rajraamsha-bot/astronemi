import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  removeItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@/services/offline-storage', () => ({
  offlineStorage: { clearAll: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/services/secure-storage', () => ({
  secureStorage: { clear: jest.fn().mockResolvedValue(undefined) },
}));

import {
  USER_SCOPED_STORAGE_KEYS,
  performLogoutStorageSweep,
} from '@/utils/user-storage-keys';
import { offlineStorage } from '@/services/offline-storage';
import { secureStorage } from '@/services/secure-storage';

describe('performLogoutStorageSweep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes exactly the per-user storage keys', async () => {
    await performLogoutStorageSweep();

    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(USER_SCOPED_STORAGE_KEYS.length);
    for (const key of USER_SCOPED_STORAGE_KEYS) {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    }
    // Cross-account PII surfaces must be included — this is the H4/H5 fix.
    expect(USER_SCOPED_STORAGE_KEYS).toEqual(expect.arrayContaining([
      'cart_items',
      'addresses',
      'orders',
      'savedKundlis',
      'userProfile',
    ]));
    // H4: the offline cache layer + secure wallet cache must also be
    // purged — neither matches the sweep prefix/legacy list.
    expect(offlineStorage.clearAll).toHaveBeenCalled();
    expect(secureStorage.clear).toHaveBeenCalled();
  });

  it('resolves even when cache clears reject', async () => {
    (offlineStorage.clearAll as jest.Mock).mockRejectedValueOnce(new Error('disk busy'));
    (secureStorage.clear as jest.Mock).mockRejectedValueOnce(new Error('store busy'));
    await expect(performLogoutStorageSweep()).resolves.toBeUndefined();
  });

  it('resolves even when individual removals reject', async () => {
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('disk busy'));
    await expect(performLogoutStorageSweep()).resolves.toBeUndefined();
  });
});
