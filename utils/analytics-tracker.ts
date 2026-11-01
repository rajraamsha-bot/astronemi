/* eslint-disable no-console */
/**
 * Analytics Tracking System
 */

import { UserRole } from './rbac';
import { UserTier } from './progressive-disclosure';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: Record<string, any> | null = null;
try {
  Sentry = require('@sentry/react-native');
} catch {
  // Sentry not available
}

import { Logger } from '@/services/logger';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
}

export interface UserProperties {
  userId?: string;
  userRole?: UserRole;
  userTier?: UserTier;
  sessionCount?: number;
  daysSinceSignup?: number;
  hasSubscription?: boolean;
  subscriptionPlan?: string;
  [key: string]: unknown;
}

export interface ScreenViewEvent {
  screenName: string;
  screenClass?: string;
  previousScreen?: string;
  timeSpent?: number;
}

class AnalyticsTracker {
  private isEnabled: boolean = true;
  private userId: string | null = null;
  private userProperties: UserProperties = {};
  private sessionStartTime: Date = new Date();
  private currentScreen: string | null = null;
  private screenStartTime: Date | null = null;

  initialize(userId?: string, properties?: UserProperties) {
    this.userId = userId || null;
    this.userProperties = properties || {};
    this.sessionStartTime = new Date();
    // Honor stored consent (M-19). Default-off if consent has not been granted
    // for this device. setEnabled(true) is called by the consent screen.
    try {
      const consent = globalThis?.localStorage?.getItem?.('analytics_consent_v1');
      this.isEnabled = consent === 'granted';
    } catch {
      this.isEnabled = false;
    }

    if (__DEV__) {
      Logger.info('[Analytics] Initialized', { userId, properties, enabled: this.isEnabled });
    }

    if (SENTRY_DSN && this.isEnabled) {
      Sentry?.init!({
        dsn: SENTRY_DSN,
        enableAutoSessionTracking: true,
        tracesSampleRate: 0.1,
      });
      if (userId) {
        Sentry?.setUser!({ id: userId, ...properties });
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (__DEV__) Logger.info('[Analytics] Enabled:', { enabled });
  }

  setUserId(userId: string) {
    this.userId = userId;
    if (!this.isEnabled) return;
    if (__DEV__) Logger.info('[Analytics] User ID set:', { userId });
    if (SENTRY_DSN) Sentry?.setUser!({ id: userId });
  }

  setUserProperties(properties: UserProperties) {
    this.userProperties = { ...this.userProperties, ...properties };
    if (!this.isEnabled) return;
    if (__DEV__) Logger.info('[Analytics] User properties set:', { properties });
    if (SENTRY_DSN && this.userId) {
      Sentry?.setUser!({ id: this.userId, ...this.userProperties });
    }
  }

  track(eventName: string, properties?: Record<string, unknown>) {
    if (!this.isEnabled) return;
    const event: AnalyticsEvent = {
      name: eventName, timestamp: new Date(),
      properties: { ...properties, userId: this.userId, ...this.userProperties, timestamp: new Date().toISOString() },
    };
    if (__DEV__) Logger.info('[Analytics] Event:', { event });
    if (SENTRY_DSN) {
      Sentry?.addBreadcrumb!({ message: eventName, category: 'analytics', data: properties, level: 'info' });
    }
  }

  trackScreenView(screenName: string, screenClass?: string) {
    if (!this.isEnabled) return;
    let timeSpent: number | undefined;
    if (this.currentScreen && this.screenStartTime) {
      timeSpent = Date.now() - this.screenStartTime.getTime();
      this.track('screen_time', { screen_name: this.currentScreen, time_spent_ms: timeSpent, time_spent_seconds: Math.round(timeSpent / 1000) });
    }
    const event: ScreenViewEvent = { screenName, screenClass, previousScreen: this.currentScreen || undefined, timeSpent };
    this.currentScreen = screenName;
    this.screenStartTime = new Date();
    if (__DEV__) Logger.info('[Analytics] Screen view:', { event });
    this.track('screen_view', event as unknown as Record<string, unknown>);
    if (SENTRY_DSN) Sentry?.addBreadcrumb!({ message: `Screen: ${screenName}`, category: 'navigation', data: { screenName, screenClass }, level: 'info' });
  }

  trackFeatureUsage(featureId: string, action: string, metadata?: Record<string, unknown>) {
    this.track('feature_usage', { feature_id: featureId, action, ...metadata });
  }

  trackEngagement(engagementType: string, value?: number, metadata?: Record<string, unknown>) {
    this.track('user_engagement', { engagement_type: engagementType, value, ...metadata });
  }

  trackConversion(conversionType: string, value?: number, currency?: string) {
    this.track('conversion', { conversion_type: conversionType, value, currency: currency || 'INR' });
  }

  trackError(error: Error, context?: Record<string, unknown>) {
    this.track('error', { error_message: error.message, error_stack: error.stack, error_name: error.name, ...context });
    if (SENTRY_DSN) Sentry?.captureException!(error, { extra: context });
  }

  trackSessionStart() {
    this.sessionStartTime = new Date();
    this.track('session_start', { session_start_time: this.sessionStartTime.toISOString() });
  }

  trackSessionEnd() {
    const sessionDuration = Date.now() - this.sessionStartTime.getTime();
    this.track('session_end', { session_duration_ms: sessionDuration, session_duration_minutes: Math.round(sessionDuration / 60000) });
  }

  trackTierProgression(fromTier: UserTier, toTier: UserTier) {
    this.track('tier_progression', { from_tier: fromTier, to_tier: toTier });
  }

  trackFeatureUnlock(featureId: string, unlockMethod: 'tier' | 'subscription') {
    this.track('feature_unlock', { feature_id: featureId, unlock_method: unlockMethod });
  }

  trackSubscription(action: 'view' | 'start' | 'complete' | 'cancel', plan?: string, amount?: number) {
    this.track('subscription', { action, plan, amount, currency: 'INR' });
  }

  trackOnboarding(step: number, stepName: string, completed: boolean) {
    this.track('onboarding', { step, step_name: stepName, completed });
  }

  trackSearch(query: string, resultsCount: number) {
    this.track('search', { query, results_count: resultsCount });
  }

  trackShare(contentType: string, contentId: string, method: string) {
    this.track('share', { content_type: contentType, content_id: contentId, method });
  }

  getSessionDuration(): number {
    return Date.now() - this.sessionStartTime.getTime();
  }
}

export const analytics = new AnalyticsTracker();

export const trackEvent = (name: string, properties?: Record<string, unknown>) => analytics.track(name, properties);
export const trackScreen = (screenName: string, screenClass?: string) => analytics.trackScreenView(screenName, screenClass);
export const trackFeature = (featureId: string, action: string, metadata?: Record<string, unknown>) => analytics.trackFeatureUsage(featureId, action, metadata);
export const trackError = (error: Error, context?: Record<string, unknown>) => analytics.trackError(error, context);

export default analytics;