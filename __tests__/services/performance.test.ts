/**
 * Performance Monitoring Service Tests
 */

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
  configurable: true,
});

// Mock __DEV__
Object.defineProperty(global, '__DEV__', {
  value: false,
  writable: true,
  configurable: true,
});

// Import service after mocks
import { performanceMonitoring, useRenderTime } from '@/services/performance';

describe('Performance Monitoring Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    performanceMonitoring.clear();
    mockPerformance.now.mockReturnValue(Date.now());
  });

  describe('Initialization', () => {
    it('should initialize without error', () => {
      expect(() => performanceMonitoring.initialize()).not.toThrow();
    });
  });

  describe('recordMetric', () => {
    it('should record a metric', () => {
      performanceMonitoring.recordMetric({
        name: 'test_metric',
        duration: 100,
        timestamp: Date.now(),
      });
      
      const metrics = performanceMonitoring.getMetrics('test_metric');
      
      expect(metrics.length).toBe(1);
      expect(metrics[0].name).toBe('test_metric');
      expect(metrics[0].duration).toBe(100);
    });

    it('should record metric with metadata', () => {
      performanceMonitoring.recordMetric({
        name: 'test_metric',
        duration: 100,
        timestamp: Date.now(),
        metadata: { screen: 'home' },
      });
      
      const metrics = performanceMonitoring.getMetrics('test_metric');
      
      expect(metrics[0].metadata).toEqual({ screen: 'home' });
    });

    it('should store multiple metrics', () => {
      performanceMonitoring.recordMetric({ name: 'metric1', duration: 100, timestamp: Date.now() });
      performanceMonitoring.recordMetric({ name: 'metric2', duration: 200, timestamp: Date.now() });
      performanceMonitoring.recordMetric({ name: 'metric1', duration: 150, timestamp: Date.now() });
      
      const allMetrics = performanceMonitoring.getMetrics();
      
      expect(allMetrics.length).toBe(3);
    });
  });

  describe('measure', () => {
    it('should measure synchronous function execution', () => {
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(50);
      
      const result = performanceMonitoring.measure('test_fn', () => 'hello');
      
      expect(result).toBe('hello');
      const metrics = performanceMonitoring.getMetrics('test_fn');
      expect(metrics.length).toBe(1);
    });

    it('should record metric even if function throws', () => {
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(50);
      
      expect(() => {
        performanceMonitoring.measure('test_fn', () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
      
      const metrics = performanceMonitoring.getMetrics('test_fn');
      expect(metrics.length).toBe(1);
    });
  });

  describe('measureAsync', () => {
    it('should measure async function execution', async () => {
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(100);
      
      const result = await performanceMonitoring.measureAsync('async_fn', async () => {
        return 'async result';
      });
      
      expect(result).toBe('async result');
      const metrics = performanceMonitoring.getMetrics('async_fn');
      expect(metrics.length).toBe(1);
    });

    it('should record metric even if async function rejects', async () => {
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(50);
      
      await expect(
        performanceMonitoring.measureAsync('async_fn', async () => {
          throw new Error('Async error');
        })
      ).rejects.toThrow('Async error');
      
      const metrics = performanceMonitoring.getMetrics('async_fn');
      expect(metrics.length).toBe(1);
    });
  });

  describe('startTimer', () => {
    it('should start a timer and record on stop', () => {
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(200);
      
      const stopTimer = performanceMonitoring.startTimer('timed_operation');
      
      expect(typeof stopTimer).toBe('function');
      
      stopTimer();
      
      const metrics = performanceMonitoring.getMetrics('timed_operation');
      expect(metrics.length).toBe(1);
      expect(metrics[0].duration).toBe(200);
    });
  });

  describe('getMetrics', () => {
    it('should get all metrics when no name provided', () => {
      performanceMonitoring.recordMetric({ name: 'a', duration: 1, timestamp: 1 });
      performanceMonitoring.recordMetric({ name: 'b', duration: 2, timestamp: 2 });
      performanceMonitoring.recordMetric({ name: 'c', duration: 3, timestamp: 3 });
      
      const metrics = performanceMonitoring.getMetrics();
      
      expect(metrics.length).toBe(3);
    });

    it('should filter metrics by name', () => {
      performanceMonitoring.recordMetric({ name: 'a', duration: 1, timestamp: 1 });
      performanceMonitoring.recordMetric({ name: 'b', duration: 2, timestamp: 2 });
      performanceMonitoring.recordMetric({ name: 'a', duration: 3, timestamp: 3 });
      
      const metrics = performanceMonitoring.getMetrics('a');
      
      expect(metrics.length).toBe(2);
      metrics.forEach(m => expect(m.name).toBe('a'));
    });

    it('should return empty array for non-existent metric', () => {
      const metrics = performanceMonitoring.getMetrics('nonexistent');
      
      expect(metrics).toEqual([]);
    });
  });

  describe('getAverageDuration', () => {
    it('should calculate average duration', () => {
      performanceMonitoring.recordMetric({ name: 'test', duration: 100, timestamp: 1 });
      performanceMonitoring.recordMetric({ name: 'test', duration: 200, timestamp: 2 });
      performanceMonitoring.recordMetric({ name: 'test', duration: 300, timestamp: 3 });
      
      const avg = performanceMonitoring.getAverageDuration('test');
      
      expect(avg).toBe(200);
    });

    it('should return 0 for no metrics', () => {
      const avg = performanceMonitoring.getAverageDuration('nonexistent');
      
      expect(avg).toBe(0);
    });
  });

  describe('getPercentile', () => {
    it('should calculate percentile correctly', () => {
      // Add 10 metrics with durations 10, 20, 30, ..., 100
      for (let i = 1; i <= 10; i++) {
        performanceMonitoring.recordMetric({ name: 'test', duration: i * 10, timestamp: i });
      }
      
      const p50 = performanceMonitoring.getPercentile('test', 50);
      const p95 = performanceMonitoring.getPercentile('test', 95);
      const p99 = performanceMonitoring.getPercentile('test', 99);
      
      expect(p50).toBeGreaterThan(0);
      expect(p95).toBeGreaterThan(0);
      expect(p99).toBeGreaterThan(0);
    });

    it('should return 0 for no metrics', () => {
      const p50 = performanceMonitoring.getPercentile('nonexistent', 50);
      
      expect(p50).toBe(0);
    });
  });

  describe('getSummary', () => {
    it('should generate summary for all metrics', () => {
      performanceMonitoring.recordMetric({ name: 'api_call', duration: 100, timestamp: 1 });
      performanceMonitoring.recordMetric({ name: 'api_call', duration: 200, timestamp: 2 });
      performanceMonitoring.recordMetric({ name: 'render', duration: 16, timestamp: 3 });
      
      const summary = performanceMonitoring.getSummary();
      
      expect(summary['api_call']).toBeDefined();
      expect(summary['render']).toBeDefined();
      expect(summary['api_call'].avg).toBe(150);
      expect(summary['api_call'].min).toBe(100);
      expect(summary['api_call'].max).toBe(200);
      expect(summary['api_call'].count).toBe(2);
    });

    it('should include percentiles in summary', () => {
      for (let i = 1; i <= 100; i++) {
        performanceMonitoring.recordMetric({ name: 'test', duration: i, timestamp: i });
      }
      
      const summary = performanceMonitoring.getSummary();
      
      expect(summary['test'].p50).toBeDefined();
      expect(summary['test'].p95).toBeDefined();
      expect(summary['test'].p99).toBeDefined();
    });

    it('should return empty object when no metrics', () => {
      const summary = performanceMonitoring.getSummary();
      
      expect(Object.keys(summary).length).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all metrics', () => {
      performanceMonitoring.recordMetric({ name: 'test', duration: 100, timestamp: 1 });
      performanceMonitoring.recordMetric({ name: 'test', duration: 200, timestamp: 2 });
      
      performanceMonitoring.clear();
      
      const metrics = performanceMonitoring.getMetrics();
      expect(metrics.length).toBe(0);
    });
  });

  describe('release', () => {
    it('should release resources', () => {
      performanceMonitoring.recordMetric({ name: 'test', duration: 100, timestamp: 1 });
      
      performanceMonitoring.release();
      
      const metrics = performanceMonitoring.getMetrics();
      expect(metrics.length).toBe(0);
    });
  });

  describe('Max Metrics Storage', () => {
    it('should limit stored metrics', () => {
      // Record more than max
      for (let i = 0; i < 1100; i++) {
        performanceMonitoring.recordMetric({ name: 'test', duration: i, timestamp: i });
      }
      
      const metrics = performanceMonitoring.getMetrics();
      
      // Should be limited to maxMetricsStored (1000)
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('useRenderTime Hook', () => {
    it('should be a function', () => {
      expect(typeof useRenderTime).toBe('function');
    });

    it('should not throw when called', () => {
      expect(() => useRenderTime('TestComponent')).not.toThrow();
    });
  });

  describe('Multiple Metric Types', () => {
    it('should handle different metric types', () => {
      performanceMonitoring.recordMetric({ name: 'api_call', duration: 100, timestamp: 1 });
      performanceMonitoring.recordMetric({ name: 'render', duration: 16, timestamp: 2 });
      performanceMonitoring.recordMetric({ name: 'db_query', duration: 50, timestamp: 3 });
      performanceMonitoring.recordMetric({ name: 'cache_hit', duration: 1, timestamp: 4 });
      
      const summary = performanceMonitoring.getSummary();
      
      expect(Object.keys(summary).length).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration', () => {
      performanceMonitoring.recordMetric({ name: 'test', duration: 0, timestamp: 1 });
      
      const metrics = performanceMonitoring.getMetrics('test');
      
      expect(metrics[0].duration).toBe(0);
    });

    it('should handle very large duration', () => {
      performanceMonitoring.recordMetric({ name: 'test', duration: 999999999, timestamp: 1 });
      
      const metrics = performanceMonitoring.getMetrics('test');
      
      expect(metrics[0].duration).toBe(999999999);
    });

    it('should handle negative duration', () => {
      performanceMonitoring.recordMetric({ name: 'test', duration: -100, timestamp: 1 });
      
      const metrics = performanceMonitoring.getMetrics('test');
      
      expect(metrics[0].duration).toBe(-100);
    });

    it('should handle single metric for percentile', () => {
      performanceMonitoring.recordMetric({ name: 'test', duration: 100, timestamp: 1 });
      
      const p50 = performanceMonitoring.getPercentile('test', 50);
      
      expect(p50).toBe(100);
    });
  });
});
