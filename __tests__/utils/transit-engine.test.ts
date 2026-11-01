/**
 * Unit Tests — Transit Engine (transit-engine.ts)
 *
 * Tests transit position calculations, retrograde detection,
 * Sade Sati analysis, and double transit effects.
 */

import {
  calculateTransitPositions,
  analyzeSadeSati,
  analyzeDoubleTransit,
  generateTransitPredictions,
} from '@/utils/transit-engine';

// ────────────────────────────────────────────────────────────────────────────────
// Transit Position Calculations
// ────────────────────────────────────────────────────────────────────────────────

describe('calculateTransitPositions', () => {
  test('Returns exactly 9 planets', () => {
    const positions = calculateTransitPositions(new Date(2026, 1, 23));
    expect(positions).toHaveLength(9);
  });

  test('All planet names are present', () => {
    const positions = calculateTransitPositions(new Date(2026, 1, 23));
    const names = positions.map(p => p.planet);
    expect(names).toContain('Sun');
    expect(names).toContain('Moon');
    expect(names).toContain('Mars');
    expect(names).toContain('Mercury');
    expect(names).toContain('Jupiter');
    expect(names).toContain('Venus');
    expect(names).toContain('Saturn');
    expect(names).toContain('Rahu');
    expect(names).toContain('Ketu');
  });

  test('All longitudes are within 0-360°', () => {
    const dates = [
      new Date(2020, 0, 1),
      new Date(2026, 5, 15),
      new Date(2030, 11, 31),
    ];
    for (const date of dates) {
      const positions = calculateTransitPositions(date);
      for (const pos of positions) {
        expect(pos.longitude).toBeGreaterThanOrEqual(0);
        expect(pos.longitude).toBeLessThan(360);
      }
    }
  });

  test('Sign index is 0-11 for all planets', () => {
    const positions = calculateTransitPositions(new Date(2026, 1, 23));
    for (const pos of positions) {
      expect(pos.signIndex).toBeGreaterThanOrEqual(0);
      expect(pos.signIndex).toBeLessThanOrEqual(11);
    }
  });

  test('Rahu and Ketu are always retrograde', () => {
    const positions = calculateTransitPositions(new Date(2026, 1, 23));
    const rahu = positions.find(p => p.planet === 'Rahu');
    const ketu = positions.find(p => p.planet === 'Ketu');
    expect(rahu?.isRetrograde).toBe(true);
    expect(ketu?.isRetrograde).toBe(true);
  });

  test('Rahu and Ketu signs are 6 apart (180°)', () => {
    const positions = calculateTransitPositions(new Date(2026, 5, 15));
    const rahu = positions.find(p => p.planet === 'Rahu')!;
    const ketu = positions.find(p => p.planet === 'Ketu')!;
    const signDiff = Math.abs(rahu.signIndex - ketu.signIndex);
    expect(signDiff).toBe(6);
  });

  test('Sun never appears retrograde', () => {
    // Sun is never retrograde from geocentric perspective
    const testDates = [
      new Date(2020, 0, 1), new Date(2023, 3, 1),
      new Date(2026, 6, 1), new Date(2028, 9, 1),
    ];
    for (const date of testDates) {
      const positions = calculateTransitPositions(date);
      const sun = positions.find(p => p.planet === 'Sun');
      expect(sun?.isRetrograde).toBe(false);
    }
  });

  test('Moon never appears retrograde', () => {
    const testDates = [new Date(2020, 0, 1), new Date(2026, 6, 1)];
    for (const date of testDates) {
      const positions = calculateTransitPositions(date);
      const moon = positions.find(p => p.planet === 'Moon');
      expect(moon?.isRetrograde).toBe(false);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Retrograde Detection
// ────────────────────────────────────────────────────────────────────────────────

describe('Retrograde detection', () => {
  test('Mercury retrogrades at least once in a 365-day window', () => {
    // Mercury retrogrades 3-4 times per year
    let retrogradeFound = false;
    const startDate = new Date(2026, 0, 1);
    for (let day = 0; day < 365; day += 3) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      const positions = calculateTransitPositions(date);
      const mercury = positions.find(p => p.planet === 'Mercury');
      if (mercury?.isRetrograde) {
        retrogradeFound = true;
        break;
      }
    }
    expect(retrogradeFound).toBe(true);
  });

  test('Jupiter retrogrades for a portion of the year', () => {
    // Jupiter retrogrades for about 120 days per year
    let retroDays = 0;
    const startDate = new Date(2026, 0, 1);
    for (let day = 0; day < 365; day += 7) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      const positions = calculateTransitPositions(date);
      const jupiter = positions.find(p => p.planet === 'Jupiter');
      if (jupiter?.isRetrograde) retroDays += 7;
    }
    // Jupiter retrogrades ~30-35% of the year (typically 100-130 days)
    expect(retroDays).toBeGreaterThan(60);
    expect(retroDays).toBeLessThan(200);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Sade Sati Analysis
// ────────────────────────────────────────────────────────────────────────────────

describe('analyzeSadeSati', () => {
  test('Returns a valid phase or none', () => {
    const result = analyzeSadeSati(new Date(2026, 1, 23), 7); // Scorpio moon
    expect(['none', 'rising', 'peak', 'setting']).toContain(result.phase);
  });

  test('Phase description is always provided', () => {
    for (let moonSign = 0; moonSign < 12; moonSign++) {
      const result = analyzeSadeSati(new Date(2026, 1, 23), moonSign);
      expect(result.description).toBeTruthy();
      expect(typeof result.description).toBe('string');
    }
  });

  test('Is active is true only when phase is not none', () => {
    for (let moonSign = 0; moonSign < 12; moonSign++) {
      const result = analyzeSadeSati(new Date(2026, 1, 23), moonSign);
      if (result.phase === 'none') {
        expect(result.isActive).toBe(false);
      } else {
        expect(result.isActive).toBe(true);
      }
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Double Transit
// ────────────────────────────────────────────────────────────────────────────────

describe('analyzeDoubleTransit', () => {
  test('Returns Jupiter and Saturn sign info', () => {
    const result = analyzeDoubleTransit(new Date(2026, 1, 23), 0);
    expect(result.jupiterSign).toBeTruthy();
    expect(result.saturnSign).toBeTruthy();
    expect(typeof result.effect).toBe('string');
  });

  test('Aspected houses is an array', () => {
    const result = analyzeDoubleTransit(new Date(2026, 1, 23), 3);
    expect(Array.isArray(result.aspectedHouses)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Transit Predictions
// ────────────────────────────────────────────────────────────────────────────────

describe('generateTransitPredictions', () => {
  test('Returns an array of predictions', () => {
    const predictions = generateTransitPredictions(new Date(2026, 1, 23), 3, 0, 0);
    expect(Array.isArray(predictions)).toBe(true);
  });

  test('Predictions have required fields', () => {
    const predictions = generateTransitPredictions(new Date(2026, 1, 23), 3, 4, 4);
    if (predictions.length > 0) {
      const pred = predictions[0];
      expect(pred).toHaveProperty('date');
      expect(pred).toHaveProperty('planet');
      expect(pred).toHaveProperty('event');
      expect(pred).toHaveProperty('effect');
      expect(pred).toHaveProperty('duration');
      expect(pred).toHaveProperty('intensity');
    }
  });

  test('Predictions are sorted by intensity (descending)', () => {
    const predictions = generateTransitPredictions(new Date(2026, 0, 1), 6, 0, 0);
    for (let i = 1; i < predictions.length; i++) {
      // Either intensity decreases or, at same intensity, date increases
      expect(predictions[i].intensity).toBeLessThanOrEqual(predictions[i - 1].intensity);
    }
  });

  test('Maximum 20 predictions returned', () => {
    const predictions = generateTransitPredictions(new Date(2026, 0, 1), 12, 0, 0);
    expect(predictions.length).toBeLessThanOrEqual(20);
  });
});
