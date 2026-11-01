import {
  calculateJulianDay,
  calculateSunPosition,
  calculateMoonPosition,
  calculateMercuryPosition,
  calculateJupiterPosition,
  calculateAyanamsa,
  DateTime
} from '../astronomy';

describe('Astronomy Engine Precision Audit', () => {
  // Calibration Date: Jan 1, 2024, 00:00:00 UTC
  // Data retrieved from NASA JPL Horizons / Swiss Ephemeris
  const testDate: DateTime = {
    year: 2024,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0
  };
  const jd = calculateJulianDay(testDate, 0); // UTC
  const T = (jd - 2451545.0) / 36525.0;

  test('Sun Position Accuracy (Sayana)', () => {
    const sun = calculateSunPosition(T);
    // Expected: ~280.12° (Capricorn)
    const expected = 280.12;
    const diff = Math.abs(sun.longitude - expected);
    console.log(`Sun Precision: ${sun.longitude.toFixed(4)} vs ${expected} (Error: ${diff.toFixed(4)}°)`);
    expect(diff).toBeLessThan(0.1); // Within 6 arc-minutes
  });

  test('Moon Position Accuracy (Sayana - ELP2000)', () => {
    const moon = calculateMoonPosition(T);
    // Expected: ~156.01° (Virgo) - Verified with Swiss Ephemeris
    const expected = 156.01;
    const diff = Math.abs(moon.longitude - expected);
    console.log(`Moon Precision: ${moon.longitude.toFixed(4)} vs ${expected} (Error: ${diff.toFixed(4)}°)`);
    // High-precision ELP2000 with 60 terms should be within 0.05 degrees
    expect(diff).toBeLessThan(0.05); 
    // Verify moon longitude is in valid range
    expect(moon.longitude).toBeGreaterThanOrEqual(0);
    expect(moon.longitude).toBeLessThan(360);
  });

  test('Lahiri Ayanamsa Calibration', () => {
    const ayanamsa = calculateAyanamsa(jd, 'lahiri');
    // For 2024, Lahiri is approx 24.1917°
    const expected = 24.1917;
    const diff = Math.abs(ayanamsa - expected);
    console.log(`Ayanamsa Precision: ${ayanamsa.toFixed(4)} vs ${expected} (Error: ${diff.toFixed(4)}°)`);
    expect(diff).toBeLessThan(0.01); // Within 36 arc-seconds
  });

  test('Mercury Position Accuracy (Sayana)', () => {
    const mercury = calculateMercuryPosition(T);
    // Expected: ~262.13° (Sagittarius)
    const expected = 262.13;
    const diff = Math.abs(mercury.longitude - expected);
    console.log(`Mercury Precision: ${mercury.longitude.toFixed(4)} vs ${expected} (Error: ${diff.toFixed(4)}°)`);
    // Planetary precision with orbital elements should be within 0.5 degrees
    expect(diff).toBeLessThan(0.5);
  });

  test('Jupiter Position Accuracy (Sayana)', () => {
    const jupiter = calculateJupiterPosition(T);
    // Expected: ~35.56° (Taurus)
    const expected = 35.56;
    const diff = Math.abs(jupiter.longitude - expected);
    console.log(`Jupiter Precision: ${jupiter.longitude.toFixed(4)} vs ${expected} (Error: ${diff.toFixed(4)}°)`);
    // Jupiter requires Great Inequality correction, expect < 0.5 degrees
    expect(diff).toBeLessThan(0.5);
  });

  test('Retrograde Logic Validation', () => {
    // Mercury was Retrograde on Jan 1, 2024
    const mercury = calculateMercuryPosition(T);
    
    console.log(`Mercury Speed: ${mercury.speed.toFixed(2)} deg/day`);
    // We expect the speed to be negative (retrograde)
    expect(mercury.speed).toBeLessThan(0);
  });
});
