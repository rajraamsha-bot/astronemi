import { notificationService, initializeNotifications } from '../../utils/notifications';
import * as Notifications from 'expo-notifications';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'time_interval',
  },
}));

describe('Notification Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeNotifications', () => {
    it('should request permissions and return true if granted', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
      const res = await initializeNotifications();
      expect(res).toBe(true);
    });

    it('should return false if permissions are denied or throw', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
      const res = await initializeNotifications();
      expect(res).toBe(false);

      (Notifications.requestPermissionsAsync as jest.Mock).mockRejectedValueOnce(new Error('Failed'));
      const res2 = await initializeNotifications();
      expect(res2).toBe(false);
    });
  });

  describe('NotificationService', () => {
    describe('initialize', () => {
      it('should return true if permissions are already granted', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
        const res = await notificationService.initialize();
        expect(res).toBe(true);
        expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
      });

      it('should request permissions if not already granted', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });
        (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
        const res = await notificationService.initialize();
        expect(res).toBe(true);
        expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      });
    });

    describe('getPushToken', () => {
      it('should return push token if permission is granted', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
        (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({ data: 'mock_token' });
        const token = await notificationService.getPushToken();
        expect(token).toBe('mock_token');
      });

      it('should return null if permission is denied', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
        (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
        const token = await notificationService.getPushToken();
        expect(token).toBeNull();
      });

      it('should return null on error', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
        (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValueOnce(new Error('Token error'));
        const token = await notificationService.getPushToken();
        expect(token).toBeNull();
      });
    });

    describe('scheduleNotification', () => {
      it('should schedule notification', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
        (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce('notification_id');
        const id = await notificationService.scheduleNotification({ title: 'Test' }, 5);
        expect(id).toBe('notification_id');
      });

      it('should return null on schedule error', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
        (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValueOnce(new Error('Schedule error'));
        const id = await notificationService.scheduleNotification({ title: 'Test' });
        expect(id).toBeNull();
      });
    });

    describe('sendNotification', () => {
      it('should send immediate notification', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
        await notificationService.sendNotification({ title: 'Immediate' });
        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
          content: { title: 'Immediate', sound: true },
          trigger: null,
        });
      });
    });

    describe('cancellation and query', () => {
      it('should cancel all notifications', async () => {
        await notificationService.cancelAllNotifications();
        expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      });

      it('should cancel specific notification', async () => {
        await notificationService.cancelNotification('id123');
        expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('id123');
      });

      it('should get all scheduled notifications', async () => {
        (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([]);
        const list = await notificationService.getScheduledNotifications();
        expect(list).toEqual([]);
      });
    });

    describe('listeners', () => {
      it('should add response and received listeners', () => {
        const mockCb = jest.fn();
        notificationService.addResponseListener(mockCb);
        expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(mockCb);

        notificationService.addReceivedListener(mockCb);
        expect(Notifications.addNotificationReceivedListener).toHaveBeenCalledWith(mockCb);
      });
    });
  });
});
