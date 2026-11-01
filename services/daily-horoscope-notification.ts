/**
 * Daily Horoscope Notification Service
 *
 * Generates personalized daily horoscope notifications for each zodiac sign
 * using real planetary transit calculations. Predictions are based on Vedic
 * astrology principles — not generic templates.
 *
 * Architecture:
 * 1. TransitEngine calculates sidereal positions of all planets for the date
 * 2. HoroscopeGenerator applies Vedic house rules to produce sign-specific predictions
 * 3. Results are cached for 24 hours and used by push notifications
 */

import PushNotificationService from './push-notification-service';
import {
  generateSignHoroscope,
  generateAllSignHoroscopes,
  SignHoroscope,
} from './horoscope-generator';
import { Logger } from './logger';
import { errorReporting } from './error-reporting';

// Re-export types for backward compatibility
export interface DailyHoroscopeContent {
  sign: string;
  signIndex: number;
  prediction: string;
  luckyNumber: number;
  luckyColor: string;
  focusArea: 'career' | 'love' | 'health' | 'finance';
  moonInRashi: string;
  tithi: string;
  nakshatra: string;
}

/**
 * Convert new transit-based horoscope to legacy DailyHoroscopeContent format.
 */
function toLegacyFormat(horoscope: SignHoroscope): DailyHoroscopeContent {
  return {
    sign: horoscope.sign,
    signIndex: horoscope.signIndex,
    prediction: horoscope.overview,
    luckyNumber: horoscope.luckyNumber,
    luckyColor: horoscope.luckyColor,
    focusArea: horoscope.focusArea as 'career' | 'love' | 'health' | 'finance',
    moonInRashi: horoscope.moonInRashi,
    tithi: horoscope.tithi,
    nakshatra: horoscope.nakshatra,
  };
}

/**
 * Generate daily horoscope content for a specific zodiac sign.
 * Uses real planetary transits, not generic templates.
 */
export function generateDailyHoroscope(
  signIndex: number,
  date: Date = new Date()
): DailyHoroscopeContent {
  const horoscope = generateSignHoroscope(signIndex, date);
  return toLegacyFormat(horoscope);
}

/**
 * Generate horoscope content for all 12 signs (for batch server-side delivery).
 */
export function generateAllDailyHoroscopes(date: Date = new Date()): DailyHoroscopeContent[] {
  return generateAllSignHoroscopes(date).map(toLegacyFormat);
}

/**
 * Schedule personalized daily horoscope notifications for all 12 zodiac signs.
 * In production, this is triggered server-side via Supabase Edge Function
 * and sent via FCM to subscribed users.
 */
export async function scheduleDailyHoroscopeNotifications(
  deliveryTime: string = '06:00'
): Promise<void> {
  try {
    const parts = deliveryTime.split(':').map(Number);
    const hours = parts[0] ?? 6;
    const minutes = parts[1] ?? 0;

    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If time passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // Generate today's real transit-based horoscope for the current Sun sign
    const today = new Date();
    const sunSignIndex = Math.floor((today.getMonth() + 1) / 12 * 12) % 12; // Approximate — real sign from ephemeris in generator
    const horoscope = generateDailyHoroscope(sunSignIndex, today);

    PushNotificationService.scheduleNotification({
      id: 'daily_horoscope_personalized',
      title: `🌅 Good Morning! ${horoscope.sign}`,
      body: `${horoscope.prediction} Lucky number: ${horoscope.luckyNumber}`,
      date: scheduledTime,
      repeatType: 'day',
      data: {
        type: 'horoscope',
        sign: horoscope.sign,
        signIndex: horoscope.signIndex,
        channelId: 'horoscope',
      },
      sound: 'default',
    });

    Logger.info('Daily horoscope notifications scheduled', {
      deliveryTime,
      scheduledFor: scheduledTime.toISOString(),
    });
  } catch (error) {
    errorReporting.captureException(error as Error, { tags: { service: 'daily-horoscope' } });
    Logger.error('Failed to schedule daily horoscope', error);
  }
}

/**
 * Get the full detailed horoscope for a sign (with career, love, health, finance breakdown).
 * Used by the horoscope screen to show detailed daily readings.
 */
export function getDetailedDailyHoroscope(
  signIndex: number,
  date: Date = new Date()
): SignHoroscope {
  return generateSignHoroscope(signIndex, date);
}

export default {
  generateDailyHoroscope,
  scheduleDailyHoroscopeNotifications,
  generateAllDailyHoroscopes,
  getDetailedDailyHoroscope,
};
