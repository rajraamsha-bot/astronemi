/**
 * Unit Tests — Core Astronomical Calculations (astronomy.ts)
 *
 * These tests validate against known astronomical values.
 * Reference sources: USNO, JPL Horizons, Meeus "Astronomical Algorithms"
 */

import {
  calculateJulianDay,
  calculateJulianCentury,
  calculateSunPosition,
  calculateMoonPosition,
  calculateMarsPosition,
  calculateJupiterPosition,
  calculateSaturnPosition,
  calculateRahuKetuPosition,
  calculateAscendant,
  calculateSiderealTime,
  DateTime,
  GeoLocation,
} from '@/utils/astronomy';

// ────────────────────────────────────────────────────────────────────────────────
// Julian Day Number Tests
// ────────────────────────────────────────────────────────────────────────────────

describe('calculateJulianDay', () => {
  test('J2000.0 epoch (2000-01-01 12:00 UT) → JD 2451545.0', () => {
    const dt: DateTime = { year: 2000, month: 1, day: 1, hour: 12, minute: 0, second: 0 };
    const jd = calculateJulianDay(dt, 0); // UTC
    expect(jd).toBeCloseTo(2451545.0, 1);
  });

  test('Known date: 1988-06-19 12:00 UT → JD ~2447332.0 (Meeus example)', () => {
    const dt: DateTime = { year: 1988, month: 6, day: 19, hour: 12, minute: 0, second: 0 };
    const jd = calculateJulianDay(dt, 0);
    expect(jd).toBeCloseTo(2447332.0, 1);
  });

  test('Timezone handling: IST (UTC+5.5) shifts JD earlier', () => {
    const dt: DateTime = { year: 2026, month: 2, day: 23, hour: 12, minute: 0, second: 0 };
    const jdUTC = calculateJulianDay(dt, 0);
    const jdIST = calculateJulianDay(dt, 5.5);
    // IST noon = 06:30 UT, so JD should be about 5.5/24 less
    expect(jdIST).toBeLessThan(jdUTC);
    expect(jdUTC - jdIST).toBeCloseTo(5.5 / 24, 3);
  });

  test('Gregorian calendar transition edge case (pre-1582 date)', () => {
    // JD for 1582-10-15 12:00 UT should be ~2299161.0
    const dt: DateTime = { year: 1582, month: 10, day: 15, hour: 12, minute: 0, second: 0 };
    const jd = calculateJulianDay(dt, 0);
    expect(jd).toBeCloseTo(2299161.0, 0);
  });
});

