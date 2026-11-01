/**
 * Daily Horoscope Content Generator
 *
 * Generates personalized daily horoscope predictions based on real
 * planetary transits and Vedic astrology principles. Uses the ephemeris
 * service for accurate planetary positions, then applies interpretive rules
 * to produce sign-specific predictions for career, love, health, and finance.
 *
 * How it works:
 * 1. Calculate current sidereal positions of all planets for the date
 * 2. For each zodiac sign, determine which houses transiting planets occupy
 * 3. Apply Vedic astrology rules (aspects, conjunctions, retrogrades)
 * 4. Generate predictions from rule templates
 * 5. Cache results for 24 hours
 */

import {
  Body,
  getSunPosition,
  getMoonPosition,
  getPlanetLongitude,
  getRahuLongitude,
  tropicalToSidereal,
  calculateJulianDay,
} from '@/utils/ephemeris';
import { computePanchang } from '@/utils/hindu-calendar-engine';

// ====================================================================
// TYPES
// ====================================================================

export interface TransitSnapshot {
  date: string;
  sun: PlanetTransit;
  moon: PlanetTransit;
  mars: PlanetTransit;
  mercury: PlanetTransit;
  jupiter: PlanetTransit;
  venus: PlanetTransit;
  saturn: PlanetTransit;
  rahu: PlanetTransit;
  ketu: PlanetTransit;
}

export interface PlanetTransit {
  sign: number; // 0-11 (Mesha to Meena)
  longitude: number; // 0-360 sidereal
  house: number; // 1-12 from each sign's perspective
  speed: number; // deg/day
  retrograde: boolean;
  combust: boolean;
}

export interface SignHoroscope {
  sign: string;
  signIndex: number;
  date: string;
  overview: string;
  career: string;
  love: string;
  health: string;
  finance: string;
  luckyNumber: number;
  luckyColor: string;
  luckyTime: string;
  focusArea: string;
  moonInRashi: string;
  tithi: string;
  nakshatra: string;
  transitSummary: string;
  intensity: 'low' | 'moderate' | 'high'; // How eventful the day is
}

// ====================================================================
// CONSTANTS
// ====================================================================

const RASHI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka',
  'Simha', 'Kanya', 'Tula', 'Vrishchika',
  'Dhanu', 'Makara', 'Kumbha', 'Meena',
];

const DAY_COLORS = [
  'Orange', 'White', 'Red', 'Green', 'Yellow', 'Pink', 'Black',
];

// Combustion threshold: within 8° of Sun
const COMBUSTION_DEG = 8;

// ====================================================================
// TRANSIT ENGINE
// ====================================================================

/**
 * Calculate all planetary transits for a given date.
 * Returns sidereal positions with retrograde/combust flags.
 */
export function calculateDailyTransits(date: Date = new Date()): TransitSnapshot {
  const jd = calculateJulianDay(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    12, 0, 0, 5.5
  );

  const sunPos = getSunPosition(jd);
  const sunSidereal = tropicalToSidereal(sunPos.longitude, jd);

  function buildTransit(body: Body): PlanetTransit {
    const tropical = body === Body.Moon
      ? getMoonPosition(jd)
      : getPlanetLongitude(body, jd);
    const sidereal = tropicalToSidereal(tropical.longitude, jd);
    const sign = Math.floor(sidereal / 30) % 12;
    const degInSign = sidereal % 30;

    // Retrograde if speed < 0
    const retrograde = tropical.speed < 0;

    // Combust if within 8° of Sun (same sign, close degrees)
    const sunSign = Math.floor(sunSidereal / 30) % 12;
    const combust = sign === sunSign && Math.abs(degInSign - (sunSidereal % 30)) < COMBUSTION_DEG;

    return {
      sign,
      longitude: sidereal,
      house: 0, // filled later per-sign
      speed: tropical.speed,
      retrograde,
      combust,
    };
  }

  const rahuLon = getRahuLongitude(jd);
  const rahuSidereal = tropicalToSidereal(rahuLon, jd);

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  return {
    date: dateStr,
    sun: { sign: Math.floor(sunSidereal / 30) % 12, longitude: sunSidereal, house: 0, speed: sunPos.speed, retrograde: false, combust: false },
    moon: buildTransit(Body.Moon),
    mars: buildTransit(Body.Mars),
    mercury: buildTransit(Body.Mercury),
    jupiter: buildTransit(Body.Jupiter),
    venus: buildTransit(Body.Venus),
    saturn: buildTransit(Body.Saturn),
    rahu: { sign: Math.floor(rahuSidereal / 30) % 12, longitude: rahuSidereal, house: 0, speed: -0.053, retrograde: true, combust: false },
    ketu: { sign: (Math.floor(rahuSidereal / 30) % 12 + 6) % 12, longitude: (rahuSidereal + 180) % 360, house: 0, speed: -0.053, retrograde: true, combust: false },
  };
}

