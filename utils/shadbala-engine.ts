import { VedicPlanetData } from './vedic-astrology';
import { DivisionalPlanet, ZODIAC_LORDS } from './jaimini-engine';

/**
 * Shadbala Engine
 * 
 * Calculates the "Six-Fold Strength" of planets.
 * Final scores are provided in Rupas (professional) and Percentage (general).
 */

export interface ShadbalaResult {
  planet: string;
  sthanaBala: number;
  digBala: number;
  kaalaBala: number;
  chesthaBala: number;
  naisargikaBala: number;
  drikBala: number;
  totalShadbala: number;  // in Virupas
  totalRupas: number;     // totalShadbala / 60
  percentage: number;      // relative to standard strength requirements
  rank: number;
}

// Fixed Natural Strengths (Naisargika Bala)
const NAISARGIKA_BALA: Record<string, number> = {
  'Sun': 60,
  'Moon': 51.43,
  'Venus': 42.86,
  'Jupiter': 34.29,
  'Mercury': 25.71,
  'Mars': 17.14,
  'Saturn': 8.57,
};

// Standard Requirement (for percentage calculation)
const MIN_REQD_VIRUPAS: Record<string, number> = {
  'Sun': 390,
  'Moon': 360,
  'Mars': 300,
  'Mercury': 420,
  'Jupiter': 390,
  'Venus': 330,
  'Saturn': 300,
};

/**
 * Main function to calculate Shadbala for all classical planets.
 */
export function calculateShadbala(
  planets: VedicPlanetData[],
  vargas: Record<string, DivisionalPlanet[]>,
  birthInfo: { isDayBirth: boolean, moonPhase: number, sunLongitude: number }
): ShadbalaResult[] {
  const results: ShadbalaResult[] = [];
  const classicalPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

  classicalPlanets.forEach(name => {
    const p = planets.find(pl => pl.name === name);
    if (!p) return;

    // 1. Sthana Bala (Simplified for performance, covering core components)
    let sthana = calculateSthanaBala(p, vargas);

    // 2. Dig Bala (Directional)
    let dig = calculateDigBala(p);

    // 3. Kaala Bala (Temporal)
    let kaala = calculateKaalaBala(p, birthInfo);

    // 4. Chestha Bala (Motional)
    let chestha = calculateChesthaBala(p);

    // 5. Naisargika Bala (Natural)
    let naisargika = NAISARGIKA_BALA[name] || 0;

    // 6. Drik Bala (Aspectual - Simplified placeholder for net aspect influence)
    let drik = 0; 

    const totalVirupas = sthana + dig + kaala + chestha + naisargika + drik;
    const totalRupas = parseFloat((totalVirupas / 60).toFixed(2));
    const reqd = MIN_REQD_VIRUPAS[name] || 300;
    const percentage = Math.min(100, Math.round((totalVirupas / reqd) * 100));

    results.push({
      planet: name,
      sthanaBala: parseFloat(sthana.toFixed(2)),
      digBala: parseFloat(dig.toFixed(2)),
      kaalaBala: parseFloat(kaala.toFixed(2)),
      chesthaBala: parseFloat(chestha.toFixed(2)),
      naisargikaBala: parseFloat(naisargika.toFixed(2)),
      drikBala: parseFloat(drik.toFixed(2)),
      totalShadbala: parseFloat(totalVirupas.toFixed(2)),
      totalRupas,
      percentage,
      rank: 0 // Will rank after loop
    });
  });

  // Rank planets by percentage
  const ranked = [...results].sort((a, b) => b.percentage - a.percentage);
  results.forEach(r => {
    r.rank = ranked.findIndex(pr => pr.planet === r.planet) + 1;
  });

  return results;
}

/**
 * 1. Sthana Bala Calculation
 * Includes Ucha Bala, Kendra Bala, and Simplified Varga Bala.
 */
function calculateSthanaBala(p: VedicPlanetData, vargas: Record<string, DivisionalPlanet[]>): number {
  let score = 0;

  // Ucha Bala (Exaltation) - Max 60
  const exaltationDegrees: Record<string, number> = { 'Sun': 10, 'Moon': 33, 'Mars': 298, 'Mercury': 165, 'Jupiter': 95, 'Venus': 357, 'Saturn': 200 };
  const exaltPoint = exaltationDegrees[p.name] || 0;
  const dist = Math.abs(p.siderealLongitude - exaltPoint);
  const normalizedDist = dist > 180 ? 360 - dist : dist;
  score += (180 - normalizedDist) / 3;

  // Kendra Bala (Position in House)
  // Kendra (1,4,7,10) = 60, Panapara (2,5,8,11) = 30, Apoklima (3,6,9,12) = 15
  if ([1, 4, 7, 10].includes(p.house)) score += 60;
  else if ([2, 5, 8, 11].includes(p.house)) score += 30;
  else score += 15;

  // Saptavargiya Bala (Simplified)
  // Check if planet is in own/friendly sign across 7 Varga charts
  const charts = ['D1', 'D2', 'D3', 'D7', 'D9', 'D12', 'D30'];
  charts.forEach(c => {
    const vp = (vargas[c] || []).find(v => v.name === p.name);
    if (!vp) return;
    const lord = ZODIAC_LORDS[vp.sign];
    if (lord === p.name) score += 15; // Own sign
    // Placeholder for friendly sign (+10)
  });

  return score;
}

/**
 * 2. Dig Bala (Directional Strength)
 * Best house: Sun/Mars(10), Jupiter/Merc(1), Moon/Venus(4), Saturn(7)
 */
function calculateDigBala(p: VedicPlanetData): number {
  const bestHouses: Record<string, number> = { 'Sun': 10, 'Mars': 10, 'Jupiter': 1, 'Mercury': 1, 'Moon': 4, 'Venus': 4, 'Saturn': 7 };
  const best = bestHouses[p.name];
  if (!best) return 0;
  
  const dist = Math.abs(p.house - best);
  const houseDist = dist > 6 ? 12 - dist : dist;
  return (6 - houseDist) * 10; // Max 60 if in best house
}

/**
 * 3. Kaala Bala (Temporal Strength)
 * Simplified Natonnata and Paksha Bala.
 */
function calculateKaalaBala(p: VedicPlanetData, birthInfo: { isDayBirth: boolean, moonPhase: number }): number {
  let score = 0;

  // Natonnata Bala (Day vs Night)
  // Moon, Mars, Saturn strong at night. Sun, Jupiter, Venus strong at day. Mercury always strong.
  const isNight = !birthInfo.isDayBirth;
  if (['Moon', 'Mars', 'Saturn'].includes(p.name)) score += isNight ? 60 : 0;
  else if (['Sun', 'Jupiter', 'Venus'].includes(p.name)) score += !isNight ? 60 : 0;
  else if (p.name === 'Mercury') score += 60;

  // Paksha Bala (Moon Phase)
  if (p.name === 'Moon') {
    score += birthInfo.moonPhase * 60; // 0 to 1 based on phase
  }

  return score;
}

/**
 * 4. Chestha Bala (Motional Strength)
 * Based on planet's speed. Fast = strong, Stationary/Slow = weak.
 * Note: Sun/Moon don't have Chestha Bala (replaced by Ayana Bala in full math).
 */
function calculateChesthaBala(p: VedicPlanetData): number {
  if (p.name === 'Sun' || p.name === 'Moon') return 30; // Average
  
  // Retrograde planets get high Chestha Bala (exception: Mercury/Venus)
  if (p.isRetrograde) return 60;
  
  const speed = Math.abs(p.speed);
  if (speed < 0.1) return 10;
  if (speed < 0.5) return 30;
  return 50;
}
