/**
 * KP (Krishnamurti Paddhati) Astrology Engine
 *
 * 100% local — no API key, no internet required.
 * Uses planet longitudes from VedAstro (or fallback).
 *
 * What is KP?
 *   K.S. Krishnamurti (1908–1972) refined Vedic astrology by adding
 *   a third level of subdivision: Sign → Star (Nakshatra) → Sub-Lord.
 *   The Sub-Lord is the final deciding factor for any event.
 *
 * Core concepts implemented:
 *   1. Sub-Lord table (249 fixed subdivisions of the zodiac)
 *   2. Sign Lord / Star Lord / Sub Lord for every planet & cusp
 *   3. Placidus house cusps (KP uses unequal houses, not whole-sign)
 *   4. Significators of each house (planet → houses it signifies)
 *   5. KP Ruling Planets (for the current moment)
 *   6. Event prediction (yes/no) for a queried house
 *   7. Horary (Prashna) chart from a number 1–249
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const ZODIAC = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const ZODIAC_LORDS: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

// KP uses a slightly different ayanamsa (Krishnamurti ayanamsa)
// It is ~6 arcminutes less than Lahiri
// KP_AYANAMSA = Lahiri - 0.1 degrees (approx)
export const KP_AYANAMSA_OFFSET = -0.1; // degrees to subtract from Lahiri

// Vimshottari Dasha order and years (same as Parashari)
const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};
const TOTAL_DASHA_YEARS = 120;

// 27 Nakshatras with their lords (in order)
const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', // 1–9
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', // 10–18
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', // 19–27
];

const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

// Each nakshatra = 13°20' = 800 arcminutes
const NAKSHATRA_SPAN = 800 / 60; // degrees

// ─── Sub-Lord Table ───────────────────────────────────────────────────────────

export interface SubLordEntry {
  startDeg: number;   // start longitude (0–360)
  endDeg: number;     // end longitude
  signLord: string;
  starLord: string;
  subLord: string;
  nakshatra: string;
  nakshatraIndex: number; // 0-based
  pada: number;           // 1–4
}

/**
 * Build the complete KP Sub-Lord table (249 entries).
 * This is a fixed mathematical table — computed once, valid for all time.
 *
 * Algorithm:
 *   - Zodiac = 360° = 27 nakshatras × 13°20'
 *   - Each nakshatra is divided into 9 sub-lords proportional to Vimshottari years
 *   - Sub-lord sequence starts from the nakshatra lord itself
 */
function buildSubLordTable(): SubLordEntry[] {
  const table: SubLordEntry[] = [];
  let currentDeg = 0;

  for (let nakIdx = 0; nakIdx < 27; nakIdx++) {
    const starLord = NAKSHATRA_LORDS[nakIdx] ?? 'Ketu';
    const nakshatra = NAKSHATRA_NAMES[nakIdx] ?? 'Unknown';
    const startPos = DASHA_ORDER.indexOf(starLord);

    for (let subIdx = 0; subIdx < 9; subIdx++) {
      const subLordIndex = startPos >= 0 ? (startPos + subIdx) % 9 : subIdx % 9;
      const subLord = DASHA_ORDER[subLordIndex] ?? 'Ketu';
      let subSpan = ((DASHA_YEARS[subLord] ?? 7) / TOTAL_DASHA_YEARS) * NAKSHATRA_SPAN;

      // Check if this sub-division crosses a sign boundary (every 30°)
      const nextSignBoundary = Math.floor(currentDeg / 30 + 1e-10 + 1) * 30;
      const EPS = 1e-10;
      
      if (currentDeg + subSpan > nextSignBoundary + EPS && nextSignBoundary < 360) {
        // Split into two entries
        const firstPartSpan = nextSignBoundary - currentDeg;
        
        // First part
        table.push(createEntry(currentDeg, nextSignBoundary, starLord, subLord, nakshatra, nakIdx));
        
        // Second part
        currentDeg = nextSignBoundary;
        subSpan -= firstPartSpan;
        table.push(createEntry(currentDeg, currentDeg + subSpan, starLord, subLord, nakshatra, nakIdx));
      } else {
        table.push(createEntry(currentDeg, currentDeg + subSpan, starLord, subLord, nakshatra, nakIdx));
      }

      currentDeg += subSpan;
    }
  }

  return table;
}

