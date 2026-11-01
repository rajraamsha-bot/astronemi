/**
 * Jaimini Astrology Engine
 * 
 * Implements the Jaimini system of Vedic astrology:
 * - Chara Karakas (Atmakaraka, Amatyakaraka, etc.)
 * - Chara Dasha (sign-based dasha system)
 * - Arudha Padas (AL, A2–A12)
 * - Jaimini Yogas
 * - Upapada Lagna (marriage indicator)
 * 
 * All calculations are done locally using the sidereal planet longitudes
 * obtained from the Prokerala API or the fallback engine.
 */

import { ProkeralaPlanet } from './prokerala-api';

// ─── Zodiac Constants ─────────────────────────────────────────────────────────

export const ZODIAC = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const ZODIAC_LORDS: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

// Odd signs (movable/fixed/dual): Aries, Gemini, Leo, Libra, Sagittarius, Aquarius
const ODD_SIGNS = [0, 2, 4, 6, 8, 10]; // indices

// ─── Chara Karakas ────────────────────────────────────────────────────────────

export interface CharaKaraka {
  karaka: string;        // e.g. "Atmakaraka"
  karakaShort: string;   // e.g. "AK"
  planet: string;
  degree: number;        // degrees within sign (0–30)
  description: string;
}

const KARAKA_NAMES = [
  { name: 'Atmakaraka',     short: 'AK',  desc: 'Soul indicator — your life purpose and spiritual path' },
  { name: 'Amatyakaraka',   short: 'AmK', desc: 'Career & mind — your professional destiny' },
  { name: 'Bhratrukaraka',  short: 'BK',  desc: 'Siblings & courage' },
  { name: 'Matrukaraka',    short: 'MK',  desc: 'Mother, emotions & home' },
  { name: 'Pitrukaraka',    short: 'PiK', desc: 'Father, authority & dharma' },
  { name: 'Putrakaraka',    short: 'PuK', desc: 'Children, creativity & intelligence' },
  { name: 'Gnatikaraka',    short: 'GK',  desc: 'Obstacles, disease & enemies' },
  { name: 'Darakaraka',     short: 'DK',  desc: 'Spouse & partnerships' },
];

/**
 * Calculate Chara Karakas from planet positions.
 * Planets are ranked by their degree within their sign (highest = AK).
 * Rahu uses 30 - degree (counted backwards).
 */
export function calculateCharaKarakas(planets: ProkeralaPlanet[]): CharaKaraka[] {
  const eligible = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu'];

  const scored = planets
    .filter(p => eligible.includes(p.name))
    .map(p => ({
      planet: p.name,
      degree: p.name === 'Rahu' ? 30 - p.degree : p.degree,
    }))
    .sort((a, b) => b.degree - a.degree); // highest degree = AK

  return scored.slice(0, 8).map((p, i) => {
    const info = KARAKA_NAMES[i];
    if (!info) throw new Error("Invalid karaka index");
    return {
      karaka: info.name,
      karakaShort: info.short,
      planet: p.planet,
      degree: p.degree,
      description: info.desc,
    };
  });
}

// ─── Arudha Padas ─────────────────────────────────────────────────────────────

export interface ArudhaPada {
  name: string;       // e.g. "Arudha Lagna (AL)"
  short: string;      // e.g. "AL"
  house: number;      // house number 1–12
  sign: string;       // zodiac sign name
  signIndex: number;
  description: string;
}

const ARUDHA_NAMES = [
  { name: 'Arudha Lagna',   short: 'AL',  desc: 'Your public image and how the world perceives you' },
  { name: 'Dhana Pada',     short: 'A2',  desc: 'Wealth, speech and family' },
  { name: 'Vikrama Pada',   short: 'A3',  desc: 'Courage, siblings and efforts' },
  { name: 'Matru Pada',     short: 'A4',  desc: 'Mother, home and happiness' },
  { name: 'Mantra Pada',    short: 'A5',  desc: 'Intelligence, children and past life' },
  { name: 'Roga Pada',      short: 'A6',  desc: 'Enemies, disease and debts' },
  { name: 'Dara Pada',      short: 'A7',  desc: 'Spouse, business partnerships' },
  { name: 'Ayu Pada',       short: 'A8',  desc: 'Longevity, transformation and hidden matters' },
  { name: 'Bhagya Pada',    short: 'A9',  desc: 'Fortune, dharma and father' },
  { name: 'Rajya Pada',     short: 'A10', desc: 'Career, status and authority' },
  { name: 'Labha Pada',     short: 'A11', desc: 'Gains, income and elder siblings' },
  { name: 'Vyaya Pada',     short: 'A12', desc: 'Losses, expenses and liberation' },
];

