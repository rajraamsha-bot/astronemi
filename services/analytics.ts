/**
 * Analytics Service
 * 
 * Central analytics tracking service for the application
 * Provides event tracking, user properties, and analytics utilities
 */

export enum AnalyticsEvent {
  // Auth events
  LOGIN_INITIATED = 'login_initiated',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  SIGNUP_INITIATED = 'signup_initiated',
  SIGNUP_SUCCESS = 'signup_success',
  OTP_SENT = 'otp_sent',
  OTP_VERIFIED = 'otp_verified',

  // Navigation events
  SCREEN_VIEW = 'screen_view',
  TAB_SWITCH = 'tab_switch',

  // Kundli events
  KUNDLI_GENERATION_STARTED = 'kundli_generation_started',
  KUNDLI_GENERATION_SUCCESS = 'kundli_generation_success',
  KUNDLI_GENERATION_FAILED = 'kundli_generation_failed',
  KUNDLI_DOWNLOADED = 'kundli_downloaded',
  KUNDLI_SHARED = 'kundli_shared',
  KUNDLI_MATCHING_STARTED = 'kundli_matching_started',
  KUNDLI_MATCHING_SUCCESS = 'kundli_matching_success',

  // Horoscope events
  HOROSCOPE_VIEWED = 'horoscope_viewed',
  HOROSCOPE_SHARED = 'horoscope_shared',
  DAILY_HOROSCOPE_CHECKED = 'daily_horoscope_checked',

  // Consultation events
  ASTROLOGER_VIEWED = 'astrologer_viewed',
  CONSULTATION_STARTED = 'consultation_started',
  CONSULTATION_ENDED = 'consultation_ended',
  CONSULTATION_RATED = 'consultation_rated',
  CHAT_MESSAGE_SENT = 'chat_message_sent',
  VIDEO_CALL_STARTED = 'video_call_started',
  VIDEO_CALL_ENDED = 'video_call_end',

  // Payment events
  WALLET_TOPUP_INITIATED = 'wallet_topup_initiated',
  WALLET_TOPUP_SUCCESS = 'wallet_topup_success',
  WALLET_TOPUP_FAILED = 'wallet_topup_failed',
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',

  // Subscription events
  SUBSCRIPTION_VIEWED = 'subscription_viewed',
  SUBSCRIPTION_INITIATED = 'subscription_initiated',
  SUBSCRIPTION_SUCCESS = 'subscription_success',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',

  // Shop events
  PRODUCT_VIEWED = 'product_viewed',
  ADD_TO_CART = 'add_to_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  CHECKOUT_INITIATED = 'checkout_initiated',
  ORDER_PLACED = 'order_placed',
  ORDER_CANCELLED = 'order_cancelled',

  // Referral events
  REFERRAL_CODE_SHARED = 'referral_code_shared',
  REFERRAL_APPLIED = 'referral_applied',
  REFERRAL_SUCCESS = 'referral_success',

  // Feature usage events
  AI_CHAT_STARTED = 'ai_chat_started',
  AI_CHAT_MESSAGE_SENT = 'ai_chat_message_sent',
  PANCHANG_VIEWED = 'panchang_viewed',
  MUHURAT_VIEWED = 'muhurat_viewed',
  TRANSIT_VIEWED = 'transit_viewed',
  NUMEROLOGY_CALCULATED = 'numerology_calculated',
  TAROT_READING_STARTED = 'tarot_reading_started',
  FESTIVAL_VIEWED = 'festival_viewed',

  // Engagement events
  NOTIFICATION_RECEIVED = 'notification_received',
  NOTIFICATION_OPENED = 'notification_opened',
  PUSH_ENABLED = 'push_enabled',
  PUSH_DISABLED = 'push_disabled',
  DARK_MODE_ENABLED = 'dark_mode_enabled',
  LANGUAGE_CHANGED = 'language_changed',

  // Error events
  ERROR_OCCURRED = 'error_occurred',
  API_ERROR = 'api_error',
  NETWORK_ERROR = 'network_error',
}

export type AnalyticsEventProperties = Record<string, string | number | boolean | Date | undefined>;

export interface UserProperties {
  userId?: string;
  email?: string;
  phone?: string;
  name?: string;
  plan?: string;
  walletBalance?: number;
  totalConsultations?: number;
  signupDate?: string;
  referralCode?: string;
  language?: string;
  theme?: string;
}

class AnalyticsService {
  private isEnabled = true;

  /**
   * Track an analytics event
   */
  track(event: AnalyticsEvent | string, properties?: AnalyticsEventProperties): void {
    if (!this.isEnabled) return;

    // In production, this would send to analytics service (Firebase, Mixpanel, etc.)
    if (__DEV__) {
      console.log('[Analytics]', event, properties);
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties): void {
    if (!this.isEnabled) return;

    // In production, this would update user properties in analytics service
    if (__DEV__) {
      console.log('[Analytics] User Properties:', properties);
    }
  }

  /**
   * Identify a user
   */
  identify(userId: string): void {
    if (!this.isEnabled) return;

    // In production, this would identify the user in analytics service
    if (__DEV__) {
      console.log('[Analytics] Identify:', userId);
    }
  }

  /**
   * Enable analytics tracking
   */
  enable(): void {
    this.isEnabled = true;
  }

  /**
   * Disable analytics tracking
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Reset analytics (on logout)
   */
  reset(): void {
    // In production, this would reset the analytics state
    if (__DEV__) {
      console.log('[Analytics] Reset');
    }
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