function createEntry(startDeg: number, endDeg: number, starLord: string, subLord: string, nakshatra: string, nakIdx: number): SubLordEntry {
  const degInNak = startDeg - (nakIdx * NAKSHATRA_SPAN);
  const pada = Math.floor(degInNak / (NAKSHATRA_SPAN / 4)) + 1;
  const signIndex = Math.floor(startDeg / 30) % 12;
  const signLord = ZODIAC_LORDS[ZODIAC[signIndex] ?? 'Aries'] ?? 'Mars';

  return {
    startDeg,
    endDeg,
    signLord,
    starLord,
    subLord,
    nakshatra,
    nakshatraIndex: nakIdx,
    pada: Math.min(pada, 4),
  };
}

// Build once at module load — this is a fixed table
const SUB_LORD_TABLE: SubLordEntry[] = buildSubLordTable();

/**
 * Look up Sign Lord, Star Lord, Sub Lord for a given longitude.
 */
export function getSubLord(longitude: number): SubLordEntry {
  const norm = ((longitude % 360) + 360) % 360;
  const entry = SUB_LORD_TABLE.find(e => norm >= e.startDeg && norm < e.endDeg);
  return entry ?? SUB_LORD_TABLE[0]!;
}

// ─── KP Planet Data ───────────────────────────────────────────────────────────

export interface KPPlanet {
  name: string;
  longitude: number;      // KP sidereal longitude (Lahiri - 0.1°)
  sign: string;
  signIndex: number;
  degree: number;         // degree within sign
  nakshatra: string;
  pada: number;
  signLord: string;
  starLord: string;
  subLord: string;
  isRetrograde: boolean;
  house: number;          // Placidus house (1–12)
  housesSignified: number[]; // houses this planet signifies
}

export interface KPCusp {
  house: number;          // 1–12
  longitude: number;      // KP sidereal longitude
  sign: string;
  signIndex: number;
  degree: number;
  signLord: string;
  starLord: string;
  subLord: string;        // THE KEY in KP — determines if house events happen
}

// ─── KP House Cusps (Placidus House System) ──────────────────────────────────

const _DEG = Math.PI / 180;
const _RAD = 180 / Math.PI;

/**
 * Normalize any angle into [0, 360).
 */
function normalizeDeg(d: number): number {
  d = d % 360;
  return d < 0 ? d + 360 : d;
}

/**
 * Calculate tropical Midheaven (MC) from RAMC and obliquity.
 * MC = atan(tan(RAMC) / cos(ε))
 */
function calcMC(ramc: number, obliquity: number): number {
  const ramcRad = ramc * _DEG;
  const epsRad = obliquity * _DEG;
  let mc = Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(epsRad)) * _RAD;
  mc = normalizeDeg(mc);
  // MC must be in the same hemisphere as RAMC
  const ramcNorm = normalizeDeg(ramc);
  if (ramcNorm >= 180 && mc < 180) mc += 180;
  else if (ramcNorm < 180 && mc >= 180) mc += 180;
  mc = normalizeDeg(mc);
  return mc;
}

/**
 * Calculate tropical Ascendant from RAMC, obliquity, and latitude.
 * ASC = atan2(-cos(RAMC), sin(ε)·tan(φ) + cos(ε)·sin(RAMC))
 */
function calcASC(ramc: number, obliquity: number, latitude: number): number {
  const ramcRad = ramc * _DEG;
  const epsRad = obliquity * _DEG;
  const latRad = latitude * _DEG;
  const y = -Math.cos(ramcRad);
  const x = Math.sin(epsRad) * Math.tan(latRad) + Math.cos(epsRad) * Math.sin(ramcRad);
  let asc = Math.atan2(y, x) * _RAD;
  asc = normalizeDeg(asc);
  return asc;
}

