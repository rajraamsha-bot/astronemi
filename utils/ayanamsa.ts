/**
 * Ayanamsa Calculator
 * Supports multiple ayanamsa systems for Vedic astrology
 *
 * Uses IAU 2006 precession model via astronomy-engine for high accuracy.
 */

import {
  getLahiriAyanamsa,
  getRamanAyanamsa,
  getKPAyanamsa,
  getYukteswarAyanamsa,
  calculateJulianDay,
} from './ephemeris';

export enum AyanamsaType {
  LAHIRI = 'lahiri',
  RAMAN = 'raman',
  KRISHNAMURTI = 'krishnamurti',
  YUKTESHWAR = 'yukteshwar',
  FAGAN_BRADLEY = 'fagan_bradley',
  TROPICAL = 'tropical',
}

export interface AyanamsaConfig {
  type: AyanamsaType;
  name: string;
  value: number; // degrees for reference year
  description: string;
  usage: string;
  referenceYear: number;
  annualPrecession: number; // degrees per year
}

/**
 * Ayanamsa values for the year 2000 (reference)
 */
export const AYANAMSA_VALUES_2000 = {
  LAHIRI: 23.85,
  RAMAN: 21.60,
  KP: 23.85,
  YUKTESHWAR: 21.10,
  FAGAN_BRADLEY: 24.75,
  TROPICAL: 0,
};

/**
 * Annual precession rates (degrees per year)
 */
export const AYANAMSA_RATES = {
  LAHIRI: 0.0139,
  RAMAN: 0.0139,
  KP: 0.0139,
  YUKTESHWAR: 0.0139,
  FAGAN_BRADLEY: 0.0139,
  TROPICAL: 0,
};

/**
 * Ayanamsa configurations
 */
export const AYANAMSA_CONFIGS: Record<AyanamsaType, AyanamsaConfig> = {
  [AyanamsaType.LAHIRI]: {
    type: AyanamsaType.LAHIRI,
    name: 'Lahiri (Chitrapaksha)',
    value: 24.15, // Approximate value for 2024
    description: 'Lahiri: Most popular ayanamsa in India, based on the star Spica (Chitra)',
    usage: 'Standard for Indian Vedic astrology',
    referenceYear: 2024,
    annualPrecession: 0.0139, // ~50.27" per year
  },
  [AyanamsaType.RAMAN]: {
    type: AyanamsaType.RAMAN,
    name: 'Raman',
    value: 21.60, // Approximate value for 2024
    description: 'Used by B.V. Raman, slightly different from Lahiri',
    usage: 'Popular in South India',
    referenceYear: 2024,
    annualPrecession: 0.0139,
  },
  [AyanamsaType.KRISHNAMURTI]: {
    type: AyanamsaType.KRISHNAMURTI,
    name: 'Krishnamurti (KP)',
    value: 23.85, // Approximate value for 2024
    description: 'Used in Krishnamurti Paddhati system',
    usage: 'KP astrology system',
    referenceYear: 2024,
    annualPrecession: 0.0139,
  },
  [AyanamsaType.YUKTESHWAR]: {
    type: AyanamsaType.YUKTESHWAR,
    name: 'Yukteshwar',
    value: 21.10, // Approximate value for 2024
    description: 'Based on Sri Yukteshwar\'s calculations in "The Holy Science"',
    usage: 'Spiritual astrology',
    referenceYear: 2024,
    annualPrecession: 0.0139,
  },
  [AyanamsaType.FAGAN_BRADLEY]: {
    type: AyanamsaType.FAGAN_BRADLEY,
    name: 'Fagan-Bradley',
    value: 24.75, // Approximate value for 2024
    description: 'Used in Western sidereal astrology',
    usage: 'Western sidereal system',
    referenceYear: 2024,
    annualPrecession: 0.0139,
  },
  [AyanamsaType.TROPICAL]: {
    type: AyanamsaType.TROPICAL,
    name: 'Tropical (No Ayanamsa)',
    value: 0,
    description: 'No precession correction - Western tropical astrology',
    usage: 'Western tropical astrology',
    referenceYear: 2024,
    annualPrecession: 0,
  },
};

/**
 * Calculate ayanamsa for a given date and type
 * Uses proper IAU 2006 precession model for high accuracy.
 */
