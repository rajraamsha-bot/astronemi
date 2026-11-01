/**
 * Advanced Analytics Service
 * 
 * Provides comprehensive analytics tracking including:
 * - User journey analysis
 * - Feature usage tracking
 * - Conversion funnel tracking
 * - A/B test integration
 * - Custom event tracking
 */

import { analytics } from '@/utils/analytics-tracker';
import { Logger } from './logger';
import { prefixedSecureId } from '../utils/secure-random';

// Analytics configuration
const ANALYTICS_CONFIG = {
  enableUserJourney: true,
  enableFeatureTracking: true,
  enableConversionTracking: true,
  enableABTesting: true,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  batchSize: 10,
  flushInterval: 5000, // 5 seconds
};

// User journey step types
export enum JourneyStep {
  APP_OPEN = 'app_open',
  ONBOARDING_START = 'onboarding_start',
  ONBOARDING_COMPLETE = 'onboarding_complete',
  LOGIN_START = 'login_start',
  LOGIN_SUCCESS = 'login_success',
  SIGNUP_START = 'signup_start',
  SIGNUP_SUCCESS = 'signup_success',
  FIRST_KUNDLI = 'first_kundli',
  FIRST_CONSULTATION = 'first_consultation',
  FIRST_PURCHASE = 'first_purchase',
  SUBSCRIPTION_START = 'subscription_start',
}

// Feature usage types
export enum FeatureType {
  KUNDLI_GENERATION = 'kundli_generation',
  HOROSCOPE_VIEW = 'horoscope_view',
  ASTROLOGER_SEARCH = 'astrologer_search',
  CONSULTATION_BOOK = 'consultation_book',
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_COMPLETED = 'payment_completed',
  PRODUCT_VIEW = 'product_view',
  PRODUCT_PURCHASE = 'product_purchase',
  CHAT_MESSAGE = 'chat_message',
  VIDEO_CALL = 'video_call',
  AI_CHAT = 'ai_chat',
  PANCHANG_VIEW = 'panchang_view',
}

// Conversion funnel types
export enum FunnelType {
  SIGNUP = 'signup',
  CONSULTATION = 'consultation',
  PURCHASE = 'purchase',
  SUBSCRIPTION = 'subscription',
}

export interface FunnelStep {
  name: string;
  timestamp: Date;
  properties?: Record<string, unknown>;
}

export interface UserJourney {
  userId: string;
  steps: JourneyStep[];
  startTime: Date;
  lastActivity: Date;
}

export interface FeatureUsage {
  feature: FeatureType;
  count: number;
  lastUsed: Date;
  totalTime: number;
}

export interface ConversionFunnel {
  type: FunnelType;
  steps: FunnelStep[];
  completed: boolean;
  conversionRate?: number;
}

class AdvancedAnalyticsService {
  private userJourney: UserJourney | null = null;
  private featureUsage: Map<FeatureType, FeatureUsage> = new Map();
  private conversionFunnels: Map<FunnelType, ConversionFunnel> = new Map();
  private eventQueue: { event: string; properties: Record<string, unknown>; timestamp: Date }[] = [];
  private sessionId: string = '';
  private isInitialized: boolean = false;
  private flushIntervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize advanced analytics
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Generate session ID
      this.sessionId = this.generateSessionId();

      // Initialize user journey tracking
      if (ANALYTICS_CONFIG.enableUserJourney) {
        this.initializeUserJourney();
      }

      // Initialize feature usage tracking
      if (ANALYTICS_CONFIG.enableFeatureTracking) {
        this.initializeFeatureTracking();
      }

      // Initialize conversion tracking
      if (ANALYTICS_CONFIG.enableConversionTracking) {
        this.initializeConversionTracking();
      }

      // Start event batching
      this.startEventBatching();

