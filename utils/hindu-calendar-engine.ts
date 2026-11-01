/**
 * Hindu Calendar Engine — REAL ASTRONOMICAL CALCULATIONS
 * 
 * Computes Panchang (Hindu calendar) data including:
 * - Tithi (lunar day) — calculated from Sun-Moon longitude difference
 * - Vara (day of week)
 * - Nakshatra (lunar mansion) — calculated from Moon's sidereal position
 * - Yoga (auspicious combination) — calculated from Sun+Moon longitudes
 * - Karana (half tithi) — calculated from Tithi
 * - Real sunrise/sunset times based on location
 */

import {
  calculateJulianDay,
  getLahiriAyanamsa,
  getSunPosition,
  getMoonPosition,
  getSunriseSunset as getAccurateSunriseSunset,
  getMoonriseMoonset,
  formatTime,
  normalizeAngle,
} from './ephemeris';

export interface PanchangData {
  date?: Date;
  vara: number;
  varaName: string;
  tithi: number;
  tithiName: string;
  paksha?: string;
  lunarMonth?: number;
  nakshatra: number;
  nakshatraName: string;
  yoga: number;
  yogaName: string;
  karana: number;
  karanaName: string;
  sunLongitude?: number;
  moonLongitude?: number;
  sunRashiName?: string;
  moonRashiName?: string;
  ayana?: string;
  ritu?: string;
  sunRise: string;
  sunSet: string;
  moonRise: string;
  moonSet: string;
  tithiEndTime?: Date;
  nakshatraEndTime?: Date;
  yogaEndTime?: Date;
}

const VARA_NAMES = ['Ravivara', 'Somavara', 'Mangalavara', 'Budhavara', 'Guruvara', 'Shukravara', 'Shanivara'];

const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
];

export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
  'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
  'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
  'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati'
];

export const RASHI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'
];

const YOGA_NAMES = [
  'Viskambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti'
];

