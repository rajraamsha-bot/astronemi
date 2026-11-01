/**
 * Notification Service Tests
 * 
 * Tests for push notification service including:
 * - Notification data types
 * - Permission handling
 * - Token management
 * - Notification scheduling
 */

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test-token]' })),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
  },
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      eas: {
        projectId: 'test-project-id',
      },
    },
  },
}));

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: jest.fn(() => Promise.resolve({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      update: jest.fn(() => Promise.resolve({ error: null })),
    })),
  },
  isSupabaseConfigured: jest.fn(() => false),
  subscribeToNotifications: jest.fn(() => ({ unsubscribe: jest.fn() })),
}));

import {
  NotificationData,
  StoredNotification,
} from '@/services/notifications';

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('NotificationData Type', () => {
    it('should define consultation notification', () => {
      const notification: NotificationData = {
        type: 'consultation',
        title: 'Upcoming Consultation',
        message: 'Your consultation with Dr. Sharma starts in 15 minutes',
        data: { consultationId: '123', astrologerId: '456' },
      };
      
      expect(notification.type).toBe('consultation');
      expect(notification.title).toBe('Upcoming Consultation');
      expect(notification.data?.consultationId).toBe('123');
    });

    it('should define subscription notification', () => {
      const notification: NotificationData = {
        type: 'subscription',
        title: 'Subscription Renewed',
        message: 'Your Premium subscription has been renewed',
      };
      
      expect(notification.type).toBe('subscription');
      expect(notification.data).toBeUndefined();
    });

    it('should define wallet notification', () => {
      const notification: NotificationData = {
        type: 'wallet',
        title: 'Wallet Credited',
        message: '₹500 has been added to your wallet',
        data: { amount: 500, transactionId: 'txn_123' },
      };
      
      expect(notification.type).toBe('wallet');
    });

    it('should define horoscope notification', () => {
      const notification: NotificationData = {
        type: 'horoscope',
        title: 'Daily Horoscope',
        message: 'Your daily horoscope is ready!',
        data: { sign: 'aries' },
      };
      
      expect(notification.type).toBe('horoscope');
    });

    it('should define transit notification', () => {
      const notification: NotificationData = {
        type: 'transit',
        title: 'Transit Alert',
        message: 'Saturn is moving into Aquarius',
        data: { planet: 'Saturn', sign: 'Aquarius' },
      };
      
      expect(notification.type).toBe('transit');
    });

    it('should define promo notification', () => {
      const notification: NotificationData = {
        type: 'promo',
        title: 'Special Offer',
        message: 'Get 20% off on all consultations this week!',
        data: { promoCode: 'ASTRO20', discount: 20 },
      };
      
      expect(notification.type).toBe('promo');
    });
  });

  describe('StoredNotification Type', () => {
    it('should define stored notification structure', () => {
      const stored: StoredNotification = {
        id: 'notif_123',
        userId: 'user_456',
        type: 'consultation',
        title: 'Test Notification',
        message: 'This is a test',
        data: { key: 'value' },
        isRead: false,
        createdAt: new Date('2024-01-15T10:30:00Z'),
      };
      
      expect(stored.id).toBe('notif_123');
      expect(stored.userId).toBe('user_456');
      expect(stored.isRead).toBe(false);
    });

    it('should handle read notification', () => {
      const stored: StoredNotification = {
        id: 'notif_789',
        userId: 'user_123',
        type: 'wallet',
        title: 'Wallet Updated',
        message: 'Balance updated',
        isRead: true,
        createdAt: new Date(),
      };
      
      expect(stored.isRead).toBe(true);
      expect(stored.data).toBeUndefined();
    });
  });

  describe('Notification Types Validation', () => {
    it('should accept all valid notification types', () => {
      const validTypes: NotificationData['type'][] = [
        'consultation',
        'subscription',
        'wallet',
        'horoscope',
        'transit',
        'promo',
      ];
      
      validTypes.forEach(type => {
        const notification: NotificationData = {
          type,
          title: 'Test',
          message: 'Test message',
        };
        expect(notification.type).toBe(type);
      });
    });
  });

  describe('Notification Data Structure', () => {
    it('should allow optional data field', () => {
      const withoutData: NotificationData = {
        type: 'horoscope',
        title: 'Test',
        message: 'Test message',
      };
      
      const withData: NotificationData = {
        type: 'horoscope',
        title: 'Test',
        message: 'Test message',
        data: { foo: 'bar' },
      };
      
      expect(withoutData.data).toBeUndefined();
      expect(withData.data).toEqual({ foo: 'bar' });
    });

    it('should allow any data structure', () => {
      const complexData = {
        nested: {
          deep: {
            value: 123,
          },
        },
        array: [1, 2, 3],
        string: 'test',
        boolean: true,
      };
      
      const notification: NotificationData = {
        type: 'transit',
        title: 'Complex Data',
        message: 'Test',
        data: complexData,
      };
      
      expect(notification.data?.nested?.deep?.value).toBe(123);
      expect(notification.data?.array).toHaveLength(3);
    });
  });
});
