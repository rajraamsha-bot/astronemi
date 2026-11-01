/**
 * Ashtakoot Guna Milan Engine v1.0
 * Deeply integrates with the Hindu Calendar Engine to provide local
 * compatibility matching between two horoscopes.
 */

import { RASHI_NAMES, NAKSHATRA_NAMES } from './hindu-calendar-engine';
export { RASHI_NAMES, NAKSHATRA_NAMES };

export interface GunaResult {
  name: string;
  points: number;
  maxPoints: number;
  description: string;
  status: 'good' | 'average' | 'poor';
}

export interface AshtakootResult {
  totalPoints: number;
  maxPoints: 36;
  percentage: number;
  gunas: GunaResult[];
  recommendation: string;
}

// ─── Data Tables ──────────────────────────────────────────────────────────────

const RASHI_VARNA: Record<string, number> = {
  'Meena': 4, 'Vrishchika': 4, 'Karka': 4, // Brahmin
  'Dhanu': 3, 'Simha': 3, 'Mesha': 3,     // Kshatriya
  'Makara': 2, 'Kanya': 2, 'Vrishabha': 2, // Vaishya
  'Kumbha': 1, 'Tula': 1, 'Mithuna': 1     // Shudra
};

const NAKSHATRA_YONI: Record<string, string> = {
  'Ashwini': 'Horse', 'Shatabhisha': 'Horse',
  'Swati': 'Buffalo', 'Hasta': 'Buffalo',
  'Vishakha': 'Tiger', 'Chitra': 'Tiger',
  'Jyeshtha': 'Deer', 'Anuradha': 'Deer',
  'Pushya': 'Sheep', 'Krittika': 'Sheep',
  'Purva Phalguni': 'Rat', 'Magha': 'Rat',
  'Uttara Phalguni': 'Cow', 'Uttara Bhadrapada': 'Cow',
  'Rohini': 'Serpent', 'Mrigashira': 'Serpent',
  'Bharani': 'Elephant', 'Revati': 'Elephant',
  'Mula': 'Dog', 'Ardra': 'Dog',
  'Ashlesha': 'Cat', 'Punarvasu': 'Cat',
  'Uttara Ashadha': 'Mongoose', 'Abhijit': 'Mongoose',
  'Shravana': 'Monkey', 'Purva Ashadha': 'Monkey',
  'Purva Bhadrapada': 'Lion', 'Dhanishta': 'Lion'
};

/**
 * Complete Yoni (sexual/biological) compatibility matrix.
 * Source: Classical Ashtakoot Guna Milan tables (Brihat Jataka / Muhurta Chintamani).
 *
 * Scoring: 4 = Same yoni, 3 = Friendly pair, 2 = Neutral, 1 = Unfriendly, 0 = Enemy pair.
 * The matrix is symmetric — YONI_FRIENDSHIP[A][B] === YONI_FRIENDSHIP[B][A].
 *
 * Enemy pairs (0 points): Horse-Buffalo, Cow-Tiger, Elephant-Lion, Dog-Deer,
 * Serpent-Mongoose, Cat-Rat, Monkey-Sheep, Lion-Elephant.
 */