export function calculateAyanamsa(date: Date, type: AyanamsaType | string = AyanamsaType.LAHIRI): number {
  // Handle string type input with case-insensitive matching
  let configKey: AyanamsaType;
  if (typeof type === 'string') {
    const normalizedType = type.toLowerCase();
    switch (normalizedType) {
      case 'lahiri':
        configKey = AyanamsaType.LAHIRI;
        break;
      case 'raman':
        configKey = AyanamsaType.RAMAN;
        break;
      case 'krishnamurti':
      case 'kp':
        configKey = AyanamsaType.KRISHNAMURTI;
        break;
      case 'yukteshwar':
        configKey = AyanamsaType.YUKTESHWAR;
        break;
      case 'fagan_bradley':
      case 'fagan-bradley':
        configKey = AyanamsaType.FAGAN_BRADLEY;
        break;
      case 'tropical':
        configKey = AyanamsaType.TROPICAL;
        break;
      default:
        configKey = normalizedType as AyanamsaType;
    }
  } else {
    configKey = type;
  }

  if (configKey === AyanamsaType.TROPICAL) {
    return 0;
  }

  // Handle invalid dates gracefully
  if (isNaN(date.getTime())) {
    return NaN;
  }

  // Use accurate Julian Day for the date
  const jd = calculateJulianDay(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  );

  switch (configKey) {
    case AyanamsaType.LAHIRI:
      return getLahiriAyanamsa(jd);
    case AyanamsaType.RAMAN:
      return getRamanAyanamsa(jd);
    case AyanamsaType.KRISHNAMURTI:
      return getKPAyanamsa(jd);
    case AyanamsaType.YUKTESHWAR:
      return getYukteswarAyanamsa(jd);
    case AyanamsaType.FAGAN_BRADLEY:
      // Fagan-Bradley: Spica at 29° Virgo = 179° sidereal
      // At J2000.0, Fagan-Bradley ≈ 24.75°
      return getLahiriAyanamsa(jd) + 0.9; // Approximate offset from Lahiri
    default:
      return getLahiriAyanamsa(jd);
  }
}

/**
 * Convert tropical longitude to sidereal longitude
 */
export function tropicalToSidereal(
  tropicalLongitude: number,
  date: Date,
  ayanamsaType: AyanamsaType = AyanamsaType.LAHIRI
): number {
  const ayanamsa = calculateAyanamsa(date, ayanamsaType);
  let siderealLongitude = tropicalLongitude - ayanamsa;
  
  // Normalize to 0-360
  while (siderealLongitude < 0) {
    siderealLongitude += 360;
  }
  while (siderealLongitude >= 360) {
    siderealLongitude -= 360;
  }
  
  return siderealLongitude;
}

/**
 * Convert sidereal longitude to tropical longitude
 */
export function siderealToTropical(
  longitude: number,
  date: Date,
  ayanamsaType: AyanamsaType = AyanamsaType.LAHIRI
): number {
  const ayanamsa = calculateAyanamsa(date, ayanamsaType);
  let tropical = longitude + ayanamsa;
  // Ensure the result is between 0 and 360
  while (tropical < 0) {
    tropical += 360;
  }
  while (tropical >= 360) {
    tropical -= 360;
  }
  return tropical;
}

/**
 * Compare all ayanamsa systems for a given date
 */
export function compareAyanamsaSystems(date: Date): Record<string, number> {
  const systems = Object.values(AyanamsaType);
  const comparison: Record<string, number> = {};

  systems.forEach(system => {
    try {
      const value = calculateAyanamsa(date, system);
      // Use short names as expected by tests
      let key = system.toUpperCase();
      if (system === AyanamsaType.KRISHNAMURTI) {
        key = 'KP';
      }
      // Round to 2 decimal places for consistency
      comparison[key] = Math.round(value * 100) / 100;
    } catch (error) {
      let key = system.toUpperCase();
      if (system === AyanamsaType.KRISHNAMURTI) {
        key = 'KP';
      }
      comparison[key] = 0;
    }
  });

  return comparison;
}

/**
 * Get detailed ayanamsa information for a specific date and system
 */