/**
 * Placidus intermediate cusp solver.
 *
 * For a given fraction `f` of the semi-arc, iteratively solve for the
 * ecliptic longitude where the altitude equals f × (semi-arc altitude).
 *
 * This is the classical Placidus algorithm:
 *   tan(δ) = tan(ε) · sin(λ)
 *   AD = asin(tan(δ) · tan(φ))
 *   SA = 90 + AD  (diurnal) or  SA = 90 - AD (nocturnal)
 *   We find λ such that RAMC + f·SA = RA of λ
 *
 * @param ramc   Right Ascension of MC (degrees)
 * @param eps    Obliquity of the ecliptic (degrees)
 * @param lat    Geographic latitude (degrees)
 * @param f      Fraction of the semi-arc (e.g. 1/3, 2/3)
 * @param isDiurnal  true for houses above horizon (10→1), false for below (4→7)
 * @returns Ecliptic longitude of the cusp (tropical, degrees)
 */
function placidusIterate(
  ramc: number,
  eps: number,
  lat: number,
  f: number,
  isDiurnal: boolean
): number | null {
  const epsRad = eps * _DEG;
  const latRad = lat * _DEG;
  const tanLat = Math.tan(latRad);
  const MAX_ITER = 50;
  const TOLERANCE = 1e-7; // ~0.00036 arc-seconds — professional precision

  // Initial guess: equal-house position
  let lambda = normalizeDeg(ramc + f * (isDiurnal ? 90 : 270));

  for (let i = 0; i < MAX_ITER; i++) {
    const lambdaRad = lambda * _DEG;
    // Declination of the ecliptic point
    const sinDec = Math.sin(epsRad) * Math.sin(lambdaRad);
    // Guard against impossible declinations at extreme latitudes
    const adArg = sinDec * tanLat;
    if (Math.abs(adArg) >= 1) return null; // Placidus fails here

    const AD = Math.asin(adArg) * _RAD; // Ascensional Difference
    const SA = isDiurnal ? (90 + AD) : (90 - AD); // Semi-Arc

    // Right Ascension of the ecliptic point
    const RA = Math.atan2(
      Math.cos(epsRad) * Math.sin(lambdaRad),
      Math.cos(lambdaRad)
    ) * _RAD;

    // Target RA based on fraction of semi-arc
    let targetRA: number;
    if (isDiurnal) {
      targetRA = normalizeDeg(ramc + f * SA);
    } else {
      targetRA = normalizeDeg(ramc + 180 + f * SA);
    }

    const raNorm = normalizeDeg(RA);
    let diff = targetRA - raNorm;
    // Normalize difference to [-180, 180]
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (Math.abs(diff) < TOLERANCE) break;

    lambda = normalizeDeg(lambda + diff);
  }

  return normalizeDeg(lambda);
}

/**
 * Calculate KP house cusps using the Placidus House System.
 *
 * This is the industry-standard house system for KP (Krishnamurti Paddhati).
 * Unlike Equal Houses where every house is 30°, Placidus houses are UNEQUAL
 * and based on the time it takes for a degree of the ecliptic to travel
 * from one point to another.
 *
 * The algorithm:
 *   1. MC (10th cusp) = atan(tan(RAMC) / cos(ε))
 *   2. ASC (1st cusp) = standard ascendant formula
 *   3. IC (4th cusp) = MC + 180°
 *   4. DSC (7th cusp) = ASC + 180°
 *   5. Cusps 11, 12, 2, 3 are solved iteratively using semi-arc fractions
 *   6. Cusps 5, 6, 8, 9 are opposite to 11, 12, 2, 3
 *
 * Falls back gracefully to Equal Houses for latitudes > 60° where
 * the Placidus algorithm can fail mathematically.
 *
 * @param ascendantLongitude  Sidereal longitude of the ascendant (KP-adjusted)
 * @param latitude            Geographic latitude of birth place
 * @param ramc                Right Ascension of Midheaven (degrees)
 * @param obliquity           Obliquity of the ecliptic (degrees, ~23.44)
 */