      this.isInitialized = true;
      Logger.info('Advanced analytics initialized');
    } catch (error) {
      Logger.error('Failed to initialize advanced analytics:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return prefixedSecureId('session', 12);
  }

  /**
   * Initialize user journey tracking
   */
  private initializeUserJourney(): void {
    this.userJourney = {
      userId: '',
      steps: [JourneyStep.APP_OPEN],
      startTime: new Date(),
      lastActivity: new Date(),
    };

    this.trackJourneyStep(JourneyStep.APP_OPEN);
  }

  /**
   * Initialize feature usage tracking
   */
  private initializeFeatureTracking(): void {
    // Load existing feature usage from storage
    // In a real app, this would persist across sessions
  }

  /**
   * Initialize conversion tracking
   */
  private initializeConversionTracking(): void {
    // Initialize funnels
    Object.values(FunnelType).forEach(funnelType => {
      this.conversionFunnels.set(funnelType, {
        type: funnelType,
        steps: [],
        completed: false,
      });
    });
  }

  /**
   * Start event batching
   */
  private startEventBatching(): void {
    if (this.flushIntervalId) clearInterval(this.flushIntervalId);
    this.flushIntervalId = setInterval(() => {
      this.flushEventQueue();
    }, ANALYTICS_CONFIG.flushInterval);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }
    this.isInitialized = false;
  }

  /**
   * Track user journey step
   */
  trackJourneyStep(step: JourneyStep, properties?: Record<string, unknown>): void {
    if (!ANALYTICS_CONFIG.enableUserJourney || !this.userJourney) return;

    this.userJourney.steps.push(step);
    this.userJourney.lastActivity = new Date();

    analytics.track('SCREEN_VIEW', {
      journey_step: step,
      session_id: this.sessionId,
      ...properties,
    });

    Logger.debug(`Journey step tracked: ${step}`);
  }

  /**
   * Set user ID for journey tracking
   */
  setUserId(userId: string): void {
    if (this.userJourney) {
      this.userJourney.userId = userId;
    }
    analytics.setUserId(userId);
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: FeatureType, duration?: number, properties?: Record<string, unknown>): void {
    if (!ANALYTICS_CONFIG.enableFeatureTracking) return;

    const existing = this.featureUsage.get(feature);
    const usage: FeatureUsage = {
      feature,
      count: (existing?.count || 0) + 1,
      lastUsed: new Date(),
      totalTime: (existing?.totalTime || 0) + (duration || 0),
    };

    this.featureUsage.set(feature, usage);

    analytics.track('SCREEN_VIEW', {
      feature_name: feature,
      feature_count: usage.count,
      feature_duration: duration,
      session_id: this.sessionId,
      ...properties,
    });

    Logger.debug(`Feature usage tracked: ${feature}`);
  }

  /**
   * Start conversion funnel
   */
  startFunnel(funnelType: FunnelType, properties?: Record<string, unknown>): void {
    if (!ANALYTICS_CONFIG.enableConversionTracking) return;

    const funnel = this.conversionFunnels.get(funnelType);
    if (funnel) {
      funnel.steps = [{
        name: 'start',
        timestamp: new Date(),
        properties,
      }];

      analytics.track('SCREEN_VIEW', {
        funnel_type: funnelType,
        funnel_step: 'start',
        session_id: this.sessionId,
        ...properties,
      });

      Logger.debug(`Funnel started: ${funnelType}`);
    }
  }

  /**
   * Add step to conversion funnel
   */
  trackFunnelStep(funnelType: FunnelType, stepName: string, properties?: Record<string, unknown>): void {
    if (!ANALYTICS_CONFIG.enableConversionTracking) return;

    const funnel = this.conversionFunnels.get(funnelType);
    if (funnel) {
      funnel.steps.push({
        name: stepName,
        timestamp: new Date(),
        properties,
      });

      analytics.track('SCREEN_VIEW', {
        funnel_type: funnelType,
        funnel_step: stepName,
        funnel_progress: funnel.steps.length,
        session_id: this.sessionId,
        ...properties,
      });

      Logger.debug(`Funnel step tracked: ${funnelType} - ${stepName}`);
    }
  }

  /**
   * Complete conversion funnel
   */
  completeFunnel(funnelType: FunnelType, properties?: Record<string, unknown>): void {
    if (!ANALYTICS_CONFIG.enableConversionTracking) return;

    const funnel = this.conversionFunnels.get(funnelType);
    if (funnel) {
      funnel.completed = true;
      funnel.steps.push({
        name: 'complete',
        timestamp: new Date(),
        properties,
      });

      analytics.track('SCREEN_VIEW', {
        funnel_type: funnelType,
        funnel_step: 'complete',
        funnel_steps: funnel.steps.length,
        session_id: this.sessionId,
        ...properties,
      });

      Logger.debug(`Funnel completed: ${funnelType}`);
    }
  }

  /**
   * Track A/B test exposure
   */
  trackABTestExposure(testId: string, variant: string, properties?: Record<string, unknown>): void {
    if (!ANALYTICS_CONFIG.enableABTesting) return;

    analytics.track('SCREEN_VIEW', {
      ab_test_id: testId,
      ab_variant: variant,
      session_id: this.sessionId,
      ...properties,
    });

    Logger.debug(`A/B test exposure tracked: ${testId} - ${variant}`);
  }

  /**
   * Track custom event with advanced properties
   */
  trackAdvancedEvent(eventName: string, properties: Record<string, unknown> = {}): void {
    const enrichedProperties = {
      ...properties,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      user_journey_length: this.userJourney?.steps.length || 0,
    };

    // Add to event queue for batching
    this.eventQueue.push({
      event: eventName,
      properties: enrichedProperties,
      timestamp: new Date(),
    });

    // Flush if queue is full
    if (this.eventQueue.length >= ANALYTICS_CONFIG.batchSize) {
      this.flushEventQueue();
    }
  }

  /**
   * Flush event queue
   */
  private flushEventQueue(): void {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    // Send events to analytics service
    events.forEach(({ event, properties }) => {
      analytics.track(event, properties as Record<string, string>);
    });

    Logger.debug(`Flushed ${events.length} events from queue`);
  }

  /**
   * Get user journey summary
   */
  getUserJourneySummary(): UserJourney | null {
    return this.userJourney;
  }

  /**
   * Get feature usage summary
   */
  getFeatureUsageSummary(): Map<FeatureType, FeatureUsage> {
    return new Map(this.featureUsage);
  }

  /**
   * Get conversion funnel summary
   */
  getConversionFunnelSummary(): Map<FunnelType, ConversionFunnel> {
    return new Map(this.conversionFunnels);
  }

  /**
   * Calculate funnel conversion rate
   */
  calculateFunnelConversionRate(funnelType: FunnelType): number {
    const funnel = this.conversionFunnels.get(funnelType);
    if (!funnel || funnel.steps.length === 0) return 0;

    const completed = funnel.completed ? 1 : 0;
    return (completed / funnel.steps.length) * 100;
  }

  /**
   * Export analytics data
   */
  exportAnalyticsData(): {
    userJourney: UserJourney | null;
    featureUsage: Record<string, FeatureUsage>;
    conversionFunnels: Record<string, ConversionFunnel>;
    sessionId: string;
  } {
    return {
      userJourney: this.userJourney,
      featureUsage: Object.fromEntries(this.featureUsage),
      conversionFunnels: Object.fromEntries(this.conversionFunnels),
      sessionId: this.sessionId,
    };
  }

  /**
   * Reset analytics data (for testing or user logout)
   */
  reset(): void {
    this.userJourney = null;
    this.featureUsage.clear();
    this.conversionFunnels.clear();
    this.eventQueue = [];
    this.sessionId = this.generateSessionId();
    
    Logger.info('Analytics data reset');
  }
}