function calculateArudhaPada(
  houseIndex: number,
  ascSignIndex: number,
  planets: ProkeralaPlanet[]
): number {
  const houseSignIndex = (ascSignIndex + houseIndex) % 12;
  const houseLord = ZODIAC_LORDS[ZODIAC[houseSignIndex] ?? 'Aries'] ?? 'Mars';

  const lordPlanet = planets.find(p => p.name === houseLord);
  if (!lordPlanet) return houseSignIndex;

  const lordSignIndex = lordPlanet.signIndex;

  let steps = (lordSignIndex - houseSignIndex + 12) % 12;
  if (steps === 0) steps = 12;

  let arudhaSignIndex = (lordSignIndex + steps - 1) % 12;

  if (arudhaSignIndex === houseSignIndex || arudhaSignIndex === (houseSignIndex + 6) % 12) {
    arudhaSignIndex = (arudhaSignIndex + 9) % 12;
  }

  return arudhaSignIndex;
}

export function calculateAllArudhaPadas(
  ascSignIndex: number,
  planets: ProkeralaPlanet[]
): ArudhaPada[] {
  return ARUDHA_NAMES.map((info, i) => {
    const signIndex = calculateArudhaPada(i, ascSignIndex, planets);
    const houseFromLagna = ((signIndex - ascSignIndex + 12) % 12) + 1;
    return {
      name: info.name,
      short: info.short,
      house: houseFromLagna,
      sign: ZODIAC[signIndex] ?? 'Aries',
      signIndex,
      description: info.desc,
    };
  });
}

// ─── Upapada Lagna ────────────────────────────────────────────────────────────

export interface UpapadaResult {
  sign: string;
  signIndex: number;
  lord: string;
  description: string;
}

export function calculateUpapadaLagna(
  ascSignIndex: number,
  planets: ProkeralaPlanet[]
): UpapadaResult {
  const upapadaSignIndex = calculateArudhaPada(11, ascSignIndex, planets);
  const signName = ZODIAC[upapadaSignIndex] ?? 'Aries';
  const lord = ZODIAC_LORDS[signName] ?? 'Mars';

  return {
    sign: signName,
    signIndex: upapadaSignIndex,
    lord,
    description: `Upapada Lagna in ${signName} indicates the nature of your spouse and marriage. The lord ${lord} plays a key role in your marital life.`,
  };
}

// ─── Chara Dasha ──────────────────────────────────────────────────────────────

export interface CharaDashaPeriod {
  sign: string;
  signIndex: number;
  years: number;
  startDate: Date;
  endDate: Date;
  isCurrentDasha: boolean;
  antardasha: {
    sign: string;
    signIndex: number;
    months: number;
    startDate: Date;
    endDate: Date;
    isCurrent: boolean;
  }[];
}

function getCharaDashaYears(
  signIndex: number,
  planets: ProkeralaPlanet[]
): number {
  const sign = ZODIAC[signIndex] ?? 'Aries';
  const lord = ZODIAC_LORDS[sign] ?? 'Mars';
  const lordPlanet = planets.find(p => p.name === lord);

  if (!lordPlanet) return 7;

  const lordSignIndex = lordPlanet.signIndex;
  if (lordSignIndex === signIndex) return 12;

  const isOdd = ODD_SIGNS.includes(signIndex);
  let count: number;
  if (isOdd) {
    count = (lordSignIndex - signIndex + 12) % 12;
  } else {
    count = (signIndex - lordSignIndex + 12) % 12;
  }

  return count === 0 ? 12 : count;
}

