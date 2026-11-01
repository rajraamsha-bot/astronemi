/**
 * Tests for Sync Manager Service
 */

// Mock offline-storage
jest.mock('@/services/offline-storage', () => ({
  offlineStorage: {
    getPendingActions: jest.fn().mockResolvedValue([]),
    addPendingAction: jest.fn().mockResolvedValue(undefined),
    removePendingAction: jest.fn().mockResolvedValue(undefined),
    incrementRetry: jest.fn().mockResolvedValue(undefined),
    updateLastSync: jest.fn().mockResolvedValue(undefined),
    getLastSync: jest.fn().mockResolvedValue(null),
  },
}));

// Mock analytics
jest.mock('@/services/analytics', () => ({
  analyticsService: {
    track: jest.fn(),
  },
  AnalyticsEvent: {
    SCREEN_VIEW: 'screen_view',
  },
}));

// Mock logger
jest.mock('@/services/logger', () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SyncManagerService', () => {
  let syncManager: typeof import('@/services/sync-manager').syncManager;

  beforeEach(() => {
    jest.resetModules();
    syncManager = require('@/services/sync-manager').syncManager;
  });

  afterEach(() => {
    syncManager.destroy();
  });

  describe('isConnected', () => {
    it('should return a boolean', () => {
      expect(typeof syncManager.isConnected()).toBe('boolean');
    });

    it('should return true by default', () => {
      expect(syncManager.isConnected()).toBe(true);
    });
  });

  describe('setOnlineStatus', () => {
    it('should update online status', () => {
      syncManager.setOnlineStatus(false);
      expect(syncManager.isConnected()).toBe(false);
    });

    it('should notify listeners on status change', () => {
      const listener = jest.fn();
      syncManager.subscribe(listener);
      jest.clearAllMocks();
      syncManager.setOnlineStatus(false);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should call listener immediately with current status', () => {
      const listener = jest.fn();
      syncManager.subscribe(listener);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: expect.any(Boolean),
          isSyncing: expect.any(Boolean),
        }),
      );
    });

    it('should return unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = syncManager.subscribe(listener);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should stop notifications after unsubscribe', () => {
      const listener = jest.fn();
      const unsubscribe = syncManager.subscribe(listener);
      jest.clearAllMocks();
      unsubscribe();
      syncManager.setOnlineStatus(false);
      // Listener should not be called again after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return status object with correct shape', () => {
      const status = syncManager.getStatus();
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('isSyncing');
      expect(status).toHaveProperty('lastSyncTime');
      expect(status).toHaveProperty('pendingActions');
      expect(status).toHaveProperty('syncErrors');
    });

    it('should have correct types', () => {
      const status = syncManager.getStatus();
      expect(typeof status.isOnline).toBe('boolean');
      expect(typeof status.isSyncing).toBe('boolean');
      expect(Array.isArray(status.syncErrors)).toBe(true);
    });

    it('should report queued actions in pendingActions', async () => {
      expect(syncManager.getStatus().pendingActions).toBe(0);
      syncManager.setOnlineStatus(false); // stay offline so the sync does not drain it
      await syncManager.queueAction('TEST_ACTION', { data: 'test' });
      expect(syncManager.getStatus().pendingActions).toBe(1);
    });

    it('should report lastSyncTime and errors after a sync', async () => {
      const { offlineStorage } = require('@/services/offline-storage');
      (offlineStorage.getLastSync as jest.Mock).mockResolvedValueOnce(1234);

      syncManager.setOnlineStatus(true);
      syncManager.registerSync('boom', jest.fn().mockRejectedValue(new Error('nope')));
      await syncManager.syncAll();
      syncManager.unregisterSync('boom');

      const status = syncManager.getStatus();
      expect(offlineStorage.updateLastSync).toHaveBeenCalled();
      expect(status.lastSyncTime).toBe(1234);
      expect(status.syncErrors).toHaveLength(1);
    });
  });

  describe('registerSync / unregisterSync', () => {
    it('should register and unregister sync callbacks', () => {
      const callback = jest.fn().mockResolvedValue(undefined);
      expect(() => {
        syncManager.registerSync('test-sync', callback);
      }).not.toThrow();
      expect(() => {
        syncManager.unregisterSync('test-sync');
      }).not.toThrow();
    });
  });

  describe('syncAll', () => {
    it('should return SyncResult object', async () => {
      const result = await syncManager.syncAll();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('syncedActions');
      expect(result).toHaveProperty('failedActions');
      expect(result).toHaveProperty('errors');
    });

    it('should return failure when offline', async () => {
      syncManager.setOnlineStatus(false);
      const result = await syncManager.syncAll();
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Device is offline');
    });

    it('should execute registered sync callbacks', async () => {
      syncManager.setOnlineStatus(true);
      const callback = jest.fn().mockResolvedValue(undefined);
      syncManager.registerSync('test-sync', callback);
      await syncManager.syncAll();
      expect(callback).toHaveBeenCalled();
      syncManager.unregisterSync('test-sync');
    });

    it('should handle callback errors gracefully', async () => {
      syncManager.setOnlineStatus(true);
      const errorCallback = jest.fn().mockRejectedValue(new Error('sync failed'));
      syncManager.registerSync('error-sync', errorCallback);
      const result = await syncManager.syncAll();
      expect(result.failedActions).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
      syncManager.unregisterSync('error-sync');
    });
  });

  describe('queueAction', () => {
    it('should not throw', async () => {
      await expect(
        syncManager.queueAction('TEST_ACTION', { data: 'test' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('forcSync', () => {
    it('should trigger sync', async () => {
      const result = await syncManager.forcSync();
      expect(result).toHaveProperty('success');
    });
  });

  describe('destroy', () => {
    it('should not throw', () => {
      expect(() => syncManager.destroy()).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      syncManager.destroy();
      syncManager.destroy();
    });

    it('should clear listeners', () => {
      const listener = jest.fn();
      syncManager.subscribe(listener);
      syncManager.destroy();
      jest.clearAllMocks();
      syncManager.setOnlineStatus(false);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe('useSyncManager hook', () => {
  it('should export useSyncManager function', () => {
    const { useSyncManager } = require('@/services/sync-manager');
    expect(typeof useSyncManager).toBe('function');
  });

  it('should return object with sync methods', () => {
    const { useSyncManager } = require('@/services/sync-manager');
    const hook = useSyncManager();
    expect(typeof hook.getStatus).toBe('function');
    expect(typeof hook.isConnected).toBe('function');
    expect(typeof hook.subscribe).toBe('function');
    expect(typeof hook.queueAction).toBe('function');
    expect(typeof hook.forcSync).toBe('function');
  });
});