// Export singleton instance
export const advancedAnalytics = new AdvancedAnalyticsService();

/**
 * Hook for advanced analytics
 */
export function useAdvancedAnalytics() {
  return {
    trackJourneyStep: advancedAnalytics.trackJourneyStep.bind(advancedAnalytics),
    setUserId: advancedAnalytics.setUserId.bind(advancedAnalytics),
    trackFeatureUsage: advancedAnalytics.trackFeatureUsage.bind(advancedAnalytics),
    startFunnel: advancedAnalytics.startFunnel.bind(advancedAnalytics),
    trackFunnelStep: advancedAnalytics.trackFunnelStep.bind(advancedAnalytics),
    completeFunnel: advancedAnalytics.completeFunnel.bind(advancedAnalytics),
    trackABTestExposure: advancedAnalytics.trackABTestExposure.bind(advancedAnalytics),
    trackAdvancedEvent: advancedAnalytics.trackAdvancedEvent.bind(advancedAnalytics),
    getUserJourneySummary: advancedAnalytics.getUserJourneySummary.bind(advancedAnalytics),
    getFeatureUsageSummary: advancedAnalytics.getFeatureUsageSummary.bind(advancedAnalytics),
    getConversionFunnelSummary: advancedAnalytics.getConversionFunnelSummary.bind(advancedAnalytics),
    exportAnalyticsData: advancedAnalytics.exportAnalyticsData.bind(advancedAnalytics),
  };
}

export default advancedAnalytics;