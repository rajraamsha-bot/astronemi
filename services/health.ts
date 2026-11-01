/**
 * Health Check Service
 * 
 * Monitors app health, API availability, and service status
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';

// Health status types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  platform: {
    os: string;
    version: string;
  };
  services: ServiceHealth[];
  metrics: HealthMetrics;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  lastChecked: string;
  error?: string;
}

export interface HealthMetrics {
  memoryUsage?: number;
  storageUsed?: number;
  lastCrash?: string;
  sessionCount: number;
}

// Health check service
export const HealthService = {
  /**
   * Perform full health check
   */
  async checkHealth(): Promise<HealthStatus> {
    const services = await this.checkAllServices();
    const metrics = await this.getMetrics();
    
    // Determine overall status
    const status = this.determineOverallStatus(services);
    
    return {
      status,
      timestamp: new Date().toISOString(),
      version: '1.0.0', // Should come from app config
      platform: {
        os: Platform.OS,
        version: Platform.Version?.toString() || 'unknown',
      },
      services,
      metrics,
    };
  },

  /**
   * Check all external services
   */
  async checkAllServices(): Promise<ServiceHealth[]> {
    const checks = [
      this.checkSupabase(),
      this.checkRazorpay(),
      this.checkAgora(),
      this.checkSentry(),
    ];
    
    return Promise.all(checks);
  },

  /**
   * Check Supabase health
   */
  async checkSupabase(): Promise<ServiceHealth> {
    const startTime = Date.now();
    const name = 'Supabase';
    
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        return {
          name,
          status: 'down',
          lastChecked: new Date().toISOString(),
          error: 'Supabase URL not configured',
        };
      }
      
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        },
      });
      
      const latency = Date.now() - startTime;
      
      return {
        name,
        status: response.ok ? 'up' : 'down',
        latency,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name,
        status: 'down',
        latency: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Check Razorpay health
   */
  async checkRazorpay(): Promise<ServiceHealth> {
    const startTime = Date.now();
    const name = 'Razorpay';
    
    try {
      // Razorpay doesn't have a public health endpoint
      // We just check if the SDK is initialized
      const keyId = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
      
      if (!keyId) {
        return {
          name,
          status: 'down',
          lastChecked: new Date().toISOString(),
          error: 'Razorpay key not configured',
        };
      }
      
      return {
        name,
        status: 'up',
        latency: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name,
        status: 'down',
        latency: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Check Agora health
   */
  async checkAgora(): Promise<ServiceHealth> {
    const startTime = Date.now();
    const name = 'Agora';
    
    try {
      const appId = process.env.EXPO_PUBLIC_AGORA_APP_ID;
      
      if (!appId) {
        return {
          name,
          status: 'down',
          lastChecked: new Date().toISOString(),
          error: 'Agora app ID not configured',
        };
      }
      
      return {
        name,
        status: 'up',
        latency: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name,
        status: 'down',
        latency: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Check Sentry health
   */
  async checkSentry(): Promise<ServiceHealth> {
    const startTime = Date.now();
    const name = 'Sentry';
    
    try {
      const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
      
      if (!dsn) {
        return {
          name,
          status: 'down',
          lastChecked: new Date().toISOString(),
          error: 'Sentry DSN not configured',
        };
      }
      
      return {
        name,
        status: 'up',
        latency: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name,
        status: 'down',
        latency: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get app metrics
   */
  async getMetrics(): Promise<HealthMetrics> {
    try {
      // Get session count
      const sessionCountStr = await AsyncStorage.getItem('session_count');
      const sessionCount = sessionCountStr ? parseInt(sessionCountStr, 10) : 0;
      
      // Get last crash timestamp
      const lastCrash = await AsyncStorage.getItem('last_crash_timestamp');
      
      // Get storage usage (approximate)
      const keys = await AsyncStorage.getAllKeys();
      const storageUsed = keys.length * 100; // Rough estimate
      
      return {
        storageUsed,
        lastCrash: lastCrash || undefined,
        sessionCount,
      };
    } catch (error) {
      return {
        sessionCount: 0,
      };
    }
  },

  /**
   * Determine overall health status
   */
  determineOverallStatus(services: ServiceHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const downCount = services.filter(s => s.status === 'down').length;
    
    // If more than half are down, unhealthy
    if (downCount > services.length / 2) {
      return 'unhealthy';
    }
    
    // If any are degraded or down, degraded
    if (degradedCount > 0 || downCount > 0) {
      return 'degraded';
    }
    
    return 'healthy';
  },

  /**
   * Report health to monitoring
   */
  async reportHealth(): Promise<void> {
    try {
      const health = await this.checkHealth();
      
      // Send to monitoring endpoint
      // In production, this would send to your monitoring service
      
      Logger.info('[Health] Status: ' + health.status);
      Logger.info('[Health] Services: ' + health.services.map(s => 
        `${s.name}: ${s.status}${s.latency ? ` (${s.latency}ms)` : ''}`
      ).join(', '));
    } catch (error) {
      Logger.error('[Health] Failed to report health:', error);
    }
  },

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(intervalMs: number = 60000): () => void {
    const interval = setInterval(() => {
      this.reportHealth();
    }, intervalMs);
    
    // Return cleanup function
    return () => clearInterval(interval);
  },
};

export default HealthService;
