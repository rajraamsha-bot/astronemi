/**
 * Push Notification Service - Expo Notifications Only
 *
 * This service uses ONLY `expo-notifications` (the only push-notification
 * library actually installed in package.json). The previous version
 * referenced `react-native-push-notification` and `@react-native-firebase/messaging`
 * but those packages were NOT installed, so the old code's try/catch
 * silently swallowed the failures and no notifications were ever sent.
 *
 * Setup:
 *   1. Run `eas build:configure` to set up EAS
 *   2. Configure APNs (iOS) and FCM (Android) via EAS
 *   3. Set EXPO_PUBLIC_EAS_PROJECT_ID in your .env
 *   4. The Expo push token is automatically stored in the push_tokens
 *      table by saveExpoPushToken().
 *
 * To send a push from your server:
 *   POST https://exp.host/--/api/v2/push/send
 *   { "to": "<expo push token>", "title": "...", "body": "..." }
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Logger } from '@/services/logger';
import { errorReporting } from '@/services/error-reporting';
import { computeMuhurtas } from '@/utils/hindu-calendar-engine';
import { prefixedSecureId } from '@/utils/secure-random';

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'high' | 'normal' | 'low';
  imageUrl?: string;
}

export interface ScheduledNotification extends NotificationPayload {
  date: Date;
  repeatType?: 'day' | 'week' | 'month' | 'year';
}

export interface NotificationPreferences {
  dailyHoroscope: boolean;
  dailyHoroscopeTime: string;
  transitAlerts: boolean;
  muhuratReminders: boolean;
  festivalNotifications: boolean;
  consultationReminders: boolean;
  promotionalMessages: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const PREFERENCES_KEY = '@notification_preferences';
const EXPO_PUSH_TOKEN_KEY = '@expo_push_token';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolve the EAS project id from the app config (or an explicit env
 * override). expo-notifications rejects a placeholder/non-UUID value, so
 * returning null here keeps startup quiet until `eas init` has run.
 */
function resolveEasProjectId(): string | null {
  const candidate =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof candidate !== 'string' || !UUID_RE.test(candidate)) return null;
  return candidate;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  dailyHoroscope: true,
  dailyHoroscopeTime: '07:00',
  transitAlerts: true,
  muhuratReminders: true,
  festivalNotifications: true,
  consultationReminders: true,
  promotionalMessages: false,
  soundEnabled: true,
  vibrationEnabled: true,
};