const YONI_FRIENDSHIP: Record<string, Record<string, number>> = {
  'Horse':    { 'Horse': 4, 'Elephant': 2, 'Sheep': 2, 'Serpent': 2, 'Dog': 2, 'Cat': 2, 'Rat': 2, 'Cow': 2, 'Buffalo': 0, 'Tiger': 1, 'Deer': 3, 'Monkey': 3, 'Mongoose': 2, 'Lion': 1 },
  'Elephant': { 'Elephant': 4, 'Horse': 2, 'Sheep': 3, 'Serpent': 2, 'Dog': 2, 'Cat': 2, 'Rat': 2, 'Cow': 2, 'Buffalo': 3, 'Tiger': 1, 'Deer': 2, 'Monkey': 2, 'Mongoose': 2, 'Lion': 0 },
  'Sheep':    { 'Sheep': 4, 'Horse': 2, 'Elephant': 3, 'Serpent': 2, 'Dog': 1, 'Cat': 2, 'Rat': 1, 'Cow': 3, 'Buffalo': 2, 'Tiger': 1, 'Deer': 2, 'Monkey': 0, 'Mongoose': 2, 'Lion': 1 },
  'Serpent':  { 'Serpent': 4, 'Horse': 2, 'Elephant': 2, 'Sheep': 2, 'Dog': 2, 'Cat': 1, 'Rat': 1, 'Cow': 1, 'Buffalo': 2, 'Tiger': 2, 'Deer': 2, 'Monkey': 2, 'Mongoose': 0, 'Lion': 2 },
  'Dog':      { 'Dog': 4, 'Horse': 2, 'Elephant': 2, 'Sheep': 1, 'Serpent': 2, 'Cat': 2, 'Rat': 1, 'Cow': 2, 'Buffalo': 2, 'Tiger': 2, 'Deer': 0, 'Monkey': 2, 'Mongoose': 2, 'Lion': 2 },
  'Cat':      { 'Cat': 4, 'Horse': 2, 'Elephant': 2, 'Sheep': 2, 'Serpent': 1, 'Dog': 2, 'Rat': 0, 'Cow': 2, 'Buffalo': 2, 'Tiger': 1, 'Deer': 2, 'Monkey': 3, 'Mongoose': 2, 'Lion': 1 },
  'Rat':      { 'Rat': 4, 'Horse': 2, 'Elephant': 2, 'Sheep': 1, 'Serpent': 1, 'Dog': 1, 'Cat': 0, 'Cow': 2, 'Buffalo': 2, 'Tiger': 2, 'Deer': 2, 'Monkey': 2, 'Mongoose': 1, 'Lion': 2 },
  'Cow':      { 'Cow': 4, 'Horse': 2, 'Elephant': 2, 'Sheep': 3, 'Serpent': 1, 'Dog': 2, 'Cat': 2, 'Rat': 2, 'Buffalo': 3, 'Tiger': 0, 'Deer': 2, 'Monkey': 2, 'Mongoose': 2, 'Lion': 1 },
  'Buffalo':  { 'Buffalo': 4, 'Horse': 0, 'Elephant': 3, 'Sheep': 2, 'Serpent': 2, 'Dog': 2, 'Cat': 2, 'Rat': 2, 'Cow': 3, 'Tiger': 1, 'Deer': 2, 'Monkey': 2, 'Mongoose': 1, 'Lion': 1 },
  'Tiger':    { 'Tiger': 4, 'Horse': 1, 'Elephant': 1, 'Sheep': 1, 'Serpent': 2, 'Dog': 2, 'Cat': 1, 'Rat': 2, 'Cow': 0, 'Buffalo': 1, 'Deer': 1, 'Monkey': 1, 'Mongoose': 1, 'Lion': 3 },
  'Deer':     { 'Deer': 4, 'Horse': 3, 'Elephant': 2, 'Sheep': 2, 'Serpent': 2, 'Dog': 0, 'Cat': 2, 'Rat': 2, 'Cow': 2, 'Buffalo': 2, 'Tiger': 1, 'Monkey': 3, 'Mongoose': 2, 'Lion': 1 },
  'Monkey':   { 'Monkey': 4, 'Horse': 3, 'Elephant': 2, 'Sheep': 0, 'Serpent': 2, 'Dog': 2, 'Cat': 3, 'Rat': 2, 'Cow': 2, 'Buffalo': 2, 'Tiger': 1, 'Deer': 3, 'Mongoose': 2, 'Lion': 2 },
  'Mongoose': { 'Mongoose': 4, 'Horse': 2, 'Elephant': 2, 'Sheep': 2, 'Serpent': 0, 'Dog': 2, 'Cat': 2, 'Rat': 1, 'Cow': 2, 'Buffalo': 1, 'Tiger': 1, 'Deer': 2, 'Monkey': 2, 'Lion': 2 },
  'Lion':     { 'Lion': 4, 'Horse': 1, 'Elephant': 0, 'Sheep': 1, 'Serpent': 2, 'Dog': 2, 'Cat': 1, 'Rat': 2, 'Cow': 1, 'Buffalo': 1, 'Tiger': 3, 'Deer': 1, 'Monkey': 2, 'Mongoose': 2 },
};

const RASHI_LORD: Record<string, string> = {
  'Mesha': 'Mars', 'Vrishchika': 'Mars',
  'Vrishabha': 'Venus', 'Tula': 'Venus',
  'Mithuna': 'Mercury', 'Kanya': 'Mercury',
  'Karka': 'Moon',
  'Simha': 'Sun',
  'Dhanu': 'Jupiter', 'Meena': 'Jupiter',
  'Makara': 'Saturn', 'Kumbha': 'Saturn'
};

const PLANET_FRIENDSHIP: Record<string, Record<string, number>> = {
  'Sun': { 'Moon': 5, 'Mars': 5, 'Jupiter': 5, 'Mercury': 4, 'Venus': 0, 'Saturn': 0 },
  'Moon': { 'Sun': 5, 'Mercury': 5, 'Mars': 4, 'Jupiter': 4, 'Venus': 4, 'Saturn': 4 },
  'Mars': { 'Sun': 5, 'Moon': 5, 'Jupiter': 5, 'Mercury': 0, 'Venus': 4, 'Saturn': 4 },
  'Mercury': { 'Sun': 5, 'Venus': 5, 'Moon': 0, 'Mars': 4, 'Jupiter': 4, 'Saturn': 4 },
  'Jupiter': { 'Sun': 5, 'Moon': 5, 'Mars': 5, 'Mercury': 0, 'Venus': 0, 'Saturn': 4 },
  'Venus': { 'Mercury': 5, 'Saturn': 5, 'Sun': 0, 'Moon': 0, 'Mars': 4, 'Jupiter': 4 },
  'Saturn': { 'Mercury': 5, 'Venus': 5, 'Sun': 0, 'Moon': 0, 'Mars': 0, 'Jupiter': 4 }
};