export function calculateCharaDasha(
  ascSignIndex: number,
  birthDate: Date,
  planets: ProkeralaPlanet[]
): CharaDashaPeriod[] {
  const now = new Date();
  const dashas: CharaDashaPeriod[] = [];
  let currentDate = new Date(birthDate);

  for (let i = 0; i < 12; i++) {
    const signIndex = (ascSignIndex + i) % 12;
    const years = getCharaDashaYears(signIndex, planets);

    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    endDate.setFullYear(endDate.getFullYear() + years);

    const isCurrentDasha = now >= startDate && now < endDate;
    const antardasha = calculateCharaAntardasha(signIndex, startDate, years, planets, now);

    dashas.push({
      sign: ZODIAC[signIndex] ?? 'Aries',
      signIndex,
      years,
      startDate,
      endDate,
      isCurrentDasha,
      antardasha,
    });

    currentDate = new Date(endDate);
  }

  return dashas;
}

function calculateCharaAntardasha(
  mahaSignIndex: number,
  mahaStart: Date,
  mahaYears: number,
  planets: ProkeralaPlanet[],
  now: Date
) {
  const antardasha = [];
  let current = new Date(mahaStart);
  const totalDays = mahaYears * 365.25;

  for (let i = 0; i < 12; i++) {
    const signIndex = (mahaSignIndex + i) % 12;
    const antarYears = getCharaDashaYears(signIndex, planets);
    const antarDays = (antarYears / 12) * totalDays;

    const startDate = new Date(current);
    const endDate = new Date(current.getTime() + antarDays * 86400000);

    antardasha.push({
      sign: ZODIAC[signIndex] ?? 'Aries',
      signIndex,
      months: Math.round(antarDays / 30.44),
      startDate,
      endDate,
      isCurrent: now >= startDate && now < endDate,
    });

    current = new Date(endDate);
  }

  return antardasha;
}

// ─── Divisional Charts (Varga) ────────────────────────────────────────────────

export interface DivisionalPlanet {
  name: string;
  sign: string;
  signIndex: number;
  house: number;
}

/** D3 Drekkana chart — divisions of 10° each. */
export function calculateD3Chart(
  planets: ProkeralaPlanet[],
  ascLongitude: number
): { planets: DivisionalPlanet[]; ascendant: { sign: string; signIndex: number } } {
  const getD3Sign = (longitude: number): number => {
    const signIndex = Math.floor(longitude / 30);
    const degreeInSign = longitude % 30;
    const drekkana = Math.floor(degreeInSign / 10);
    const offsets = [0, 4, 8];
    return (signIndex + (offsets[drekkana] ?? 0)) % 12;
  };

  const ascD3SignIndex = getD3Sign(ascLongitude);
  return {
    planets: planets.map(p => {
      const d3SignIndex = getD3Sign(p.longitude);
      const house = ((d3SignIndex - ascD3SignIndex + 12) % 12) + 1;
      return { name: p.name, sign: ZODIAC[d3SignIndex] ?? 'Aries', signIndex: d3SignIndex, house };
    }),
    ascendant: { sign: ZODIAC[ascD3SignIndex] ?? 'Aries', signIndex: ascD3SignIndex },
  };
}

/** D9 Navamsha chart — divisions of 3°20' each. */
export function calculateD9Chart(
  planets: ProkeralaPlanet[],
  ascLongitude: number
): { planets: DivisionalPlanet[]; ascendant: { sign: string; signIndex: number } } {
  const getD9Sign = (longitude: number): number => {
    const signIndex = Math.floor(longitude / 30);
    const degreeInSign = longitude % 30;
    const navamsa = Math.floor(degreeInSign / (30 / 9));
    const startSigns = [0, 9, 6, 3, 0, 9, 6, 3, 0, 9, 6, 3];
    return ((startSigns[signIndex] ?? 0) + navamsa) % 12;
  };

  const ascD9SignIndex = getD9Sign(ascLongitude);
  return {
    planets: planets.map(p => {
      const d9SignIndex = getD9Sign(p.longitude);
      const house = ((d9SignIndex - ascD9SignIndex + 12) % 12) + 1;
      return { name: p.name, sign: ZODIAC[d9SignIndex] ?? 'Aries', signIndex: d9SignIndex, house };
    }),
    ascendant: { sign: ZODIAC[ascD9SignIndex] ?? 'Aries', signIndex: ascD9SignIndex },
  };
}

