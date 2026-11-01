/**
 * Transit Engine (Gochar Calculations)
 * 
 * Real-time planetary transit calculations including:
 * - Current planetary positions
 * - Transit effects on natal chart
 * - Sade Sati analysis
 * - Double transit (Jupiter + Saturn)
 * - Transit predictions
 */

import {
  gregorianToJD,
  sunLongitude,
  moonLongitude,
  norm360,
} from './hindu-calendar-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransitPosition {
  planet: string;
  sign: string;
  signIndex: number;
  degree: number;
  nakshatra: string;
  nakshatraPada: number;
  isRetrograde: boolean;
  speed: number; // degrees per day
  longitude: number;
}

export interface TransitEffect {
  planet: string;
  natalHouse: number;
  transitHouse: number;
  aspectType: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition' | 'none';
  effect: 'positive' | 'negative' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
}

export interface SadeSatiPhase {
  phase: 'first' | 'second' | 'third' | 'none';
  startDate: Date;
  endDate: Date;
  currentSign: string;
  description: string;
  remedies: string[];
}

export interface SadeSatiAnalysis {
  isActive: boolean;
  currentPhase: SadeSatiPhase;
  pastPhases: SadeSatiPhase[];
  futurePhases: SadeSatiPhase[];
  totalDuration: number; // in years
  intensity: 'high' | 'medium' | 'low' | 'none';
  overallEffect: string;
}

export interface DoubleTransit {
  jupiterSign: string;
  saturnSign: string;
  aspectedHouses: number[];
  effect: string;
  duration: string;
}