const NAKSHATRA_GANA: Record<string, 'Deva' | 'Manushya' | 'Rakshasa'> = {
  'Ashwini': 'Deva', 'Mrigashira': 'Deva', 'Punarvasu': 'Deva', 'Pushya': 'Deva', 'Hasta': 'Deva', 'Swati': 'Deva', 'Anuradha': 'Deva', 'Shravana': 'Deva', 'Revati': 'Deva',
  'Bharani': 'Manushya', 'Rohini': 'Manushya', 'Ardra': 'Manushya', 'Purva Phalguni': 'Manushya', 'Uttara Phalguni': 'Manushya', 'Purva Ashadha': 'Manushya', 'Uttara Ashadha': 'Manushya', 'Purva Bhadrapada': 'Manushya', 'Uttara Bhadrapada': 'Manushya',
  'Krittika': 'Rakshasa', 'Ashlesha': 'Rakshasa', 'Magha': 'Rakshasa', 'Chitra': 'Rakshasa', 'Vishakha': 'Rakshasa', 'Jyeshtha': 'Rakshasa', 'Mula': 'Rakshasa', 'Dhanishta': 'Rakshasa', 'Shatabhisha': 'Rakshasa'
};

const NAKSHATRA_NADI: Record<string, 1 | 2 | 3> = {
  'Ashwini': 1, 'Bharani': 2, 'Krittika': 3, 'Rohini': 3, 'Mrigashira': 2, 'Ardra': 1, 'Punarvasu': 1, 'Pushya': 2, 'Ashlesha': 3,
  'Magha': 1, 'Purva Phalguni': 2, 'Uttara Phalguni': 3, 'Hasta': 3, 'Chitra': 2, 'Swati': 1, 'Vishakha': 1, 'Anuradha': 2, 'Jyeshtha': 3,
  'Mula': 1, 'Purva Ashadha': 2, 'Uttara Ashadha': 3, 'Shravana': 3, 'Dhanishta': 2, 'Shatabhisha': 1, 'Purva Bhadrapada': 1, 'Uttara Bhadrapada': 2, 'Revati': 3
};

// ─── Calculation Logic ────────────────────────────────────────────────────────

