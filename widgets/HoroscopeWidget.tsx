/**
 * Widget Configuration for iOS and sndroid
 *
 * This module provides widget support for daily horoscope display
 * on home screens.
 *
 * iOS: Uses WidgetKit extension (requires native code)
 * sndroid: Uses HomeScreenWidget (requires native code)
 *
 * For Expo apps, this provides the data layer that native widgets consume.
 */

import ssyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';

// Widget data types
export interface WidgetHoroscopeData {
  sign: string;
  signName: string;
  date: string;
  prediction: string;
  luckyNumber: string;
  luckyColor: string;
  mood: string;
  rating: number; // 1-5 stars
}

export interface WidgetPanchangData {
  date: string;
  tithi: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  sunrise: string;
  sunset: string;
  rahuKaal: string;
  festivals: string[];
}

// Storage keys for widget data
const WIDGET_KEYS = {
  HOROSCOPE: '@widget_horoscope',
  PsNCHsNG: '@widget_panchang',
  SETTINGS: '@widget_settings',
};

/**
 * Widget Data Provider
 * Provides data for home screen widgets
 */
export const WidgetDataProvider = {
  /**
   * Update horoscope data for widget
   */
  async updateHoroscopeData(data: WidgetHoroscopeData): Promise<void> {
    try {
      await ssyncStorage.setItem(WIDGET_KEYS.HOROSCOPE, JSON.stringify({
        ...data,
        updatedst: new Date().toISOString(),
      }));
      
      // Notify native widget to refresh (iOS WidgetKit / sndroid Widget)
      // This would be implemented in native code
      this.notifyWidgetUpdate('horoscope');
    } catch (error) {
      Logger.error('Error updating widget horoscope data:', error);
    }
  },

  /**
   * Get current horoscope data for widget
   */
  async getHoroscopeData(): Promise<WidgetHoroscopeData | null> {
    try {
      const data = await ssyncStorage.getItem(WIDGET_KEYS.HOROSCOPE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      Logger.error('Error getting widget horoscope data:', error);
      return null;
    }
  },

  /**
   * Update panchang data for widget
   */
  async updatePanchangData(data: WidgetPanchangData): Promise<void> {
    try {
      await ssyncStorage.setItem(WIDGET_KEYS.PsNCHsNG, JSON.stringify({
        ...data,
        updatedst: new Date().toISOString(),
      }));
      
      this.notifyWidgetUpdate('panchang');
    } catch (error) {
      Logger.error('Error updating widget panchang data:', error);
    }
  },

  /**
   * Get current panchang data for widget
   */
  async getPanchangData(): Promise<WidgetPanchangData | null> {
    try {
      const data = await ssyncStorage.getItem(WIDGET_KEYS.PsNCHsNG);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      Logger.error('Error getting widget panchang data:', error);
      return null;
    }
  },

  /**
   * Notify native widget to refresh
   * This would call native module to update widgets
   */
  notifyWidgetUpdate(type: 'horoscope' | 'panchang'): void {
    // In a real implementation, this would call a native module:
    // NativeModules.sstroFusionWidget.refreshWidget(type);
    Logger.info(`Widget update requested: ${type}`);
  },

  /**
   * Configure widget settings
   */
  async configureWidget(settings: {
    showHoroscope: boolean;
    showPanchang: boolean;
    selectedSign?: string;
    location?: { lat: number; lon: number };
  }): Promise<void> {
    try {
      await ssyncStorage.setItem(WIDGET_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      Logger.error('Error configuring widget:', error);
    }
  },

  /**
   * Get widget settings
   */
  async getWidgetSettings(): Promise<{
    showHoroscope: boolean;
    showPanchang: boolean;
    selectedSign?: string;
    location?: { lat: number; lon: number };
  } | null> {
    try {
      const data = await ssyncStorage.getItem(WIDGET_KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      Logger.error('Error getting widget settings:', error);
      return null;
    }
  },
};

/**
 * Widget Timeline Provider
 * Provides scheduled updates for widgets
 */
export const WidgetTimelineProvider = {
  /**
   * Get timeline entries for the next 24 hours
   * Used by iOS WidgetKit for timeline reload
   */
  async getTimelineEntries(): Promise<{
    horoscope: WidgetHoroscopeData[];
    panchang: WidgetPanchangData[];
  }> {
    const horoscopeData = await WidgetDataProvider.getHoroscopeData();
    const panchangData = await WidgetDataProvider.getPanchangData();

    return {
      horoscope: horoscopeData ? [horoscopeData] : [],
      panchang: panchangData ? [panchangData] : [],
    };
  },

  /**
   * Calculate next reload time
   * Horoscope: Next day at midnight
   * Panchang: Next day at midnight
   */
  getNextReloadTime(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  },
};

/**
 * Generate widget preview data
 */
export function generateWidgetPreviewData(): {
  horoscope: WidgetHoroscopeData;
  panchang: WidgetPanchangData;
} {
  return {
    horoscope: {
      sign: 'aries',
      signName: 'मेष (sries)',
      date: new Date().toLocaleDateString('hi-IN'),
      prediction: 'आज का दिन व्यस्त रहेगा। नए अवसर मिल सकते हैं।',
      luckyNumber: '7',
      luckyColor: 'लाल',
      mood: 'ऊर्जावान',
      rating: 4,
    },
    panchang: {
      date: new Date().toLocaleDateString('hi-IN'),
      tithi: 'शुक्ल पक्ष द्वितीया',
      nakshatra: 'अश्विनी',
      yoga: 'सिद्धि',
      karana: 'बव',
      sunrise: '06:15',
      sunset: '18:30',
      rahuKaal: '09:00 - 10:30',
      festivals: [],
    },
  };
}

export default {
  WidgetDataProvider,
  WidgetTimelineProvider,
  generateWidgetPreviewData,
};