/** D2 Hora Chart — Divisions of 15° each. */
export function calculateD2Chart(
  planets: ProkeralaPlanet[],
  ascLongitude: number
): { planets: DivisionalPlanet[]; ascendant: { sign: string; signIndex: number } } {
  const getD2Sign = (longitude: number): number => {
    const signIndex = Math.floor(longitude / 30);
    const degreeInSign = longitude % 30;
    const isOdd = ODD_SIGNS.includes(signIndex);
    if (isOdd) return degreeInSign < 15 ? 4 : 3; // Sun/Moon
    return degreeInSign < 15 ? 3 : 4; // Moon/Sun
  };

  const ascD2SignIndex = getD2Sign(ascLongitude);
  return {
    planets: planets.map(p => {
      const d2SignIndex = getD2Sign(p.longitude);
      const house = ((d2SignIndex - ascD2SignIndex + 12) % 12) + 1;
      return { name: p.name, sign: ZODIAC[d2SignIndex] ?? 'Leo', signIndex: d2SignIndex, house };
    }),
    ascendant: { sign: ZODIAC[ascD2SignIndex] ?? 'Leo', signIndex: ascD2SignIndex },
  };
}

/** D7 Saptamsha Chart — Divisions of 4°17' approx. */
export function calculateD7Chart(
  planets: ProkeralaPlanet[],
  ascLongitude: number
): { planets: DivisionalPlanet[]; ascendant: { sign: string; signIndex: number } } {
  const getD7Sign = (longitude: number): number => {
    const signIndex = Math.floor(longitude / 30);
    const degreeInSign = longitude % 30;
    const part = Math.floor(degreeInSign / (30/7));
    const startSign = ODD_SIGNS.includes(signIndex) ? signIndex : (signIndex + 6) % 12;
    return (startSign + part) % 12;
  };

  const ascD7SignIndex = getD7Sign(ascLongitude);
  return {
    planets: planets.map(p => {
      const d7SignIndex = getD7Sign(p.longitude);
      const house = ((d7SignIndex - ascD7SignIndex + 12) % 12) + 1;
      return { name: p.name, sign: ZODIAC[d7SignIndex] ?? 'Aries', signIndex: d7SignIndex, house };
    }),
    ascendant: { sign: ZODIAC[ascD7SignIndex] ?? 'Aries', signIndex: ascD7SignIndex },
  };
}

/** D12 Dwadashamsha Chart — Divisions of 2°30' each. */
export function calculateD12Chart(
  planets: ProkeralaPlanet[],
  ascLongitude: number
): { planets: DivisionalPlanet[]; ascendant: { sign: string; signIndex: number } } {
  const getD12Sign = (longitude: number): number => {
    const signIndex = Math.floor(longitude / 30);
    const degreeInSign = longitude % 30;
    const part = Math.floor(degreeInSign / 2.5);
    return (signIndex + part) % 12;
  };

  const ascD12SignIndex = getD12Sign(ascLongitude);
  return {
    planets: planets.map(p => {
      const d12SignIndex = getD12Sign(p.longitude);
      const house = ((d12SignIndex - ascD12SignIndex + 12) % 12) + 1;
      return { name: p.name, sign: ZODIAC[d12SignIndex] ?? 'Aries', signIndex: d12SignIndex, house };
    }),
    ascendant: { sign: ZODIAC[ascD12SignIndex] ?? 'Aries', signIndex: ascD12SignIndex },
  };
}