export function calculateKPPlacidusCusps(
  ascendantLongitude: number,
  latitude: number,
  ramc: number,
  obliquity: number = 23.4393
): KPCusp[] {
  // For extreme latitudes (>60°N/S), Placidus can fail. Use equal houses as fallback.
  if (Math.abs(latitude) > 60) {
    return calculateKPEqualCuspsFallback(ascendantLongitude);
  }

  // Calculate the 4 angular cusps (tropical)
  const mcTropical = calcMC(ramc, obliquity);
  const ascTropical = calcASC(ramc, obliquity, latitude);
  const icTropical = normalizeDeg(mcTropical + 180);
  const dscTropical = normalizeDeg(ascTropical + 180);

  // Calculate intermediate cusps via Placidus iteration
  // Diurnal semi-arc: MC → ASC (cusps 11, 12)
  const cusp11Tropical = placidusIterate(ramc, obliquity, latitude, 1 / 3, true);
  const cusp12Tropical = placidusIterate(ramc, obliquity, latitude, 2 / 3, true);

  // Nocturnal semi-arc: IC → DSC (cusps 2, 3)
  const cusp2Tropical = placidusIterate(ramc, obliquity, latitude, 1 / 3, false);
  const cusp3Tropical = placidusIterate(ramc, obliquity, latitude, 2 / 3, false);

  // If any iteration failed, fall back to equal houses
  if (cusp11Tropical === null || cusp12Tropical === null ||
      cusp2Tropical === null || cusp3Tropical === null) {
    return calculateKPEqualCuspsFallback(ascendantLongitude);
  }

  // Build the 12-cusp array (tropical longitudes)
  // Opposite cusps: 5=11+180, 6=12+180, 8=2+180, 9=3+180
  const tropicalCusps: number[] = [
    ascTropical,                           // 1 - ASC
    cusp2Tropical,                         // 2
    cusp3Tropical,                         // 3
    icTropical,                            // 4 - IC
    normalizeDeg(cusp11Tropical + 180),    // 5
    normalizeDeg(cusp12Tropical + 180),    // 6
    dscTropical,                           // 7 - DSC
    normalizeDeg(cusp2Tropical + 180),     // 8
    normalizeDeg(cusp3Tropical + 180),     // 9
    mcTropical,                            // 10 - MC
    cusp11Tropical,                        // 11
    cusp12Tropical,                        // 12
  ];

  // Convert tropical cusps to sidereal (KP) using the difference between
  // the provided sidereal ascendant and the calculated tropical ascendant
  const ayanamsaOffset = normalizeDeg(ascTropical - ascendantLongitude);

  const cusps: KPCusp[] = tropicalCusps.map((tropLon, i) => {
    const siderealLon = normalizeDeg(tropLon - ayanamsaOffset);
    const signIndex = Math.floor(siderealLon / 30) % 12;
    const degree = siderealLon % 30;
    const entry = getSubLord(siderealLon);

    return {
      house: i + 1,
      longitude: siderealLon,
      sign: ZODIAC[signIndex] ?? 'Aries',
      signIndex,
      degree,
      signLord: entry.signLord,
      starLord: entry.starLord,
      subLord: entry.subLord,
    };
  });

  return cusps;
}

/**
 * Equal House fallback for extreme latitudes.
 * Used when Placidus iteration fails (|latitude| > 60°).
 */
function calculateKPEqualCuspsFallback(ascendantLongitude: number): KPCusp[] {
  const cusps: KPCusp[] = [];
  for (let i = 0; i < 12; i++) {
    const longitude = normalizeDeg(ascendantLongitude + i * 30);
    const signIndex = Math.floor(longitude / 30) % 12;
    const degree = longitude % 30;
    const entry = getSubLord(longitude);

    cusps.push({
      house: i + 1,
      longitude,
      sign: ZODIAC[signIndex] ?? 'Aries',
      signIndex,
      degree,
      signLord: entry.signLord,
      starLord: entry.starLord,
      subLord: entry.subLord,
    });
  }
  return cusps;
}

// ─── KP Planet Enrichment ─────────────────────────────────────────────────────

/**
 * Enrich planet data with KP-specific fields (Sign/Star/Sub lords, house significations).
 */
