import { PlanetPosition } from './astronomy';

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export const RASHI_NAMES = ZODIAC_SIGNS;

export const PLANETS = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'
];

export const SANSKRIT_PLANETS = [
  'Surya', 'Chandra', 'Mangal', 'Budh', 'Guru', 'Shukra', 'Shani', 'Rahu', 'Ketu'
];

export const SIGN_RULERS: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter'
};

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

export const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu',
  'Jupiter', 'Saturn', 'Mercury', 'Ketu', 'Venus', 'Sun',
  'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu',
  'Jupiter', 'Saturn', 'Mercury'
];

export const AYANAMSA = 23.85; // Default for J2000.0 approximately

// Lahiri Ayanamsa calculation
export function getAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  return 23.85306 + (50.317 / 3600) * (T * 100);
}

export function tropicalToSidereal(tropical: number, jd: number = 2451545.0): number {
  const ayanamsa = getAyanamsa(jd);
  let sidereal = tropical - ayanamsa;
  while (sidereal < 0) sidereal += 360;
  while (sidereal >= 360) sidereal -= 360;
  return sidereal;
}

export function getZodiacSign(longitude: number): { sign: string; signIndex: number; degree: number } {
  const signIndex = Math.floor(longitude / 30) % 12;
  const degree = longitude % 30;
  return {
    sign: ZODIAC_SIGNS[signIndex] ?? 'Unknown',
    signIndex,
    degree
  };
}

export function getNakshatra(longitude: number): { nakshatra: string; nakshatraIndex: number; pada: number; lord: string } {
  const nakshatraSpan = 360 / 27;
  const nakshatraIndex = Math.floor(longitude / nakshatraSpan) % 27;
  const positionInNakshatra = longitude % nakshatraSpan;
  const pada = Math.floor(positionInNakshatra / (nakshatraSpan / 4)) + 1;

  return {
    nakshatra: NAKSHATRAS[nakshatraIndex] ?? 'Unknown',
    nakshatraIndex,
    pada,
    lord: NAKSHATRA_LORDS[nakshatraIndex] ?? 'Unknown'
  };
}

export interface VedicPlanetData {
  name: string;
  sanskritName: string;
  longitude: number;
  siderealLongitude: number;
  sign: string;
  signIndex: number;
  degree: number;
  nakshatra: string;
  nakshatraPada: number;
  nakshatraLord: string;
  house: number;
  isRetrograde: boolean;
  speed: number; // Daily speed in degrees
  lordOfHouses?: number[]; // Houses this planet rules in the chart
}

export function convertToVedicPlanet(
  planetName: string,
  sanskritName: string,
  position: PlanetPosition,
  ascendant: number,
  jd: number,
  isRetrograde: boolean = false
): VedicPlanetData {
  const siderealLong = tropicalToSidereal(position.longitude, jd);
  const signData = getZodiacSign(siderealLong);
  const nakshatraData = getNakshatra(siderealLong);
  
  const siderealAsc = tropicalToSidereal(ascendant, jd);
  let house = Math.floor((siderealLong - siderealAsc + 360) / 30) % 12 + 1;
  if (house < 1) house += 12;
  
  return {
    name: planetName,
    sanskritName,
    longitude: position.longitude,
    siderealLongitude: siderealLong,
    sign: signData.sign,
    signIndex: signData.signIndex,
    degree: signData.degree,
    nakshatra: nakshatraData.nakshatra,
    nakshatraPada: nakshatraData.pada,
    nakshatraLord: nakshatraData.lord,
    house,
    isRetrograde,
    speed: position.speed
  };
}

export interface DashaPeriod {
  planet: string;
  startDate: Date;
  endDate: Date;
  years: number;
}

const DASHA_YEARS: { [key: string]: number } = {
  'Ketu': 7,
  'Venus': 20,
  'Sun': 6,
  'Moon': 10,
  'Mars': 7,
  'Rahu': 18,
  'Jupiter': 16,
  'Saturn': 19,
  'Mercury': 17
};

const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

export function calculateVimshottariDasha(birthDate: Date, moonLongitude: number, jd: number = 2451545.0): DashaPeriod[] {
  const siderealMoon = tropicalToSidereal(moonLongitude, jd);
  const nakshatraData = getNakshatra(siderealMoon);
  
  const startPlanetIndex = DASHA_ORDER.indexOf(nakshatraData.lord);
  
  const nakshatraSpan = 360 / 27;
  const positionInNakshatra = siderealMoon % nakshatraSpan;
  const fractionCompleted = positionInNakshatra / nakshatraSpan;
  const remainingYears = (DASHA_YEARS[nakshatraData.lord] ?? 10) * (1 - fractionCompleted);
  
  const dashas: DashaPeriod[] = [];
  let currentDate = new Date(birthDate);
  let totalYearsAdded = 0;
  
  for (let i = 0; i < DASHA_ORDER.length + 1; i++) {
    const planetIndex = (startPlanetIndex + i) % DASHA_ORDER.length;
    const planet = DASHA_ORDER[planetIndex] ?? 'Unknown';
    let years = DASHA_YEARS[planet] ?? 10;
    
    if (i === 0) {
      years = remainingYears;
    } else if (i === DASHA_ORDER.length) {
      // The 10th period is the remaining part of the first planet to complete 120 years
      years = (DASHA_YEARS[planet] ?? 10) - remainingYears;
      if (years <= 0) break;
    }
    
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    const fullYears = Math.floor(years);
    const partialYearDays = Math.floor((years % 1) * 365.25);
    
    endDate.setFullYear(endDate.getFullYear() + fullYears);
    endDate.setDate(endDate.getDate() + partialYearDays);
    
    dashas.push({
      planet,
      startDate,
      endDate,
      years
    });
    
    currentDate = new Date(endDate);
    totalYearsAdded += years;
    
    if (totalYearsAdded >= 119.9 && dashas.length >= 9) break;
  }
  
  return dashas.slice(0, 10);
}

