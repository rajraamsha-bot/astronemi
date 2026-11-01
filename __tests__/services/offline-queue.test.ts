/**
 * Tests for Offline Queue Service
 */

// Mock secure-storage
jest.mock('@/utils/secure-storage', () => ({
  secureSetItem: jest.fn().mockResolvedValue(undefined),
  secureGetItem: jest.fn().mockResolvedValue(null),
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

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

describe('OfflineQueueService', () => {
  let offlineQueueService: typeof import('@/services/offline-queue').offlineQueueService;

  beforeEach(() => {
    jest.resetModules();
    offlineQueueService = require('@/services/offline-queue').offlineQueueService;
    jest.clearAllMocks();
  });

  describe('enqueue', () => {
    it('should add an operation to the queue', async () => {
      const id = await offlineQueueService.enqueue('message', { text: 'hello' });
      expect(id).toMatch(/^op_/);
    });

    it('should return unique IDs for different operations', async () => {
      const id1 = await offlineQueueService.enqueue('message', { text: 'hello' });
      const id2 = await offlineQueueService.enqueue('message', { text: 'world' });
      expect(id1).not.toBe(id2);
    });

    it('should support different operation types', async () => {
      const types = ['consultation', 'message', 'payment', 'review', 'profile_update'] as const;
      for (const type of types) {
        const id = await offlineQueueService.enqueue(type, { data: 'test' });
        expect(id).toBeTruthy();
      }
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status with all fields', () => {
      const status = offlineQueueService.getQueueStatus();
      expect(status).toHaveProperty('total');
      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('processing');
      expect(status).toHaveProperty('completed');
      expect(status).toHaveProperty('failed');
    });

    it('should track total count after enqueue', async () => {
      const statusBefore = offlineQueueService.getQueueStatus();
      await offlineQueueService.enqueue('message', { text: 'test' });
      const statusAfter = offlineQueueService.getQueueStatus();
      expect(statusAfter.total).toBeGreaterThanOrEqual(statusBefore.total);
    });
  });

  describe('getQueue', () => {
    it('should return a copy of the queue', async () => {
      await offlineQueueService.enqueue('message', { text: 'test' });
      const queue = offlineQueueService.getQueue();
      expect(Array.isArray(queue)).toBe(true);
    });

    it('should return a copy, not the original array', async () => {
      await offlineQueueService.enqueue('message', { text: 'test' });
      const queue1 = offlineQueueService.getQueue();
      const queue2 = offlineQueueService.getQueue();
      expect(queue1).not.toBe(queue2);
      expect(queue1).toEqual(queue2);
    });
  });

  describe('retryOperation', () => {
    it('should return false for non-existent operation', async () => {
      const result = await offlineQueueService.retryOperation('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('clearCompleted', () => {
    it('should return number of cleared operations', async () => {
      const cleared = await offlineQueueService.clearCompleted();
      expect(typeof cleared).toBe('number');
      expect(cleared).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isNetworkAvailable', () => {
    it('should return a boolean', () => {
      const result = offlineQueueService.isNetworkAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('should return true by default (no NetInfo in test env)', () => {
      expect(offlineQueueService.isNetworkAvailable()).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should not throw', () => {
      expect(() => {
        offlineQueueService.destroy();
      }).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      offlineQueueService.destroy();
      offlineQueueService.destroy();
    });
  });
});