const KARANA_NAMES = [
  'Kimstughna', 'Bava', 'Balava', 'Kaulava', 'Taitila',
  'Gara', 'Vanija', 'Vishti', 'Shakuni', 'Chatushpada',
  'Naga', 'Kintamani'
];

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngleLocal(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

/**
 * Calculate real Tithi from Sun and Moon longitudes
 * Tithi = (Moon longitude - Sun longitude) / 12°
 * Range: 1-30 (1-15 Shukla Paksha, 16-30 Krishna Paksha)
 */
function calculateTithi(sunLon: number, moonLon: number): number {
  const diff = normalizeAngle(moonLon - sunLon);
  const tithi = Math.floor(diff / 12) + 1;
  return tithi > 30 ? 30 : tithi;
}

/**
 * Calculate Nakshatra from Moon's sidereal longitude
 * Each Nakshatra = 13°20' (800 arcminutes)
 */
function calculateNakshatra(moonLon: number): number {
  const nakshatra = Math.floor(moonLon / (360 / 27)) + 1;
  return nakshatra > 27 ? 27 : nakshatra;
}

/**
 * Calculate Yoga from Sun and Moon longitudes
 * Yoga = (Sun longitude + Moon longitude) / 13°20'
 * Range: 1-27
 */
function calculateYoga(sunLon: number, moonLon: number): number {
  const sum = normalizeAngle(sunLon + moonLon);
  const yoga = Math.floor(sum / (360 / 27)) + 1;
  return yoga > 27 ? 27 : yoga;
}

/**
 * Calculate Karana from Tithi.
 *
 * There are 60 half-tithis in a lunar month (30 tithis × 2 halves).
 * Karanas fall into two groups:
 *   - 4 Fixed (Sthira): Kimstughna (1st half of Shukla Pratipada),
 *     Shakuni, Chatushpada, Naga (last 3 half-tithis before Amavasya)
 *   - 7 Movable (Chara): Bava, Balava, Kaulava, Taitila, Gara, Vanija, Vishti
 *     — these cycle 8 times through the remaining 56 half-tithis
 *
 * Returns: index into KARANA_NAMES (0-based)
 */
function calculateKarana(tithi: number, isFirstHalf: boolean): number {
  // Half-tithi index (0-based): 0 = first half of tithi 1, 59 = second half of tithi 30
  const halfTithiIndex = (tithi - 1) * 2 + (isFirstHalf ? 0 : 1);

  // Fixed karanas
  if (halfTithiIndex === 0) return 0;   // Kimstughna — first half of Shukla Pratipada
  if (halfTithiIndex === 57) return 8;  // Shakuni
  if (halfTithiIndex === 58) return 9;  // Chatushpada
  if (halfTithiIndex === 59) return 10; // Naga

  // Movable karanas: cycle through indices 1-7 (Bava to Vishti)
  // Starting from halfTithiIndex 1 (second half of Shukla Pratipada)
  const movableIndex = (halfTithiIndex - 1) % 7;
  return movableIndex + 1; // 1=Bava, 2=Balava, ..., 7=Vishti
}

/**
 * Calculate sunrise and sunset times for a given date and location
 * Calculate sunrise and sunset times for a given date and location
 * HIGH PRECISION: Uses astronomy-engine which accounts for:
 * - Atmospheric refraction
 * - Solar semi-diameter
 * - Observer elevation
 */
function calculateSunriseSunset(date: Date, latitude: number, longitude: number, timezone: number): {
  sunrise: string;
  sunset: string;
} {
  const result = getAccurateSunriseSunset(date, {
    latitude,
    longitude,
    elevation: 0,
  });

  const formatLocalTime = (d: Date | null): string => {
    if (!d) return '--:--';
    // Convert UTC to local time using timezone offset
    const utcMs = d.getTime();
    const localMs = utcMs + timezone * 3600000;
    const localDate = new Date(localMs);
    const h = localDate.getUTCHours().toString().padStart(2, '0');
    const m = localDate.getUTCMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  return {
    sunrise: formatLocalTime(result.rise),
    sunset: formatLocalTime(result.set),
  };
}

/**
 * Iterative search to find the exact moment an astronomical value crosses a boundary.
 * windowSize: number of hours to search (default 24)
 */
function findMomentOfCrossing(
  date: Date,
  targetValue: number,
  calcFn: (jd: number) => number,
  _tolerance: number = 0.0001,
  windowHours: number = 26,
  timezone: number = 5.5
): Date {
  const startJD = calculateJulianDay(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    0, 0, 0,
    timezone
  );

  let low = startJD;
  let high = startJD + (windowHours / 24);

  // Binary search for the crossing point
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const val = calcFn(mid);
    
    // Handle 360 wrap-around for longitude-based values
    let diff = val - targetValue;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

    if (diff < 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const resultJD = (low + high) / 2;
  // Convert JD back to Date
  const unixTime = (resultJD - 2440587.5) * 86400000;
  return new Date(unixTime);
}

/**
 * Compute REAL Panchang data for a given date using astronomical calculations
 */
export function computePanchang(date: Date, latitude: number = 28.6139, longitude: number = 77.2090): PanchangData {
  const dayOfWeek = date.getDay();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  // Determine timezone (simplified - in production, use proper timezone library)
  const timezone = Math.round(longitude / 15);
  
  // Calculate Julian Day for noon (to get daily positions)
  const jd = calculateJulianDay(year, month, date.getDate(), 12, 0, 0, timezone);

  // Get tropical Sun and Moon positions from high-precision ephemeris
  const sunPos = getSunPosition(jd);
  const moonPos = getMoonPosition(jd);

  // Calculate Lahiri ayanamsa and convert to sidereal
  const ayanamsa = getLahiriAyanamsa(jd);
  const sunLon = normalizeAngleLocal(sunPos.longitude - ayanamsa);
  const moonLon = normalizeAngleLocal(moonPos.longitude - ayanamsa);
  
  // Calculate Panchang elements using REAL formulas
  const tithi = calculateTithi(sunLon, moonLon);
  const nakshatra = calculateNakshatra(moonLon);
  const yoga = calculateYoga(sunLon, moonLon);
  
  // Precision End Times
  const tithiCrossing = (jd: number) => {
    const s = sunLongitude(jd);
    const m = moonLongitude(jd);
    return normalizeAngle(m - s);
  };
  const nakshatraCrossing = (jd: number) => moonLongitude(jd);
  const yogaCrossing = (jd: number) => normalizeAngle(sunLongitude(jd) + moonLongitude(jd));

  const tithiEndTime = findMomentOfCrossing(date, tithi * 12, tithiCrossing, 0.0001, 26, timezone);
  const nakshatraEndTime = findMomentOfCrossing(date, nakshatra * (360 / 27), nakshatraCrossing, 0.0001, 26, timezone);
  const yogaEndTime = findMomentOfCrossing(date, yoga * (360 / 27), yogaCrossing, 0.0001, 26, timezone);
  
  // Determine if we're in first or second half of tithi for Karana
  const tithiProgress = (normalizeAngle(moonLon - sunLon) % 12) / 12;
  const isFirstHalf = tithiProgress < 0.5;
  const karana = calculateKarana(tithi, isFirstHalf);
  
  // Paksha: Shukla (waxing) or Krishna (waning)
  const paksha = tithi <= 15 ? 'Shukla' : 'Krishna';
  
  // Lunar month (approximate - based on Sun's position in zodiac)
  const lunarMonth = Math.floor(sunLon / 30) + 1;
  
  // Ayana: Uttarayana (Sun moving north) or Dakshinayana (Sun moving south)
  // Uttarayana: Winter Solstice to Summer Solstice (roughly Dec 22 - Jun 21)
  const ayana = (month >= 1 && month <= 6) ? 'Uttarayana' : 'Dakshinayana';
  
  // Ritu (season) - 6 seasons of 2 months each
  const RITU_NAMES = ['Shishira', 'Vasanta', 'Grishma', 'Varsha', 'Sharad', 'Hemanta'];
  const ritu = RITU_NAMES[Math.floor((month - 1) / 2)];
  
  // Calculate real sunrise and sunset
  const { sunrise, sunset } = calculateSunriseSunset(date, latitude, longitude, timezone);

  // REAL Moon rise/set calculation using ephemeris
  const moonRiseSet = getMoonriseMoonset(date, { latitude, longitude, elevation: 0 });
  const moonRise = moonRiseSet.rise ? formatTime(moonRiseSet.rise) : '--:--';
  const moonSet = moonRiseSet.set ? formatTime(moonRiseSet.set) : '--:--';
  
  return {
    date,
    vara: dayOfWeek,
    varaName: VARA_NAMES[dayOfWeek] ?? 'Ravivara',
    tithi,
    tithiName: TITHI_NAMES[tithi - 1] ?? 'Pratipada',
    tithiEndTime,
    paksha,
    lunarMonth,
    nakshatra,
    nakshatraName: NAKSHATRA_NAMES[nakshatra - 1] ?? 'Ashwini',
    nakshatraEndTime,
    yoga,
    yogaName: YOGA_NAMES[yoga - 1] ?? 'Viskambha',
    yogaEndTime,
    karana,
    karanaName: KARANA_NAMES[karana] ?? 'Bava',
    sunLongitude: sunLon,
    moonLongitude: moonLon,
    sunRashiName: RASHI_NAMES[Math.floor(sunLon / 30)] ?? 'Mesha',
    moonRashiName: RASHI_NAMES[Math.floor(moonLon / 30)] ?? 'Mesha',
    ayana,
    ritu,
    sunRise: sunrise,
    sunSet: sunset,
    moonRise,
    moonSet,
  };
}

/**
 * Get auspicious times (Muhurat) for a given date based on REAL sunrise calculation.
 * Returns Brahma Muhurat, Abhijit Muhurat, and Rahu Kaal.
 */
export function getMuhurat(date: Date, latitude: number = 28.6139, longitude: number = 77.2090): { start: string; end: string; type: string; description: string }[] {
  const timezone = Math.round(longitude / 15);
  const { sunrise: sunriseStr, sunset: sunsetStr } = calculateSunriseSunset(date, latitude, longitude, timezone);

  const [sunriseH, sunriseM] = sunriseStr.split(':').map(Number);
  const [sunsetH, sunsetM] = sunsetStr.split(':').map(Number);

  const sunriseMin = (sunriseH ?? 6) * 60 + (sunriseM ?? 0);
  const sunsetMin = (sunsetH ?? 18) * 60 + (sunsetM ?? 0);
  const dayDurationMin = sunsetMin - sunriseMin;
  const eighthPart = dayDurationMin / 8;

  const fmt = (totalMin: number): string => {
    const h = Math.floor(totalMin / 60) % 24;
    const m = Math.floor(totalMin % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Brahma Muhurat: 96 minutes before sunrise (1.5 muhurtas)
  const brahmaStart = sunriseMin - 96;
  const brahmaEnd = sunriseMin - 48;

  // Abhijit Muhurat: ~24 minutes before and after solar noon
  const solarNoon = sunriseMin + dayDurationMin / 2;
  const abhijitStart = solarNoon - 24;
  const abhijitEnd = solarNoon + 24;

  // Rahu Kaal: varies by day of week
  const rahuKaalPeriods = [7, 1, 6, 4, 5, 3, 2]; // Sun=7th, Mon=1st, etc.
  const rahuPeriod = rahuKaalPeriods[date.getDay()] ?? 7;
  const rahuStart = sunriseMin + (rahuPeriod - 1) * eighthPart;
  const rahuEnd = sunriseMin + rahuPeriod * eighthPart;

  return [
    { start: fmt(brahmaStart), end: fmt(brahmaEnd), type: 'Brahma Muhurat', description: 'Most auspicious for meditation, prayer, and spiritual practices' },
    { start: fmt(abhijitStart), end: fmt(abhijitEnd), type: 'Abhijit Muhurat', description: 'Universally auspicious — good for starting any new work' },
    { start: fmt(rahuStart), end: fmt(rahuEnd), type: 'Rahu Kaal (Avoid)', description: 'Inauspicious period — avoid starting new ventures' },
  ];
}

/**
 * Convert Gregorian date to Julian Day (REAL FORMULA)
 */
export function gregorianToJD(year: number, month: number, day: number, hour: number = 12): number {
  // Standard Julian Day calculation (valid for all dates)
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + 
              Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  
  return jdn + (hour - 12) / 24;
}

/**
 * Calculate Sun's sidereal longitude using high-precision ephemeris.
 */
export function sunLongitude(jd: number): number {
  const tropical = getSunPosition(jd);
  const ayanamsa = getLahiriAyanamsa(jd);
  return normalizeAngleLocal(tropical.longitude - ayanamsa);
}

/**
 * Calculate Moon's sidereal longitude using high-precision ephemeris.
 */
export function moonLongitude(jd: number): number {
  const tropical = getMoonPosition(jd);
  const ayanamsa = getLahiriAyanamsa(jd);
  return normalizeAngleLocal(tropical.longitude - ayanamsa);
}

/**
 * Normalize angle to 0-360 degrees
 */
export function norm360(angle: number): number {
  return normalizeAngle(angle);
}

/**
 * Compute festivals for a year
 */
export interface FestivalData {
  id: string;
  name: string;
  date: Date;
  type: string;
  description: string;
  significance?: string;
  rituals?: string[];
}

/**
 * Compute Hindu festivals astronomically for a given year.
 *
 * Algorithm: Scan each day of the year, compute Panchang (Tithi, Nakshatra,
 * sidereal Sun longitude), and match against festival rules.
 *
 * This replaces the previous mock that only returned 2 hardcoded festivals.
 */
export function computeFestivalsForYear(year: number): FestivalData[] {
  const festivals: FestivalData[] = [];
  const seen = new Set<string>();

  // Scan each day of the year
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, m, d);
      const panchang = computePanchang(date);

      // Helper: add festival only once per year
      const add = (id: string, name: string, type: string, desc: string, sig?: string, rituals?: string[]) => {
        if (!seen.has(id)) {
          seen.add(id);
          festivals.push({ id, name, date, type, description: desc, significance: sig, rituals });
        }
      };

      // ─── Tithi-based festivals ──────────────────────────────────────

      // Makar Sankranti: Sun enters Capricorn (sidereal longitude 270-300°)
      if (m === 0 && d >= 13 && d <= 15 && panchang.sunLongitude !== undefined) {
        const sunSign = Math.floor(panchang.sunLongitude / 30);
        if (sunSign === 9) add('makar_sankranti', 'Makar Sankranti', 'major', 'Sun enters Capricorn — harvest festival', 'Marks Uttarayana, the northward journey of the Sun', ['Til-gul offering', 'Kite flying', 'Holy dip in rivers']);
      }

      // Vasant Panchami: Shukla Panchami in Magha (Jan-Feb)
      if ((m === 0 || m === 1) && panchang.tithi === 5 && panchang.paksha === 'Shukla') {
        add('vasant_panchami', 'Vasant Panchami', 'major', 'Worship of Goddess Saraswati', 'Beginning of spring season', ['Saraswati Puja', 'Wear yellow clothes', 'Start new learning']);
      }

      // Maha Shivaratri: Krishna Chaturdashi in Magha/Phalguna (Feb-Mar)
      if ((m === 1 || m === 2) && panchang.tithi === 29 && panchang.paksha === 'Krishna') {
        add('maha_shivaratri', 'Maha Shivaratri', 'major', 'Great night of Lord Shiva', 'Night of spiritual awakening', ['Night-long vigil', 'Abhishekam', 'Fasting', 'Om Namah Shivaya chanting']);
      }

      // Holi: Phalguna Purnima (Feb-Mar)
      if ((m === 1 || m === 2) && panchang.tithi === 15 && panchang.paksha === 'Shukla') {
        if (panchang.lunarMonth !== undefined && panchang.lunarMonth >= 11) {
          add('holi', 'Holi', 'major', 'Festival of Colors', 'Victory of good over evil (Holika Dahan)', ['Holika Dahan', 'Color play', 'Gujiya sweets', 'Thandai']);
        }
      }

      // Ugadi / Gudi Padwa: Chaitra Shukla Pratipada (Mar-Apr)
      if ((m === 2 || m === 3) && panchang.tithi === 1 && panchang.paksha === 'Shukla') {
        if (panchang.lunarMonth !== undefined && panchang.lunarMonth <= 2) {
          add('ugadi', 'Ugadi / Gudi Padwa', 'major', 'Hindu New Year (lunisolar)', 'New beginnings and fresh start', ['Panchanga Shravanam', 'Ugadi Pachadi', 'Gudi decoration']);
        }
      }

      // Ram Navami: Chaitra Shukla Navami (Mar-Apr)
      if ((m === 2 || m === 3) && panchang.tithi === 9 && panchang.paksha === 'Shukla') {
        if (panchang.lunarMonth !== undefined && panchang.lunarMonth <= 2) {
          add('ram_navami', 'Ram Navami', 'major', 'Birth of Lord Rama', 'Celebration of dharma and righteousness', ['Rama Katha', 'Fasting', 'Temple visits']);
        }
      }

      // Hanuman Jayanti: Chaitra Purnima (Apr)
      if ((m === 3 || m === 4) && panchang.tithi === 15 && panchang.paksha === 'Shukla') {
        if (panchang.lunarMonth !== undefined && panchang.lunarMonth <= 3) {
          add('hanuman_jayanti', 'Hanuman Jayanti', 'major', 'Birth of Lord Hanuman', 'Devotion, strength, and selfless service', ['Hanuman Chalisa recitation', 'Sindoor offering']);
        }
      }

      // Akshaya Tritiya: Vaishakha Shukla Tritiya (Apr-May)
      if ((m === 3 || m === 4) && panchang.tithi === 3 && panchang.paksha === 'Shukla') {
        if (panchang.lunarMonth !== undefined && (panchang.lunarMonth === 2 || panchang.lunarMonth === 3)) {
          add('akshaya_tritiya', 'Akshaya Tritiya', 'major', 'Day of eternal prosperity', 'Most auspicious day for new beginnings', ['Gold purchase', 'Charity', 'New ventures']);
        }
      }

      // Guru Purnima: Ashadha Purnima (Jul)
      if ((m === 6 || m === 7) && panchang.tithi === 15 && panchang.paksha === 'Shukla') {
        add('guru_purnima', 'Guru Purnima', 'major', 'Day of honoring the Guru', 'Tribute to Maharishi Vyasa', ['Guru worship', 'Spiritual discourses']);
      }

      // Nag Panchami: Shravana Shukla Panchami (Jul-Aug)
      if ((m === 6 || m === 7) && panchang.tithi === 5 && panchang.paksha === 'Shukla') {
        add('nag_panchami', 'Nag Panchami', 'festival', 'Worship of the serpent deity', 'Protection from Kala Sarpa Dosha', ['Milk offering to snakes', 'Nag deity worship']);
      }

      // Raksha Bandhan: Shravana Purnima (Aug)
      if ((m === 7 || m === 8) && panchang.tithi === 15 && panchang.paksha === 'Shukla') {
        if (panchang.lunarMonth !== undefined && (panchang.lunarMonth >= 4 && panchang.lunarMonth <= 6)) {
          add('raksha_bandhan', 'Raksha Bandhan', 'major', 'Bond of protection and love', 'Sacred thread tying ceremony', ['Rakhi tying', 'Sweets exchange', 'Family gathering']);
        }
      }

      // Krishna Janmashtami: Bhadrapada Krishna Ashtami (Aug-Sep)
      if ((m === 7 || m === 8) && panchang.tithi === 23 && panchang.paksha === 'Krishna') {
        add('janmashtami', 'Krishna Janmashtami', 'major', 'Birth of Lord Krishna', 'Divine love and cosmic play', ['Midnight celebration', 'Dahi Handi', 'Fasting', 'Bhajan']);
      }

      // Ganesh Chaturthi: Bhadrapada Shukla Chaturthi (Aug-Sep)
      if ((m === 7 || m === 8) && panchang.tithi === 4 && panchang.paksha === 'Shukla') {
        add('ganesh_chaturthi', 'Ganesh Chaturthi', 'major', 'Birth of Lord Ganesha', 'Remover of obstacles', ['Idol installation', 'Modak offering', 'Visarjan after 10 days']);
      }

      // Navaratri (Sharad): Ashwin Shukla Pratipada to Navami (Sep-Oct)
      if ((m === 8 || m === 9) && panchang.tithi === 1 && panchang.paksha === 'Shukla') {
        if (panchang.lunarMonth !== undefined && (panchang.lunarMonth >= 6 && panchang.lunarMonth <= 8)) {
          add('navaratri', 'Sharad Navaratri', 'major', '9 nights of Goddess Durga', 'Triumph of divine feminine energy', ['Garba/Dandiya', 'Durga Puja', 'Fasting', 'Kanya Pujan']);
        }
      }

      // Dussehra: Ashwin Shukla Dashami (Oct)
      if ((m === 8 || m === 9 || m === 10) && panchang.tithi === 10 && panchang.paksha === 'Shukla') {
        if (panchang.lunarMonth !== undefined && (panchang.lunarMonth >= 6 && panchang.lunarMonth <= 8)) {
          add('dussehra', 'Vijayadashami (Dussehra)', 'major', 'Victory of good over evil', 'Rama\'s victory over Ravana', ['Ravana effigy burning', 'Weapon worship', 'New beginnings']);
        }
      }

      // Karva Chauth: Kartik Krishna Chaturthi (Oct-Nov)
      if ((m === 9 || m === 10) && panchang.tithi === 19 && panchang.paksha === 'Krishna') {
        add('karva_chauth', 'Karva Chauth', 'festival', 'Married women fast for husband\'s long life', 'Devotion and marital bond', ['Moon sighting', 'Fasting', 'Sargi']);
      }

      // Dhanteras: Kartik Krishna Trayodashi (Oct-Nov)
      if ((m === 9 || m === 10) && panchang.tithi === 28 && panchang.paksha === 'Krishna') {
        add('dhanteras', 'Dhanteras', 'major', 'Day of wealth and prosperity', 'Worship of Lord Dhanvantari', ['Gold/Silver purchase', 'Lakshmi Puja', 'New utensils']);
      }

      // Diwali: Kartik Amavasya
      // Occurs when Sun is in Libra (Tula) or early Scorpio, and it is the New Moon
      if (panchang.tithi === 30) {
        const sunSign = Math.floor((panchang.sunLongitude || 0) / 30);
        if (sunSign === 6 || sunSign === 7) { // 6 = Tula (Libra), 7 = Vrischika (Scorpio)
          // Kartik month is usually Sun in Libra
          add('diwali', 'Diwali', 'major', 'Festival of Lights', 'Victory of light over darkness, knowledge over ignorance', ['Lakshmi-Ganesh Puja', 'Diya lighting', 'Rangoli', 'Fireworks', 'Sweets']);
        }
      }

      // Govardhan Puja / Annakut: Kartik Shukla Pratipada (day after Diwali)
      if ((m === 9 || m === 10 || m === 11) && panchang.tithi === 1 && panchang.paksha === 'Shukla') {
        if (panchang.lunarMonth !== undefined && (panchang.lunarMonth >= 7 && panchang.lunarMonth <= 9)) {
          add('govardhan', 'Govardhan Puja', 'festival', 'Krishna lifts Govardhan Hill', 'Gratitude to nature and cattle', ['Annakut (Mountain of food)', 'Cow worship']);
        }
      }

      // Bhai Dooj: Kartik Shukla Dwitiya (2 days after Diwali)
      if ((m === 10 || m === 11) && panchang.tithi === 2 && panchang.paksha === 'Shukla') {
        if (panchang.lunarMonth !== undefined && (panchang.lunarMonth >= 7 && panchang.lunarMonth <= 9)) {
          add('bhai_dooj', 'Bhai Dooj', 'festival', 'Bond of brother and sister', 'Yama and Yamuna legend', ['Tilak ceremony', 'Sweets exchange']);
        }
      }

      // Dev Uthani Ekadashi / Tulsi Vivah: Kartik Shukla Ekadashi (Nov)
      if ((m === 10 || m === 11) && panchang.tithi === 11 && panchang.paksha === 'Shukla') {
        add('dev_uthani', 'Dev Uthani Ekadashi', 'festival', 'Lord Vishnu awakens from cosmic sleep', 'Marriage season begins', ['Tulsi Vivah', 'Fasting', 'Wedding season inaugurated']);
      }

      // ─── Weekly observances ────────────────────────────────────────

      // Ekadashi (11th Tithi) — occurs twice monthly
      if (panchang.tithi === 11) {
        // Don't add as festival; it's too frequent. Users can check Panchang daily.
      }

      // Purnima (Full Moon)
      if (panchang.tithi === 15 && panchang.paksha === 'Shukla') {
        if (!seen.has(`purnima_${m}`)) {
          seen.add(`purnima_${m}`);
          festivals.push({
            id: `purnima_${m}`,
            name: `${LUNAR_MONTHS[panchang.lunarMonth ?? m] ?? 'Unknown'} Purnima`,
            date,
            type: 'purnima',
            description: 'Full Moon day — auspicious for pujas and charity',
          });
        }
      }

      // Amavasya (New Moon)
      if (panchang.tithi === 30) {
        if (!seen.has(`amavasya_${m}`)) {
          seen.add(`amavasya_${m}`);
          festivals.push({
            id: `amavasya_${m}`,
            name: `${LUNAR_MONTHS[panchang.lunarMonth ?? m] ?? 'Unknown'} Amavasya`,
            date,
            type: 'amavasya',
            description: 'New Moon day — auspicious for Pitru Tarpan',
          });
        }
      }
    }
  }

  // Sort by date
  festivals.sort((a, b) => a.date.getTime() - b.date.getTime());
  return festivals;
}

/** Lunar month names (1-indexed, matching lunarMonth from computePanchang) */
const LUNAR_MONTHS: Record<number, string> = {
  1: 'Chaitra', 2: 'Vaishakha', 3: 'Jyeshtha', 4: 'Ashadha',
  5: 'Shravana', 6: 'Bhadrapada', 7: 'Ashwin', 8: 'Kartik',
  9: 'Margashirsha', 10: 'Pausha', 11: 'Magha', 12: 'Phalguna',
};

/**
 * Compute Muhurtas for a date with REAL sunrise/sunset calculations
 */
export function computeMuhurtas(date: Date, latitude: number, longitude: number): {
  sunrise: Date;
  sunset: Date;
  rahuKaal: [Date, Date];
  gulikaKaal: [Date, Date];
  yamaghanta: [Date, Date];
  abhijit: [Date, Date];
  brahma: [Date, Date];
} {
  const timezone = Math.round(longitude / 15);
  const { sunrise: sunriseStr, sunset: sunsetStr } = calculateSunriseSunset(date, latitude, longitude, timezone);
  
  // Parse sunrise and sunset times
  const [sunriseHour, sunriseMin] = sunriseStr.split(':').map(Number);
  const [sunsetHour, sunsetMin] = sunsetStr.split(':').map(Number);

  const sunrise = new Date(date);
  sunrise.setHours(sunriseHour ?? 6, sunriseMin ?? 0, 0, 0);

  const sunset = new Date(date);
  sunset.setHours(sunsetHour ?? 18, sunsetMin ?? 0, 0, 0);
  
  // Calculate day duration in milliseconds
  const dayDuration = sunset.getTime() - sunrise.getTime();
  const oneEighth = dayDuration / 8; // Divide day into 8 parts
  
  // Rahu Kaal calculation (varies by day of week)
  const dayOfWeek = date.getDay();
  const rahuKaalPeriods = [7, 1, 6, 4, 5, 3, 2]; // Sunday=7th period, Monday=1st, etc.
  const rahuPeriod = rahuKaalPeriods[dayOfWeek] ?? 7;

  const rahuStart = new Date(sunrise.getTime() + (rahuPeriod - 1) * oneEighth);
  const rahuEnd = new Date(sunrise.getTime() + rahuPeriod * oneEighth);
  
  // Gulika Kaal (similar to Rahu Kaal but different periods)
  const gulikaKaalPeriods = [6, 5, 4, 3, 2, 1, 7];
  const gulikaPeriod = gulikaKaalPeriods[dayOfWeek] ?? 6;

  const gulikaStart = new Date(sunrise.getTime() + (gulikaPeriod - 1) * oneEighth);
  const gulikaEnd = new Date(sunrise.getTime() + gulikaPeriod * oneEighth);
  
  // Yamaghanta (8th part of night, before sunrise)
  const nightDuration = 24 * 60 * 60 * 1000 - dayDuration;
  const yamaghantaDuration = nightDuration / 8;
  
  const yamaghantaEnd = new Date(sunrise.getTime());
  const yamaghantaStart = new Date(yamaghantaEnd.getTime() - yamaghantaDuration);
  
  // Abhijit Muhurat (middle of the day, most auspicious)
  // Starts at midday - 24 minutes, lasts 48 minutes
  const midday = new Date(sunrise.getTime() + dayDuration / 2);
  const abhijitStart = new Date(midday.getTime() - 24 * 60 * 1000);
  const abhijitEnd = new Date(midday.getTime() + 24 * 60 * 1000);
  
  // Brahma Muhurat (96 minutes before sunrise, most auspicious for spiritual practices)
  const brahmaEnd = new Date(sunrise.getTime());
  const brahmaStart = new Date(brahmaEnd.getTime() - 96 * 60 * 1000);
  
  return {
    sunrise,
    sunset,
    rahuKaal: [rahuStart, rahuEnd],
    gulikaKaal: [gulikaStart, gulikaEnd],
    yamaghanta: [yamaghantaStart, yamaghantaEnd],
    abhijit: [abhijitStart, abhijitEnd],
    brahma: [brahmaStart, brahmaEnd],
  };
}

/**
 * Check if a date is auspicious for a given activity
 */
export function isAuspicious(date: Date, activity: string): boolean {
  const panchang = computePanchang(date);

  // Simplified logic - in production, use proper rules
  if (activity === 'marriage') {
    return panchang.tithi !== 8 && panchang.tithi !== 14 && panchang.tithi !== 30;
  }

  if (activity === 'travel') {
    return panchang.vara !== 0; // Not Sunday
  }

  return true;
}

/**
 * Get sunrise and sunset times for a date (REAL CALCULATION)
 */
export function getSunriseSunset(date: Date, latitude: number, longitude: number): { sunrise: Date; sunset: Date } {
  const timezone = Math.round(longitude / 15);
  const { sunrise: sunriseStr, sunset: sunsetStr } = calculateSunriseSunset(date, latitude, longitude, timezone);
  
  const [sunriseHour, sunriseMin] = sunriseStr.split(':').map(Number);
  const [sunsetHour, sunsetMin] = sunsetStr.split(':').map(Number);

  const sunrise = new Date(date);
  sunrise.setHours(sunriseHour ?? 6, sunriseMin ?? 0, 0, 0);

  const sunset = new Date(date);
  sunset.setHours(sunsetHour ?? 18, sunsetMin ?? 0, 0, 0);
  
  return { sunrise, sunset };
}

/**
 * Muhurta timing entry
 */
export interface MuhurtaTimings {
  sunrise: Date;
  sunset: Date;
  rahuKaal: [Date, Date];
  gulikaKaal: [Date, Date];
  yamaghanta: [Date, Date];
  abhijit: [Date, Date];
  brahma: [Date, Date];
}

/**
 * PanchangDay type for muhurat engine
 */
export interface PanchangDay {
  date?: Date;
  vara: number;
  varaName: string;
  tithi: number;
  tithiName: string;
  paksha?: string;
  lunarMonth?: number;
  nakshatra: number;
  nakshatraName: string;
  yoga: number;
  yogaName: string;
  karana: number;
  karanaName: string;
  sunLongitude?: number;
  moonLongitude?: number;
  ayana?: string;
  ritu?: string;
  sunRise: string;
  sunSet: string;
  moonRise: string;
  moonSet: string;
  tithiEndTime?: Date;
  nakshatraEndTime?: Date;
  yogaEndTime?: Date;
}