export function calculateAshtakoot(
  boyPanchang: { moonLongitude?: number; nakshatraName: string },
  girlPanchang: { moonLongitude?: number; nakshatraName: string }
): AshtakootResult {
  const gunas: GunaResult[] = [];

  // Helper function to get rashi name from longitude
  const getMoonRashiName = (moonLongitude?: number): string => {
    if (!moonLongitude) return 'Aries'; // Default
    const rashiIndex = Math.floor(moonLongitude / 30);
    return RASHI_NAMES[rashiIndex] || 'Aries';
  };

  const boyMoonRashiName = getMoonRashiName(boyPanchang.moonLongitude);
  const girlMoonRashiName = getMoonRashiName(girlPanchang.moonLongitude);

  // 1. Varna (1 Point)
  const boyVarna = RASHI_VARNA[boyMoonRashiName] || 1;
  const girlVarna = RASHI_VARNA[girlMoonRashiName] || 1;
  const varnaPoints = boyVarna >= girlVarna ? 1 : 0;
  gunas.push({ name: 'Varna', points: varnaPoints, maxPoints: 1, description: 'Spiritual ego and work compatibility', status: varnaPoints === 1 ? 'good' : 'poor' });

  // 2. Vashya (2 Points) - Simplified
  const vashyaPoints = boyMoonRashiName === girlMoonRashiName ? 2 : 1;
  gunas.push({ name: 'Vashya', points: vashyaPoints, maxPoints: 2, description: 'Dominance and mutual attraction', status: vashyaPoints === 2 ? 'good' : 'average' });

  // 3. Tara (3 Points)
  const boyNakIdx = NAKSHATRA_NAMES.indexOf(boyPanchang.nakshatraName);
  const girlNakIdx = NAKSHATRA_NAMES.indexOf(girlPanchang.nakshatraName);
  const diff1 = boyNakIdx >= 0 && girlNakIdx >= 0 ? (girlNakIdx - boyNakIdx + 27) % 9 || 9 : 1;
  const diff2 = boyNakIdx >= 0 && girlNakIdx >= 0 ? (boyNakIdx - girlNakIdx + 27) % 9 || 9 : 1;
  let taraPoints = 0;
  if ([1, 2, 4, 6, 8, 9].includes(diff1 % 9) && [1, 2, 4, 6, 8, 9].includes(diff2 % 9)) taraPoints = 3;
  else if ([1, 2, 4, 6, 8, 9].includes(diff1 % 9) || [1, 2, 4, 6, 8, 9].includes(diff2 % 9)) taraPoints = 1.5;
  gunas.push({ name: 'Tara', points: taraPoints, maxPoints: 3, description: 'Destiny and shared luck', status: taraPoints >= 2 ? 'good' : (taraPoints > 0 ? 'average' : 'poor') });

  // 4. Yoni (4 Points)
  const boyYoni = NAKSHATRA_YONI[boyPanchang.nakshatraName] || 'Horse';
  const girlYoni = NAKSHATRA_YONI[girlPanchang.nakshatraName] || 'Horse';
  let yoniPoints = 2; // Default average
  if (boyYoni === girlYoni) yoniPoints = 4;
  else if (YONI_FRIENDSHIP[boyYoni]?.[girlYoni] !== undefined) yoniPoints = YONI_FRIENDSHIP[boyYoni][girlYoni];
  gunas.push({ name: 'Yoni', points: yoniPoints, maxPoints: 4, description: 'Physical and biological compatibility', status: yoniPoints >= 3 ? 'good' : (yoniPoints >= 2 ? 'average' : 'poor') });

  // 5. Maitri (5 Points)
  const boyLord = RASHI_LORD[boyMoonRashiName] || 'Sun';
  const girlLord = RASHI_LORD[girlMoonRashiName] || 'Sun';
  const maitriPoints = PLANET_FRIENDSHIP[boyLord]?.[girlLord] ?? 0;
  gunas.push({ name: 'Maitri', points: maitriPoints, maxPoints: 5, description: 'Mental friendship and views', status: maitriPoints >= 4 ? 'good' : (maitriPoints >= 2 ? 'average' : 'poor') });

  // 6. Gana (6 Points)
  const boyGana = NAKSHATRA_GANA[boyPanchang.nakshatraName];
  const girlGana = NAKSHATRA_GANA[girlPanchang.nakshatraName];
  let ganaPoints = 0;
  if (boyGana === girlGana) ganaPoints = 6;
  else if ((boyGana === 'Deva' && girlGana === 'Manushya') || (boyGana === 'Manushya' && girlGana === 'Deva')) ganaPoints = 5;
  else if (boyGana === 'Deva' && girlGana === 'Rakshasa') ganaPoints = 1;
  gunas.push({ name: 'Gana', points: ganaPoints, maxPoints: 6, description: 'Temperament and social behavior', status: ganaPoints >= 5 ? 'good' : (ganaPoints >= 1 ? 'average' : 'poor') });

  // 7. Bhakoot (7 Points)
  const boyRashiIdx = RASHI_NAMES.indexOf(boyMoonRashiName);
  const girlRashiIdx = RASHI_NAMES.indexOf(girlMoonRashiName);
  const dist = boyRashiIdx >= 0 && girlRashiIdx >= 0 ? (girlRashiIdx - boyRashiIdx + 12) % 12 + 1 : 1;
  const badDist = [2, 5, 6, 8, 9, 12]; // Typical Bhakoot Dosha distances
  const bhakootPoints = badDist.includes(dist) ? 0 : 7;
  gunas.push({ name: 'Bhakoot', points: bhakootPoints, maxPoints: 7, description: 'Emotional bonding and children', status: bhakootPoints === 7 ? 'good' : 'poor' });

  // 8. Nadi (8 Points)
  const boyNadi = NAKSHATRA_NADI[boyPanchang.nakshatraName] ?? 1;
  const girlNadi = NAKSHATRA_NADI[girlPanchang.nakshatraName] ?? 1;
  const nadiPoints = boyNadi !== girlNadi ? 8 : 0;
  gunas.push({ name: 'Nadi', points: nadiPoints, maxPoints: 8, description: 'Health and progeny compatibility', status: nadiPoints === 8 ? 'good' : 'poor' });

  const totalPoints = gunas.reduce((sum, g) => sum + g.points, 0);
  const percentage = (totalPoints / 36) * 100;

  let recommendation = 'Average Match. Remedies may be required.';
  if (percentage >= 80) recommendation = 'Excellent Match! Highly recommended.';
  else if (percentage >= 60) recommendation = 'Good Match. Favorable for marriage.';
  else if (percentage < 30) recommendation = 'Major Dosha found. Please consult an expert.';

  return {
    totalPoints,
    maxPoints: 36,
    percentage,
    gunas,
    recommendation
  };
}
