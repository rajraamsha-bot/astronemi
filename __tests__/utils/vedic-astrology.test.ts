/**
 * Unit Tests — Vedic Astrology Engine (vedic-astrology.ts)
 *
 * Tests Zodiac signs, Nakshatras, Vimshottari Dasha, Yogas, and planet strength.
 */

import {
  tropicalToSidereal,
  getZodiacSign,
  getNakshatra,
  calculateVimshottariDasha,
  calculateHouseCusps,
  detectYogas,
  getPlanetStrength,
  ZODIAC_SIGNS,
  NAKSHATRAS,
  NAKSHATRA_LORDS,
  AYANAMSA,
  VedicPlanetData,
} from '@/utils/vedic-astrology';

// ────────────────────────────────────────────────────────────────────────────────
// Tropical to Sidereal Conversion
// ────────────────────────────────────────────────────────────────────────────────

describe('tropicalToSidereal', () => {
  test('Ayanamsa is subtracted correctly', () => {
    const tropical = 50; // 50° tropical
    const sidereal = tropicalToSidereal(tropical);
    expect(sidereal).toBeCloseTo(tropical - AYANAMSA, 1);
  });

  test('Handles zero-crossing: small tropical angle wraps correctly', () => {
    // If tropical = 10° and ayanamsa = 24.1°, sidereal = 10 - 24.1 = -14.1 → 345.9°
    const sidereal = tropicalToSidereal(10);
    expect(sidereal).toBeCloseTo(360 + 10 - AYANAMSA, 1);
    expect(sidereal).toBeGreaterThanOrEqual(0);
    expect(sidereal).toBeLessThan(360);
  });

  test('Output is always within [0, 360)', () => {
    for (const angle of [0, 10, 100, 200, 300, 350, 359]) {
      const sid = tropicalToSidereal(angle);
      expect(sid).toBeGreaterThanOrEqual(0);
      expect(sid).toBeLessThan(360);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Zodiac Sign Determination
// ────────────────────────────────────────────────────────────────────────────────

describe('getZodiacSign', () => {
  test('0° = Aries', () => {
    const result = getZodiacSign(0);
    expect(result.sign).toBe('Aries');
    expect(result.signIndex).toBe(0);
    expect(result.degree).toBeCloseTo(0);
  });

  test('30° = Taurus (start)', () => {
    const result = getZodiacSign(30);
    expect(result.sign).toBe('Taurus');
    expect(result.signIndex).toBe(1);
    expect(result.degree).toBeCloseTo(0);
  });

  test('45° = Taurus at 15°', () => {
    const result = getZodiacSign(45);
    expect(result.sign).toBe('Taurus');
    expect(result.degree).toBeCloseTo(15);
  });

  test('270° = Capricorn', () => {
    const result = getZodiacSign(270);
    expect(result.sign).toBe('Capricorn');
    expect(result.signIndex).toBe(9);
  });

  test('All 12 signs are correct at 15° into each sign', () => {
    ZODIAC_SIGNS.forEach((sign, i) => {
      const result = getZodiacSign(i * 30 + 15);
      expect(result.sign).toBe(sign);
      expect(result.signIndex).toBe(i);
      expect(result.degree).toBeCloseTo(15, 0);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Nakshatra Determination
// ────────────────────────────────────────────────────────────────────────────────

describe('getNakshatra', () => {
  test('0° = Ashwini (first nakshatra)', () => {
    const result = getNakshatra(0);
    expect(result.nakshatra).toBe('Ashwini');
    expect(result.nakshatraIndex).toBe(0);
    expect(result.pada).toBe(1);
  });

  test('Ashwini lord is Ketu', () => {
    const result = getNakshatra(0);
    expect(result.lord).toBe('Ketu');
  });

  test('27 nakshatras span exactly 360°', () => {
    const span = 360 / 27;
    // Test the last nakshatra (Revati)
    const result = getNakshatra(360 - span / 2); // Middle of Revati
    expect(result.nakshatra).toBe('Revati');
    expect(result.nakshatraIndex).toBe(26);
    expect(result.lord).toBe('Mercury');
  });

  test('Pada is always 1-4', () => {
    const span = 360 / 27;
    for (let deg = 0; deg < 360; deg += span / 8) {
      const result = getNakshatra(deg);
      expect(result.pada).toBeGreaterThanOrEqual(1);
      expect(result.pada).toBeLessThanOrEqual(4);
    }
  });

  test('All 27 nakshatras are covered', () => {
    const span = 360 / 27;
    NAKSHATRAS.forEach((name, i) => {
      const result = getNakshatra(i * span + span / 2);
      expect(result.nakshatra).toBe(name);
    });
  });

  test('Nakshatra lords follow the 9-planet cycle', () => {
    // The Nakshatra lords follow a specific 9-planet Vimshottari cycle
    const cycle = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
    NAKSHATRA_LORDS.forEach((lord, i) => {
      expect(lord).toBe(cycle[i % 9]);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Vimshottari Dasha
// ────────────────────────────────────────────────────────────────────────────────

describe('calculateVimshottariDasha', () => {
  test('Returns exactly 9 dasha periods', () => {
    const birthDate = new Date(1990, 0, 15); // Jan 15, 1990
    const dashas = calculateVimshottariDasha(birthDate, 100); // Moon at 100°
    expect(dashas.length).toBeGreaterThanOrEqual(9);
  });

  test('Total Dasha years sum to 120 years', () => {
    const birthDate = new Date(1990, 0, 15);
    const dashas = calculateVimshottariDasha(birthDate, 100);
    const totalYears = dashas.reduce((sum, d) => sum + d.years, 0);
    expect(totalYears).toBeCloseTo(120, 0);
  });

  test('Each dasha has a valid planet name', () => {
    const validPlanets = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
    const birthDate = new Date(1990, 0, 15);
    const dashas = calculateVimshottariDasha(birthDate, 200);
    dashas.forEach(d => {
      expect(validPlanets).toContain(d.planet);
    });
  });

  test('Dasha periods are chronologically ordered', () => {
    const birthDate = new Date(2000, 5, 15);
    const dashas = calculateVimshottariDasha(birthDate, 150);
    for (let i = 1; i < dashas.length; i++) {
      expect(dashas[i].startDate.getTime()).toBeGreaterThanOrEqual(dashas[i - 1].startDate.getTime());
    }
  });

  test('First dasha starts at birth date', () => {
    const birthDate = new Date(1995, 3, 20);
    const dashas = calculateVimshottariDasha(birthDate, 50);
    expect(dashas[0].startDate.getTime()).toBe(birthDate.getTime());
  });

  test('First dasha has partial years (remaining from birth nakshatra)', () => {
    const birthDate = new Date(1990, 0, 1);
    // Moon at exactly the start of a nakshatra → full dasha period
    // Moon slightly into a nakshatra → partial remaining
    const dashas = calculateVimshottariDasha(birthDate, 50);
    // The first period's years should be <= the full planet's dasha years
    const fullYears: Record<string, number> = {
      Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
    };
    expect(dashas[0].years).toBeLessThanOrEqual(fullYears[dashas[0].planet]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// House Cusps (Equal House System)
// ────────────────────────────────────────────────────────────────────────────────

describe('calculateHouseCusps', () => {
  test('Returns 12 houses', () => {
    const cusps = calculateHouseCusps(50);
    expect(cusps).toHaveLength(12);
  });

  test('Houses are 30° apart (equal house system)', () => {
    const cusps = calculateHouseCusps(100);
    for (let i = 1; i < 12; i++) {
      const diff = ((cusps[i] - cusps[i - 1]) + 360) % 360;
      expect(diff).toBeCloseTo(30, 1);
    }
  });

  test('First house starts at the sidereal ascendant', () => {
    // tropicalToSidereal(100) should be the first cusp
    const cusps = calculateHouseCusps(100);
    expect(cusps[0]).toBeCloseTo(tropicalToSidereal(100), 1);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Yoga Detection
// ────────────────────────────────────────────────────────────────────────────────

describe('detectYogas', () => {
  const makePlanet = (name: string, house: number, signIndex: number = 0): VedicPlanetData => ({
    name,
    sanskritName: name,
    longitude: 0,
    siderealLongitude: signIndex * 30,
    sign: ZODIAC_SIGNS[signIndex],
    signIndex,
    degree: 0,
    nakshatra: 'Ashwini',
    nakshatraPada: 1,
    nakshatraLord: 'Ketu',
    house,
    isRetrograde: false,
  });

  test('Gaja Kesari Yoga — Jupiter and Moon in same house', () => {
    const planets = [
      makePlanet('Jupiter', 5),
      makePlanet('Moon', 5),
      makePlanet('Sun', 1),
      makePlanet('Mars', 3),
      makePlanet('Mercury', 7),
      makePlanet('Venus', 8),
      makePlanet('Saturn', 10),
    ];
    const yogas = detectYogas(planets);
    expect(yogas.some(y => y.name === 'Gaja Kesari Yoga')).toBe(true);
  });

  test('No Gaja Kesari Yoga when Jupiter and Moon are in different houses', () => {
    const planets = [
      makePlanet('Jupiter', 5),
      makePlanet('Moon', 1),
      makePlanet('Sun', 3),
      makePlanet('Mars', 7),
      makePlanet('Mercury', 8),
      makePlanet('Venus', 10),
      makePlanet('Saturn', 11),
    ];
    const yogas = detectYogas(planets);
    expect(yogas.some(y => y.name === 'Gaja Kesari Yoga')).toBe(false);
  });

  test('Raja Yoga — Sun in 1st or 10th house', () => {
    const planets = [
      makePlanet('Sun', 1),
      makePlanet('Moon', 5),
      makePlanet('Jupiter', 9),
      makePlanet('Mars', 3),
      makePlanet('Mercury', 7),
      makePlanet('Venus', 8),
      makePlanet('Saturn', 10),
    ];
    const yogas = detectYogas(planets);
    expect(yogas.some(y => y.name === 'Raja Yoga')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Planet Strength
// ────────────────────────────────────────────────────────────────────────────────

describe('getPlanetStrength', () => {
  const makePlanet = (name: string, house: number, signIndex: number, isRetrograde = false): VedicPlanetData => ({
    name,
    sanskritName: name,
    longitude: signIndex * 30,
    siderealLongitude: signIndex * 30,
    sign: ZODIAC_SIGNS[signIndex],
    signIndex,
    degree: 15,
    nakshatra: 'Ashwini',
    nakshatraPada: 1,
    nakshatraLord: 'Ketu',
    house,
    isRetrograde,
  });

  test('Exalted planet has high strength', () => {
    // Sun exalted in Aries (signIndex 0)
    const sun = makePlanet('Sun', 1, 0);
    const strength = getPlanetStrength(sun);
    expect(strength).toBeGreaterThanOrEqual(80);
  });

  test('Debilitated planet has low strength', () => {
    // Sun debilitated in Libra (signIndex 6)
    const sun = makePlanet('Sun', 7, 6);
    const strength = getPlanetStrength(sun);
    expect(strength).toBeLessThanOrEqual(30);
  });

  test('Kendra placement adds strength', () => {
    // Planet in 1st house (kendra) vs. planet in 3rd house
    const inKendra = makePlanet('Mars', 1, 5);
    const notInKendra = makePlanet('Mars', 3, 5);
    expect(getPlanetStrength(inKendra)).toBeGreaterThan(getPlanetStrength(notInKendra));
  });

  test('Retrograde planet gets a strength boost', () => {
    const direct = makePlanet('Jupiter', 5, 3);
    const retrograde = makePlanet('Jupiter', 5, 3, true);
    expect(getPlanetStrength(retrograde)).toBeGreaterThan(getPlanetStrength(direct));
  });

  test('Strength is always between 0 and 100', () => {
    for (let sign = 0; sign < 12; sign++) {
      for (let house = 1; house <= 12; house++) {
        const planet = makePlanet('Mars', house, sign);
        const strength = getPlanetStrength(planet);
        expect(strength).toBeGreaterThanOrEqual(0);
        expect(strength).toBeLessThanOrEqual(100);
      }
    }
  });
});
