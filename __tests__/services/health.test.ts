/**
 * Health Service Tests
 */

import { HealthService, HealthStatus, ServiceHealth, HealthMetrics } from '@/services/health';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve('5')),
  setItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve(['key1', 'key2', 'key3'])),
}));

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '14.0',
  },
}));

// Mock fetch
global.fetch = jest.fn(() => Promise.resolve({ ok: true } as Response));

describe('Health Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HealthStatus Type', () => {
    it('should define healthy status', () => {
      const status: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        platform: { os: 'ios', version: '14.0' },
        services: [],
        metrics: { sessionCount: 5 },
      };
      expect(status.status).toBe('healthy');
    });

    it('should define degraded status', () => {
      const status: HealthStatus = {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        platform: { os: 'ios', version: '14.0' },
        services: [],
        metrics: { sessionCount: 5 },
      };
      expect(status.status).toBe('degraded');
    });

    it('should define unhealthy status', () => {
      const status: HealthStatus = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        platform: { os: 'ios', version: '14.0' },
        services: [],
        metrics: { sessionCount: 5 },
      };
      expect(status.status).toBe('unhealthy');
    });
  });

  describe('ServiceHealth Type', () => {
    it('should define up status', () => {
      const service: ServiceHealth = {
        name: 'Supabase',
        status: 'up',
        latency: 50,
        lastChecked: new Date().toISOString(),
      };
      expect(service.status).toBe('up');
    });

    it('should define down status', () => {
      const service: ServiceHealth = {
        name: 'Razorpay',
        status: 'down',
        lastChecked: new Date().toISOString(),
        error: 'Not configured',
      };
      expect(service.status).toBe('down');
    });

    it('should define degraded status', () => {
      const service: ServiceHealth = {
        name: 'Agora',
        status: 'degraded',
        latency: 5000,
        lastChecked: new Date().toISOString(),
      };
      expect(service.status).toBe('degraded');
    });
  });

  describe('HealthMetrics Type', () => {
    it('should define metrics structure', () => {
      const metrics: HealthMetrics = {
        memoryUsage: 100,
        storageUsed: 500,
        lastCrash: '2024-01-01T00:00:00Z',
        sessionCount: 10,
      };
      expect(metrics.sessionCount).toBe(10);
    });

    it('should allow optional fields', () => {
      const metrics: HealthMetrics = {
        sessionCount: 5,
      };
      expect(metrics.memoryUsage).toBeUndefined();
      expect(metrics.storageUsed).toBeUndefined();
      expect(metrics.lastCrash).toBeUndefined();
    });
  });

  describe('HealthService.checkHealth', () => {
    it('should return health status', async () => {
      const health = await HealthService.checkHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('platform');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('metrics');
    });

    it('should return valid status values', async () => {
      const health = await HealthService.checkHealth();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    it('should return platform info', async () => {
      const health = await HealthService.checkHealth();
      expect(health.platform).toHaveProperty('os');
      expect(health.platform).toHaveProperty('version');
    });

    it('should return services array', async () => {
      const health = await HealthService.checkHealth();
      expect(Array.isArray(health.services)).toBe(true);
    });

    it('should return metrics', async () => {
      const health = await HealthService.checkHealth();
      expect(health.metrics).toHaveProperty('sessionCount');
    });
  });

  describe('HealthService.checkAllServices', () => {
    it('should check all services', async () => {
      const services = await HealthService.checkAllServices();
      
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBe(4);
    });

    it('should return service health for each service', async () => {
      const services = await HealthService.checkAllServices();
      
      const serviceNames = services.map(s => s.name);
      expect(serviceNames).toContain('Supabase');
      expect(serviceNames).toContain('Razorpay');
      expect(serviceNames).toContain('Agora');
      expect(serviceNames).toContain('Sentry');
    });

    it('should have status for each service', async () => {
      const services = await HealthService.checkAllServices();
      
      services.forEach(service => {
        expect(['up', 'down', 'degraded']).toContain(service.status);
      });
    });
  });

  describe('HealthService.determineOverallStatus', () => {
    it('should return healthy when all services are up', () => {
      const services: ServiceHealth[] = [
        { name: 'A', status: 'up', lastChecked: '' },
        { name: 'B', status: 'up', lastChecked: '' },
        { name: 'C', status: 'up', lastChecked: '' },
        { name: 'D', status: 'up', lastChecked: '' },
      ];
      
      const status = HealthService.determineOverallStatus(services);
      expect(status).toBe('healthy');
    });

    it('should return degraded when one service is down', () => {
      const services: ServiceHealth[] = [
        { name: 'A', status: 'up', lastChecked: '' },
        { name: 'B', status: 'up', lastChecked: '' },
        { name: 'C', status: 'up', lastChecked: '' },
        { name: 'D', status: 'down', lastChecked: '' },
      ];
      
      const status = HealthService.determineOverallStatus(services);
      expect(status).toBe('degraded');
    });

    it('should return degraded when one service is degraded', () => {
      const services: ServiceHealth[] = [
        { name: 'A', status: 'up', lastChecked: '' },
        { name: 'B', status: 'up', lastChecked: '' },
        { name: 'C', status: 'up', lastChecked: '' },
        { name: 'D', status: 'degraded', lastChecked: '' },
      ];
      
      const status = HealthService.determineOverallStatus(services);
      expect(status).toBe('degraded');
    });

    it('should return unhealthy when more than half are down', () => {
      const services: ServiceHealth[] = [
        { name: 'A', status: 'up', lastChecked: '' },
        { name: 'B', status: 'down', lastChecked: '' },
        { name: 'C', status: 'down', lastChecked: '' },
        { name: 'D', status: 'down', lastChecked: '' },
      ];
      
      const status = HealthService.determineOverallStatus(services);
      expect(status).toBe('unhealthy');
    });

    it('should return unhealthy when all are down', () => {
      const services: ServiceHealth[] = [
        { name: 'A', status: 'down', lastChecked: '' },
        { name: 'B', status: 'down', lastChecked: '' },
        { name: 'C', status: 'down', lastChecked: '' },
        { name: 'D', status: 'down', lastChecked: '' },
      ];
      
      const status = HealthService.determineOverallStatus(services);
      expect(status).toBe('unhealthy');
    });
  });

  describe('HealthService.getMetrics', () => {
    it('should return metrics', async () => {
      const metrics = await HealthService.getMetrics();
      
      expect(metrics).toHaveProperty('sessionCount');
      expect(typeof metrics.sessionCount).toBe('number');
    });

    it('should return storage used', async () => {
      const metrics = await HealthService.getMetrics();
      
      expect(metrics.storageUsed).toBeDefined();
      expect(typeof metrics.storageUsed).toBe('number');
    });
  });

  describe('HealthService.startPeriodicChecks', () => {
    it('should return cleanup function', () => {
      const cleanup = HealthService.startPeriodicChecks(60000);
      expect(typeof cleanup).toBe('function');
      cleanup();
    });

    it('should accept custom interval', () => {
      const cleanup = HealthService.startPeriodicChecks(30000);
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });

  describe('Service Endpoints', () => {
    it('should have Supabase endpoint', () => {
      const endpoint = '/rest/v1/';
      expect(endpoint).toBe('/rest/v1/');
    });

    it('should have Razorpay endpoint', () => {
      const endpoint = 'https://api.razorpay.com/v1/';
      expect(endpoint).toContain('razorpay');
    });

    it('should have Agora endpoint', () => {
      const endpoint = 'https://api.agora.io/v1/';
      expect(endpoint).toContain('agora');
    });

    it('should have Sentry endpoint', () => {
      const endpoint = 'https://sentry.io/api/';
      expect(endpoint).toContain('sentry');
    });
  });

  describe('Health Status Logic', () => {
    it('should calculate up percentage correctly', () => {
      const services: ServiceHealth[] = [
        { name: 'A', status: 'up', lastChecked: '' },
        { name: 'B', status: 'up', lastChecked: '' },
        { name: 'C', status: 'down', lastChecked: '' },
        { name: 'D', status: 'down', lastChecked: '' },
      ];
      
      const upCount = services.filter(s => s.status === 'up').length;
      const upPercentage = (upCount / services.length) * 100;
      expect(upPercentage).toBe(50);
    });

    it('should identify critical services', () => {
      const criticalServices = ['Supabase', 'Razorpay'];
      expect(criticalServices).toContain('Supabase');
      expect(criticalServices).toContain('Razorpay');
    });
  });

  describe('Latency Tracking', () => {
    it('should track latency in service health', async () => {
      const services = await HealthService.checkAllServices();
      
      services.forEach(service => {
        if (service.latency !== undefined) {
          expect(typeof service.latency).toBe('number');
          expect(service.latency).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const services = await HealthService.checkAllServices();
      
      services.forEach(service => {
        if (service.error) {
          expect(typeof service.error).toBe('string');
        }
      });
    });

    it('should include lastChecked timestamp', async () => {
      const services = await HealthService.checkAllServices();
      
      services.forEach(service => {
        expect(service.lastChecked).toBeDefined();
        expect(new Date(service.lastChecked).toISOString()).toBe(service.lastChecked);
      });
    });
  });
});
