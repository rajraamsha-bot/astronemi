/**
 * Offline Storage Service Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

// Import service after mocks
import { offlineStorage } from '@/services/offline-storage';

describe('Offline Storage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    // Clear the memory cache by calling clearAll
    offlineStorage.clearAll();
  });

  describe('Initialization', () => {
    it('should initialize without error', async () => {
      await offlineStorage.initialize();
      expect(AsyncStorage.getItem).toHaveBeenCalled();
    });

    it('should load user data into memory on init', async () => {
      await offlineStorage.initialize();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('offline_user');
    });

    it('should load settings into memory on init', async () => {
      await offlineStorage.initialize();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('offline_settings');
    });
  });

  describe('Save Data', () => {
    it('should save data to storage', async () => {
      await offlineStorage.save('test_key', { name: 'test' });
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should save data with custom TTL', async () => {
      await offlineStorage.save('test_key', { name: 'test' }, 60000);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should save string data', async () => {
      await offlineStorage.save('test_key', 'test value');
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should save array data', async () => {
      await offlineStorage.save('test_key', [1, 2, 3]);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should save null data', async () => {
      await offlineStorage.save('test_key', null);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage full'));
      
      // Should not throw and should still update memory cache
      await expect(offlineStorage.save('test_key', { name: 'test' })).resolves.not.toThrow();
      
      // Data should still be in memory cache
      const result = await offlineStorage.get('test_key');
      expect(result).toEqual({ name: 'test' });
    });

    it('should log error when storage fails', async () => {
      const { Logger } = require('@/services/logger');
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage full'));
      
      await offlineStorage.save('test_key', { name: 'test' });
      
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('Get Data', () => {
    it('should get data from memory cache after save', async () => {
      await offlineStorage.save('test_key', { name: 'test' });
      const result = await offlineStorage.get('test_key');
      expect(result).toEqual({ name: 'test' });
    });

    it('should return null for missing data', async () => {
      const result = await offlineStorage.get('nonexistent_key');
      expect(result).toBeNull();
    });

    it('should get data from persistent storage when not in memory', async () => {
      const cachedData = {
        data: { name: 'test' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 60000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(cachedData));
      
      const result = await offlineStorage.get('test_key');
      
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('test_key');
      expect(result).toEqual({ name: 'test' });
    });

    it('should return null for expired data in persistent storage', async () => {
      const cachedData = {
        data: { name: 'test' },
        timestamp: Date.now() - 120000,
        expiresAt: Date.now() - 60000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(cachedData));
      
      const result = await offlineStorage.get('test_key');
      
      expect(result).toBeNull();
    });

    it('should handle parse errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('invalid json');
      
      const result = await offlineStorage.get('test_key');
      
      expect(result).toBeNull();
    });
  });

  describe('Remove Data', () => {
    it('should remove data from storage', async () => {
      await offlineStorage.remove('test_key');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('test_key');
    });

    it('should handle remove errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('Remove failed'));
      
      // Should not throw
      await expect(offlineStorage.remove('test_key')).resolves.not.toThrow();
    });

    it('should remove from memory cache as well', async () => {
      await offlineStorage.save('mem_key', { data: 'test' });
      await offlineStorage.remove('mem_key');
      
      const result = await offlineStorage.get('mem_key');
      expect(result).toBeNull();
    });
  });

  describe('Clear All', () => {
    it('should clear all offline data', async () => {
      await offlineStorage.clearAll();
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it('should handle clear errors gracefully', async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockRejectedValueOnce(new Error('Clear failed'));
      
      // Should not throw
      await expect(offlineStorage.clearAll()).resolves.not.toThrow();
    });

    it('should clear memory cache', async () => {
      await offlineStorage.save('clear_key1', { data: 'test1' });
      await offlineStorage.save('clear_key2', { data: 'test2' });
      
      await offlineStorage.clearAll();
      
      const result1 = await offlineStorage.get('clear_key1');
      const result2 = await offlineStorage.get('clear_key2');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('Cache Status', () => {
    it('should check if data is stale when not in cache', () => {
      const result = offlineStorage.isStale('nonexistent_key');
      expect(result).toBe(true);
    });

    it('should return true for stale check when data not cached', () => {
      const result = offlineStorage.isStale('some_key');
      expect(result).toBe(true);
    });

    it('should get cache age as Infinity for missing data', () => {
      const result = offlineStorage.getCacheAge('nonexistent_key');
      expect(result).toBe(Infinity);
    });

    it('should get cache age for cached data', async () => {
      await offlineStorage.save('test_key', { name: 'test' });
      
      const result = offlineStorage.getCacheAge('test_key');
      
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1000); // Should be very recent
    });

    it('should report not stale for fresh data', async () => {
      await offlineStorage.save('test_key', { name: 'test' });
      
      const result = offlineStorage.isStale('test_key');
      
      expect(result).toBe(false);
    });
  });

  describe('User Data', () => {
    it('should save user data', async () => {
      await offlineStorage.saveUser({ id: '123', name: 'Test User' });
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should get user data', async () => {
      await offlineStorage.saveUser({ id: '123', name: 'Test User' });
      
      const result = await offlineStorage.getUser();
      
      expect(result).toEqual({ id: '123', name: 'Test User' });
    });
  });

  describe('Kundlis Data', () => {
    it('should save kundlis', async () => {
      await offlineStorage.saveKundlis([{ id: '1', name: 'Kundli 1' }]);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should get kundlis', async () => {
      await offlineStorage.saveKundlis([{ id: '1', name: 'Kundli 1' }]);
      
      const result = await offlineStorage.getKundlis();
      
      expect(result).toEqual([{ id: '1', name: 'Kundli 1' }]);
    });

    it('should add a kundli to existing list', async () => {
      await offlineStorage.addKundli({ id: '2', name: 'Kundli 2' });
      
      const result = await offlineStorage.getKundlis();
      
      expect(result).toEqual([{ id: '2', name: 'Kundli 2' }]);
    });
  });

  describe('Consultations', () => {
    it('should save consultations', async () => {
      await offlineStorage.saveConsultations([{ id: '1', status: 'completed' }]);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should get consultations', async () => {
      await offlineStorage.saveConsultations([{ id: '1', status: 'completed' }]);
      
      const result = await offlineStorage.getConsultations();
      
      expect(result).toEqual([{ id: '1', status: 'completed' }]);
    });
  });

  describe('Astrologers', () => {
    it('should save astrologers', async () => {
      await offlineStorage.saveAstrologers([{ id: '1', name: 'Astrologer 1' }]);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should get astrologers', async () => {
      await offlineStorage.saveAstrologers([{ id: '1', name: 'Astrologer 1' }]);
      
      const result = await offlineStorage.getAstrologers();
      
      expect(result).toEqual([{ id: '1', name: 'Astrologer 1' }]);
    });
  });

  describe('Horoscopes', () => {
    it('should save horoscopes', async () => {
      await offlineStorage.saveHoroscopes({ aries: 'Today is good' });
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should get horoscopes', async () => {
      await offlineStorage.saveHoroscopes({ aries: 'Today is good' });
      
      const result = await offlineStorage.getHoroscopes();
      
      expect(result).toEqual({ aries: 'Today is good' });
    });
  });

  describe('Wallet Data', () => {
    it('should save wallet data', async () => {
      await offlineStorage.saveWalletData({ balance: 100 });
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should get wallet data', async () => {
      await offlineStorage.saveWalletData({ balance: 100 });
      
      const result = await offlineStorage.getWalletData();
      
      expect(result).toEqual({ balance: 100 });
    });
  });

  describe('Notifications', () => {
    it('should save notifications', async () => {
      await offlineStorage.saveNotifications([{ id: '1', message: 'Test' }]);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should get notifications', async () => {
      await offlineStorage.saveNotifications([{ id: '1', message: 'Test' }]);
      
      const result = await offlineStorage.getNotifications();
      
      expect(result).toEqual([{ id: '1', message: 'Test' }]);
    });
  });

  describe('Cart', () => {
    it('should save cart', async () => {
      await offlineStorage.saveCart([{ id: '1', product: 'Gem' }]);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should get cart', async () => {
      await offlineStorage.saveCart([{ id: '1', product: 'Gem' }]);
      
      const result = await offlineStorage.getCart();
      
      expect(result).toEqual([{ id: '1', product: 'Gem' }]);
    });
  });

  describe('Pending Actions', () => {
    it('should add pending action', async () => {
      await offlineStorage.addPendingAction({ type: 'SYNC_USER', payload: { id: '123' } });
      
      const result = await offlineStorage.getPendingActions();
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('SYNC_USER');
      expect(result[0].payload).toEqual({ id: '123' });
      expect(result[0].id).toBeDefined();
      expect(result[0].timestamp).toBeDefined();
      expect(result[0].retries).toBe(0);
    });

    it('should remove pending action', async () => {
      await offlineStorage.addPendingAction({ type: 'SYNC_USER', payload: { id: '123' } });
      const actions = await offlineStorage.getPendingActions();
      const actionId = actions[0].id;
      
      await offlineStorage.removePendingAction(actionId);
      
      const result = await offlineStorage.getPendingActions();
      expect(result).toHaveLength(0);
    });

    it('should increment retry count', async () => {
      await offlineStorage.addPendingAction({ type: 'SYNC_USER', payload: { id: '123' } });
      const actions = await offlineStorage.getPendingActions();
      const actionId = actions[0].id;
      
      await offlineStorage.incrementRetry(actionId);
      
      const result = await offlineStorage.getPendingActions();
      expect(result[0].retries).toBe(1);
    });
  });

  describe('Sync Status', () => {
    it('should update last sync timestamp', async () => {
      await offlineStorage.updateLastSync();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('last_sync_timestamp', expect.any(String));
    });

    it('should get last sync timestamp', async () => {
      const timestamp = Date.now().toString();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(timestamp);
      
      const result = await offlineStorage.getLastSync();
      
      expect(result).toBe(parseInt(timestamp, 10));
    });

    it('should return null when no last sync', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      
      const result = await offlineStorage.getLastSync();
      
      expect(result).toBeNull();
    });

    it('should check if data needs sync', async () => {
      await offlineStorage.save('test_key', { data: 'test' });
      
      const result = await offlineStorage.needsSync('test_key', 1000);
      
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Storage Info', () => {
    it('should get storage info', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce(['offline_user', 'other_key']);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('{"data":"test"}');
      
      const result = await offlineStorage.getStorageInfo();
      
      expect(result).toHaveProperty('usedKeys');
      expect(result).toHaveProperty('totalSize');
    });
  });

  describe('Multiple Keys', () => {
    it('should handle multiple save operations', async () => {
      await offlineStorage.save('key1', 'value1');
      await offlineStorage.save('key2', 'value2');
      await offlineStorage.save('key3', 'value3');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple get operations', async () => {
      await offlineStorage.save('key1', 'value1');
      await offlineStorage.save('key2', 'value2');
      await offlineStorage.save('key3', 'value3');
      
      const result1 = await offlineStorage.get('key1');
      const result2 = await offlineStorage.get('key2');
      const result3 = await offlineStorage.get('key3');
      
      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
      expect(result3).toBe('value3');
    });
  });

  describe('Complex Data Types', () => {
    it('should save and get nested objects', async () => {
      const nestedData = {
        user: {
          profile: {
            name: 'John',
            settings: {
              notifications: true,
            },
          },
        },
      };
      
      await offlineStorage.save('nested', nestedData);
      const result = await offlineStorage.get('nested');
      
      expect(result).toEqual(nestedData);
    });

    it('should save and get arrays of objects', async () => {
      const arrayData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ];
      
      await offlineStorage.save('array', arrayData);
      const result = await offlineStorage.get('array');
      
      expect(result).toEqual(arrayData);
    });
  });
});