export interface TransitPrediction {
  date: Date;
  planet: string;
  event: string;
  effect: string;
  duration: string;
  intensity: number; // 1-10
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const PLANET_SPEEDS: Record<string, number> = {
  Sun: 1.0,
  Moon: 13.2,
  Mars: 0.52,
  Mercury: 1.38,
  Jupiter: 0.083,
  Venus: 1.2,
  Saturn: 0.033,
  Rahu: -0.053, // Retrograde motion
  Ketu: -0.053, // Retrograde motion
};

const PLANET_ORBITAL_PERIODS: Record<string, number> = {
  Sun: 365.25,
  Moon: 27.3,
  Mars: 687,
  Mercury: 88,
  Jupiter: 4333,
  Venus: 225,
  Saturn: 10759,
  Rahu: 6793, // ~18.6 years
  Ketu: 6793,
};

// ─── Planetary Position Calculations ──────────────────────────────────────────

/**
 * Detect retrograde by comparing longitude at T and T + 1 day.
 * A planet is retrograde when its ecliptic longitude decreases over time.
 * We handle the 360→0 wrap-around by normalizing the difference.
 */
function isRetrogradePlanet(
  calcFn: (T: number) => number,
  T: number
): { isRetrograde: boolean; speed: number } {
  const deltaT = 1.0 / 36525.0; // 1 day in Julian centuries
  const longNow = calcFn(T);
  const longTomorrow = calcFn(T + deltaT);

  // Handle 360→0 wrap-around: normalize difference to [-180, 180]
  let diff = longTomorrow - longNow;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return {
    isRetrograde: diff < 0,
    speed: diff, // degrees per day (negative = retrograde)
  };
}

/**
 * Calculate planetary positions for a given date
 */
export function calculateTransitPositions(date: Date): TransitPosition[] {
  const jd = gregorianToJD(date.getFullYear(), date.getMonth() + 1, date.getDate(), 12);
  const T = (jd - 2451545.0) / 36525.0;

  const positions: TransitPosition[] = [];

  // Sun (never retrograde from geocentric view)
  const sunLong = sunLongitude(jd);
  positions.push(createTransitPosition('Sun', sunLong, false, PLANET_SPEEDS.Sun ?? 1.0));

  // Moon (never retrograde)
  const moonLong = moonLongitude(jd);
  positions.push(createTransitPosition('Moon', moonLong, false, PLANET_SPEEDS.Moon ?? 13.2));

  // Mars — can retrograde for ~72 days every ~2 years
  const marsLong = calculateMarsLongitude(T);
  const marsRetro = isRetrogradePlanet(calculateMarsLongitude, T);
  positions.push(createTransitPosition('Mars', marsLong, marsRetro.isRetrograde, marsRetro.speed));

  // Mercury — retrogrades ~3 times/year for ~21 days each
  const mercuryLong = calculateMercuryLongitude(T);
  const mercuryRetro = isRetrogradePlanet(calculateMercuryLongitude, T);
  positions.push(createTransitPosition('Mercury', mercuryLong, mercuryRetro.isRetrograde, mercuryRetro.speed));

  // Jupiter — retrogrades for ~120 days/year
  const jupiterLong = calculateJupiterLongitude(T);
  const jupiterRetro = isRetrogradePlanet(calculateJupiterLongitude, T);
  positions.push(createTransitPosition('Jupiter', jupiterLong, jupiterRetro.isRetrograde, jupiterRetro.speed));

  // Venus — retrogrades for ~42 days every ~18 months
  const venusLong = calculateVenusLongitude(T);
  const venusRetro = isRetrogradePlanet(calculateVenusLongitude, T);
  positions.push(createTransitPosition('Venus', venusLong, venusRetro.isRetrograde, venusRetro.speed));

  // Saturn — retrogrades for ~138 days/year
  const saturnLong = calculateSaturnLongitude(T);
  const saturnRetro = isRetrogradePlanet(calculateSaturnLongitude, T);
  positions.push(createTransitPosition('Saturn', saturnLong, saturnRetro.isRetrograde, saturnRetro.speed));

  // Rahu (always retrograde in mean node model)
  const rahuLong = calculateRahuLongitude(T);
  positions.push(createTransitPosition('Rahu', rahuLong, true, PLANET_SPEEDS.Rahu ?? -0.053));

  // Ketu (always opposite Rahu, always retrograde)
  const ketuLong = norm360(rahuLong + 180);
  positions.push(createTransitPosition('Ketu', ketuLong, true, PLANET_SPEEDS.Ketu ?? -0.053));

  return positions;
}

function createTransitPosition(planet: string, longitude: number, isRetrograde: boolean, speed: number): TransitPosition {
  const signIndex = Math.floor(longitude / 30);
  const degree = longitude % 30;
  const nakshatraIndex = Math.floor(longitude / (360 / 27));
  const nakshatraPada = Math.floor((longitude % (360 / 27)) / ((360 / 27) / 4)) + 1;

  return {
    planet,
    sign: ZODIAC_SIGNS[signIndex] ?? 'Unknown',
    signIndex,
    degree,
    nakshatra: NAKSHATRAS[nakshatraIndex] ?? 'Unknown',
    nakshatraPada,
    isRetrograde,
    speed,
    longitude,
  };
}

// ─── Planetary Longitude Calculations ──────────────────────────────────────────

function getGeocentricLongitude(planetL: number, planetA: number, sunL: number): number {
  // Simplistic geocentric conversion
  // planetL: heliocentric longitude of planet
  // planetA: semi-major axis of planet
  // sunL: heliocentric longitude of Earth (Sun + 180)
  const EarthA = 1.0;
  const EarthL = norm360(sunL + 180);
  
  const xp = planetA * Math.cos(planetL * Math.PI / 180);
  const yp = planetA * Math.sin(planetL * Math.PI / 180);
  const xe = EarthA * Math.cos(EarthL * Math.PI / 180);
  const ye = EarthA * Math.sin(EarthL * Math.PI / 180);
  
  return norm360(Math.atan2(yp - ye, xp - xe) * 180 / Math.PI);
}

function calculateMarsLongitude(T: number): number {
  const jd = T * 36525.0 + 2451545.0;
  const sunL = sunLongitude(jd);
  const helioL = norm360(355.45332 + 19140.30268 * T);
  return norm360(getGeocentricLongitude(helioL, 1.52368, sunL) - getAyanamsa(T));
}

function calculateMercuryLongitude(T: number): number {
  const jd = T * 36525.0 + 2451545.0;
  const sunL = sunLongitude(jd);
  const helioL = norm360(252.2509 + 149472.6746 * T);
  return norm360(getGeocentricLongitude(helioL, 0.3871, sunL) - getAyanamsa(T));
}

function calculateJupiterLongitude(T: number): number {
  const jd = T * 36525.0 + 2451545.0;
  const sunL = sunLongitude(jd);
  const helioL = norm360(34.35148 + 3034.90567 * T);
  return norm360(getGeocentricLongitude(helioL, 5.2026, sunL) - getAyanamsa(T));
}

function calculateVenusLongitude(T: number): number {
  const jd = T * 36525.0 + 2451545.0;
  const sunL = sunLongitude(jd);
  const helioL = norm360(181.9798 + 58517.8157 * T);
  return norm360(getGeocentricLongitude(helioL, 0.7233, sunL) - getAyanamsa(T));
}

function calculateSaturnLongitude(T: number): number {
  const jd = T * 36525.0 + 2451545.0;
  const sunL = sunLongitude(jd);
  const helioL = norm360(50.07747 + 1222.11379 * T);
  return norm360(getGeocentricLongitude(helioL, 9.5549, sunL) - getAyanamsa(T));
}

function calculateRahuLongitude(T: number): number {
  // Mean Node
  return norm360(125.04452 - 1934.136261 * T - 0.002078 * T * T);
}

function getAyanamsa(T: number): number {
  /**
   * Lahiri (Chitrapaksha) Ayanamsa — polynomial model.
   *
   * Based on the IAU precession model with the Lahiri reference point
   * (Spica at 0° Libra in the sidereal zodiac).
   *
   * Reference epoch: J2000.0 (T=0)
   * Lahiri ayanamsa at J2000.0 ≈ 23.853°
   * Precession rate ≈ 50.2882″/year with secular acceleration
   */
  const centuries = T; // T is already in Julian centuries from J2000.0

  // Mean precession (polynomial fit to the Lahiri standard)
  const precession = 23.85306
    + (50.27972 / 3600) * (centuries * 100)   // primary precession term (per year)
    + (0.000111 / 3600) * (centuries * 100) * (centuries * 100); // secular acceleration

  // Nutation in longitude (simplified — dominant 18.6-year term)
  const omega = norm360(125.04452 - 1934.136261 * centuries); // Moon's ascending node
  const nutationLon = -17.2 / 3600 * Math.sin(omega * Math.PI / 180)
    - 1.32 / 3600 * Math.sin(2 * norm360(280.4665 + 36000.7698 * centuries) * Math.PI / 180);

  return precession + nutationLon;
}

// ─── Sade Sati Analysis ────────────────────────────────────────────────────────

/**
 * Calculate Sade Sati (7.5 year Saturn transit) analysis
 */
export function calculateSadeSati(moonSignIndex: number): SadeSatiAnalysis {
  const today = new Date();
  const currentPositions = calculateTransitPositions(today);
  const saturnPos = currentPositions.find(p => p.planet === 'Saturn');
  
  if (!saturnPos) {
    return createEmptySadeSati();
  }

  // Sade Sati starts when Saturn enters 12th from Moon sign
  // and ends when Saturn leaves 2nd from Moon sign
  const twelfthFromMoon = (moonSignIndex + 11) % 12;
  const firstFromMoon = moonSignIndex;
  const secondFromMoon = (moonSignIndex + 1) % 12;

  // Calculate Saturn's transit dates
  const saturnSign = saturnPos.signIndex;
  
  // Check if currently in Sade Sati
  const inSadeSati = 
    saturnSign === twelfthFromMoon ||
    saturnSign === firstFromMoon ||
    saturnSign === secondFromMoon;

  if (!inSadeSati) {
    // Calculate next Sade Sati
    const nextStart = calculateNextSaturnEntry(twelfthFromMoon, today);
    return {
      isActive: false,
      currentPhase: {
        phase: 'none',
        startDate: nextStart,
        endDate: new Date(nextStart.getTime() + 7.5 * 365.25 * 24 * 60 * 60 * 1000),
        currentSign: '',
        description: 'Sade Sati is not currently active.',
        remedies: [],
      },
      pastPhases: [],
      futurePhases: [createSadeSatiPhase(nextStart, twelfthFromMoon)],
      totalDuration: 7.5,
      intensity: 'none',
      overallEffect: 'No Sade Sati effect currently. Next Sade Sati will begin around ' + nextStart.getFullYear(),
    };
  }

  // Determine current phase
  let currentPhase: 'first' | 'second' | 'third';
  let intensity: 'high' | 'medium' | 'low';
  let description: string;
  let remedies: string[];

  if (saturnSign === twelfthFromMoon) {
    currentPhase = 'first';
    intensity = 'medium';
    description = 'First phase of Sade Sati - Saturn is transiting the 12th house from your Moon sign. This phase may bring expenses, health concerns, and mental stress.';
    remedies = [
      'Worship Lord Hanuman on Saturdays',
      'Recite Hanuman Chalisa daily',
      'Donate black sesame seeds and mustard oil',
      'Feed the poor and needy',
    ];
  } else if (saturnSign === firstFromMoon) {
    currentPhase = 'second';
    intensity = 'high';
    description = 'Second phase of Sade Sati (peak intensity) - Saturn is transiting your Moon sign. This is the most challenging phase affecting health, career, and relationships.';
    remedies = [
      'Visit Shani temple on Saturdays',
      'Recite Shani Chalisa',
      'Perform Rudra Abhishek',
      'Wear a blue sapphire (after consultation)',
      'Practice meditation and yoga',
    ];
  } else {
    currentPhase = 'third';
    intensity = 'low';
    description = 'Third phase of Sade Sati - Saturn is transiting the 2nd house from your Moon sign. This phase affects wealth and family but is less intense.';
    remedies = [
      'Donate to charitable causes',
      'Recite Vishnu Sahasranama',
      'Maintain family harmony',
      'Avoid conflicts and arguments',
    ];
  }

  // Calculate phase dates
  const phaseStart = estimatePhaseStart(currentPhase, today);
  const phaseEnd = estimatePhaseEnd(currentPhase, today);

  return {
    isActive: true,
    currentPhase: {
      phase: currentPhase,
      startDate: phaseStart,
      endDate: phaseEnd,
      currentSign: ZODIAC_SIGNS[saturnSign] ?? 'Unknown',
      description,
      remedies,
    },
    pastPhases: [],
    futurePhases: [],
    totalDuration: 7.5,
    intensity,
    overallEffect: `Currently in ${currentPhase} phase of Sade Sati with ${intensity} intensity. ${description}`,
  };
}

/**
 * Alias for calculateSadeSati with test-compatible signature
 * Returns a simplified object matching test expectations
 */
export function analyzeSadeSati(_date: Date, moonSignIndex: number): {
  phase: 'none' | 'rising' | 'peak' | 'setting';
  description: string;
  isActive: boolean;
} {
  const analysis = calculateSadeSati(moonSignIndex);

  const phaseMap: Record<string, 'none' | 'rising' | 'peak' | 'setting'> = {
    none: 'none',
    first: 'rising',
    second: 'peak',
    third: 'setting',
  };

  return {
    phase: phaseMap[analysis.currentPhase.phase] || 'none',
    description: analysis.overallEffect || analysis.currentPhase.description || 'No Sade Sati effect.',
    isActive: analysis.isActive,
  };
}

function createEmptySadeSati(): SadeSatiAnalysis {
  return {
    isActive: false,
    currentPhase: {
      phase: 'none',
      startDate: new Date(),
      endDate: new Date(),
      currentSign: '',
      description: 'Unable to calculate Sade Sati.',
      remedies: [],
    },
    pastPhases: [],
    futurePhases: [],
    totalDuration: 0,
    intensity: 'none',
    overallEffect: 'Unable to determine Sade Sati status.',
  };
}

function createSadeSatiPhase(startDate: Date, startSign: number): SadeSatiPhase {
  return {
    phase: 'first',
    startDate,
    endDate: new Date(startDate.getTime() + 7.5 * 365.25 * 24 * 60 * 60 * 1000),
    currentSign: ZODIAC_SIGNS[startSign] ?? 'Unknown',
    description: 'Upcoming Sade Sati period.',
    remedies: [
      'Prepare mentally and spiritually',
      'Strengthen your Saturn through good deeds',
      'Start regular meditation practice',
    ],
  };
}

function calculateNextSaturnEntry(targetSign: number, fromDate: Date): Date {
  // Saturn takes ~2.5 years per sign
  const currentPositions = calculateTransitPositions(fromDate);
  const saturnPos = currentPositions.find(p => p.planet === 'Saturn');
  if (!saturnPos) return new Date(fromDate.getTime() + 365 * 24 * 60 * 60 * 1000);

  const signsToTravel = (targetSign - saturnPos.signIndex + 12) % 12;
  const yearsToWait = signsToTravel * 2.5;
  
  const nextDate = new Date(fromDate);
  nextDate.setFullYear(nextDate.getFullYear() + Math.floor(yearsToWait));
  return nextDate;
}

function estimatePhaseStart(phase: 'first' | 'second' | 'third', today: Date): Date {
  // Approximate - Saturn spends ~2.5 years per sign
  const monthsBack = phase === 'first' ? 0 : phase === 'second' ? 30 : 60;
  const start = new Date(today);
  start.setMonth(start.getMonth() - (monthsBack % 12));
  return start;
}

function estimatePhaseEnd(phase: 'first' | 'second' | 'third', today: Date): Date {
  const monthsAhead = phase === 'first' ? 30 : phase === 'second' ? 60 : 90;
  const end = new Date(today);
  end.setMonth(end.getMonth() + (monthsAhead % 12));
  return end;
}

// ─── Transit Effects ───────────────────────────────────────────────────────────

/**
 * Calculate transit effects on natal chart
 */
export function calculateTransitEffects(
  natalPlanets: { name: string; signIndex: number; house: number }[],
  transitPositions: TransitPosition[],
  ascendantSign: number
): TransitEffect[] {
  const effects: TransitEffect[] = [];

  for (const transit of transitPositions) {
    for (const natal of natalPlanets) {
      // Calculate aspect
      const aspect = calculateAspect(transit.signIndex, natal.signIndex);
      
      if (aspect.type !== 'none') {
        const effect = determineTransitEffect(transit.planet, natal.name, aspect.type);
        effects.push({
          planet: transit.planet,
          natalHouse: natal.house,
          transitHouse: ((transit.signIndex - ascendantSign + 12) % 12) + 1,
          aspectType: aspect.type,
          effect: effect.type,
          strength: aspect.strength,
          description: effect.description,
        });
      }
    }
  }

  return effects;
}

function calculateAspect(transitSign: number, natalSign: number): { type: TransitEffect['aspectType']; strength: TransitEffect['strength'] } {
  const diff = Math.abs(transitSign - natalSign);
  const aspectDiff = Math.min(diff, 12 - diff);

  if (aspectDiff === 0) {
    return { type: 'conjunction', strength: 'strong' };
  } else if (aspectDiff === 2) {
    return { type: 'sextile', strength: 'moderate' };
  } else if (aspectDiff === 3) {
    return { type: 'square', strength: 'strong' };
  } else if (aspectDiff === 4) {
    return { type: 'trine', strength: 'strong' };
  } else if (aspectDiff === 6) {
    return { type: 'opposition', strength: 'strong' };
  }

  return { type: 'none', strength: 'weak' };
}

function determineTransitEffect(
  transitPlanet: string,
  natalPlanet: string,
  aspectType: TransitEffect['aspectType']
): { type: TransitEffect['effect']; description: string } {
  // Benefic planets
  const benefics = ['Jupiter', 'Venus', 'Mercury'];
  // Malefic planets
  const malefics = ['Saturn', 'Mars', 'Rahu', 'Ketu'];

  const isBenefic = benefics.includes(transitPlanet);
  const isMalefic = malefics.includes(transitPlanet);

  if (aspectType === 'conjunction' || aspectType === 'trine') {
    if (isBenefic) {
      return {
        type: 'positive',
        description: `${transitPlanet} transiting in ${aspectType} to ${natalPlanet} brings positive outcomes and growth opportunities.`,
      };
    } else if (isMalefic) {
      return {
        type: 'negative',
        description: `${transitPlanet} transiting in ${aspectType} to ${natalPlanet} may bring challenges and obstacles.`,
      };
    }
  } else if (aspectType === 'square' || aspectType === 'opposition') {
    if (isBenefic) {
      return {
        type: 'neutral',
        description: `${transitPlanet} transiting in ${aspectType} to ${natalPlanet} brings mixed results with some challenges.`,
      };
    } else if (isMalefic) {
      return {
        type: 'negative',
        description: `${transitPlanet} transiting in ${aspectType} to ${natalPlanet} brings significant challenges and delays.`,
      };
    }
  } else if (aspectType === 'sextile') {
    return {
      type: 'positive',
      description: `${transitPlanet} transiting in sextile to ${natalPlanet} brings opportunities and positive developments.`,
    };
  }

  return {
    type: 'neutral',
    description: `${transitPlanet} transiting in ${aspectType} to ${natalPlanet} - neutral effect.`,
  };
}

// ─── Double Transit ────────────────────────────────────────────────────────────

/**
 * Calculate Double Transit (Jupiter + Saturn) effects
 */
export function calculateDoubleTransit(
  jupiterSign: number,
  saturnSign: number,
  ascendantSign: number
): DoubleTransit {
  // Jupiter aspects: 5th, 7th, 9th from itself
  const jupiterAspects = [
    jupiterSign,
    (jupiterSign + 4) % 12,
    (jupiterSign + 6) % 12,
    (jupiterSign + 8) % 12,
  ];

  // Saturn aspects: 3rd, 7th, 10th from itself
  const saturnAspects = [
    saturnSign,
    (saturnSign + 2) % 12,
    (saturnSign + 6) % 12,
    (saturnSign + 9) % 12,
  ];

  // Find common aspected houses
  const aspectedHouses = jupiterAspects
    .filter(sign => saturnAspects.includes(sign))
    .map(sign => ((sign - ascendantSign + 12) % 12) + 1);

  // Determine effect
  let effect: string;
  if (aspectedHouses.length > 0) {
    effect = `Jupiter and Saturn both aspect houses ${aspectedHouses.join(', ')}. This double transit brings significant changes in these areas of life. The combination of Jupiter's expansion and Saturn's discipline creates transformative results.`;
  } else {
    effect = 'No significant double transit effects at this time.';
  }

  return {
    jupiterSign: ZODIAC_SIGNS[jupiterSign] ?? 'Unknown',
    saturnSign: ZODIAC_SIGNS[saturnSign] ?? 'Unknown',
    aspectedHouses,
    effect,
    duration: 'Varies based on planetary motion',
  };
}

/**
 * Alias for calculateDoubleTransit with test-compatible signature
 */
export function analyzeDoubleTransit(date: Date, ascendantSign: number): DoubleTransit {
  const positions = calculateTransitPositions(date);
  const jupiter = positions.find(p => p.planet === 'Jupiter');
  const saturn = positions.find(p => p.planet === 'Saturn');
  
  return calculateDoubleTransit(
    jupiter?.signIndex || 0,
    saturn?.signIndex || 0,
    ascendantSign
  );
}

// ─── Transit Predictions ───────────────────────────────────────────────────────

/**
 * Generate transit predictions for upcoming period
 */
export function generateTransitPredictions(
  startDate: Date,
  months: number,
  moonSignIndex: number,
  ascendantSign: number
): TransitPrediction[] {
  const predictions: TransitPrediction[] = [];
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + months);