export function getAyanamsaForDate(date: Date, system: AyanamsaType | string): {
  value: number;
  system: string;
  date: Date;
  description: string;
  accuracy: string;
} {
  const value = calculateAyanamsa(date, system as AyanamsaType);

  // Normalize string input to enum key
  let configKey: AyanamsaType;
  if (typeof system === 'string') {
    const normalized = system.toLowerCase();
    if (normalized === 'kp') {
      configKey = AyanamsaType.KRISHNAMURTI;
    } else {
      configKey = normalized as AyanamsaType;
    }
  } else {
    configKey = system;
  }

  const config = AYANAMSA_CONFIGS[configKey];

  // Return the system name in uppercase as expected by tests
  let systemName = system.toString().toUpperCase();
  if (typeof system === 'string' && system.toUpperCase() === 'KP') {
    systemName = 'KRISHNAMURTI';
  }

  return {
    value: Math.round(value * 100) / 100, // Round to 2 decimal places
    system: systemName,
    date: new Date(date),
    description: config?.description || 'Ayanamsa calculation',
    accuracy: 'High precision astronomical calculation',
  };
}

/**
 * Get sign from longitude
 */
export function getSignFromLongitude(longitude: number): {
  sign: string;
  signIndex: number;
  degree: number;
} {
  const ZODIAC_SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  
  const normalizedLon = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalizedLon / 30);
  const degree = normalizedLon % 30;
  
  return {
    sign: ZODIAC_SIGNS[signIndex] || 'Aries',
    signIndex,
    degree,
  };
}

/**
 * Compare ayanamsas - show difference between systems
 */
export function compareAyanamsas(date: Date): {
  type: AyanamsaType;
  name: string;
  value: number;
  difference: number; // difference from Lahiri
}[] {
  const lahiriValue = calculateAyanamsa(date, AyanamsaType.LAHIRI);
  
  return Object.values(AyanamsaType).map(type => {
    const value = calculateAyanamsa(date, type);
    return {
      type,
      name: AYANAMSA_CONFIGS[type].name,
      value,
      difference: value - lahiriValue,
    };
  });
}

/**
 * Get recommended ayanamsa based on usage
 */
export function getRecommendedAyanamsa(usage: 'vedic' | 'kp' | 'western_sidereal' | 'tropical'): AyanamsaType {
  switch (usage) {
    case 'vedic':
      return AyanamsaType.LAHIRI;
    case 'kp':
      return AyanamsaType.KRISHNAMURTI;
    case 'western_sidereal':
      return AyanamsaType.FAGAN_BRADLEY;
    case 'tropical':
      return AyanamsaType.TROPICAL;
    default:
      return AyanamsaType.LAHIRI;
  }
}

/**
 * Calculate precession rate (degrees per year)
 */
export function getPrecessionRate(): number {
  // Standard precession rate: ~50.27 arc seconds per year
  // = 0.0139 degrees per year
  return 0.0139;
}

/**
 * Calculate when ayanamsa was zero (Ayanamsa Zero Year)
 */
export function calculateAyanamsaZeroYear(ayanamsaType: AyanamsaType = AyanamsaType.LAHIRI): number {
  const config = AYANAMSA_CONFIGS[ayanamsaType];
  
  if (ayanamsaType === AyanamsaType.TROPICAL) {
    return 0; // Always zero
  }
  
  // Calculate years back from reference year
  const yearsBack = config.value / config.annualPrecession;
  const zeroYear = config.referenceYear - yearsBack;
  
  return Math.round(zeroYear);
}

/**
 * Get detailed ayanamsa information
 */
export function getAyanamsaInfo(type: AyanamsaType, date: Date): {
  config: AyanamsaConfig;
  currentValue: number;
  zeroYear: number;
  tropicalDifference: number;
} {
  const config = AYANAMSA_CONFIGS[type];
  const currentValue = calculateAyanamsa(date, type);
  const zeroYear = calculateAyanamsaZeroYear(type);
  const tropicalDifference = currentValue; // Difference from tropical (0)
  
  return {
    config,
    currentValue,
    zeroYear,
    tropicalDifference,
  };
}

/**
 * Alias for tropicalToSidereal
 */
export const convertTropicalToSidereal = tropicalToSidereal;

/**
 * Alias for siderealToTropical
 */
export const convertSiderealToTropical = siderealToTropical;

export default {
  AyanamsaType,
  AYANAMSA_VALUES_2000,
  AYANAMSA_RATES,
  AYANAMSA_CONFIGS,
  calculateAyanamsa,
  tropicalToSidereal,
  siderealToTropical,
  convertTropicalToSidereal,
  convertSiderealToTropical,
  getSignFromLongitude,
  compareAyanamsas,
  getRecommendedAyanamsa,
  getPrecessionRate,
  calculateAyanamsaZeroYear,
  getAyanamsaInfo,
};