describe('calculateJulianCentury', () => {
  test('At J2000.0 epoch, T = 0', () => {
    expect(calculateJulianCentury(2451545.0)).toBeCloseTo(0.0, 6);
  });

  test('One century after J2000.0', () => {
    const jd = 2451545.0 + 36525.0; // 36525 days = 1 Julian century
    expect(calculateJulianCentury(jd)).toBeCloseTo(1.0, 6);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Planetary Position Tests
// ────────────────────────────────────────────────────────────────────────────────

describe('calculateSunPosition', () => {
  test('Sun longitude is within 0-360 range', () => {
    const T = 0; // J2000.0
    const pos = calculateSunPosition(T);
    expect(pos.longitude).toBeGreaterThanOrEqual(0);
    expect(pos.longitude).toBeLessThan(360);
  });

  test('Sun position at J2000.0 — should be near 280° (early Capricorn)', () => {
    const T = 0;
    const pos = calculateSunPosition(T);
    // At J2000.0 (Jan 1, 2000), Sun is at approximately 280.5° (tropical)
    expect(pos.longitude).toBeCloseTo(280.5, 0);
  });

  test('Sun at vernal equinox 2000 — should be near 0°', () => {
    // March 20, 2000, 07:35 UT — vernal equinox
    const dt: DateTime = { year: 2000, month: 3, day: 20, hour: 7, minute: 35, second: 0 };
    const jd = calculateJulianDay(dt, 0);
    const T = calculateJulianCentury(jd);
    const pos = calculateSunPosition(T);
    // Sun should be very close to 0° at vernal equinox
    expect(pos.longitude).toBeCloseTo(0, 0);
  });

  test('Sun speed is approximately 0.9856°/day', () => {
    const T = 0;
    const pos = calculateSunPosition(T);
    expect(pos.speed).toBeCloseTo(0.9856, 2);
  });
});

describe('calculateMoonPosition', () => {
  test('Moon longitude is within 0-360 range', () => {
    const T = 0;
    const pos = calculateMoonPosition(T);
    expect(pos.longitude).toBeGreaterThanOrEqual(0);
    expect(pos.longitude).toBeLessThan(360);
  });

  test('Moon speed is approximately 13.2°/day', () => {
    const T = 0;
    const pos = calculateMoonPosition(T);
    expect(pos.speed).toBeCloseTo(13.2, 0);
  });

  test('Moon latitude is within ±5.2°', () => {
    // Moon's maximum celestial latitude is about ±5.15°
    const T = 0;
    const pos = calculateMoonPosition(T);
    expect(Math.abs(pos.latitude)).toBeLessThan(6);
  });
});

describe('Outer planet positions', () => {
  test('Mars longitude is within 0-360 range', () => {
    const pos = calculateMarsPosition(0);
    expect(pos.longitude).toBeGreaterThanOrEqual(0);
    expect(pos.longitude).toBeLessThan(360);
  });

  test('Jupiter longitude is within 0-360 range', () => {
    const pos = calculateJupiterPosition(0);
    expect(pos.longitude).toBeGreaterThanOrEqual(0);
    expect(pos.longitude).toBeLessThan(360);
  });

  test('Saturn longitude is within 0-360 range', () => {
    const pos = calculateSaturnPosition(0);
    expect(pos.longitude).toBeGreaterThanOrEqual(0);
    expect(pos.longitude).toBeLessThan(360);
  });

  test('Rahu and Ketu are always exactly 180° apart', () => {
    for (const T of [-0.5, 0, 0.26, 0.5, 1.0]) {
      const { rahu, ketu } = calculateRahuKetuPosition(T);
      const diff = Math.abs(rahu.longitude - ketu.longitude);
      // Should be 180° (or 180 due to wrap-around)
      expect(diff).toBeCloseTo(180, 1);
    }
  });

  test('Rahu speed is negative (retrograde)', () => {
    const { rahu } = calculateRahuKetuPosition(0);
    expect(rahu.speed).toBeLessThan(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Ascendant and Sidereal Time Tests
// ────────────────────────────────────────────────────────────────────────────────

describe('calculateAscendant', () => {
  test('Ascendant is within 0-360 range', () => {
    const dt: DateTime = { year: 2000, month: 1, day: 1, hour: 12, minute: 0, second: 0 };
    const jd = calculateJulianDay(dt, 0);
    const location: GeoLocation = { latitude: 28.6139, longitude: 77.2090, timezone: 5.5 }; // Delhi
    const asc = calculateAscendant(jd, location);
    expect(asc).toBeGreaterThanOrEqual(0);
    expect(asc).toBeLessThan(360);
  });

  test('Ascendant changes with latitude', () => {
    const dt: DateTime = { year: 2026, month: 6, day: 15, hour: 6, minute: 0, second: 0 };
    const jd = calculateJulianDay(dt, 5.5);
    const delhiAsc = calculateAscendant(jd, { latitude: 28.6139, longitude: 77.209, timezone: 5.5 });
    const mumbaiAsc = calculateAscendant(jd, { latitude: 19.0760, longitude: 72.8777, timezone: 5.5 });
    // Different latitudes should yield different ascendants
    expect(delhiAsc).not.toBeCloseTo(mumbaiAsc, 0);
  });
});

describe('calculateSiderealTime', () => {
  test('GMST at J2000.0 epoch ≈ 280.46°', () => {
    const gmst = calculateSiderealTime(2451545.0, 0); // Greenwich
    expect(gmst).toBeCloseTo(280.46, 0);
  });

  test('LST increases with longitude', () => {
    const gmst = calculateSiderealTime(2451545.0, 0);
    const lst90 = calculateSiderealTime(2451545.0, 90);
    const diff = ((lst90 - gmst) + 360) % 360;
    expect(diff).toBeCloseTo(90, 0);
  });
});