/** D30 Trimshamsha Chart — Complex degree-specific assignments. */
export function calculateD30Chart(
  planets: ProkeralaPlanet[],
  ascLongitude: number
): { planets: DivisionalPlanet[]; ascendant: { sign: string; signIndex: number } } {
  const getD30Sign = (longitude: number): number => {
    const signIndex = Math.floor(longitude / 30);
    const degree = longitude % 30;
    if (ODD_SIGNS.includes(signIndex)) {
      if (degree < 5) return 0; if (degree < 10) return 10; if (degree < 18) return 8; if (degree < 25) return 2; return 1;
    } else {
      if (degree < 5) return 1; if (degree < 12) return 2; if (degree < 20) return 8; if (degree < 25) return 10; return 0;
    }
  };

  const ascD30SignIndex = getD30Sign(ascLongitude);
  return {
    planets: planets.map(p => {
      const d30SignIndex = getD30Sign(p.longitude);
      const house = ((d30SignIndex - ascD30SignIndex + 12) % 12) + 1;
      return { name: p.name, sign: ZODIAC[d30SignIndex] ?? 'Aries', signIndex: d30SignIndex, house };
    }),
    ascendant: { sign: ZODIAC[ascD30SignIndex] ?? 'Aries', signIndex: ascD30SignIndex },
  };
}

// ─── Jaimini Yogas ────────────────────────────────────────────────────────────

export interface JaiminiYoga {
  name: string;
  description: string;
  isPresent: boolean;
  strength: 'Strong' | 'Moderate' | 'Weak';
}

export function detectJaiminiYogas(
  planets: ProkeralaPlanet[],
  karakas: CharaKaraka[],
  _ascSignIndex: number
): JaiminiYoga[] {
  const yogas: JaiminiYoga[] = [];
  const atmakaraka = karakas.find(k => k.karakaShort === 'AK');
  const amatyakaraka = karakas.find(k => k.karakaShort === 'AmK');

  if (atmakaraka) {
    const akPlanet = planets.find(p => p.name === atmakaraka.planet);
    if (akPlanet && [1, 4, 7, 10].includes(akPlanet.house)) {
      yogas.push({ name: 'Atmakaraka Kendra Yoga', description: `${atmakaraka.planet} in Kendra gives leadership and purpose.`, isPresent: true, strength: 'Strong' });
    }
  }

  if (atmakaraka && amatyakaraka) {
    const akP = planets.find(p => p.name === atmakaraka.planet);
    const amkP = planets.find(p => p.name === amatyakaraka.planet);
    if (akP && amkP && (akP.signIndex === amkP.signIndex || Math.abs(akP.signIndex - amkP.signIndex) === 6)) {
      yogas.push({ name: 'Jaimini Raja Yoga', description: `AK and AmK in mutual aspect — career recognition.`, isPresent: true, strength: 'Strong' });
    }
  }

  return yogas.filter(y => y.isPresent);
}

// ─── Utils ────────────────────────────────────────────────────────────────────

export function calculateLahiriAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  // Aligned with vedic-astrology.getAyanamsa() so D1/D9 divisional charts and
  // the main chart use the SAME Lahiri value (previously they disagreed by
  // ~0.003°, producing inconsistent divisional placements).
  return 23.85306 + (50.317 / 3600) * (T * 100);
}

export interface GeoResult {
  latitude: number;
  longitude: number;
  timezone: number;
  displayName: string;
}

const CITY_DB: Record<string, GeoResult> = {
  'delhi': { latitude: 28.6139, longitude: 77.2090, timezone: 5.5, displayName: 'New Delhi, India' },
  'mumbai': { latitude: 19.0760, longitude: 72.8777, timezone: 5.5, displayName: 'Mumbai, India' },
  'london': { latitude: 51.5074, longitude: -0.1278, timezone: 0, displayName: 'London, UK' },
  'new york': { latitude: 40.7128, longitude: -74.0060, timezone: -5, displayName: 'New York, USA' },
  // ... (Full database would go here)
};

export async function geocodeCity(placeName: string): Promise<GeoResult> {
  const normalized = placeName.toLowerCase().trim();
  const dbResult = CITY_DB[normalized];
  if (dbResult) return dbResult;
  
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=1`, { headers: { 'User-Agent': 'AstroNemi/1.0' } });
    if (res.ok) {
      const data = await res.json();
      if (data?.[0]) {
        const lon = parseFloat(data[0].lon);
        return { latitude: parseFloat(data[0].lat), longitude: lon, timezone: Math.round(lon / 15 * 2) / 2, displayName: data[0].display_name };
      }
    }
  } catch {}
  
  const defaultCity = CITY_DB['delhi'];
  if (!defaultCity) throw new Error("Default city Delhi not found in database");
  return defaultCity;
}
