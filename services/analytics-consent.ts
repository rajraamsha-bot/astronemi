/**
 * Analytics Consent Service
 * 
 * Manages user consent for analytics, tracking, and A/B testing.
 * Implements GDPR/ePrivacy compliance for tracking consent.
 * 
 * No analytics will be initialized or tracked until explicit consent is given.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_STORAGE_KEY = '@astrofusion_analytics_consent';

export interface AnalyticsConsent {
  analytics: boolean;
  crashReporting: boolean;
  abTesting: boolean;
  pushNotifications: boolean;
  personalizedContent: boolean;
  consentGivenAt: string | null;
}

const DEFAULT_CONSENT: AnalyticsConsent = {
  analytics: false,
  crashReporting: true,
  abTesting: false,
  pushNotifications: false,
  personalizedContent: false,
  consentGivenAt: null,
};

let cachedConsent: AnalyticsConsent | null = null;

export const analyticsConsent = {
  async getConsent(): Promise<AnalyticsConsent> {
    try {
      const stored = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored) {
        const parsed = { ...DEFAULT_CONSENT, ...JSON.parse(stored) };
        cachedConsent = parsed;
        return parsed;
      }
    } catch {
      // ignore
    }
    const result = { ...DEFAULT_CONSENT };
    cachedConsent = result;
    return result;
  },

  async setConsent(consent: Partial<AnalyticsConsent>): Promise<AnalyticsConsent> {
    const current = await this.getConsent();
    const updated = {
      ...current,
      ...consent,
      consentGivenAt: consent.consentGivenAt || new Date().toISOString(),
    };
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(updated));
    cachedConsent = updated;
    // Mirror analytics consent into a synchronous flag the analytics tracker
    // reads on init (M-19). Stored under both 'analytics_consent_v1' (string
    // flag) and the structured payload above.
    try {
      const flag = updated.analytics === true ? 'granted' : 'revoked';
      if (typeof globalThis !== 'undefined' && (globalThis as { localStorage?: Storage }).localStorage) {
        (globalThis as { localStorage: Storage }).localStorage.setItem('analytics_consent_v1', flag);
      }
    } catch {
      // localStorage unavailable in non-web — analytics stays disabled by default.
    }
    return updated;
  },

  async grantAll(): Promise<AnalyticsConsent> {
    return this.setConsent({
      analytics: true,
      crashReporting: true,
      abTesting: true,
      pushNotifications: true,
      personalizedContent: true,
      consentGivenAt: new Date().toISOString(),
    });
  },

  async revokeAll(): Promise<AnalyticsConsent> {
    return this.setConsent({
      analytics: false,
      crashReporting: true,
      abTesting: false,
      pushNotifications: false,
      personalizedContent: false,
    });
  },

  /**
   * Synchronous, *cached* check. Safe to call in render paths because it only
   * reads from memory warmed by prior `getConsent()`/`setConsent()` calls.
   * Returns the conservative default (false) until the first async read has
   * populated the cache.
   */
  hasConsent(type: keyof Omit<AnalyticsConsent, 'consentGivenAt'>): boolean {
    return cachedConsent ? cachedConsent[type] === true : false;
  },

  async hasConsentAsync(type: keyof Omit<AnalyticsConsent, 'consentGivenAt'>): Promise<boolean> {
    const consent = await this.getConsent();
    return consent[type] === true;
  },

  async checkAndInit(type: keyof Omit<AnalyticsConsent, 'consentGivenAt'>): Promise<boolean> {
    const consent = await this.getConsent();
    return consent[type] === true;
  },
};

export default analyticsConsent;