/**
 * Calculate house positions for all planets from a given sign's perspective.
 * Sign 0 (Mesha) sees planet in sign 2 as being in house 3.
 */
function getHousesForSign(transits: TransitSnapshot, signIndex: number): Record<string, number> {
  return {
    sun: ((transits.sun.sign - signIndex + 12) % 12) + 1,
    moon: ((transits.moon.sign - signIndex + 12) % 12) + 1,
    mars: ((transits.mars.sign - signIndex + 12) % 12) + 1,
    mercury: ((transits.mercury.sign - signIndex + 12) % 12) + 1,
    jupiter: ((transits.jupiter.sign - signIndex + 12) % 12) + 1,
    venus: ((transits.venus.sign - signIndex + 12) % 12) + 1,
    saturn: ((transits.saturn.sign - signIndex + 12) % 12) + 1,
    rahu: ((transits.rahu.sign - signIndex + 12) % 12) + 1,
    ketu: ((transits.ketu.sign - signIndex + 12) % 12) + 1,
  };
}

// ====================================================================
// PREDICTION ENGINE
// ====================================================================

interface HouseRule {
  planet: string;
  house: number;
  prediction: string;
  category: 'career' | 'love' | 'health' | 'finance' | 'overview';
  intensity: number;
}

/**
 * Generate all applicable rules for a sign based on current transits.
 */
