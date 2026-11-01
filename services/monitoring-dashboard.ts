/**
 * Monitoring Dashboard Service
 * 
 * Provides real-time monitoring dashboards for app health,
 * performance metrics, and error tracking
 */

import { analytics } from '@/utils/analytics-tracker';
import { Logger } from './logger';

// Dashboard metrics types
export interface DashboardMetrics {
  timestamp: Date;
  performance: PerformanceMetrics;
  errors: ErrorMetrics;
  users: UserMetrics;
  business: BusinessMetrics;
}

export interface PerformanceMetrics {
  appStartTime: number;
  apiResponseTime: number;
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  crashRate: number;
  anrRate: number; // Application Not Responding
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByScreen: Record<string, number>;
  errorRate: number;
  criticalErrors: number;
  recoveredErrors: number;
}

export interface UserMetrics {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  avgSessionDuration: number;
  retentionRate: number;
  churnRate: number;
}

export interface BusinessMetrics {
  revenue: number;
  transactions: number;
  conversionRate: number;
  avgOrderValue: number;
  consultations: number;
  subscriptions: number;
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

export interface DashboardConfig {
  refreshInterval: number; // milliseconds
  alertThresholds: {
    errorRate: number;
    crashRate: number;
    apiResponseTime: number;
    memoryUsage: number;
  };
  enableRealTime: boolean;
  retentionDays: number;
}

class MonitoringDashboardService {
  private config: DashboardConfig = {
    refreshInterval: 30000, // 30 seconds
    alertThresholds: {
      errorRate: 0.01, // 1%
      crashRate: 0.005, // 0.5%
      apiResponseTime: 2000, // 2 seconds
      memoryUsage: 0.8, // 80%
    },
    enableRealTime: true,
    retentionDays: 30,
  };

  private metrics: DashboardMetrics | null = null;
  private alerts: Alert[] = [];
  private isInitialized = false;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private alertInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize monitoring dashboard
   */
  async initialize(config?: Partial<DashboardConfig>): Promise<void> {
    if (!__DEV__) {
      // This service is a dev-only diagnostic — in production it produces
      // misleading fake data and starts unnecessary intervals. Bail out.
      return;
    }
    if (this.isInitialized) return;

    this.config = { ...this.config, ...config };

    try {
      // Start metrics collection
      this.startMetricsCollection();

      // Start alert monitoring
      this.startAlertMonitoring();

      // Initialize real-time updates if enabled
      if (this.config.enableRealTime) {
        this.startRealTimeUpdates();
      }

      this.isInitialized = true;
      Logger.info('Monitoring dashboard initialized');
    } catch (error) {
      Logger.error('Failed to initialize monitoring dashboard:', error);
    }
  }

  /**
   * Start collecting metrics
   */
  private startMetricsCollection(): void {
    // Collect initial metrics
    this.collectMetrics();

    // Set up periodic collection
    this.refreshInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.refreshInterval);
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = new Date();

      // Collect performance metrics
      const performance = await this.collectPerformanceMetrics();

      // Collect error metrics
      const errors = this.collectErrorMetrics();

      // Collect user metrics
      const users = await this.collectUserMetrics();

      // Collect business metrics
      const business = await this.collectBusinessMetrics();

      this.metrics = {
        timestamp,
        performance,
        errors,
        users,
        business,
      };

      // Check for alerts
      this.checkAlerts();

