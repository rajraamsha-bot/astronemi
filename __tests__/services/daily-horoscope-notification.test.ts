/**
 * Daily Horoscope Notification Service Tests
 */

import DailyHoroscopeService, {
  generateDailyHoroscope,
  generateAllDailyHoroscopes,
  scheduleDailyHoroscopeNotifications,
} from '@/services/daily-horoscope-notification';

jest.mock('@/utils/hindu-calendar-engine', () => ({
  computePanchang: jest.fn(() => ({
    moonRashiName: 'Vrishabha',
    tithiName: 'Shukla Pratipada',
    paksha: 'Shukla',
    nakshatraName: 'Krittika',
  })),
  RASHI_NAMES: [
    'Mesha', 'Vrishabha', 'Mithuna', 'Karka',
    'Simha', 'Kanya', 'Tula', 'Vrishchika',
    'Dhanu', 'Makara', 'Kumbha', 'Meena',
  ],
}));

jest.mock('@/utils/ephemeris', () => ({
  Body: { Sun: 0, Moon: 1, Mars: 2, Mercury: 3, Jupiter: 4, Venus: 5, Saturn: 6 },
  getSunPosition: jest.fn(() => ({ longitude: 45.5, speed: 1.0 })),
  getMoonPosition: jest.fn(() => ({ longitude: 120.0, speed: 12.0 })),
  getPlanetLongitude: jest.fn((_body, _jd) => ({ longitude: 200.0, speed: 1.0 })),
  getRahuLongitude: jest.fn((_jd) => 80.0),
  tropicalToSidereal: jest.fn((lon) => lon - 24.0),
  calculateJulianDay: jest.fn(() => 2460000.5),
  getLahiriAyanamsa: jest.fn(() => 24.0),
}));

jest.mock('@/services/push-notification-service', () => ({
  scheduleNotification: jest.fn(),
}));

describe('Daily Horoscope Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDailyHoroscope', () => {
    it('should generate horoscope for a given sign index', () => {
      const horoscope = generateDailyHoroscope(0, new Date('2024-06-15'));

      expect(horoscope.signIndex).toBe(0);
      expect(horoscope.sign).toBe('Mesha');
      expect(horoscope.prediction).toBeTruthy();
      expect(typeof horoscope.luckyNumber).toBe('number');
      expect(horoscope.luckyNumber).toBeGreaterThanOrEqual(1);
      expect(horoscope.luckyNumber).toBeLessThanOrEqual(9);
      expect(horoscope.luckyColor).toBeTruthy();
      expect(['career', 'love', 'health', 'finance']).toContain(horoscope.focusArea);
      expect(horoscope.moonInRashi).toBe('Vrishabha');
      expect(horoscope.tithi).toContain('Shukla');
      expect(horoscope.nakshatra).toBe('Krittika');
    });

    it('should generate deterministic predictions for the same date and sign', () => {
      const date = new Date('2024-06-15');
      const h1 = generateDailyHoroscope(0, date);
      const h2 = generateDailyHoroscope(0, date);

      expect(h1.prediction).toBe(h2.prediction);
      expect(h1.luckyNumber).toBe(h2.luckyNumber);
      expect(h1.focusArea).toBe(h2.focusArea);
    });

    it('should generate different predictions for different signs on same date', () => {
      const date = new Date('2024-06-15');
      const h1 = generateDailyHoroscope(0, date);
      const h2 = generateDailyHoroscope(1, date);

      expect(h1.sign).not.toBe(h2.sign);
    });

    it('should generate different predictions for different dates with same sign', () => {
      const h1 = generateDailyHoroscope(0, new Date('2024-06-15'));
      const h2 = generateDailyHoroscope(0, new Date('2024-06-16'));

      expect(h1.luckyColor).not.toBe(h2.luckyColor); // different day of week
    });

    it('should handle all 12 signs', () => {
      const date = new Date('2024-06-15');
      for (let i = 0; i < 12; i++) {
        const h = generateDailyHoroscope(i, date);
        expect(h.signIndex).toBe(i);
        expect(h.prediction).toBeTruthy();
      }
    });
  });

  describe('generateAllDailyHoroscopes', () => {
    it('should generate horoscopes for all 12 signs', () => {
      const all = generateAllDailyHoroscopes(new Date('2024-06-15'));

      expect(all).toHaveLength(12);
      all.forEach((h, i) => {
        expect(h.signIndex).toBe(i);
      });
    });
  });

  describe('scheduleDailyHoroscopeNotifications', () => {
    it('should schedule notification without error', async () => {
      await expect(scheduleDailyHoroscopeNotifications('06:00')).resolves.not.toThrow();
    });

    it('should use default time when not provided', async () => {
      await expect(scheduleDailyHoroscopeNotifications()).resolves.not.toThrow();
    });
  });

  describe('DailyHoroscopeService default export', () => {
    it('should export all functions', () => {
      expect(DailyHoroscopeService.generateDailyHoroscope).toBe(generateDailyHoroscope);
      expect(DailyHoroscopeService.scheduleDailyHoroscopeNotifications).toBe(scheduleDailyHoroscopeNotifications);
      expect(DailyHoroscopeService.generateAllDailyHoroscopes).toBe(generateAllDailyHoroscopes);
    });
  });
});