// Configure notification handler at module load.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const PushNotificationService = {
  async initialize(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('horoscope', {
          name: 'Daily Horoscope',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
        });
        await Notifications.setNotificationChannelAsync('transit', {
          name: 'Transit Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
        });
        await Notifications.setNotificationChannelAsync('muhurat', {
          name: 'Muhurat Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });
        await Notifications.setNotificationChannelAsync('festival', {
          name: 'Festival Notifications',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
        await Notifications.setNotificationChannelAsync('consultation', {
          name: 'Consultation Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });
        await Notifications.setNotificationChannelAsync('promotional', {
          name: 'Promotional Messages',
          importance: Notifications.AndroidImportance.LOW,
        });
      }

      const { status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
        android: { allowAlert: true, allowBadge: true, allowSound: true },
      });

      if (status !== 'granted') {
        Logger.warn('Push notification permission not granted');
        return;
      }

      // Capture the Expo push token
      const projectId = resolveEasProjectId();
      if (!projectId) {
        Logger.warn(
          'Expo push token not captured: EAS projectId is missing or still a placeholder. ' +
          'Run "eas init" and set expo.extra.eas.projectId.'
        );
      } else {
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          await this.saveExpoPushToken(tokenData.data);
        } catch (e) {
          Logger.warn('Could not capture Expo push token', {
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      await this.loadPreferences();
      Logger.info('Push notification service initialized');
    } catch (error) {
      errorReporting.captureException(error as Error, {
        tags: { service: 'push-notifications' },
      });
      Logger.error('Failed to initialize push notifications', error);
    }
  },

  async saveExpoPushToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token);

      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Respect a previously saved opt-out when re-registering a token.
      const preferences = await this.loadPreferences();

      const { error: tokenError } = await supabase.from('push_tokens').upsert(
        { user_id: user.id, token, platform: 'expo', is_active: true },
        { onConflict: 'user_id,token' }
      );
      if (tokenError) {
        Logger.warn('Failed to persist push token', { error: tokenError.message });
        return;
      }

      // daily-horoscope reads horoscope_subscriptions (zodiac-scoped), not
      // push_tokens. Write the same Expo token there so the server can target
      // the user's sign instead of silently sending to an empty FCM registry.
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('zodiac_sign')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) {
        Logger.warn('Failed to read zodiac sign for horoscope push', {
          error: profileError.message,
        });
        return;
      }
      if (!profile?.zodiac_sign) return;

      const { error: subscriptionError } = await supabase
        .from('horoscope_subscriptions')
        .upsert(
          {
            user_id: user.id,
            zodiac_sign: profile.zodiac_sign,
            push_token: token,
            platform: Platform.OS,
            is_active: preferences.dailyHoroscope,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,zodiac_sign' }
        );
      if (subscriptionError) {
        Logger.warn('Failed to persist horoscope subscription token', {
          error: subscriptionError.message,
        });
      }
    } catch (error) {
      Logger.error('Error saving Expo push token', error);
    }
  },

  async getExpoPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: payload.id,
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: payload.sound === null ? undefined : payload.sound || 'default',
        },
        trigger: null,
      });
    } catch (error) {
      Logger.error('Error showing local notification', error);
    }
  },

  async scheduleNotification(notification: ScheduledNotification): Promise<void> {
    try {
      const channelId = (notification.data?.channelId as string) || 'default';
      await Notifications.scheduleNotificationAsync({
        identifier: notification.id,
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: notification.sound === null ? undefined : notification.sound || 'default',
        },
        trigger: { date: notification.date, channelId },
      });
    } catch (error) {
      Logger.error('Error scheduling notification', error);
    }
  },

  async cancelNotification(id: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (error) {
      Logger.error('Error canceling notification', error);
    }
  },

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      Logger.error('Error canceling all notifications', error);
    }
  },

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch {
      return [];
    }
  },

  /**
   * Route the user to the right screen when they tap a notification.
   * Uses expo-router. Failure here is non-fatal.
   */
  handleNotificationAction(data: Record<string, unknown>): void {
    const type = data.type as string | undefined;
    const consultationId = data.consultationId as string | undefined;
    const astrologerId = data.astrologerId as string | undefined;
    import('expo-router')
      .then(({ router }) => {
        switch (type) {
          case 'horoscope':
          case 'transit':
          case 'muhurat':
            router.push('/(tabs)/horoscope');
            break;
          case 'festival':
            router.push('/event-calendar');
            break;
          case 'consultation':
            router.push(consultationId ? `/consultation/${consultationId}` : '/(tabs)/astrologers');
            break;
          case 'chat':
            router.push(astrologerId ? `/chat/${astrologerId}` : '/(tabs)/astrologers');
            break;
          case 'wallet':
            router.push('/wallet');
            break;
          case 'subscription':
            router.push('/subscription');
            break;
          default:
            router.push('/(tabs)');
        }
      })
      .catch((err: unknown) => {
        Logger.error('Failed to navigate from notification', err);
      });
  },

  async loadPreferences(): Promise<NotificationPreferences> {
    try {
      const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (raw) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
      }
    } catch (error) {
      Logger.error('Error loading notification preferences', error);
    }
    return DEFAULT_PREFERENCES;
  },

  async savePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
      await this.updateScheduledNotifications(preferences);

      // Mirror the daily-horoscope opt-out to the server; otherwise
      // daily-horoscope keeps pushing to every active subscription.
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('horoscope_subscriptions')
            .update({ is_active: preferences.dailyHoroscope })
            .eq('user_id', user.id);
          if (error) {
            Logger.warn('Failed to sync horoscope preference', { error: error.message });
          }
        }
      } catch (syncError) {
        Logger.warn('Failed to sync horoscope preference', {
          error: syncError instanceof Error ? syncError.message : String(syncError),
        });
      }
    } catch (error) {
      Logger.error('Error saving notification preferences', error);
    }
  },

  async updateScheduledNotifications(preferences: NotificationPreferences): Promise<void> {
    // Only replace the daily-horoscope notification. Cancelling ALL scheduled
    // notifications here would silently wipe transit alerts, muhurat reminders,
    // consultation reminders and cosmic-window schedules on this device every
    // time any preference is saved.
    await this.cancelNotification('daily_horoscope');
    if (preferences.dailyHoroscope) {
      await this.scheduleDailyHoroscopeNotification(preferences.dailyHoroscopeTime);
    }
  },

  async scheduleDailyHoroscopeNotification(time: string): Promise<void> {
    const parts = time.split(':').map(Number);
    const hours = parts[0] ?? 7;
    const minutes = parts[1] ?? 0;
    const when = new Date();
    when.setHours(hours, minutes, 0, 0);
    if (when <= new Date()) {
      when.setDate(when.getDate() + 1);
    }
    await this.scheduleNotification({
      id: 'daily_horoscope',
      title: '🌟 आज का राशिफल',
      body: 'आज का दिन कैसा रहेगा? जानें अपना राशिफल!',
      date: when,
      data: { type: 'horoscope', channelId: 'horoscope' },
      sound: 'default',
    });
  },

  scheduleTransitAlert(planet: string, sign: string, date: Date): void {
    void this.scheduleNotification({
      id: `transit_${planet}_${date.getTime()}`,
      title: `🪐 ${planet} Transit Alert`,
      body: `${planet} is moving into ${sign}. Check your transit predictions!`,
      date,
      data: { type: 'transit', planet, sign, channelId: 'transit' },
      sound: 'default',
    });
  },

  scheduleMuhuratReminder(muhuratType: string, date: Date, time: string): void {
    void this.scheduleNotification({
      id: `muhurat_${muhuratType}_${date.getTime()}`,
      title: '⏰ शुभ मुहूर्त स्मरण',
      body: `${muhuratType} का शुभ मुहूर्त ${time} से शुरू हो रहा है।`,
      date,
      data: { type: 'muhurat', muhuratType, channelId: 'muhurat' },
      sound: 'default',
    });
  },

  scheduleConsultationReminder(consultationId: string, astrologerName: string, date: Date): void {
    const reminderDate = new Date(date.getTime() - 30 * 60 * 1000);
    void this.scheduleNotification({
      id: `consultation_${consultationId}`,
      title: '📞 Upcoming Consultation',
      body: `Your consultation with ${astrologerName} starts in 30 minutes.`,
      date: reminderDate,
      data: { type: 'consultation', consultationId, channelId: 'consultation' },
      sound: 'default',
    });
  },

  sendPromotionalNotification(title: string, body: string, data?: Record<string, unknown>): void {
    void this.showLocalNotification({
      id: prefixedSecureId('promo', 8),
      title,
      body,
      data: { ...data, type: 'promotional', channelId: 'promotional' },
    });
  },

  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  },

  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  // ─── Astrology-specific helpers (formerly NotificationManager) ───

  /**
   * Schedule daily cosmic windows (Abhijit, Rahu Kaal, Brahma Muhurat)
   * for the user's location. Formerly in NotificationManager.
   */
  async scheduleDailyCosmicWindows(
    latitude: number = 28.6139,
    longitude: number = 77.209
  ): Promise<void> {
    try {
      const now = new Date();
      const timings = computeMuhurtas(now, latitude, longitude);

      if (timings.abhijit[0] > now) {
        await this.scheduleNotification({
          id: 'muhurat_abhijit',
          title: '🌟 Your Lucky Window Starts Now!',
          body: 'Abhijit Muhurat is active. A perfect time for new beginnings.',
          date: timings.abhijit[0],
          data: { type: 'muhurat', muhuratType: 'Abhijit', channelId: 'muhurat' },
          sound: 'default',
        });
      }

      if (timings.rahuKaal[0] > now) {
        await this.scheduleNotification({
          id: 'muhurat_rahu',
          title: '⚠️ Rahu Kaal Starting',
          body: 'A period of caution for the next 90 minutes. Avoid major financial starts.',
          date: timings.rahuKaal[0],
          data: { type: 'muhurat', muhuratType: 'Rahu Kaal', channelId: 'muhurat' },
          sound: 'default',
        });
      }

      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      const tomorrowTimings = computeMuhurtas(tomorrow, latitude, longitude);
      await this.scheduleNotification({
        id: 'muhurat_brahma',
        title: '🧘 Morning Peace (Brahma Muhurat)',
        body: 'The most sacred time for meditation begins now.',
        date: tomorrowTimings.brahma[0],
        data: { type: 'muhurat', muhuratType: 'Brahma', channelId: 'muhurat' },
        sound: 'default',
      });

      Logger.info('✅ Daily cosmic windows scheduled successfully.');
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { service: 'notifications' } });
      Logger.error('Failed to schedule daily windows:', error);
    }
  },

  async scheduleMajorTransitAlert(planet: string, sign: string, date: Date): Promise<void> {
    try {
      this.scheduleTransitAlert(planet, sign, date);
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { service: 'notifications' } });
    }
  },
};

// Default export for backward compat with NotificationManager
export const NotificationManager = PushNotificationService;

export default PushNotificationService;
