/**
 * Push Notification Service
 * 
 * Uses Expo Notifications for cross-platform push notifications
 * Integrates with Supabase for notification storage and retrieval
 */

import { supabase, isSupabaseConfigured, subscribeToNotifications } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Logger } from '@/services/logger';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 'consultation' | 'subscription' | 'wallet' | 'horoscope' | 'transit' | 'promo';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface StoredNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

// Store push token
let pushToken: string | null = null;
let notificationSubscription: { remove: () => void } | null = null;
let realtimeSubscription: { unsubscribe: () => void } | null = null;

/**
 * Register for push notifications
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Logger.info('Push notification permission not granted');
      return null;
    }

    // Get push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    pushToken = token.data;
    // SECURITY: Push token logged removed - tokens should not be exposed in logs

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6B46C1',
      });
    }

    return pushToken;
  } catch (error) {
    Logger.error('Error registering for push notifications:', error);
    return null;
  }
};

/**
 * Save push token to database
 */
export const savePushToken = async (userId: string, token: string): Promise<boolean> => {
  try {
    if (isSupabaseConfigured()) {
      // Store token in user record or separate table
      // This would typically be done via a Supabase Edge Function
      const { error } = await supabase
        .from('user_devices')
        .upsert({
          user_id: userId,
          push_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>, {
          onConflict: 'user_id,push_token',
        });

      if (error) {
        Logger.error('Error saving push token:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    Logger.error('Error in savePushToken:', error);
    return false;
  }
};

/**
 * Listen for incoming notifications
 */
export const setupNotificationListener = (
  onNotification: (notification: NotificationData) => void
): (() => void) => {
  // Listen for notifications received while app is foregrounded
  const receivedSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      const data = notification.request.content.data as unknown as NotificationData;
      onNotification(data);
    }
  );
  notificationSubscription = receivedSub;

  // Listen for notification taps
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as unknown as NotificationData;
      // Handle notification tap - navigate to relevant screen
      Logger.info('Notification tapped:', data);
    }
  );

  return () => {
    receivedSub.remove();
    if (notificationSubscription === receivedSub) notificationSubscription = null;
    responseSub.remove();
  };
};

/**
 * Subscribe to real-time notifications from database
 */
export const subscribeToDatabaseNotifications = (
  userId: string,
  onNewNotification: (notification: StoredNotification) => void
): (() => void) => {
  if (isSupabaseConfigured()) {
    const sub = subscribeToNotifications(userId, (newNotification: Record<string, unknown>) => {
      onNewNotification(mapDbNotification(newNotification));

      // Also show local notification
      showLocalNotification({
        type: newNotification.type as NotificationData['type'],
        title: newNotification.title as string,
        message: newNotification.message as string,
        data: newNotification.data as Record<string, unknown>,
      });
    });
    realtimeSubscription = sub;

    return () => {
      sub.unsubscribe();
      if (realtimeSubscription === sub) realtimeSubscription = null;
    };
  }

  return () => {};
};

/**
 * Show a local notification
 */
export const showLocalNotification = async (data: NotificationData): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title,
        body: data.message,
        data: data.data,
        sound: 'default',
      },
      trigger: null, // Immediately
    });
  } catch (error) {
    Logger.error('Error showing local notification:', error);
  }
};

/**
 * Schedule a daily horoscope notification
 */
export const scheduleDailyHoroscopeNotification = async (
  zodiacSign: string,
  time: string = '08:00'
): Promise<void> => {
  const [hour, minute] = time.split(':').map(Number);

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Daily Horoscope - ${zodiacSign}`,
      body: 'Your daily cosmic guidance is ready! Tap to view.',
      data: { type: 'horoscope', zodiacSign },
      sound: 'default',
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    } as unknown as Notifications.NotificationTriggerInput,
  });
};

/**
 * Schedule transit alert notification
 */
export const scheduleTransitAlertNotification = async (
  planet: string,
  date: Date,
  message: string
): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${planet} Transit Alert`,
      body: message,
      data: { type: 'transit', planet },
      sound: 'default',
    },
    trigger: {
      date,
    } as unknown as Notifications.NotificationTriggerInput,
  });
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllScheduledNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Get all scheduled notifications
 */
export const getScheduledNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  return await Notifications.getAllScheduledNotificationsAsync();
};

/**
 * Get notification history from database
 */
export const getNotificationHistory = async (
  userId: string,
  limit: number = 50
): Promise<StoredNotification[]> => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        Logger.error('Error fetching notification history:', error);
        return [];
      }

      return data.map(mapDbNotification);
    }

    return [];
  } catch (error) {
    Logger.error('Error in getNotificationHistory:', error);
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        Logger.error('Error marking notification as read:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    Logger.error('Error in markNotificationAsRead:', error);
    return false;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        Logger.error('Error marking all notifications as read:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    Logger.error('Error in markAllNotificationsAsRead:', error);
    return false;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    if (isSupabaseConfigured()) {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        Logger.error('Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    }

    return 0;
  } catch (error) {
    Logger.error('Error in getUnreadCount:', error);
    return 0;
  }
};

/**
 * Create a notification in database (for server-side use)
 */
export const createNotification = async (
  userId: string,
  data: NotificationData
): Promise<boolean> => {
  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data,
        } as Record<string, unknown>);

      if (error) {
        Logger.error('Error creating notification:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    Logger.error('Error in createNotification:', error);
    return false;
  }
};

/**
 * Send push notification to a specific user.
 *
 * Remote delivery is intentionally NOT client-triggerable: there is no
 * client-callable push Edge Function (any authenticated user could otherwise
 * spam arbitrary users). Rows written here are picked up by server-side
 * delivery (scheduled jobs / triggers holding the recipient's Expo push
 * token). This helper therefore records the notification and reports success
 * when the row lands.
 */
export const sendPushToUser = async (
  userId: string,
  data: NotificationData
): Promise<boolean> => {
  return createNotification(userId, data);
};

// Helper function
const mapDbNotification = (dbNotification: Record<string, unknown>): StoredNotification => ({
  id: dbNotification.id as string,
  userId: dbNotification.user_id as string,
  type: dbNotification.type as string,
  title: dbNotification.title as string,
  message: dbNotification.message as string,
  data: dbNotification.data as Record<string, unknown>,
  isRead: dbNotification.is_read as boolean,
  createdAt: new Date(dbNotification.created_at as string),
});