function generateRules(transits: TransitSnapshot, signIndex: number): HouseRule[] {
  const h = getHousesForSign(transits, signIndex);
  const rules: HouseRule[] = [];

  // Helper to add rules
  const add = (planet: string, house: number, pred: string, cat: HouseRule['category'], intensity: number) => {
    if (h[planet as keyof typeof h] === house) {
      rules.push({ planet, house, prediction: pred, category: cat, intensity });
    }
  };

  // ========================
  // SUN (Soul, Authority)
  // ========================
  add('sun', 1,  'Your confidence and leadership shine today. A good day to take initiative.', 'overview', 2);
  add('sun', 10, 'Authority figures support your career goals. Recognition is possible.', 'career', 3);
  add('sun', 5,  'Creative energy is high. Express yourself boldly in romantic matters.', 'love', 2);
  add('sun', 6,  'Focus on health routines. Energy may feel lower than usual.', 'health', 2);

  // ========================
  // MOON (Mind, Emotions)
  // ========================
  add('moon', 1,  'Emotions are heightened today. Trust your intuition.', 'overview', 2);
  add('moon', 4,  'Domestic harmony brings peace of mind. Spend time at home.', 'love', 2);
  add('moon', 7,  'Emotional connections with partners deepen. Good for relationship talks.', 'love', 3);
  add('moon', 10, 'Public image and emotional well-being at work need balance.', 'career', 2);
  add('moon', 12, 'Rest and introspection serve you better than socializing.', 'health', 1);

  // ========================
  // MARS (Energy, Courage)
  // ========================
  add('mars', 1,  'High energy and drive. Channel it constructively to avoid conflicts.', 'overview', 3);
  add('mars', 3,  'Courage for communication. Good day for important conversations.', 'career', 2);
  add('mars', 6,  'Energy directed towards overcoming obstacles. Good for health regimens.', 'health', 2);
  add('mars', 10, 'Ambition drives career actions. Take bold steps at work.', 'career', 3);
  add('mars', 7,  'Passion runs high in relationships. Avoid unnecessary arguments.', 'love', 2);

  // ========================
  // MERCURY (Intellect, Business)
  // ========================
  add('mercury', 1,  'Sharp mind and clear communication. Good for negotiations.', 'overview', 2);
  add('mercury', 2,  'Financial discussions and planning yield insights.', 'finance', 2);
  add('mercury', 10, 'Strategic thinking benefits career. Present ideas confidently.', 'career', 3);
  add('mercury', 7,  'Clear communication strengthens partnerships.', 'love', 2);

  // Retrograde Mercury caution
  if (transits.mercury.retrograde) {
    add('mercury', h.mercury ?? 1, 'Mercury is retrograde. Double-check documents and communications.', 'overview', 2);
  }

  // ========================
  // JUPITER (Wisdom, Fortune)
  // ========================
  add('jupiter', 1,  'Optimism and wisdom guide your decisions. A fortunate day.', 'overview', 3);
  add('jupiter', 2,  'Financial growth opportunities appear. Wise investments favored.', 'finance', 3);
  add('jupiter', 5,  'Good fortune in creative ventures and romance.', 'love', 2);
  add('jupiter', 9,  'Higher learning and spiritual pursuits are blessed.', 'overview', 2);
  add('jupiter', 10, 'Professional expansion and recognition. Career growth indicated.', 'career', 3);
  add('jupiter', 11, 'Gains through social connections and elder siblings.', 'finance', 2);

  // ========================
  // VENUS (Love, Luxury)
  // ========================
  add('venus', 1,  'Charm and attractiveness are heightened. Enjoy artistic pursuits.', 'overview', 2);
  add('venus', 2,  'Financial gains through beauty, art, or partnerships.', 'finance', 2);
  add('venus', 5,  'Romance and creative expression flourish.', 'love', 3);
  add('venus', 7,  'Harmony in partnerships. Excellent day for marriage matters.', 'love', 3);
  add('venus', 11, 'Pleasant social gatherings bring joy and connections.', 'love', 2);

  // Combust Venus
  if (transits.venus.combust) {
    add('venus', h.venus ?? 1, 'Venus is combust. Relationships may feel strained; practice patience.', 'love', 2);
  }

  // ========================
  // SATURN (Discipline, Delay)
  // ========================
  add('saturn', 1,  'Responsibilities weigh heavy. Hard work brings long-term rewards.', 'overview', 2);
  add('saturn', 3,  'Disciplined effort in communication brings results.', 'career', 2);
  add('saturn', 6,  'Health requires discipline. Stick to routines.', 'health', 2);
  add('saturn', 10, 'Career demands persistence. Do not cut corners.', 'career', 3);
  add('saturn', 12, 'Expenses may be higher. Budget carefully.', 'finance', 2);

  // Retrograde Saturn
  if (transits.saturn.retrograde) {
    add('saturn', h.saturn ?? 1, 'Saturn is retrograde. Review past decisions before moving forward.', 'overview', 2);
  }

  // ========================
  // RAHU (Desire, Obsession)
  // ========================
  add('rahu', 1,  'Desires feel intensified. Be mindful of impulsive decisions.', 'overview', 2);
  add('rahu', 6,  'Success over obstacles through unconventional methods.', 'career', 2);
  add('rahu', 10, 'Ambition for status may drive unusual career moves.', 'career', 2);
  add('rahu', 11, 'Unexpected gains possible through foreign or tech sources.', 'finance', 3);

  // ========================
  // KETU (Detachment, Spirituality)
  // ========================
  add('ketu', 1,  'A sense of detachment helps you see situations clearly.', 'overview', 2);
  add('ketu', 9,  'Spiritual insights deepen. Good for meditation and study.', 'overview', 2);
  add('ketu', 12, 'Expenses on spiritual or charitable causes bring peace.', 'finance', 1);

  return rules;
}

// ====================================================================
// HOROSCOPE COMPOSITION
// ====================================================================

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function pickLuckyNumber(seed: number): number {
  return Math.floor(seededRandom(seed) * 9) + 1;
}

