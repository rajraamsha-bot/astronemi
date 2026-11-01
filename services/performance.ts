/**
 * Performance Monitoring Service
 * 
 * Tracks app performance metrics including:
 * - Screen load times
 * - API call durations
 * - Memory usage
 * - Render times
 * 
 * Note: Uses simple Date-based timing for React Native compatibility
 */


import { Logger } from './logger';

// Performance metrics storage
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private maxMetricsStored = 1000;

  // Use Date.now() for timing (React Native compatible)
  // private _getTime(): number {
  //   return Date.now();
  // }

  /**
   * Start performance monitoring
   */
  initialize(): void {
    if (__DEV__) {
      Logger.debug('Performance monitoring initialized');
    }

    // Monitor long tasks if available
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: 'long-task',
              duration: entry.duration,
              timestamp: Date.now(),
              metadata: { entryType: entry.entryType }
            });
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long tasks not supported
      }
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsStored) {
      this.metrics = this.metrics.slice(-this.maxMetricsStored);
    }

    if (__DEV__) {
      Logger.debug(`Performance ${metric.name}: ${metric.duration.toFixed(2)}ms`);
    }
  }

  /**
   * Measure execution time of a function
   */
  measure<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - startTime;
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Measure async function execution time
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - startTime;
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Start a named timer
   */
  startTimer(name: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
      });
    };
  }

  /**
   * Get metrics for a specific name
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  /**
   * Get average duration for a metric
   */
  getAverageDuration(name: string): number {
    const relevantMetrics = this.metrics.filter(m => m.name === name);
    if (relevantMetrics.length === 0) return 0;
    
    const sum = relevantMetrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / relevantMetrics.length;
  }

  /**
   * Get percentile for a metric
   */
  getPercentile(name: string, percentile: number): number {
    const relevantMetrics = this.metrics
      .filter(m => m.name === name)
      .sort((a, b) => a.duration - b.duration);
    
    if (relevantMetrics.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * relevantMetrics.length) - 1;
    return relevantMetrics[Math.max(0, index)]?.duration ?? 0;
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, { avg: number; min: number; max: number; p50: number; p95: number; p99: number; count: number }> {
    const summary: Record<string, { avg: number; min: number; max: number; p50: number; p95: number; p99: number; count: number }> = {};
    const metricNames = [...new Set(this.metrics.map(m => m.name))];

    for (const name of metricNames) {
      const relevantMetrics = this.metrics.filter(m => m.name === name);
      if (relevantMetrics.length === 0) continue;

      const durations = relevantMetrics.map(m => m.duration);
      summary[name] = {
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        p50: this.getPercentile(name, 50),
        p95: this.getPercentile(name, 95),
        p99: this.getPercentile(name, 99),
        count: durations.length,
      };
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Cleanup resources
   */
  release(): void {
    this.metrics = [];
  }
}

// Export singleton
export const performanceMonitoring = new PerformanceMonitoringService();

/**
 * Hook for measuring component render time
 */
export function useRenderTime(componentName: string) {
  const startTime = Date.now();

  if (__DEV__) {
    // In development, log when component renders
    setTimeout(() => {
      const duration = Date.now() - startTime;
      if (duration > 16) { // Longer than one frame
        performanceMonitoring.recordMetric({
          name: `render.${componentName}`,
          duration,
          timestamp: Date.now(),
        });
      }
    }, 0);
  }
}

export default performanceMonitoring;