  // Major transit events — which planets to flag for retrograde events
  const retrogradePlanets = new Set(['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']);

  const currentDate = new Date(startDate);
  while (currentDate < endDate) {
    const positions = calculateTransitPositions(currentDate);

    // Check for significant transits
    for (const pos of positions) {
      // Transit over natal Moon
      if (pos.signIndex === moonSignIndex) {
        predictions.push({
          date: new Date(currentDate),
          planet: pos.planet,
          event: `${pos.planet} transiting over natal Moon sign`,
          effect: getTransitOverMoonEffect(pos.planet),
          duration: getTransitDuration(pos.planet),
          intensity: pos.planet === 'Saturn' ? 9 : pos.planet === 'Jupiter' ? 7 : 5,
        });
      }

      // Transit over ascendant
      if (pos.signIndex === ascendantSign) {
        predictions.push({
          date: new Date(currentDate),
          planet: pos.planet,
          event: `${pos.planet} transiting over Ascendant`,
          effect: getTransitOverAscendantEffect(pos.planet),
          duration: getTransitDuration(pos.planet),
          intensity: pos.planet === 'Saturn' ? 8 : pos.planet === 'Jupiter' ? 6 : 4,
        });
      }

      // Retrograde events — flag when a major planet is retrograde
      if (retrogradePlanets.has(pos.planet) && pos.isRetrograde) {
        predictions.push({
          date: new Date(currentDate),
          planet: pos.planet,
          event: `${pos.planet} retrograde in ${pos.sign}`,
          effect: `${pos.planet} is retrograde — review and reassess matters related to this planet. Avoid starting new ventures under ${pos.planet}'s domain.`,
          duration: getTransitDuration(pos.planet),
          intensity: pos.planet === 'Mercury' ? 7 : pos.planet === 'Saturn' ? 8 : 6,
        });
      }
    }

    // Move to next week
    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Sort by intensity and date
  predictions.sort((a, b) => {
    if (b.intensity !== a.intensity) return b.intensity - a.intensity;
    return a.date.getTime() - b.date.getTime();
  });

  return predictions.slice(0, 20); // Return top 20 predictions
}

function getTransitOverMoonEffect(planet: string): string {
  const effects: Record<string, string> = {
    Sun: 'Increased vitality and focus. Good for self-expression and leadership activities.',
    Moon: 'Emotional sensitivity heightened. Good for introspection and family matters.',
    Mars: 'Increased energy but potential for conflicts. Channel energy constructively.',
    Mercury: 'Enhanced communication and intellectual activities. Good for learning.',
    Jupiter: 'Excellent for spiritual growth, wisdom, and expansion. Auspicious period.',
    Venus: 'Good for relationships, creativity, and material comforts.',
    Saturn: 'Challenging period requiring patience and discipline. Focus on long-term goals.',
    Rahu: 'Intense desires and ambitions. Be cautious of illusions and obsessions.',
    Ketu: 'Spiritual insights and detachment. Good for meditation and inner work.',
  };
  return effects[planet] || 'General transit effect.';
}

function getTransitOverAscendantEffect(planet: string): string {
  const effects: Record<string, string> = {
    Sun: 'Personal confidence and visibility increase. Good for self-promotion.',
    Moon: 'Emotional and intuitive period. Focus on home and family.',
    Mars: 'High energy and assertiveness. Be mindful of impulsiveness.',
    Mercury: 'Mental clarity and communication skills enhanced.',
    Jupiter: 'Blessed period for growth, wisdom, and good fortune.',
    Venus: 'Attractive and harmonious period. Good for relationships.',
    Saturn: 'Testing period requiring hard work and responsibility.',
    Rahu: 'Ambitious period with potential for material success.',
    Ketu: 'Spiritual period favoring detachment and inner growth.',
  };
  return effects[planet] || 'General transit effect.';
}

function getTransitDuration(planet: string): string {
  const durations: Record<string, string> = {
    Sun: '1 month',
    Moon: '2.25 days',
    Mars: '1.5 months',
    Mercury: '1 month',
    Jupiter: '1 year',
    Venus: '1 month',
    Saturn: '2.5 years',
    Rahu: '1.5 years',
    Ketu: '1.5 years',
  };
  return durations[planet] || 'Varies';
}

// ─── Current Transit Summary ───────────────────────────────────────────────────

/**
 * Get current transit summary
 */
export function getCurrentTransitSummary(): {
  date: Date;
  positions: TransitPosition[];
  majorEvents: string[];
  auspiciousPeriods: string[];
  challengingPeriods: string[];
} {
  const today = new Date();
  const positions = calculateTransitPositions(today);
  const majorEvents: string[] = [];
  const auspiciousPeriods: string[] = [];
  const challengingPeriods: string[] = [];

  for (const pos of positions) {
    // Check for retrograde
    if (pos.isRetrograde) {
      majorEvents.push(`${pos.planet} is retrograde in ${pos.sign}`);
    }

    // Check for sign changes (approximate)
    if (pos.degree < 3) {
      majorEvents.push(`${pos.planet} recently entered ${pos.sign}`);
    } else if (pos.degree > 27) {
      majorEvents.push(`${pos.planet} about to leave ${pos.sign}`);
    }

    // Categorize periods
    if (['Jupiter', 'Venus'].includes(pos.planet) && !pos.isRetrograde) {
      auspiciousPeriods.push(`${pos.planet} in ${pos.sign} - favorable transit`);
    }

    if (['Saturn', 'Mars', 'Rahu', 'Ketu'].includes(pos.planet) && pos.isRetrograde) {
      challengingPeriods.push(`${pos.planet} retrograde in ${pos.sign} - challenging period`);
    }
  }

  return {
    date: today,
    positions,
    majorEvents,
    auspiciousPeriods,
    challengingPeriods,
  };
}

export {
  ZODIAC_SIGNS,
  NAKSHATRAS,
  PLANET_SPEEDS,
  PLANET_ORBITAL_PERIODS,
};