export function calculateHouseCusps(ascendant: number, jd: number = 2451545.0): number[] {
  const siderealAsc = tropicalToSidereal(ascendant, jd);
  const cusps: number[] = [];
  
  for (let i = 0; i < 12; i++) {
    cusps.push((siderealAsc + i * 30) % 360);
  }
  
  return cusps;
}

export interface YogaResult {
  name: string;
  description: string;
  strength: 'Strong' | 'Moderate' | 'Weak';
}

export function detectYogas(planets: VedicPlanetData[]): YogaResult[] {
  const yogas: YogaResult[] = [];
  
  const jupiter = planets.find(p => p.name === 'Jupiter');
  const moon = planets.find(p => p.name === 'Moon');
  
  if (jupiter && moon && jupiter.house === moon.house) {
    yogas.push({
      name: 'Gaja Kesari Yoga',
      description: 'Jupiter and Moon together bring wisdom, wealth, and prosperity',
      strength: 'Strong'
    });
  }
  
  const sun = planets.find(p => p.name === 'Sun');
  if (sun && (sun.house === 1 || sun.house === 10)) {
    yogas.push({
      name: 'Raja Yoga',
      description: 'Sun in 1st or 10th house indicates leadership and authority',
      strength: 'Moderate'
    });
  }
  
  const venus = planets.find(p => p.name === 'Venus');
  const mercury = planets.find(p => p.name === 'Mercury');
  if (venus && mercury && Math.abs(venus.house - mercury.house) <= 1) {
    yogas.push({
      name: 'Budhaditya Yoga',
      description: 'Venus and Mercury together bring artistic talents and intelligence',
      strength: 'Moderate'
    });
  }
  
  return yogas;
}

export function getPlanetStrength(planet: VedicPlanetData): number {
  let strength = 50;
  
  const exaltedSigns: { [key: string]: number } = {
    'Sun': 0,
    'Moon': 1,
    'Mars': 9,
    'Mercury': 5,
    'Jupiter': 3,
    'Venus': 11,
    'Saturn': 6
  };
  
  if (exaltedSigns[planet.name] === planet.signIndex) {
    strength += 30;
  }
  
  const debilitatedSigns: { [key: string]: number } = {
    'Sun': 6,
    'Moon': 7,
    'Mars': 3,
    'Mercury': 11,
    'Jupiter': 9,
    'Venus': 5,
    'Saturn': 0
  };
  
  if (debilitatedSigns[planet.name] === planet.signIndex) {
    strength -= 30;
  }
  
  if ([1, 4, 7, 10].includes(planet.house)) {
    strength += 10;
  }
  
  if ([6, 8, 12].includes(planet.house)) {
    strength -= 15;
  }
  
  if (planet.isRetrograde) {
    strength += 10;
  }
  
  return Math.max(0, Math.min(100, strength));
}

/**
 * Identifies which planet rules a specific house based on the Ascendant.
 */
export function getHouseLord(houseNum: number, lagnaSignIndex: number): string {
  const signIndex = (lagnaSignIndex + houseNum - 1) % 12;
  const signName = ZODIAC_SIGNS[signIndex] || 'Aries';
  return SIGN_RULERS[signName] || 'Sun';
}

/**
 * Returns all houses ruled by a specific planet for a given Ascendant.
 */
export function getHousesRuledByPlanet(planetName: string, lagnaSignIndex: number): number[] {
  const ruledHouses: number[] = [];
  for (let h = 1; h <= 12; h++) {
    const lord = getHouseLord(h, lagnaSignIndex);
    if (lord === planetName) ruledHouses.push(h);
  }
  return ruledHouses;
}

/**
 * Generates a technical lordship placement string (e.g., "5th lord in 10th house").
 */
export function getLordPlacementString(planet: VedicPlanetData, lagnaSignIndex: number): string {
  const houses = getHousesRuledByPlanet(planet.name, lagnaSignIndex);
  if (houses.length === 0) return '';
  
  const houseStr = houses.map(h => {
    const suffix = h === 1 ? 'st' : h === 2 ? 'nd' : h === 3 ? 'rd' : 'th';
    return `${h}${suffix}`;
  }).join(' & ');
  
  const posSuffix = planet.house === 1 ? 'st' : planet.house === 2 ? 'nd' : planet.house === 3 ? 'rd' : 'th';
  return `${houseStr} Lord in ${planet.house}${posSuffix} House`;
}
