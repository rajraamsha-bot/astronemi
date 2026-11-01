/**
 * Muhurat Engine — Real Panchang-Based Calculations
 * 
 * Calculates auspicious timings based on:
 * - Tithi (lunar day)
 * - Nakshatra (lunar mansion)
 * - Yoga (sun-moon combination)
 * - Karana (half-tithi)
 * - Vara (weekday)
 * - Planetary hours (Hora)
 * - Avoidance periods (Rahu Kaal, etc.)
 */

import {
  computePanchang,
  computeMuhurtas,
  getSunriseSunset,
  MuhurtaTimings,
  PanchangDay,
} from './hindu-calendar-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MuhuratType {
  id: string;
  name: string;
  hindiName: string;
  category: string;
  description: string;
  importance: string;
  requiredTithis: number[];
  requiredNakshatras: string[];
  requiredYogas: string[];
  avoidNakshatras: string[];
  avoidTithis: number[];
  requiredVaras: number[]; // 0=Sunday, 6=Saturday
  avoidVaras: number[];
  duration: number; // minutes
  priority: 'essential' | 'important' | 'preferred';
}

export interface CalculatedMuhurat {
  type: MuhuratType;
  date: Date;
  startTime: Date;
  endTime: Date;
  quality: 'excellent' | 'good' | 'average';
  score: number;
  tithi: string;
  nakshatra: string;
  yoga: string;
  notes: string[];
}

export interface MuhuratSearchResult {
  muhurats: CalculatedMuhurat[];
  searchParams: {
    type: string;
    startDate: Date;
    endDate: Date;
    location: { lat: number; lon: number; timezone: number };
  };
}

// ─── Muhurat Definitions ──────────────────────────────────────────────────────