      // Log metrics for debugging
      if (__DEV__) {
        Logger.debug('Metrics collected:', this.metrics as unknown as Record<string, unknown>);
      }
    } catch (error) {
      Logger.error('Failed to collect metrics:', error);
    }
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    // In a real app, these would come from native modules or performance APIs
    return {
      appStartTime: Math.random() * 2000 + 1000, // 1-3 seconds
      apiResponseTime: Math.random() * 1000 + 200, // 200-1200ms
      renderTime: Math.random() * 100 + 16, // 16-116ms
      memoryUsage: Math.random() * 0.3 + 0.4, // 40-70%
      cpuUsage: Math.random() * 0.2 + 0.1, // 10-30%
      networkLatency: Math.random() * 200 + 50, // 50-250ms
      crashRate: Math.random() * 0.01, // 0-1%
      anrRate: Math.random() * 0.005, // 0-0.5%
    };
  }

  /**
   * Collect error metrics
   */
  private collectErrorMetrics(): ErrorMetrics {
    // Simulate error metrics collection
    // In a real app, this would fetch from crash reporting service
    const errors: Array<{ type: string; screen: string; severity: string; recovered: boolean }> = [];
    
    const errorsByType: Record<string, number> = {};
    const errorsByScreen: Record<string, number> = {};
    
    errors.forEach((error: { type: string; screen: string }) => {
      const type = error.type || 'unknown';
      const screen = error.screen || 'unknown';
      
      errorsByType[type] = (errorsByType[type] || 0) + 1;
      errorsByScreen[screen] = (errorsByScreen[screen] || 0) + 1;
    });

    const criticalErrors = errors.filter((e: { severity: string }) => e.severity === 'critical').length;
    const recoveredErrors = errors.filter((e: { recovered: boolean }) => e.recovered).length;

    return {
      totalErrors: errors.length,
      errorsByType,
      errorsByScreen,
      errorRate: errors.length > 0 ? errors.length / 1000 : 0, // errors per 1000 requests
      criticalErrors,
      recoveredErrors,
    };
  }

  /**
   * Collect user metrics
   */
  private async collectUserMetrics(): Promise<UserMetrics> {
    // In a real app, these would come from analytics or database
    return {
      activeUsers: Math.floor(Math.random() * 10000) + 1000,
      newUsers: Math.floor(Math.random() * 500) + 50,
      sessions: Math.floor(Math.random() * 50000) + 5000,
      avgSessionDuration: Math.floor(Math.random() * 600) + 300, // 5-15 minutes
      retentionRate: Math.random() * 0.3 + 0.6, // 60-90%
      churnRate: Math.random() * 0.1 + 0.05, // 5-15%
    };
  }

  /**
   * Collect business metrics
   */
  private async collectBusinessMetrics(): Promise<BusinessMetrics> {
    // In a real app, these would come from payment or order services
    return {
      revenue: Math.floor(Math.random() * 1000000) + 100000,
      transactions: Math.floor(Math.random() * 10000) + 1000,
      conversionRate: Math.random() * 0.1 + 0.02, // 2-12%
      avgOrderValue: Math.floor(Math.random() * 500) + 100,
      consultations: Math.floor(Math.random() * 5000) + 500,
      subscriptions: Math.floor(Math.random() * 1000) + 100,
    };
  }

  /**
   * Start alert monitoring
   */
  private startAlertMonitoring(): void {
    // Monitor for threshold violations
    if (this.alertInterval) clearInterval(this.alertInterval);
    this.alertInterval = setInterval(() => {
      if (this.metrics) {
        this.checkAlerts();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    if (!this.metrics) return;

    const { performance, errors } = this.metrics;
    const { alertThresholds } = this.config;

    // Check error rate
    if (errors.errorRate > alertThresholds.errorRate) {
      this.createAlert({
        type: 'error',
        severity: 'critical',
        message: `Error rate exceeded threshold: ${(errors.errorRate * 100).toFixed(2)}%`,
        metadata: { errorRate: errors.errorRate },
      });
    }

    // Check crash rate
    if (performance.crashRate > alertThresholds.crashRate) {
      this.createAlert({
        type: 'error',
        severity: 'critical',
        message: `Crash rate exceeded threshold: ${(performance.crashRate * 100).toFixed(2)}%`,
        metadata: { crashRate: performance.crashRate },
      });
    }

    // Check API response time
    if (performance.apiResponseTime > alertThresholds.apiResponseTime) {
      this.createAlert({
        type: 'warning',
        severity: 'high',
        message: `API response time exceeded threshold: ${performance.apiResponseTime.toFixed(0)}ms`,
        metadata: { apiResponseTime: performance.apiResponseTime },
      });
    }

    // Check memory usage
    if (performance.memoryUsage > alertThresholds.memoryUsage) {
      this.createAlert({
        type: 'warning',
        severity: 'medium',
        message: `Memory usage exceeded threshold: ${(performance.memoryUsage * 100).toFixed(1)}%`,
        metadata: { memoryUsage: performance.memoryUsage },
      });
    }
  }

  /**
   * Create an alert
   */
  private createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alertData,
    };

    this.alerts.push(alert);

    // Log alert
    Logger.warn(`Alert created: ${alert.message}`, alert as unknown as Record<string, unknown>);

    // Track alert in analytics
    analytics.track('ERROR_OCCURRED', {
      alert_type: alert.type,
      severity: alert.severity,
      message: alert.message,
    });

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      Logger.info(`Alert resolved: ${alert.message}`);
    }
  }

  /**
   * Start real-time updates
   */
  private startRealTimeUpdates(): void {
    // In a real app, this would use WebSockets or Server-Sent Events
    Logger.info('Real-time updates enabled');
  }

  /**
   * Get current metrics
   */
  getMetrics(): DashboardMetrics | null {
    return this.metrics;
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit = 50): Alert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get unresolved alerts
   */
  getUnresolvedAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(_hours = 24): DashboardMetrics[] {
    // In a real app, this would fetch from a time-series database
    return [];
  }

  /**
   * Export dashboard data
   */
  exportData(): {
    metrics: DashboardMetrics | null;
    alerts: Alert[];
    config: DashboardConfig;
  } {
    return {
      metrics: this.metrics,
      alerts: this.alerts,
      config: this.config,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
      this.alertInterval = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const monitoringDashboard = new MonitoringDashboardService();

/**
 * Dashboard hook for React components
 */
export function useMonitoringDashboard() {
  return {
    getMetrics: monitoringDashboard.getMetrics.bind(monitoringDashboard),
    getAlerts: monitoringDashboard.getAlerts.bind(monitoringDashboard),
    getUnresolvedAlerts: monitoringDashboard.getUnresolvedAlerts.bind(monitoringDashboard),
    resolveAlert: monitoringDashboard.resolveAlert.bind(monitoringDashboard),
    getMetricsHistory: monitoringDashboard.getMetricsHistory.bind(monitoringDashboard),
    exportData: monitoringDashboard.exportData.bind(monitoringDashboard),
  };
}

export default monitoringDashboard;