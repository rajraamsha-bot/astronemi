/**
 * Notification System
 * 
 * Toast/notification utility for user feedback
 */


import * as Notifications from 'expo-notifications';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationOptions {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: boolean;
  badge?: number;
}

export interface NotificationSettings {
  dailyHoroscope?: boolean;
  dailyHoroscopeTime?: string;
  festivalReminders?: boolean;
  muhuratAlerts?: boolean;
  transitAlerts?: boolean;
  walletLowBalance?: boolean;
  promotionalOffers?: boolean;
  astrologerMessages?: boolean;
}

// Export initializeNotifications for backwards compatibility
export async function initializeNotifications(
  _settings?: NotificationOptions | NotificationSettings,
  _userName?: string
): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

class NotificationService {
  private hasPermission: boolean = false;

  /**
   * Initialize notification permissions
   */
  async initialize(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus === 'granted') {
      this.hasPermission = true;
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    this.hasPermission = status === 'granted';
    
    return this.hasPermission;
  }

  /**
   * Get push token for server registration
   */
  async getPushToken(): Promise<string | null> {
    if (!this.hasPermission) {
      await this.initialize();
    }

    if (!this.hasPermission) return null;

    try {
      const { data } = await Notifications.getExpoPushTokenAsync();
      return data;
} catch (error) {
    return null;
  }
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification(
    options: NotificationOptions,
    delaySeconds: number = 0
  ): Promise<string | null> {
    if (!this.hasPermission) {
      await this.initialize();
    }

    if (!this.hasPermission) return null;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: options.title,
          body: options.body,
          data: options.data,
          sound: options.sound ?? true,
        },
        trigger: delaySeconds > 0 
          ? { seconds: delaySeconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL }
          : null,
      });
      return id;
} catch (error) {
    return null;
  }
  }

  /**
   * Send immediate local notification
   */
  async sendNotification(options: NotificationOptions): Promise<void> {
    if (!this.hasPermission) {
      await this.initialize();
    }

    if (!this.hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: options.title,
        body: options.body,
        data: options.data,
        sound: options.sound ?? true,
      },
      trigger: null, // Immediate
    });
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Cancel specific notification
   */
  async cancelNotification(id: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(id);
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Add notification response listener
   */
  addResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Add notification received listener
   */
  addReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

export default notificationService;
