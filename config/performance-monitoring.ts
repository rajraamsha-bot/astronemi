/**
 * Performance Monitoring Configuration
 * 
 * This module sets up comprehensive performance monitoring for the AstroNemi app,
 * including:
 * - App startup time tracking
 * - Network request monitoring
 * - Memory usage tracking
 * - User interaction latency
 * - Error rate monitoring
 * - Custom performance metrics
 */

import { Platform } from 'react-native';
import { errorReporting } from '../services/error-reporting';

// Performance metrics interface
export interface PerformanceMetrics {
  // App startup metrics
  coldStart: number;
  warmStart: number;
  jsBundleLoadTime: number;
  
  // Network metrics
  apiResponseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  networkRequests: {
    total: number;
    failed: number;
    retried: number;
  };
  
  // Memory metrics
  memoryUsage: {
    current: number;
    peak: number;
    threshold: number;
  };
  
  // User interaction metrics
  screenRenderTime: {
    average: number;
    p95: number;
  };
  touchResponseTime: {
    average: number;
    p95: number;
  };
  
  // Error metrics
  errorRate: {
    total: number;
    rate: number; // errors per 1000 sessions
    critical: number;
  };
  
  // Custom metrics
  custom: Record<string, number>;
}

// Performance monitoring configuration
export const PerformanceConfig = {
  // Sampling rate for performance data (1.0 = 100%)
  samplingRate: 0.1, // 10% of users
  
  // Thresholds for alerts
  thresholds: {
    coldStart: 3000, // 3 seconds
    warmStart: 1500, // 1.5 seconds
    apiResponseTime: 2000, // 2 seconds
    errorRate: 5, // 5 errors per 1000 sessions
    memoryUsage: 150, // 150MB
  },
  
  // Metrics to track
  metrics: {
    startup: true,
    network: true,
    memory: true,
    userInteractions: true,
    errors: true,
    custom: true,
  },
  
  // Reporting interval (in ms)
  reportingInterval: 60000, // 1 minute
  
  // Performance observer configuration
  observerConfig: {
    type: ['paint', 'largest-contentful-paint', 'first-input'],
    buffered: true,
  },
};