export function enrichPlanetsKP(
  planets: { name: string; longitude: number; house: number; isRetrograde: boolean }[],
  cusps: KPCusp[],
  _lahiriAyanamsa: number
): KPPlanet[] {
  return planets.map(p => {
    // Apply KP ayanamsa offset
    const kpLong = ((p.longitude + KP_AYANAMSA_OFFSET) % 360 + 360) % 360;
    const signIndex = Math.floor(kpLong / 30) % 12;
    const degree = kpLong % 30;
    const entry = getSubLord(kpLong);

    // Houses signified by this planet:
    // 1. House it occupies (strongest)
    // 2. Houses owned by its sign lord
    // 3. Houses owned by its star lord
    // 4. Houses owned by its sub lord
    const housesSignified = getHousesSignified(p.name, p.house, entry, planets, cusps);

    return {
      name: p.name,
      longitude: kpLong,
      sign: ZODIAC[signIndex] ?? 'Aries',
      signIndex,
      degree,
      nakshatra: entry.nakshatra,
      pada: entry.pada,
      signLord: entry.signLord,
      starLord: entry.starLord,
      subLord: entry.subLord,
      isRetrograde: p.isRetrograde,
      house: p.house,
      housesSignified,
    };
  });
}

/**
 * Get all houses a planet signifies (KP significator theory).
 */
function getHousesSignified(
  planetName: string,
  occupiedHouse: number,
  subLordEntry: SubLordEntry,
  allPlanets: { name: string; longitude: number; house: number; isRetrograde: boolean }[],
  cusps: KPCusp[]
): number[] {
  const houses = new Set<number>();

  // 1. House occupied
  houses.add(occupiedHouse);

  // 2. Houses owned (where this planet is the sign lord of the cusp)
  for (const cusp of cusps) {
    if (cusp.signLord === planetName) houses.add(cusp.house);
  }

  // 3. Houses signified through star lord
  const starLordPlanet = allPlanets.find(p => p.name === subLordEntry.starLord);
  if (starLordPlanet) {
    houses.add(starLordPlanet.house);
    for (const cusp of cusps) {
      if (cusp.signLord === subLordEntry.starLord) houses.add(cusp.house);
    }
  }

  return Array.from(houses).sort((a, b) => a - b);
}

// ─── KP Ruling Planets ────────────────────────────────────────────────────────

export interface KPRulingPlanets {
  dayLord: string;
  moonSignLord: string;
  moonStarLord: string;
  moonSubLord: string;
  ascendantSignLord: string;
  ascendantStarLord: string;
  ascendantSubLord: string;
  rulingPlanets: string[];  // unique, in order of strength
}

/**
 * Calculate KP Ruling Planets for the current moment.
 * Used to narrow down timing of events to specific days/hours.
 */
export function calculateKPRulingPlanets(
  moonLongitude: number,
  ascendantLongitude: number,
  currentDate: Date = new Date()
): KPRulingPlanets {
  const DAY_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const dayLord = DAY_LORDS[currentDate.getDay()] ?? 'Sun';

  const moonEntry = getSubLord(moonLongitude);
  const ascEntry = getSubLord(ascendantLongitude);

  const all = [
    dayLord,
    moonEntry.signLord,
    moonEntry.starLord,
    moonEntry.subLord,
    ascEntry.signLord,
    ascEntry.starLord,
    ascEntry.subLord,
  ];

  // Deduplicate while preserving order
  const rulingPlanets = all.filter((p, i) => all.indexOf(p) === i);

  return {
    dayLord,
    moonSignLord: moonEntry.signLord,
    moonStarLord: moonEntry.starLord,
    moonSubLord: moonEntry.subLord,
    ascendantSignLord: ascEntry.signLord,
    ascendantStarLord: ascEntry.starLord,
    ascendantSubLord: ascEntry.subLord,
    rulingPlanets: rulingPlanets as string[],
  };
}

// ─── KP Significators ─────────────────────────────────────────────────────────

export interface KPSignificator {
  house: number;
  planets: string[];        // all planets signifying this house
  cuspSubLord: string;      // THE key — if sub lord signifies the house, events happen
  isPromised: boolean;      // sub lord of cusp signifies the house itself
}

/**
 * Calculate significators for all 12 houses.
 */
export function calculateSignificators(
  kpPlanets: KPPlanet[],
  cusps: KPCusp[]
): KPSignificator[] {
  return cusps.map(cusp => {
    // Planets that signify this house
    const significators = kpPlanets
      .filter(p => p.housesSignified.includes(cusp.house))
      .map(p => p.name);

    // Is the event "promised"? — sub lord of the cusp must signify the house
    const subLordPlanet = kpPlanets.find(p => p.name === cusp.subLord);
    const isPromised = subLordPlanet
      ? subLordPlanet.housesSignified.includes(cusp.house)
      : false;

    return {
      house: cusp.house,
      planets: significators,
      cuspSubLord: cusp.subLord,
      isPromised,
    };
  });
}

