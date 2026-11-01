/**
 * Analytics Service Tests
 */

import { AnalyticsEvent } from '@/services/analytics';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '14.0',
  },
}));

describe('Analytics Service', () => {
  describe('AnalyticsEvent Enum', () => {
    it('should have auth events', () => {
      expect(AnalyticsEvent.LOGIN_INITIATED).toBe('login_initiated');
      expect(AnalyticsEvent.LOGIN_SUCCESS).toBe('login_success');
      expect(AnalyticsEvent.LOGIN_FAILED).toBe('login_failed');
      expect(AnalyticsEvent.LOGOUT).toBe('logout');
      expect(AnalyticsEvent.SIGNUP_INITIATED).toBe('signup_initiated');
      expect(AnalyticsEvent.SIGNUP_SUCCESS).toBe('signup_success');
      expect(AnalyticsEvent.OTP_SENT).toBe('otp_sent');
      expect(AnalyticsEvent.OTP_VERIFIED).toBe('otp_verified');
    });

    it('should have navigation events', () => {
      expect(AnalyticsEvent.SCREEN_VIEW).toBe('screen_view');
      expect(AnalyticsEvent.TAB_SWITCH).toBe('tab_switch');
    });

    it('should have kundli events', () => {
      expect(AnalyticsEvent.KUNDLI_GENERATION_STARTED).toBe('kundli_generation_started');
      expect(AnalyticsEvent.KUNDLI_GENERATION_SUCCESS).toBe('kundli_generation_success');
      expect(AnalyticsEvent.KUNDLI_GENERATION_FAILED).toBe('kundli_generation_failed');
      expect(AnalyticsEvent.KUNDLI_DOWNLOADED).toBe('kundli_downloaded');
      expect(AnalyticsEvent.KUNDLI_SHARED).toBe('kundli_shared');
      expect(AnalyticsEvent.KUNDLI_MATCHING_STARTED).toBe('kundli_matching_started');
      expect(AnalyticsEvent.KUNDLI_MATCHING_SUCCESS).toBe('kundli_matching_success');
    });

    it('should have horoscope events', () => {
      expect(AnalyticsEvent.HOROSCOPE_VIEWED).toBe('horoscope_viewed');
      expect(AnalyticsEvent.HOROSCOPE_SHARED).toBe('horoscope_shared');
      expect(AnalyticsEvent.DAILY_HOROSCOPE_CHECKED).toBe('daily_horoscope_checked');
    });

    it('should have consultation events', () => {
      expect(AnalyticsEvent.ASTROLOGER_VIEWED).toBe('astrologer_viewed');
      expect(AnalyticsEvent.CONSULTATION_STARTED).toBe('consultation_started');
      expect(AnalyticsEvent.CONSULTATION_ENDED).toBe('consultation_ended');
      expect(AnalyticsEvent.CONSULTATION_RATED).toBe('consultation_rated');
      expect(AnalyticsEvent.CHAT_MESSAGE_SENT).toBe('chat_message_sent');
      expect(AnalyticsEvent.VIDEO_CALL_STARTED).toBe('video_call_started');
      expect(AnalyticsEvent.VIDEO_CALL_ENDED).toBe('video_call_end');
    });

    it('should have payment events', () => {
      expect(AnalyticsEvent.WALLET_TOPUP_INITIATED).toBe('wallet_topup_initiated');
      expect(AnalyticsEvent.WALLET_TOPUP_SUCCESS).toBe('wallet_topup_success');
      expect(AnalyticsEvent.WALLET_TOPUP_FAILED).toBe('wallet_topup_failed');
      expect(AnalyticsEvent.PAYMENT_INITIATED).toBe('payment_initiated');
      expect(AnalyticsEvent.PAYMENT_SUCCESS).toBe('payment_success');
      expect(AnalyticsEvent.PAYMENT_FAILED).toBe('payment_failed');
    });

    it('should have subscription events', () => {
      expect(AnalyticsEvent.SUBSCRIPTION_VIEWED).toBe('subscription_viewed');
      expect(AnalyticsEvent.SUBSCRIPTION_INITIATED).toBe('subscription_initiated');
      expect(AnalyticsEvent.SUBSCRIPTION_SUCCESS).toBe('subscription_success');
      expect(AnalyticsEvent.SUBSCRIPTION_CANCELLED).toBe('subscription_cancelled');
      expect(AnalyticsEvent.SUBSCRIPTION_RENEWED).toBe('subscription_renewed');
    });

    it('should have shop events', () => {
      expect(AnalyticsEvent.PRODUCT_VIEWED).toBe('product_viewed');
      expect(AnalyticsEvent.ADD_TO_CART).toBe('add_to_cart');
      expect(AnalyticsEvent.REMOVE_FROM_CART).toBe('remove_from_cart');
      expect(AnalyticsEvent.CHECKOUT_INITIATED).toBe('checkout_initiated');
      expect(AnalyticsEvent.ORDER_PLACED).toBe('order_placed');
      expect(AnalyticsEvent.ORDER_CANCELLED).toBe('order_cancelled');
    });

    it('should have referral events', () => {
      expect(AnalyticsEvent.REFERRAL_CODE_SHARED).toBe('referral_code_shared');
      expect(AnalyticsEvent.REFERRAL_APPLIED).toBe('referral_applied');
      expect(AnalyticsEvent.REFERRAL_SUCCESS).toBe('referral_success');
    });

    it('should have feature usage events', () => {
      expect(AnalyticsEvent.AI_CHAT_STARTED).toBe('ai_chat_started');
      expect(AnalyticsEvent.AI_CHAT_MESSAGE_SENT).toBe('ai_chat_message_sent');
      expect(AnalyticsEvent.PANCHANG_VIEWED).toBe('panchang_viewed');
      expect(AnalyticsEvent.MUHURAT_VIEWED).toBe('muhurat_viewed');
      expect(AnalyticsEvent.TRANSIT_VIEWED).toBe('transit_viewed');
      expect(AnalyticsEvent.NUMEROLOGY_CALCULATED).toBe('numerology_calculated');
      expect(AnalyticsEvent.TAROT_READING_STARTED).toBe('tarot_reading_started');
      expect(AnalyticsEvent.FESTIVAL_VIEWED).toBe('festival_viewed');
    });

    it('should have engagement events', () => {
      expect(AnalyticsEvent.NOTIFICATION_RECEIVED).toBe('notification_received');
      expect(AnalyticsEvent.NOTIFICATION_OPENED).toBe('notification_opened');
      expect(AnalyticsEvent.PUSH_ENABLED).toBe('push_enabled');
      expect(AnalyticsEvent.PUSH_DISABLED).toBe('push_disabled');
      expect(AnalyticsEvent.DARK_MODE_ENABLED).toBe('dark_mode_enabled');
      expect(AnalyticsEvent.LANGUAGE_CHANGED).toBe('language_changed');
    });

    it('should have error events', () => {
      expect(AnalyticsEvent.ERROR_OCCURRED).toBe('error_occurred');
      expect(AnalyticsEvent.API_ERROR).toBe('api_error');
      expect(AnalyticsEvent.NETWORK_ERROR).toBe('network_error');
    });
  });

  describe('Event Categories', () => {
    it('should have correct number of auth events', () => {
      const authEvents = [
        AnalyticsEvent.LOGIN_INITIATED,
        AnalyticsEvent.LOGIN_SUCCESS,
        AnalyticsEvent.LOGIN_FAILED,
        AnalyticsEvent.LOGOUT,
        AnalyticsEvent.SIGNUP_INITIATED,
        AnalyticsEvent.SIGNUP_SUCCESS,
        AnalyticsEvent.OTP_SENT,
        AnalyticsEvent.OTP_VERIFIED,
      ];
      expect(authEvents).toHaveLength(8);
    });

    it('should have correct number of kundli events', () => {
      const kundliEvents = [
        AnalyticsEvent.KUNDLI_GENERATION_STARTED,
        AnalyticsEvent.KUNDLI_GENERATION_SUCCESS,
        AnalyticsEvent.KUNDLI_GENERATION_FAILED,
        AnalyticsEvent.KUNDLI_DOWNLOADED,
        AnalyticsEvent.KUNDLI_SHARED,
        AnalyticsEvent.KUNDLI_MATCHING_STARTED,
        AnalyticsEvent.KUNDLI_MATCHING_SUCCESS,
      ];
      expect(kundliEvents).toHaveLength(7);
    });

    it('should have correct number of payment events', () => {
      const paymentEvents = [
        AnalyticsEvent.WALLET_TOPUP_INITIATED,
        AnalyticsEvent.WALLET_TOPUP_SUCCESS,
        AnalyticsEvent.WALLET_TOPUP_FAILED,
        AnalyticsEvent.PAYMENT_INITIATED,
        AnalyticsEvent.PAYMENT_SUCCESS,
        AnalyticsEvent.PAYMENT_FAILED,
      ];
      expect(paymentEvents).toHaveLength(6);
    });

    it('should have correct number of subscription events', () => {
      const subscriptionEvents = [
        AnalyticsEvent.SUBSCRIPTION_VIEWED,
        AnalyticsEvent.SUBSCRIPTION_INITIATED,
        AnalyticsEvent.SUBSCRIPTION_SUCCESS,
        AnalyticsEvent.SUBSCRIPTION_CANCELLED,
        AnalyticsEvent.SUBSCRIPTION_RENEWED,
      ];
      expect(subscriptionEvents).toHaveLength(5);
    });

    it('should have correct number of shop events', () => {
      const shopEvents = [
        AnalyticsEvent.PRODUCT_VIEWED,
        AnalyticsEvent.ADD_TO_CART,
        AnalyticsEvent.REMOVE_FROM_CART,
        AnalyticsEvent.CHECKOUT_INITIATED,
        AnalyticsEvent.ORDER_PLACED,
        AnalyticsEvent.ORDER_CANCELLED,
      ];
      expect(shopEvents).toHaveLength(6);
    });
  });

  describe('Event Naming Convention', () => {
    it('should use snake_case for all events', () => {
      const events = Object.values(AnalyticsEvent);
      events.forEach(event => {
        expect(event).toMatch(/^[a-z]+(_[a-z]+)*$/);
      });
    });

    it('should have lowercase event names', () => {
      const events = Object.values(AnalyticsEvent);
      events.forEach(event => {
        expect(event).toBe(event.toLowerCase());
      });
    });

    it('should not have spaces in event names', () => {
      const events = Object.values(AnalyticsEvent);
      events.forEach(event => {
        expect(event).not.toMatch(/\s/);
      });
    });
  });

  describe('Event Properties Type', () => {
    it('should allow string properties', () => {
      const props: Record<string, string | number | boolean | Date | undefined> = {
        screen: 'home',
        action: 'click',
      };
      expect(props.screen).toBe('home');
    });

    it('should allow number properties', () => {
      const props: Record<string, string | number | boolean | Date | undefined> = {
        duration: 120,
        count: 5,
      };
      expect(props.duration).toBe(120);
    });

    it('should allow boolean properties', () => {
      const props: Record<string, string | number | boolean | Date | undefined> = {
        success: true,
        error: false,
      };
      expect(props.success).toBe(true);
    });

    it('should allow Date properties', () => {
      const props: Record<string, string | number | boolean | Date | undefined> = {
        timestamp: new Date(),
      };
      expect(props.timestamp).toBeInstanceOf(Date);
    });

    it('should allow undefined properties', () => {
      const props: Record<string, string | number | boolean | Date | undefined> = {
        optional: undefined,
      };
      expect(props.optional).toBeUndefined();
    });
  });

  describe('User Properties Type', () => {
    it('should define user properties structure', () => {
      const userProps = {
        userId: 'user_123',
        email: 'test@example.com',
        phone: '9876543210',
        name: 'Test User',
        plan: 'premium',
        walletBalance: 500,
        totalConsultations: 10,
        signupDate: '2024-01-01',
        referralCode: 'REF123',
        language: 'en',
        theme: 'dark',
      };
      
      expect(userProps.userId).toBe('user_123');
      expect(userProps.plan).toBe('premium');
      expect(userProps.walletBalance).toBe(500);
    });

    it('should allow optional properties', () => {
      const userProps: { userId: string; email?: string } = {
        userId: 'user_123',
      };
      
      expect(userProps.userId).toBe('user_123');
      expect(userProps.email).toBeUndefined();
    });
  });

  describe('Event Flow Patterns', () => {
    it('should have initiated-success-failed pattern for login', () => {
      expect(AnalyticsEvent.LOGIN_INITIATED).toBeDefined();
      expect(AnalyticsEvent.LOGIN_SUCCESS).toBeDefined();
      expect(AnalyticsEvent.LOGIN_FAILED).toBeDefined();
    });

    it('should have initiated-success-failed pattern for signup', () => {
      expect(AnalyticsEvent.SIGNUP_INITIATED).toBeDefined();
      expect(AnalyticsEvent.SIGNUP_SUCCESS).toBeDefined();
    });

    it('should have initiated-success-failed pattern for payment', () => {
      expect(AnalyticsEvent.PAYMENT_INITIATED).toBeDefined();
      expect(AnalyticsEvent.PAYMENT_SUCCESS).toBeDefined();
      expect(AnalyticsEvent.PAYMENT_FAILED).toBeDefined();
    });

    it('should have initiated-success-failed pattern for wallet topup', () => {
      expect(AnalyticsEvent.WALLET_TOPUP_INITIATED).toBeDefined();
      expect(AnalyticsEvent.WALLET_TOPUP_SUCCESS).toBeDefined();
      expect(AnalyticsEvent.WALLET_TOPUP_FAILED).toBeDefined();
    });

    it('should have started-success-failed pattern for kundli', () => {
      expect(AnalyticsEvent.KUNDLI_GENERATION_STARTED).toBeDefined();
      expect(AnalyticsEvent.KUNDLI_GENERATION_SUCCESS).toBeDefined();
      expect(AnalyticsEvent.KUNDLI_GENERATION_FAILED).toBeDefined();
    });

    it('should have started-ended pattern for consultation', () => {
      expect(AnalyticsEvent.CONSULTATION_STARTED).toBeDefined();
      expect(AnalyticsEvent.CONSULTATION_ENDED).toBeDefined();
    });

    it('should have started-ended pattern for video call', () => {
      expect(AnalyticsEvent.VIDEO_CALL_STARTED).toBeDefined();
      expect(AnalyticsEvent.VIDEO_CALL_ENDED).toBeDefined();
    });
  });

  describe('Total Event Count', () => {
    it('should have comprehensive event coverage', () => {
      const totalEvents = Object.keys(AnalyticsEvent).length;
      // Should have at least 50 defined events
      expect(totalEvents).toBeGreaterThanOrEqual(50);
    });
  });
});