// Performance monitoring class
class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private startTime: number;
  private apiTimings: number[] = [];
  private screenRenderTimings: number[] = [];
  private touchResponseTimings: number[] = [];
  
  constructor() {
    this.metrics = this.initializeMetrics();
    this.startTime = Date.now();
  }
  
  private initializeMetrics(): PerformanceMetrics {
    return {
      coldStart: 0,
      warmStart: 0,
      jsBundleLoadTime: 0,
      apiResponseTime: {
        average: 0,
        p95: 0,
        p99: 0,
      },
      networkRequests: {
        total: 0,
        failed: 0,
        retried: 0,
      },
      memoryUsage: {
        current: 0,
        peak: 0,
        threshold: PerformanceConfig.thresholds.memoryUsage,
      },
      screenRenderTime: {
        average: 0,
        p95: 0,
      },
      touchResponseTime: {
        average: 0,
        p95: 0,
      },
      errorRate: {
        total: 0,
        rate: 0,
        critical: 0,
      },
      custom: {},
    };
  }
  
  // Track app startup time
  trackStartup(isColdStart: boolean) {
    const startupTime = Date.now() - this.startTime;
    
    if (isColdStart) {
      this.metrics.coldStart = startupTime;
    } else {
      this.metrics.warmStart = startupTime;
    }
    
    // Check if startup time exceeds threshold
    if (startupTime > PerformanceConfig.thresholds.coldStart) {
      this.reportSlowStartup(startupTime, isColdStart);
    }
  }
  
  // Track API response time
  trackApiRequest(duration: number, success: boolean, retried: boolean) {
    this.metrics.networkRequests.total++;
    
    if (!success) {
      this.metrics.networkRequests.failed++;
    }
    
    if (retried) {
      this.metrics.networkRequests.retried++;
    }
    
    this.apiTimings.push(duration);
    
    // Keep only last 1000 measurements
    if (this.apiTimings.length > 1000) {
      this.apiTimings.shift();
    }
    
    // Update statistics
    this.updateApiStats();
    
    // Check if API response time exceeds threshold
    if (duration > PerformanceConfig.thresholds.apiResponseTime) {
      this.reportSlowApi(duration);
    }
  }
  
  // Track screen render time
  trackScreenRender(_screenName: string, duration: number) {
    this.screenRenderTimings.push(duration);
    
    if (this.screenRenderTimings.length > 1000) {
      this.screenRenderTimings.shift();
    }
    
    this.updateScreenRenderStats();
  }
  
  // Track touch response time
  trackTouchResponse(duration: number) {
    this.touchResponseTimings.push(duration);
    
    if (this.touchResponseTimings.length > 1000) {
      this.touchResponseTimings.shift();
    }
    
    this.updateTouchResponseStats();
  }
  
  // Track memory usage
  trackMemoryUsage(currentMemory: number) {
    this.metrics.memoryUsage.current = currentMemory;
    
    if (currentMemory > this.metrics.memoryUsage.peak) {
      this.metrics.memoryUsage.peak = currentMemory;
    }
    
    // Check if memory usage exceeds threshold
    if (currentMemory > PerformanceConfig.thresholds.memoryUsage) {
      this.reportHighMemoryUsage(currentMemory);
    }
  }
  
  // Track error
  trackError(isCritical: boolean) {
    this.metrics.errorRate.total++;
    
    if (isCritical) {
      this.metrics.errorRate.critical++;
    }
    
    // Calculate error rate (errors per 1000 sessions)
    const uptimeMinutes = (Date.now() - this.startTime) / 60000;
    this.metrics.errorRate.rate = (this.metrics.errorRate.total / Math.max(uptimeMinutes, 1)) * 1000;
    
    // Check if error rate exceeds threshold
    if (this.metrics.errorRate.rate > PerformanceConfig.thresholds.errorRate) {
      this.reportHighErrorRate();
    }
  }
  
  // Track custom metric
  trackCustomMetric(name: string, value: number) {
    this.metrics.custom[name] = value;
  }
  
  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  // Reset metrics (for testing)
  resetMetrics() {
    this.metrics = this.initializeMetrics();
    this.apiTimings = [];
    this.screenRenderTimings = [];
    this.touchResponseTimings = [];
  }
  
  // Private methods for statistics calculation
  private updateApiStats() {
    if (this.apiTimings.length === 0) return;
    
    const sorted = [...this.apiTimings].sort((a, b) => a - b);
    this.metrics.apiResponseTime.average = 
      sorted.reduce((a, b) => a + b, 0) / sorted.length;
    this.metrics.apiResponseTime.p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    this.metrics.apiResponseTime.p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  }
  
  private updateScreenRenderStats() {
    if (this.screenRenderTimings.length === 0) return;
    
    const sorted = [...this.screenRenderTimings].sort((a, b) => a - b);
    this.metrics.screenRenderTime.average = 
      sorted.reduce((a, b) => a + b, 0) / sorted.length;
    this.metrics.screenRenderTime.p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  }
  
  private updateTouchResponseStats() {
    if (this.touchResponseTimings.length === 0) return;
    
    const sorted = [...this.touchResponseTimings].sort((a, b) => a - b);
    this.metrics.touchResponseTime.average = 
      sorted.reduce((a, b) => a + b, 0) / sorted.length;
    this.metrics.touchResponseTime.p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  }
  
  // Reporting methods
  private reportSlowStartup(startupTime: number, isColdStart: boolean) {
    const type = isColdStart ? 'cold' : 'warm';
    errorReporting.captureException(
      new Error(`Slow ${type} startup: ${startupTime}ms`),
      {
        tags: { 
          service: 'performance',
          type: 'startup',
          platform: Platform.OS
        },
        extra: {
          startupTime,
          isColdStart,
          timestamp: new Date().toISOString()
        }
      }
    );
  }
  
  private reportSlowApi(duration: number) {
    errorReporting.captureException(
      new Error(`Slow API response: ${duration}ms`),
      {
        tags: { 
          service: 'performance',
          type: 'api',
          platform: Platform.OS
        },
        extra: {
          duration,
          threshold: PerformanceConfig.thresholds.apiResponseTime,
          timestamp: new Date().toISOString()
        }
      }
    );
  }
  
  private reportHighMemoryUsage(memory: number) {
    errorReporting.captureException(
      new Error(`High memory usage: ${memory}MB`),
      {
        tags: { 
          service: 'performance',
          type: 'memory',
          platform: Platform.OS
        },
        extra: {
          memory,
          threshold: PerformanceConfig.thresholds.memoryUsage,
          peak: this.metrics.memoryUsage.peak,
          timestamp: new Date().toISOString()
        }
      }
    );
  }
  
  private reportHighErrorRate() {
    errorReporting.captureException(
      new Error(`High error rate: ${this.metrics.errorRate.rate} per 1000 sessions`),
      {
        tags: { 
          service: 'performance',
          type: 'error_rate',
          platform: Platform.OS
        },
        extra: {
          errorRate: this.metrics.errorRate.rate,
          threshold: PerformanceConfig.thresholds.errorRate,
          totalErrors: this.metrics.errorRate.total,
          criticalErrors: this.metrics.errorRate.critical,
          timestamp: new Date().toISOString()
        }
      }
    );
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export hooks for React components
export const usePerformanceMonitoring = () => {
  const trackScreenRender = (screenName: string, duration: number) => {
    performanceMonitor.trackScreenRender(screenName, duration);
  };
  
  const trackTouchResponse = (duration: number) => {
    performanceMonitor.trackTouchResponse(duration);
  };
  
  const trackApiRequest = (duration: number, success: boolean, retried: boolean) => {
    performanceMonitor.trackApiRequest(duration, success, retried);
  };
  
  const getMetrics = () => {
    return performanceMonitor.getMetrics();
  };
  
  return {
    trackScreenRender,
    trackTouchResponse,
    trackApiRequest,
    getMetrics,
  };
};

export default performanceMonitor;