// ─── Event Prediction ─────────────────────────────────────────────────────────

export interface KPEventPrediction {
  query: string;
  houses: number[];           // relevant houses for this query
  isPromised: boolean;        // will the event happen at all?
  significators: string[];    // planets that will time the event
  verdict: string;            // human-readable verdict
  strength: 'Strong' | 'Moderate' | 'Weak' | 'Not Promised';
}

/**
 * Calculate Equal House cusps for KP Prashna.
 * Each house is exactly 30 degrees.
 */
export function calculateKPEqualCusps(ascLongitude: number, _lat: number, _ayanamsa: number): KPCusp[] {
  const cusps: KPCusp[] = [];
  
  for (let i = 1; i <= 12; i++) {
    const longitude = (ascLongitude + (i - 1) * 30) % 360;
    const signIndex = Math.floor(longitude / 30) % 12;
    const sign = ZODIAC[signIndex] ?? 'Aries';
    const degree = longitude % 30;
    
    // In equal house, we don't calculate complex lords for every cusp usually,
    // but KP requires them for significator logic.
    const entry = SUB_LORD_TABLE.find(e => longitude >= e.startDeg && longitude < e.endDeg) 
               || SUB_LORD_TABLE[0]!;

    cusps.push({
      house: i,
      longitude,
      sign,
      signIndex,
      degree,
      signLord: entry.signLord,
      starLord: entry.starLord,
      subLord: entry.subLord,
    });
  }
  
  return cusps;
}

// House groups for common life events
const EVENT_HOUSES: Record<string, { houses: number[]; label: string }> = {
  marriage:     { houses: [2, 7, 11], label: 'Marriage / Partnership' },
  career:       { houses: [2, 6, 10, 11], label: 'Career / Job' },
  education:    { houses: [4, 9, 11], label: 'Education / Higher Studies' },
  travel:       { houses: [3, 9, 12], label: 'Foreign Travel / Settlement' },
  children:     { houses: [2, 5, 11], label: 'Children / Pregnancy' },
  property:     { houses: [4, 11, 12], label: 'Property / Real Estate' },
  health:       { houses: [1, 6, 8, 12], label: 'Health / Recovery' },
  finance:      { houses: [2, 6, 11], label: 'Financial Gains' },
  spirituality: { houses: [4, 8, 9, 12], label: 'Spirituality / Moksha' },
  litigation:   { houses: [6, 8, 11], label: 'Court Case / Legal Matters' },
};

/**
 * Predict whether a life event is promised in this chart.
 */
export function predictKPEvent(
  eventKey: string,
  kpPlanets: KPPlanet[],
  _cusps: KPCusp[],
  significators: KPSignificator[]
): KPEventPrediction {
  const eventInfo = EVENT_HOUSES[eventKey] ?? { houses: [1], label: eventKey };
  const { houses, label } = eventInfo;

  // Check if event is promised: sub lords of relevant cusps must signify those houses
  let promisedCount = 0;
  for (const houseNum of houses) {
    const sig = significators.find(s => s.house === houseNum);
    if (sig?.isPromised) promisedCount++;
  }

  const isPromised = promisedCount >= Math.ceil(houses.length / 2);

  // Find significator planets (those signifying ALL relevant houses)
  const eventSignificators = kpPlanets
    .filter(p => houses.every(h => p.housesSignified.includes(h)) ||
                 houses.filter(h => p.housesSignified.includes(h)).length >= 2)
    .map(p => p.name);

  const strength: KPEventPrediction['strength'] = !isPromised ? 'Not Promised' :
    promisedCount >= houses.length ? 'Strong' :
    promisedCount >= houses.length - 1 ? 'Moderate' : 'Weak';

  const verdict = !isPromised
    ? `${label} is NOT strongly promised in this chart. The sub-lords of relevant house cusps do not support this event.`
    : strength === 'Strong'
    ? `${label} is STRONGLY promised. All relevant house cusps support this event. Timing planets: ${eventSignificators.slice(0, 3).join(', ')}.`
    : `${label} is MODERATELY promised. Most relevant cusps support this event. Key planets: ${eventSignificators.slice(0, 3).join(', ')}.`;

  return {
    query: label,
    houses,
    isPromised,
    significators: eventSignificators,
    verdict,
    strength,
  };
}