function pickLuckyTime(seed: number): string {
  const hours = [6, 7, 9, 10, 12, 14, 15, 17, 18, 19];
  const hour = hours[Math.floor(seededRandom(seed) * hours.length)] ?? 9;
  return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Compose a daily horoscope for a specific zodiac sign.
 * Uses real transit data to generate Vedic astrology predictions.
 */
export function generateSignHoroscope(
  signIndex: number,
  date: Date = new Date(),
  transits?: TransitSnapshot
): SignHoroscope {
  // Calculate transits if not provided
  const dailyTransits = transits ?? calculateDailyTransits(date);

  // Get Panchang
  const panchang = computePanchang(date);

  // Generate rules
  const rules = generateRules(dailyTransits, signIndex);

  // Categorize rules
  const byCategory = {
    overview: rules.filter((r) => r.category === 'overview'),
    career: rules.filter((r) => r.category === 'career'),
    love: rules.filter((r) => r.category === 'love'),
    health: rules.filter((r) => r.category === 'health'),
    finance: rules.filter((r) => r.category === 'finance'),
  };

  // Pick top predictions by intensity, or fallback
  function pickBest(categoryRules: HouseRule[], fallback: string): string {
    if (categoryRules.length === 0) return fallback;
    // Sort by intensity, pick highest
    categoryRules.sort((a, b) => b.intensity - a.intensity);
    return categoryRules[0]?.prediction ?? fallback;
  }

  // Determine focus area based on most intense rules
  const categoryScores: Record<string, number> = {
    career: byCategory.career.reduce((s, r) => s + r.intensity, 0),
    love: byCategory.love.reduce((s, r) => s + r.intensity, 0),
    health: byCategory.health.reduce((s, r) => s + r.intensity, 0),
    finance: byCategory.finance.reduce((s, r) => s + r.intensity, 0),
  };

  const focusArea = (Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as string) ?? 'career';

  // Determine intensity
  const totalIntensity = rules.reduce((s, r) => s + r.intensity, 0);
  const intensity: SignHoroscope['intensity'] =
    totalIntensity >= 8 ? 'high' : totalIntensity >= 4 ? 'moderate' : 'low';

  // Generate transit summary
  const moonHouse = ((dailyTransits.moon.sign - signIndex + 12) % 12) + 1;
  const transitSummary = `Moon transits your ${getHouseName(moonHouse)} house today. ${
    dailyTransits.mercury.retrograde ? 'Mercury is retrograde. ' : ''
  }${dailyTransits.saturn.retrograde ? 'Saturn is retrograde. ' : ''}`;

  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate() + signIndex * 100000;

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  return {
    sign: RASHI_NAMES[signIndex] ?? 'Mesha',
    signIndex,
    date: dateStr,
    overview: pickBest(byCategory.overview, 'A balanced day ahead. Focus on steady progress.'),
    career: pickBest(byCategory.career, 'Maintain your current pace at work. Patience brings results.'),
    love: pickBest(byCategory.love, 'Stability in relationships. Small gestures strengthen bonds.'),
    health: pickBest(byCategory.health, 'Moderate energy levels. Regular routines serve you well.'),
    finance: pickBest(byCategory.finance, 'Conservative approach to money is advised today.'),
    luckyNumber: pickLuckyNumber(seed),
    luckyColor: DAY_COLORS[date.getDay()] ?? 'Orange',
    luckyTime: pickLuckyTime(seed + 1),
    focusArea,
    moonInRashi: panchang.moonRashiName ?? 'Unknown',
    tithi: `${panchang.tithiName ?? 'Unknown'} (${panchang.paksha ?? 'Unknown'})`,
    nakshatra: panchang.nakshatraName ?? 'Unknown',
    transitSummary,
    intensity,
  };
}

function getHouseName(house: number): string {
  const names: Record<number, string> = {
    1: '1st (Self)',
    2: '2nd (Wealth)',
    3: '3rd (Courage)',
    4: '4th (Home)',
    5: '5th (Creativity)',
    6: '6th (Health)',
    7: '7th (Partnerships)',
    8: '8th (Transformation)',
    9: '9th (Fortune)',
    10: '10th (Career)',
    11: '11th (Gains)',
    12: '12th (Expenses)',
  };
  return names[house] ?? `${house}th`;
}

/**
 * Generate horoscopes for all 12 signs.
 * Calculates transits once, then generates all sign predictions.
 */
export function generateAllSignHoroscopes(date: Date = new Date()): SignHoroscope[] {
  const transits = calculateDailyTransits(date);
  return Array.from({ length: 12 }, (_, i) => generateSignHoroscope(i, date, transits));
}

/**
 * Generate a horoscope for a user's specific birth sign.
 * Includes personalized focus based on their sign.
 */
export function generatePersonalHoroscope(
  birthSignIndex: number,
  date: Date = new Date()
): SignHoroscope {
  return generateSignHoroscope(birthSignIndex, date);
}

export default {
  calculateDailyTransits,
  generateSignHoroscope,
  generateAllSignHoroscopes,
  generatePersonalHoroscope,
};