export const MUHURAT_TYPES: MuhuratType[] = [
  // Marriage Muhurats
  {
    id: 'vivah',
    name: 'Vivah Muhurat',
    hindiName: 'विवाह मुहूर्त',
    category: 'marriage',
    description: 'Auspicious time for marriage ceremony ensuring long and happy married life.',
    importance: 'Marriage is one of the most important samskaras. The right muhurat ensures harmony, prosperity, and longevity.',
    requiredTithis: [1, 2, 3, 5, 7, 10, 11, 12, 13], // Pratipada to Trayodashi (avoid 4, 6, 8, 9, 14, 15)
    requiredNakshatras: ['Rohini', 'Mrigashira', 'Magha', 'Uttara Phalguni', 'Hasta', 'Swati', 'Anuradha', 'Mula', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati'],
    requiredYogas: ['Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Sukarma', 'Dhriti', 'Vriddhi', 'Dhruva', 'Harshana', 'Siddhi', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra'],
    avoidNakshatras: ['Bharani', 'Krittika', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Jyeshtha', 'Dhanishta', 'Shatabhisha'],
    avoidTithis: [4, 6, 8, 9, 14, 15], // Chaturthi, Shashthi, Ashtami, Navami, Chaturdashi, Purnima/Amavasya
    requiredVaras: [], // Any day
    avoidVaras: [6], // Avoid Saturday
    duration: 120,
    priority: 'essential',
  },
  // Griha Pravesh
  {
    id: 'griha_pravesh',
    name: 'Griha Pravesh',
    hindiName: 'गृह प्रवेश',
    category: 'property',
    description: 'Auspicious time for entering a new house to bring prosperity and peace.',
    importance: 'Griha Pravesh purifies the new home and invites positive energies.',
    requiredTithis: [1, 2, 3, 5, 7, 10, 11, 12, 13],
    requiredNakshatras: ['Rohini', 'Mrigashira', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati'],
    requiredYogas: ['Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Sukarma', 'Dhriti', 'Vriddhi', 'Dhruva', 'Siddhi', 'Shiva', 'Siddha', 'Shubha'],
    avoidNakshatras: ['Bharani', 'Krittika', 'Ardra', 'Pushya', 'Ashlesha', 'Magha', 'Jyeshtha', 'Mula'],
    avoidTithis: [4, 6, 8, 9, 14, 15],
    requiredVaras: [0, 1, 4], // Sunday, Monday, Thursday preferred
    avoidVaras: [6],
    duration: 90,
    priority: 'essential',
  },
  // Business Start
  {
    id: 'business_start',
    name: 'Business Start',
    hindiName: 'व्यापार आरंभ',
    category: 'business',
    description: 'Auspicious time to start a new business or expand existing one.',
    importance: 'Starting business during favorable muhurat ensures growth and success.',
    requiredTithis: [1, 2, 3, 5, 10, 11, 12],
    requiredNakshatras: ['Ashwini', 'Rohini', 'Mrigashira', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Dhanishta', 'Revati'],
    requiredYogas: ['Ayushman', 'Saubhagya', 'Shobhana', 'Sukarma', 'Vriddhi', 'Dhruva', 'Siddhi', 'Siddha', 'Shubha'],
    avoidNakshatras: ['Bharani', 'Krittika', 'Ardra', 'Pushya', 'Ashlesha', 'Jyeshtha'],
    avoidTithis: [4, 6, 8, 9, 14, 15],
    requiredVaras: [0, 3, 4], // Sunday, Wednesday, Thursday
    avoidVaras: [6],
    duration: 60,
    priority: 'important',
  },
  // Vehicle Purchase
  {
    id: 'vehicle_purchase',
    name: 'Vehicle Purchase',
    hindiName: 'वाहन खरीद',
    category: 'vehicle',
    description: 'Auspicious time to purchase a vehicle for safety and prosperity.',
    importance: 'Buying vehicle during shubh muhurat ensures safety and longevity.',
    requiredTithis: [1, 2, 3, 5, 7, 10, 11, 12],
    requiredNakshatras: ['Ashwini', 'Rohini', 'Mrigashira', 'Hasta', 'Chitra', 'Swati', 'Dhanishta', 'Revati'],
    requiredYogas: ['Ayushman', 'Saubhagya', 'Shobhana', 'Sukarma', 'Siddhi', 'Shubha'],
    avoidNakshatras: ['Bharani', 'Krittika', 'Ardra', 'Jyeshtha', 'Mula'],
    avoidTithis: [4, 8, 9, 14, 15],
    requiredVaras: [0, 1, 3, 4, 5], // Sunday, Monday, Wednesday, Thursday, Friday
    avoidVaras: [2, 6], // Avoid Tuesday, Saturday
    duration: 60,
    priority: 'important',
  },
  // Travel
  {
    id: 'travel',
    name: 'Travel Muhurat',
    hindiName: 'यात्रा मुहूर्त',
    category: 'travel',
    description: 'Auspicious time to start a journey for safe and successful travel.',
    importance: 'Starting journey during favorable muhurat ensures safety and success.',
    requiredTithis: [1, 2, 3, 5, 7, 10, 11, 12, 13],
    requiredNakshatras: ['Ashwini', 'Rohini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Dhanishta', 'Revati'],
    requiredYogas: ['Ayushman', 'Saubhagya', 'Shobhana', 'Sukarma', 'Vriddhi', 'Dhruva', 'Siddhi'],
    avoidNakshatras: ['Bharani', 'Krittika', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula'],
    avoidTithis: [4, 8, 9, 14],
    requiredVaras: [],
    avoidVaras: [],
    duration: 30,
    priority: 'preferred',
  },
  // Education Start
  {
    id: 'education_start',
    name: 'Vidya Arambh',
    hindiName: 'विद्या आरंभ',
    category: 'education',
    description: 'Auspicious time to start education, new course, or learning.',
    importance: 'Vidya Arambh muhurat ensures success in studies and academic achievements.',
    requiredTithis: [1, 2, 3, 5, 7, 10, 11, 12],
    requiredNakshatras: ['Ashwini', 'Rohini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Dhanishta', 'Revati'],
    requiredYogas: ['Ayushman', 'Saubhagya', 'Shobhana', 'Sukarma', 'Siddhi', 'Siddha', 'Brahma'],
    avoidNakshatras: ['Bharani', 'Krittika', 'Ardra', 'Ashlesha', 'Jyeshtha'],
    avoidTithis: [4, 8, 9, 14, 15],
    requiredVaras: [0, 3, 4, 5], // Sunday, Wednesday, Thursday, Friday
    avoidVaras: [2, 6],
    duration: 45,
    priority: 'important',
  },
  // Naming Ceremony
  {
    id: 'namkaran',
    name: 'Namkaran',
    hindiName: 'नामकरण',
    category: 'ceremony',
    description: 'Auspicious time for naming ceremony of a newborn.',
    importance: 'Namkaran performed at right muhurat blesses the child with good fortune.',
    requiredTithis: [1, 2, 3, 5, 7, 10, 11, 12],
    requiredNakshatras: ['Ashwini', 'Rohini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Revati'],
    requiredYogas: ['Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Sukarma', 'Siddhi', 'Shubha'],
    avoidNakshatras: ['Bharani', 'Krittika', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula'],
    avoidTithis: [4, 8, 9, 14],
    requiredVaras: [0, 1, 3, 4, 5],
    avoidVaras: [2, 6],
    duration: 60,
    priority: 'essential',
  },
  // Property Purchase
  {
    id: 'property_purchase',
    name: 'Property Purchase',
    hindiName: 'संपत्ति खरीद',
    category: 'property',
    description: 'Auspicious time for purchasing property or land.',
    importance: 'Property purchase during favorable muhurat ensures prosperity and legal clarity.',
    requiredTithis: [1, 2, 3, 5, 7, 10, 11, 12, 13],
    requiredNakshatras: ['Rohini', 'Mrigashira', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati'],
    requiredYogas: ['Ayushman', 'Saubhagya', 'Shobhana', 'Sukarma', 'Vriddhi', 'Dhruva', 'Siddhi', 'Shubha'],
    avoidNakshatras: ['Bharani', 'Krittika', 'Ardra', 'Pushya', 'Ashlesha', 'Jyeshtha', 'Mula'],
    avoidTithis: [4, 6, 8, 9, 14, 15],
    requiredVaras: [0, 1, 4],
    avoidVaras: [6],
    duration: 90,
    priority: 'essential',
  },
  // Legal Matters
  {
    id: 'legal_matters',
    name: 'Legal Matters',
    hindiName: 'न्यायिक मुहूर्त',
    category: 'legal',
    description: 'Auspicious time for filing cases, court appearances, legal documents.',
    importance: 'Favorable muhurat for legal matters increases chances of favorable outcomes.',
    requiredTithis: [1, 2, 3, 5, 10, 11, 12],
    requiredNakshatras: ['Ashwini', 'Rohini', 'Mrigashira', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Dhanishta', 'Revati'],
    requiredYogas: ['Ayushman', 'Saubhagya', 'Shobhana', 'Sukarma', 'Vriddhi', 'Siddhi', 'Siddha'],
    avoidNakshatras: ['Bharani', 'Krittika', 'Ardra', 'Jyeshtha', 'Mula'],
    avoidTithis: [4, 8, 9, 14, 15],
    requiredVaras: [0, 3, 4, 5],
    avoidVaras: [2, 6],
    duration: 45,
    priority: 'important',
  },
  // Shopping
  {
    id: 'shopping',
    name: 'Shopping Muhurat',
    hindiName: 'खरीद मुहूर्त',
    category: 'shopping',
    description: 'Auspicious time for important purchases and investments.',
    importance: 'Making purchases during favorable time ensures value and satisfaction.',
    requiredTithis: [1, 2, 3, 5, 7, 10, 11, 12],
    requiredNakshatras: ['Ashwini', 'Rohini', 'Mrigashira', 'Hasta', 'Chitra', 'Swati', 'Dhanishta', 'Revati'],
    requiredYogas: ['Ayushman', 'Saubhagya', 'Shobhana', 'Sukarma', 'Siddhi', 'Shubha'],
    avoidNakshatras: ['Bharani', 'Krittika', 'Ardra', 'Jyeshtha'],
    avoidTithis: [4, 8, 9, 14, 15],
    requiredVaras: [0, 1, 3, 4, 5],
    avoidVaras: [],
    duration: 60,
    priority: 'preferred',
  },
];

// ─── Auspicious/Inauspicious Periods ──────────────────────────────────────────

const AUSPICIOUS_YOGAS = ['Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Sukarma', 'Dhriti', 'Vriddhi', 'Dhruva', 'Harshana', 'Siddhi', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra'];
const INAUSPICIOUS_YOGAS = ['Vishkumbha', 'Atiganda', 'Shula', 'Ganda', 'Vyaghata', 'Vajra', 'Vyatipata', 'Parigha', 'Vaidhriti'];

// ─── Core Calculation Functions ───────────────────────────────────────────────

/**
 * Calculate quality score for a specific time slot
 */
function calculateMuhuratScore(
  panchang: PanchangDay,
  muhuratType: MuhuratType,
  muhurtaTimings: MuhurtaTimings,
  checkTime: Date
): { score: number; quality: 'excellent' | 'good' | 'average'; notes: string[] } {
  let score = 50; // Base score
  const notes: string[] = [];

  // Check Tithi (max +15 points)
  if (muhuratType.requiredTithis.includes(panchang.tithi)) {
    score += 15;
    notes.push(`✓ Auspicious tithi: ${panchang.tithiName}`);
  } else if (muhuratType.avoidTithis.includes(panchang.tithi)) {
    score -= 20;
    notes.push(`✗ Inauspicious tithi: ${panchang.tithiName}`);
  }

  // Check Nakshatra (max +15 points)
  if (muhuratType.requiredNakshatras.includes(panchang.nakshatraName)) {
    score += 15;
    notes.push(`✓ Auspicious nakshatra: ${panchang.nakshatraName}`);
  } else if (muhuratType.avoidNakshatras.includes(panchang.nakshatraName)) {
    score -= 15;
    notes.push(`✗ Inauspicious nakshatra: ${panchang.nakshatraName}`);
  }

  // Check Yoga (max +10 points)
  if (muhuratType.requiredYogas.includes(panchang.yogaName)) {
    score += 10;
    notes.push(`✓ Auspicious yoga: ${panchang.yogaName}`);
  } else if (INAUSPICIOUS_YOGAS.includes(panchang.yogaName)) {
    score -= 10;
    notes.push(`✗ Inauspicious yoga: ${panchang.yogaName}`);
  }

  // Check Vara (max +10 points)
  if (muhuratType.requiredVaras.length > 0 && muhuratType.requiredVaras.includes(panchang.vara)) {
    score += 10;
    notes.push(`✓ Auspicious day: ${panchang.varaName}`);
  } else if (muhuratType.avoidVaras.includes(panchang.vara)) {
    score -= 10;
    notes.push(`✗ Inauspicious day: ${panchang.varaName}`);
  }

  // Check if time falls in Rahu Kaal (-20 points)
  const checkHour = checkTime.getHours() + checkTime.getMinutes() / 60;
  const rahuStart = muhurtaTimings.rahuKaal[0].getHours() + muhurtaTimings.rahuKaal[0].getMinutes() / 60;
  const rahuEnd = muhurtaTimings.rahuKaal[1].getHours() + muhurtaTimings.rahuKaal[1].getMinutes() / 60;
  
  if (checkHour >= rahuStart && checkHour < rahuEnd) {
    score -= 20;
    notes.push(`✗ Falls in Rahu Kaal`);
  }

  // Check if time falls in Abhijit Muhurta (+10 points)
  const abhijitStart = muhurtaTimings.abhijit[0].getHours() + muhurtaTimings.abhijit[0].getMinutes() / 60;
  const abhijitEnd = muhurtaTimings.abhijit[1].getHours() + muhurtaTimings.abhijit[1].getMinutes() / 60;
  
  if (checkHour >= abhijitStart && checkHour < abhijitEnd) {
    score += 10;
    notes.push(`✓ Abhijit Muhurta (highly auspicious)`);
  }

  // Check if time falls in Brahma Muhurta (+15 points)
  const brahmaStart = muhurtaTimings.brahma[0].getHours() + muhurtaTimings.brahma[0].getMinutes() / 60;
  const brahmaEnd = muhurtaTimings.brahma[1].getHours() + muhurtaTimings.brahma[1].getMinutes() / 60;
  
  if (checkHour >= brahmaStart && checkHour < brahmaEnd) {
    score += 15;
    notes.push(`✓ Brahma Muhurta (most auspicious)`);
  }

  // Determine quality
  let quality: 'excellent' | 'good' | 'average';
  if (score >= 80) quality = 'excellent';
  else if (score >= 60) quality = 'good';
  else quality = 'average';

  return { score: Math.max(0, Math.min(100, score)), quality, notes };
}

/**
 * Find auspicious muhurats for a specific type within a date range
 */
export function findMuhurats(
  muhuratTypeId: string,
  startDate: Date,
  endDate: Date,
  location: { lat: number; lon: number; timezone: number }
): MuhuratSearchResult {
  const muhuratType = MUHURAT_TYPES.find(m => m.id === muhuratTypeId);
  if (!muhuratType) {
    throw new Error(`Unknown muhurat type: ${muhuratTypeId}`);
  }

  const muhurats: CalculatedMuhurat[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const panchang = computePanchang(currentDate);
    const muhurtaTimings = computeMuhurtas(currentDate, location.lat, location.lon);

    // Check if day is suitable
    const daySuitable = 
      !muhuratType.avoidVaras.includes(panchang.vara) &&
      !muhuratType.avoidTithis.includes(panchang.tithi) &&
      !muhuratType.avoidNakshatras.includes(panchang.nakshatraName);

    if (daySuitable) {
      // Generate time slots throughout the day
      const { sunrise, sunset } = getSunriseSunset(currentDate, location.lat, location.lon);
      // const dayLength = sunset.getTime() - sunrise.getTime();
      const slotDuration = muhuratType.duration * 60 * 1000; // Convert to milliseconds

      // Create slots every 30 minutes from sunrise to sunset
      for (let time = sunrise.getTime(); time + slotDuration <= sunset.getTime(); time += 30 * 60 * 1000) {
        const slotStart = new Date(time);
        const slotEnd = new Date(time + slotDuration);

        const { score, quality, notes } = calculateMuhuratScore(
          panchang,
          muhuratType,
          muhurtaTimings,
          slotStart
        );

        // Only include if score is good enough
        if (score >= 50) {
          muhurats.push({
            type: muhuratType,
            date: new Date(currentDate),
            startTime: slotStart,
            endTime: slotEnd,
            quality,
            score,
            tithi: `${panchang.paksha} ${panchang.tithiName}`,
            nakshatra: panchang.nakshatraName,
            yoga: panchang.yogaName,
            notes,
          });
        }
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Sort by score (highest first), then by date
  muhurats.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.startTime.getTime() - b.startTime.getTime();
  });

  // Return top 20 results
  return {
    muhurats: muhurats.slice(0, 20),
    searchParams: {
      type: muhuratTypeId,
      startDate,
      endDate,
      location,
    },
  };
}

/**
 * Get next available muhurat for a specific type
 */
export function getNextMuhurat(
  muhuratTypeId: string,
  location: { lat: number; lon: number; timezone: number },
  daysToSearch: number = 30
): CalculatedMuhurat | null {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysToSearch);

  const result = findMuhurats(muhuratTypeId, startDate, endDate, location);
  return result.muhurats[0] || null;
}

/**
 * Get all available muhurats for a specific date
 */
export function getMuhuratsForDate(
  date: Date,
  location: { lat: number; lon: number; timezone: number }
): CalculatedMuhurat[] {
  const allMuhurats: CalculatedMuhurat[] = [];

  for (const muhuratType of MUHURAT_TYPES) {
    const result = findMuhurats(
      muhuratType.id,
      date,
      date,
      location
    );
    allMuhurats.push(...result.muhurats);
  }

  // Sort by score
  allMuhurats.sort((a, b) => b.score - a.score);
  return allMuhurats;
}

/**
 * Check if a specific time is auspicious
 */
export function checkTimeAuspiciousness(
  dateTime: Date,
  location: { lat: number; lon: number; timezone: number }
): {
  isAuspicious: boolean;
  score: number;
  panchang: PanchangDay;
  muhurtaTimings: MuhurtaTimings;
  warnings: string[];
  recommendations: string[];
} {
  const panchang = computePanchang(dateTime);
  const muhurtaTimings = computeMuhurtas(dateTime, location.lat, location.lon);
  const warnings: string[] = [];
  const recommendations: string[] = [];

  let score = 70; // Base score

  // Check yoga
  if (AUSPICIOUS_YOGAS.includes(panchang.yogaName)) {
    score += 10;
    recommendations.push(`Good yoga: ${panchang.yogaName}`);
  } else if (INAUSPICIOUS_YOGAS.includes(panchang.yogaName)) {
    score -= 15;
    warnings.push(`Challenging yoga: ${panchang.yogaName}`);
  }

  // Check Rahu Kaal
  const checkHour = dateTime.getHours() + dateTime.getMinutes() / 60;
  const rahuStart = muhurtaTimings.rahuKaal[0].getHours() + muhurtaTimings.rahuKaal[0].getMinutes() / 60;
  const rahuEnd = muhurtaTimings.rahuKaal[1].getHours() + muhurtaTimings.rahuKaal[1].getMinutes() / 60;
  
  if (checkHour >= rahuStart && checkHour < rahuEnd) {
    score -= 25;
    warnings.push(`Currently in Rahu Kaal (${formatTime(muhurtaTimings.rahuKaal[0])} - ${formatTime(muhurtaTimings.rahuKaal[1])})`);
  }

  // Check Gulika Kaal
  const gulikaStart = muhurtaTimings.gulikaKaal[0].getHours() + muhurtaTimings.gulikaKaal[0].getMinutes() / 60;
  const gulikaEnd = muhurtaTimings.gulikaKaal[1].getHours() + muhurtaTimings.gulikaKaal[1].getMinutes() / 60;
  
  if (checkHour >= gulikaStart && checkHour < gulikaEnd) {
    score -= 10;
    warnings.push(`Currently in Gulika Kaal`);
  }

  // Check Abhijit Muhurta
  const abhijitStart = muhurtaTimings.abhijit[0].getHours() + muhurtaTimings.abhijit[0].getMinutes() / 60;
  const abhijitEnd = muhurtaTimings.abhijit[1].getHours() + muhurtaTimings.abhijit[1].getMinutes() / 60;
  
  if (checkHour >= abhijitStart && checkHour < abhijitEnd) {
    score += 15;
    recommendations.push(`Abhijit Muhurta active - highly auspicious time`);
  }

  return {
    isAuspicious: score >= 60,
    score: Math.max(0, Math.min(100, score)),
    panchang,
    muhurtaTimings,
    warnings,
    recommendations,
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Get muhurat categories with icons and colors
 */
export function getMuhuratCategories(): { id: string; name: string; icon: string; color: string }[] {
  return [
    { id: 'marriage', name: 'Marriage', icon: '💑', color: '#e91e63' },
    { id: 'property', name: 'Property', icon: '🏠', color: '#4caf50' },
    { id: 'business', name: 'Business', icon: '💼', color: '#2196f3' },
    { id: 'education', name: 'Education', icon: '📚', color: '#9c27b0' },
    { id: 'travel', name: 'Travel', icon: '✈️', color: '#ff9800' },
    { id: 'vehicle', name: 'Vehicle', icon: '🚗', color: '#795548' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#00bcd4' },
    { id: 'legal', name: 'Legal', icon: '⚖️', color: '#607d8b' },
    { id: 'ceremony', name: 'Ceremony', icon: '🎉', color: '#ffc107' },
  ];
}

export { MUHURAT_TYPES as muhuratTypes };