// ─── Horary (Prashna) ─────────────────────────────────────────────────────────

export interface KPHoraryResult {
  number: number;         // 1–249
  ascendantLongitude: number;
  ascendantSign: string;
  ascendantSignLord: string;
  ascendantStarLord: string;
  ascendantSubLord: string;
}

/**
 * KP Horary: The querent picks a number 1–249.
 * Each number maps to a specific sub-lord division of the zodiac.
 * The ascendant is set to the midpoint of that sub-lord's span.
 */
export function calculateKPHorary(number: number): KPHoraryResult {
  const idx = Math.max(0, Math.min(248, number - 1));
  const entry = SUB_LORD_TABLE[idx];
  if (!entry) {
    return {
      number,
      ascendantLongitude: 0,
      ascendantSign: 'Aries',
      ascendantSignLord: 'Mars',
      ascendantStarLord: 'Ketu',
      ascendantSubLord: 'Ketu',
    };
  }
  const ascendantLongitude = (entry.startDeg + entry.endDeg) / 2;
  const signIndex = Math.floor(ascendantLongitude / 30) % 12;

  return {
    number,
    ascendantLongitude,
    ascendantSign: ZODIAC[signIndex] ?? 'Aries',
    ascendantSignLord: entry.signLord,
    ascendantStarLord: entry.starLord,
    ascendantSubLord: entry.subLord,
  };
}

// ─── Main KP Chart Generator ──────────────────────────────────────────────────

export interface KPChart {
  planets: KPPlanet[];
  cusps: KPCusp[];
  significators: KPSignificator[];
  rulingPlanets: KPRulingPlanets;
  predictions: KPEventPrediction[];
  ayanamsa: number;  // KP ayanamsa used
}

/**
 * Generate a complete KP chart from planet data.
 *
 * @param planets - Planet longitudes (sidereal, Lahiri) from VedAstro or fallback
 * @param ascendantLongitude - Ascendant sidereal longitude (Lahiri)
 * @param latitude - Geographic latitude of birth place
 * @param lahiriAyanamsa - Lahiri ayanamsa value
 * @param ramc - Right Ascension of Midheaven (degrees). Defaults to 0 for fallback.
 * @param obliquity - Obliquity of the ecliptic (degrees). Defaults to ~23.44.
 */
export function generateKPChart(
  planets: { name: string; longitude: number; house: number; isRetrograde: boolean }[],
  ascendantLongitude: number,
  latitude: number,
  _lahiriAyanamsa: number,
  ramc: number = 0,
  obliquity: number = 23.4393
): KPChart {
  const kpAyanamsa = _lahiriAyanamsa + KP_AYANAMSA_OFFSET;

  // Apply KP ayanamsa offset to ascendant
  const kpAscendant = ((ascendantLongitude + KP_AYANAMSA_OFFSET) % 360 + 360) % 360;

  // Calculate Placidus cusps (falls back to equal houses for extreme latitudes)
  const cusps = calculateKPPlacidusCusps(kpAscendant, latitude, ramc, obliquity);

  // Enrich planets with KP data
  const kpPlanets = enrichPlanetsKP(planets, cusps, _lahiriAyanamsa);

  // Calculate significators
  const significators = calculateSignificators(kpPlanets, cusps);

  // Ruling planets for today
  const moon = kpPlanets.find(p => p.name === 'Moon');
  const rulingPlanets = calculateKPRulingPlanets(
    moon?.longitude ?? 0,
    kpAscendant,
    new Date()
  );

  // Predict common life events
  const eventKeys = ['marriage', 'career', 'education', 'travel', 'children', 'finance'];
  const predictions = eventKeys.map(key =>
    predictKPEvent(key, kpPlanets, cusps, significators)
  );

  return {
    planets: kpPlanets,
    cusps,
    significators,
    rulingPlanets,
    predictions,
    ayanamsa: kpAyanamsa,
  };
}

// ─── Utility Exports ──────────────────────────────────────────────────────────

export { SUB_LORD_TABLE, EVENT_HOUSES };
