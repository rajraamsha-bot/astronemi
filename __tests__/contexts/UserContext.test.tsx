import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { UserProvider, useUser } from '@/contexts/UserContext';

let mockAsyncStorageStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((key, value) => {
    mockAsyncStorageStore[key] = String(value);
    return Promise.resolve();
  }),
  getItem: jest.fn((key) => {
    return Promise.resolve(mockAsyncStorageStore[key] || null);
  }),
  removeItem: jest.fn((key) => {
    delete mockAsyncStorageStore[key];
    return Promise.resolve();
  }),
  multiGet: jest.fn(() => Promise.resolve([])),
  clear: jest.fn(() => {
    mockAsyncStorageStore = {};
    return Promise.resolve();
  }),
}));

const mockAuthUser = {
  id: 'auth-user-123',
  phone: '9876543210',
  name: 'Test User',
  email: 'test@example.com',
  walletBalance: 100,
  subscriptionTier: 'free' as const,
  referralCode: 'TEST1234',
  language: 'en' as const,
  notificationsEnabled: true,
  createdAt: Date.now(),
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: mockAuthUser,
    isAuthenticated: true,
  })),
}));

jest.mock('@/utils/crypto', () => ({
  generateOTP: jest.fn(() => '123456'),
  generateUUID: jest.fn(() => 'test-uuid-1234'),
  generateReferralCode: jest.fn(() => 'TEST1234'),
  isSecureRandomAvailable: jest.fn(() => true),
}));

jest.mock('@/utils/notifications', () => ({
  initializeNotifications: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/logger', () => ({
  Logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UserProvider>{children}</UserProvider>
);

describe('UserContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorageStore = {};
  });

  describe('Initial State', () => {
    it('should sync user from AuthContext', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.name).toBe('Test User');
      expect(result.current.isLoggedIn).toBe(true);
    });

    it('should have empty saved kundlis initially', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      expect(result.current.savedKundlis).toEqual([]);
    });

    it('should have default notification settings', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      expect(result.current.notificationSettings.dailyHoroscope).toBe(true);
      expect(result.current.notificationSettings.festivalReminders).toBe(true);
    });
  });

  describe('deprecated signup', () => {
    it('should return false (deprecated)', async () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      let success: boolean;
      await act(async () => {
        success = await result.current.signup('Test User', 'test@example.com', 'password123');
      });
      expect(success!).toBe(false);
    });
  });

  describe('deprecated login', () => {
    it('should return false (deprecated)', async () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      let success: boolean;
      await act(async () => {
        success = await result.current.login('test@example.com', 'password123');
      });
      expect(success!).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear user state on logout', async () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      expect(result.current.isLoggedIn).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isLoggedIn).toBe(false);
      expect(result.current.savedKundlis).toEqual([]);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      await act(async () => {
        await result.current.updateProfile({ name: 'Updated Name' });
      });

      expect(result.current.user?.name).toBe('Updated Name');
    });
  });

  describe('updateBirthDetails', () => {
    it('should update birth details', async () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      await act(async () => {
        await result.current.updateBirthDetails({
          name: 'Test',
          birthDate: '1990-01-15',
          birthTime: '10:30',
          birthPlace: 'Mumbai, India',
        });
      });

      expect(result.current.user?.birthDetails.birthDate).toBe('1990-01-15');
      expect(result.current.user?.birthDetails.birthTime).toBe('10:30');
      expect(result.current.user?.birthDetails.birthPlace).toBe('Mumbai, India');
    });
  });

  describe('savedKundlis', () => {
    it('should add a saved kundli', async () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      await act(async () => {
        await result.current.addSavedKundli({
          name: 'Test Kundli',
          relation: 'self',
          birthDetails: {
            name: 'Test',
            birthDate: '1990-01-15',
            birthTime: '10:30',
            birthPlace: 'Mumbai',
            latitude: 19.076,
            longitude: 72.8777,
          },
        });
      });

      expect(result.current.savedKundlis.length).toBe(1);
      expect(result.current.savedKundlis[0].name).toBe('Test Kundli');
    });

    it('should remove a saved kundli', async () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      await act(async () => {
        await result.current.addSavedKundli({
          name: 'Test Kundli',
          relation: 'self',
          birthDetails: {
            name: 'Test',
            birthDate: '1990-01-15',
            birthTime: '10:30',
            birthPlace: 'Mumbai',
            latitude: 19.076,
            longitude: 72.8777,
          },
        });
      });

      const kundliId = result.current.savedKundlis[0].id;

      await act(async () => {
        await result.current.removeSavedKundli(kundliId);
      });

      expect(result.current.savedKundlis.length).toBe(0);
    });

    it('should get a saved kundli by id', async () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      await act(async () => {
        await result.current.addSavedKundli({
          name: 'Test Kundli',
          relation: 'self',
          birthDetails: {
            name: 'Test',
            birthDate: '1990-01-15',
            birthTime: '10:30',
            birthPlace: 'Mumbai',
            latitude: 19.076,
            longitude: 72.8777,
          },
        });
      });

      const kundliId = result.current.savedKundlis[0].id;
      const kundli = result.current.getSavedKundli(kundliId);

      expect(kundli).toBeDefined();
      expect(kundli?.name).toBe('Test Kundli');
    });
  });

  describe('notificationSettings', () => {
    it('should update notification settings', async () => {
      const { result } = renderHook(() => useUser(), { wrapper });

      await act(async () => {
        await result.current.updateNotificationSettings({
          dailyHoroscope: false,
          promotionalOffers: true,
        });
      });

      expect(result.current.notificationSettings.dailyHoroscope).toBe(false);
      expect(result.current.notificationSettings.promotionalOffers).toBe(true);
      expect(result.current.notificationSettings.festivalReminders).toBe(true);
    });
  });

  describe('deprecated subscription', () => {
    it('should return false (deprecated)', async () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      let success: boolean;
      await act(async () => {
        success = await result.current.subscribe('premium');
      });
      expect(success!).toBe(false);
    });
  });

  describe('referral', () => {
    it('should return referral code from user', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      expect(result.current.referralCode).toBe('TEST1234');
    });

    it('should return false for applyReferralCode (deprecated)', async () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      let success: boolean;
      await act(async () => {
        success = await result.current.applyReferralCode('FRIEND123');
      });
      expect(success!).toBe(false);
    });
  });
});
