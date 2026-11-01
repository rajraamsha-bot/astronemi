/**
 * Divisional Charts (Varga Charts) Calculator
 * Implements D7, D10, D12, and other divisional charts
 */

export interface DivisionalChartPlanet {
  name: string;
  sign: string;
  signIndex: number;
  signNumber: number;
  house: number;
  degree: number;
  isRetrograde: boolean;
}

export interface Planet {
  name: string;
  longitude: number;
  isRetrograde: boolean;
}

export interface DivisionalChart {
  type: string;
  chartType: string;
  name: string;
  purpose: string;
  interpretation: string;
  ascendant: {
    sign: string;
    signIndex: number;
    degree: number;
  };
  planets: DivisionalChartPlanet[];
}

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

/**
 * Calculate divisional chart position
 * @param longitude - Planet's longitude in degrees (0-360)
 * @param division - Division number (7, 10, 12, etc.)
 * @returns Sign index (0-11) in the divisional chart
 */
function calculateDivisionalPosition(longitude: number, division: number): number {
  // Normalize longitude to 0-360
  const normalizedLon = ((longitude % 360) + 360) % 360;
  
  // Get sign (0-11) and degree within sign (0-30)
  const signIndex = Math.floor(normalizedLon / 30);
  const degreeInSign = normalizedLon % 30;
  
  // Calculate position in divisional chart
  const divisionalDegree = (degreeInSign / 30) * division;
  const divisionalSignOffset = Math.floor(divisionalDegree);
  
  // For odd signs (Aries, Gemini, Leo, etc.)
  // Start from the same sign
  // For even signs (Taurus, Cancer, Virgo, etc.)
  // Start from the 9th sign (8 signs ahead)
  const isOddSign = signIndex % 2 === 0;
  const startSign = isOddSign ? signIndex : (signIndex + 8) % 12;
  
  // Calculate final position
  const finalSignIndex = (startSign + divisionalSignOffset) % 12;
  
  return finalSignIndex;
}

/**
 * Calculate D7 - Saptamsa Chart (Children & Progeny)
 */
export function calculateD7Chart(
  ascendantLongitude: number,
  planets: { name: string; longitude: number; isRetrograde: boolean }[]
): DivisionalChart {
  const ascSignIndex = calculateDivisionalPosition(ascendantLongitude, 7);
  
  const d7Planets: DivisionalChartPlanet[] = planets.map(planet => {
    const signIndex = calculateDivisionalPosition(planet.longitude, 7);
    return {
      name: planet.name,
      sign: ZODIAC_SIGNS[signIndex] ?? 'Unknown',
      signIndex,
      signNumber: signIndex,
      house: ((signIndex - ascSignIndex + 12) % 12) + 1,
      degree: (planet.longitude % 30) * 7 % 30,
      isRetrograde: planet.isRetrograde,
    };
  });

  return {
    type: 'D7',
    chartType: 'D7',
    name: 'Saptamsa',
    purpose: 'Children, Progeny, Creativity',
    interpretation: 'The Saptamsa chart reveals insights about children, creativity, and progeny based on planetary positions.',
    ascendant: {
      sign: ZODIAC_SIGNS[ascSignIndex] ?? 'Unknown',
      signIndex: ascSignIndex,
      degree: (ascendantLongitude % 30) * 7 % 30,
    },
    planets: d7Planets,
  };
}

/**
 * Calculate D10 - Dasamsa Chart (Career & Profession)
 */
export function calculateD10Chart(
  ascendantLongitude: number,
  planets: { name: string; longitude: number; isRetrograde: boolean }[]
): DivisionalChart {
  const ascSignIndex = calculateDivisionalPosition(ascendantLongitude, 10);
  
  const d10Planets: DivisionalChartPlanet[] = planets.map(planet => {
    const signIndex = calculateDivisionalPosition(planet.longitude, 10);
    return {
      name: planet.name,
      sign: ZODIAC_SIGNS[signIndex] ?? 'Unknown',
      signIndex,
      signNumber: signIndex,
      house: ((signIndex - ascSignIndex + 12) % 12) + 1,
      degree: (planet.longitude % 30) * 10 % 30,
      isRetrograde: planet.isRetrograde,
    };
  });

  return {
    type: 'D10',
    chartType: 'D10',
    name: 'Dasamsa',
    purpose: 'Career, Profession, Status, Authority',
    interpretation: 'The Dasamsa chart focuses on career, profession, and status in society.',
    ascendant: {
      sign: ZODIAC_SIGNS[ascSignIndex] ?? 'Unknown',
      signIndex: ascSignIndex,
      degree: (ascendantLongitude % 30) * 10 % 30,
    },
    planets: d10Planets,
  };
}

/**
 * Calculate D12 - Dwadasamsa Chart (Parents & Ancestry)
 */
export function calculateD12Chart(
  ascendantLongitude: number,
  planets: { name: string; longitude: number; isRetrograde: boolean }[]
): DivisionalChart {
  const ascSignIndex = calculateDivisionalPosition(ascendantLongitude, 12);
  
  const d12Planets: DivisionalChartPlanet[] = planets.map(planet => {
    const signIndex = calculateDivisionalPosition(planet.longitude, 12);
    return {
      name: planet.name,
      sign: ZODIAC_SIGNS[signIndex] ?? 'Unknown',
      signIndex,
      signNumber: signIndex,
      house: ((signIndex - ascSignIndex + 12) % 12) + 1,
      degree: (planet.longitude % 30) * 12 % 30,
      isRetrograde: planet.isRetrograde,
    };
  });

  return {
    type: 'D12',
    chartType: 'D12',
    name: 'Dwadasamsa',
    purpose: 'Parents, Ancestors, Past Life Karma',
    interpretation: 'The Dwadasamsa chart reveals information about parents, ancestors, and past life karma.',
    ascendant: {
      sign: ZODIAC_SIGNS[ascSignIndex] ?? 'Unknown',
      signIndex: ascSignIndex,
      degree: (ascendantLongitude % 30) * 12 % 30,
    },
    planets: d12Planets,
  };
}

/**
 * Calculate D16 - Shodasamsa Chart (Vehicles & Comforts)
 */
export function calculateD16Chart(
  ascendantLongitude: number,
  planets: { name: string; longitude: number; isRetrograde: boolean }[]
): DivisionalChart {
  const ascSignIndex = calculateDivisionalPosition(ascendantLongitude, 16);
  
  const d16Planets: DivisionalChartPlanet[] = planets.map(planet => {
    const signIndex = calculateDivisionalPosition(planet.longitude, 16);
    return {
      name: planet.name,
      sign: ZODIAC_SIGNS[signIndex] ?? 'Unknown',
      signIndex,
      signNumber: signIndex,
      house: ((signIndex - ascSignIndex + 12) % 12) + 1,
      degree: (planet.longitude % 30) * 16 % 30,
      isRetrograde: planet.isRetrograde,
    };
  });

  return {
    type: 'D16',
    chartType: 'D16',
    name: 'Shodasamsa',
    purpose: 'Vehicles, Luxuries, Material Comforts',
    interpretation: 'The Shodasamsa chart indicates vehicles, luxuries, and material comforts.',
    ascendant: {
      sign: ZODIAC_SIGNS[ascSignIndex] ?? 'Unknown',
      signIndex: ascSignIndex,
      degree: (ascendantLongitude % 30) * 16 % 30,
    },
    planets: d16Planets,
  };
}

/**
 * Get divisional chart name
 */
export function getDivisionalChartName(chartType: string): string {
  const names: Record<string, string> = {
    D1: 'Rasi',
    D2: 'Hora',
    D3: 'Dreshkana',
    D4: 'Chaturthamsa',
    D7: 'Saptamsa',
    D9: 'Navamsa',
    D10: 'Dasamsa',
    D12: 'Dwadasamsa',
    D16: 'Shodasamsa',
    D20: 'Vimsamsa',
    D24: 'Chaturvimsamsa',
    D27: 'Saptavimsamsa',
    D30: 'Trimshamsa',
    D40: 'Khavedamsa',
    D45: 'Akshavedamsa',
    D60: 'Shashtiamsa',
  };
  return names[chartType] || 'Unknown';
}

/**
 * Get divisional chart purpose
 */
export function getDivisionalChartPurpose(chartType: string): string {
const purposes: Record<string, string> = {
  D1: 'physical body, personality, general life',
  D2: 'wealth, family, speech, food',
  D3: 'siblings, communication, short journeys',
  D4: 'fortune, property, education',
  D7: 'children, creativity, intelligence',
  D9: 'marriage, partnerships, spirituality',
  D10: 'career, profession, public life',
  D12: 'parents, ancestors, spiritual practices',
  D16: 'vehicles, luxuries, pleasures',
  D20: 'spiritual progress, worship',
  D24: 'education, knowledge, learning',
  D27: 'strengths, weaknesses, spiritual practices',
  D30: 'misfortunes, enemies, diseases',
  D40: 'ancestral property, spiritual gains',
  D45: 'all aspects of life, detailed analysis',
  D60: 'overall life, karma, past lives',
};
  return purposes[chartType] || '';
}

/**
 * Calculate D7 (Saptamsa) - Children and Creativity
 */
export function calculateD7(planets: Planet[]): DivisionalChart {
  const divisor = 7;
  const d7Planets = planets.map(planet => {
    const signIndex = Math.floor(planet.longitude / 30);
    const degreesInSign = planet.longitude % 30;
    const d7SignIndex = Math.floor((degreesInSign / 30) * divisor) + (signIndex * divisor);
    const finalSignIndex = d7SignIndex % 12;
    const finalHouse = (finalSignIndex + 1);

    return {
      name: planet.name,
      sign: ZODIAC_SIGNS[finalSignIndex] ?? 'Unknown',
      signIndex: finalSignIndex,
      signNumber: finalSignIndex,
      house: finalHouse,
      degree: planet.longitude % 30,
      isRetrograde: planet.isRetrograde,
    };
  });

  return {
    type: 'D7',
    chartType: 'D7',
    name: 'Saptamsa',
    purpose: 'Children and Creativity',
    interpretation: 'The Saptamsa chart reveals insights about children, creativity, and progeny based on planetary positions.',
    ascendant: {
      sign: 'Aries', // Placeholder - would need proper calculation
      signIndex: 0,
      degree: 0,
    },
    planets: d7Planets,
  };
}

/**
 * Calculate D10 (Dasamsa) - Career and Profession
 */
export function calculateD10(planets: Planet[]): DivisionalChart {
  const divisor = 10;
  const d10Planets = planets.map(planet => {
    const signIndex = Math.floor(planet.longitude / 30);
    const degreesInSign = planet.longitude % 30;
    const d10SignIndex = Math.floor((degreesInSign / 30) * divisor) + (signIndex * divisor);
    const finalSignIndex = d10SignIndex % 12;
    const finalHouse = (finalSignIndex + 1);

    return {
      name: planet.name,
      sign: ZODIAC_SIGNS[finalSignIndex] ?? 'Unknown',
      signIndex: finalSignIndex,
      signNumber: finalSignIndex,
      house: finalHouse,
      degree: planet.longitude % 30,
      isRetrograde: planet.isRetrograde,
    };
  });

  return {
    type: 'D10',
    chartType: 'D10',
    name: 'Dasamsa',
    purpose: 'Career and Profession',
    interpretation: 'The Dasamsa chart focuses on career, profession, and status in society.',
    ascendant: {
      sign: 'Aries', // Placeholder
      signIndex: 0,
      degree: 0,
    },
    planets: d10Planets,
  };
}

/**
 * Calculate D12 (Dwadasamsa) - Parents and Spiritual Practices
 */
export function calculateD12(planets: Planet[]): DivisionalChart {
  const divisor = 12;
  const d12Planets = planets.map(planet => {
    const signIndex = Math.floor(planet.longitude / 30);
    const degreesInSign = planet.longitude % 30;
    const d12SignIndex = Math.floor((degreesInSign / 30) * divisor) + (signIndex * divisor);
    const finalSignIndex = d12SignIndex % 12;
    const finalHouse = (finalSignIndex + 1);

    return {
      name: planet.name,
      sign: ZODIAC_SIGNS[finalSignIndex] ?? 'Unknown',
      signIndex: finalSignIndex,
      signNumber: finalSignIndex,
      house: finalHouse,
      degree: planet.longitude % 30,
      isRetrograde: planet.isRetrograde,
    };
  });

  return {
    type: 'D12',
    chartType: 'D12',
    name: 'Dwadasamsa',
    purpose: 'Parents, Ancestors, Past Life Karma',
    interpretation: 'The Dwadasamsa chart reveals information about parents, ancestors, and past life karma.',
    ascendant: {
      sign: 'Aries',
      signIndex: 0,
      degree: 0,
    },
    planets: d12Planets,
  };
}

/**
 * Calculate D16 (Shodasamsa) - Vehicles and Luxuries
 */
export function calculateD16(planets: Planet[]): DivisionalChart {
  const divisor = 16;
  const d16Planets = planets.map(planet => {
    const signIndex = Math.floor(planet.longitude / 30);
    const degreesInSign = planet.longitude % 30;
    const d16SignIndex = Math.floor((degreesInSign / 30) * divisor) + (signIndex * divisor);
    const finalSignIndex = d16SignIndex % 12;
    const finalHouse = (finalSignIndex + 1);

    return {
      name: planet.name,
      sign: ZODIAC_SIGNS[finalSignIndex] ?? 'Unknown',
      signIndex: finalSignIndex,
      signNumber: finalSignIndex,
      house: finalHouse,
      degree: planet.longitude % 30,
      isRetrograde: planet.isRetrograde,
    };
  });

  return {
    type: 'D16',
    chartType: 'D16',
    name: 'Shodasamsa',
    purpose: 'Vehicles, Luxuries, Material Comforts',
    interpretation: 'The Shodasamsa chart indicates vehicles, luxuries, and material comforts.',
    ascendant: {
      sign: 'Aries',
      signIndex: 0,
      degree: 0,
    },
    planets: d16Planets,
  };
}

/**
 * Calculate D20 (Vimsamsa) - Spiritual Progress
 */
export function calculateD20(planets: Planet[]): DivisionalChart {
  const divisor = 20;
  const d20Planets = planets.map(planet => {
    const signIndex = Math.floor(planet.longitude / 30);
    const degreesInSign = planet.longitude % 30;
    const d20SignIndex = Math.floor((degreesInSign / 30) * divisor) + (signIndex * divisor);
    const finalSignIndex = d20SignIndex % 12;
    const finalHouse = (finalSignIndex + 1);

    return {
      name: planet.name,
      sign: ZODIAC_SIGNS[finalSignIndex] ?? 'Unknown',
      signIndex: finalSignIndex,
      signNumber: finalSignIndex,
      house: finalHouse,
      degree: planet.longitude % 30,
      isRetrograde: planet.isRetrograde,
    };
  });

  return {
    type: 'D20',
    chartType: 'D20',
    name: 'Vimsamsa',
    purpose: 'Spiritual Progress, Worship, Devotion',
    interpretation: 'The Vimsamsa chart reveals spiritual progress, worship, and devotion.',
    ascendant: {
      sign: 'Aries',
      signIndex: 0,
      degree: 0,
    },
    planets: d20Planets,
  };
}

/**
 * Calculate D24 (Chaturvimsamsa) - Education and Knowledge
 */
export function calculateD24(planets: Planet[]): DivisionalChart {
  const divisor = 24;
  const d24Planets = planets.map(planet => {
    const signIndex = Math.floor(planet.longitude / 30);
    const degreesInSign = planet.longitude % 30;
    const d24SignIndex = Math.floor((degreesInSign / 30) * divisor) + (signIndex * divisor);
    const finalSignIndex = d24SignIndex % 12;
    const finalHouse = (finalSignIndex + 1);

    return {
      name: planet.name,
      sign: ZODIAC_SIGNS[finalSignIndex] ?? 'Unknown',
      signIndex: finalSignIndex,
      signNumber: finalSignIndex,
      house: finalHouse,
      degree: planet.longitude % 30,
      isRetrograde: planet.isRetrograde,
    };
  });

  return {
    type: 'D24',
    chartType: 'D24',
    name: 'Chaturvimsamsa',
    purpose: 'Education, Knowledge, Learning Abilities',
    interpretation: 'The Chaturvimsamsa chart focuses on education, knowledge, and learning abilities.',
    ascendant: {
      sign: 'Aries',
      signIndex: 0,
      degree: 0,
    },
    planets: d24Planets,
  };
}

/**
 * Calculate D60 (Shashtiamsa) - Overall Life and Karma
 */
export function calculateD60(planets: Planet[]): DivisionalChart {
  const divisor = 60;
  const d60Planets = planets.map(planet => {
    const signIndex = Math.floor(planet.longitude / 30);
    const degreesInSign = planet.longitude % 30;
    const d60SignIndex = Math.floor((degreesInSign / 30) * divisor) + (signIndex * divisor);
    const finalSignIndex = d60SignIndex % 12;
    const finalHouse = (finalSignIndex + 1);

    return {
      name: planet.name,
      sign: ZODIAC_SIGNS[finalSignIndex] ?? 'Unknown',
      signIndex: finalSignIndex,
      signNumber: finalSignIndex,
      house: finalHouse,
      degree: planet.longitude % 30,
      isRetrograde: planet.isRetrograde,
    };
  });

  return {
    type: 'D60',
    chartType: 'D60',
    name: 'Shashtiamsa',
    purpose: 'Past Life Karma, Overall Life Assessment',
    interpretation: 'The Shashtiamsa chart provides a detailed analysis of past life karma and overall life assessment, offering deep insights into karmic patterns and life trajectory.',
    ascendant: {
      sign: 'Aries',
      signIndex: 0,
      degree: 0,
    },
    planets: d60Planets,
  };
}

/**
 * Calculate divisional chart positions
 */
export function calculateDivisionalChart(
  planets: Planet[],
  chartType: string
): DivisionalChart {
  switch (chartType) {
    case 'D7':
      return calculateD7(planets);
    case 'D10':
      return calculateD10(planets);
    case 'D12':
      return calculateD12(planets);
    case 'D16':
      return calculateD16(planets);
    case 'D20':
      return calculateD20(planets);
    case 'D24':
      return calculateD24(planets);
    case 'D60':
      return calculateD60(planets);
    default:
      return {
        type: chartType,
        chartType,
        name: getDivisionalChartName(chartType),
        purpose: getDivisionalChartPurpose(chartType),
        interpretation: `Analysis of ${chartType} divisional chart.`,
        ascendant: {
          sign: 'Aries',
          signIndex: 0,
          degree: 0,
        },
        planets: planets.map(p => ({
          name: p.name,
          sign: 'Aries',
          signIndex: 0,
          signNumber: 0,
          house: 1,
          degree: p.longitude % 30,
          isRetrograde: p.isRetrograde,
        })),
      };
  }
}

/**
 * Calculate D24 - Chaturvimsamsa Chart (Education & Learning)
 */
export function calculateD24Chart(
  ascendantLongitude: number,
  planets: { name: string; longitude: number; isRetrograde: boolean }[]
): DivisionalChart {
  const ascSignIndex = calculateDivisionalPosition(ascendantLongitude, 24);
  
  const d24Planets: DivisionalChartPlanet[] = planets.map(planet => {
    const signIndex = calculateDivisionalPosition(planet.longitude, 24);
    return {
      name: planet.name,
      sign: ZODIAC_SIGNS[signIndex] ?? 'Unknown',
      signIndex,
      signNumber: signIndex,
      house: ((signIndex - ascSignIndex + 12) % 12) + 1,
      degree: (planet.longitude % 30) * 24 % 30,
      isRetrograde: planet.isRetrograde,
    };
  });

  return {
    type: 'D24',
    chartType: 'D24',
    name: 'Chaturvimsamsa',
    purpose: 'Education, Knowledge, Learning Abilities',
    interpretation: 'The Chaturvimsamsa chart focuses on education, knowledge, and learning abilities.',
    ascendant: {
      sign: ZODIAC_SIGNS[ascSignIndex] ?? 'Unknown',
      signIndex: ascSignIndex,
      degree: (ascendantLongitude % 30) * 24 % 30,
    },
    planets: d24Planets,
  };
}

/**
 * Calculate D60 - Shashtiamsa Chart (Past Life & Overall Karma)
 */
export function calculateD60Chart(
  ascendantLongitude: number,
  planets: { name: string; longitude: number; isRetrograde: boolean }[]
): DivisionalChart {
  const ascSignIndex = calculateDivisionalPosition(ascendantLongitude, 60);
  
  const d60Planets: DivisionalChartPlanet[] = planets.map(planet => {
    const signIndex = calculateDivisionalPosition(planet.longitude, 60);
    return {
      name: planet.name,
      sign: ZODIAC_SIGNS[signIndex] ?? 'Unknown',
      signIndex,
      signNumber: signIndex,
      house: ((signIndex - ascSignIndex + 12) % 12) + 1,
      degree: (planet.longitude % 30) * 60 % 30,
      isRetrograde: planet.isRetrograde,
    };
  });

  return {
    type: 'D60',
    chartType: 'D60',
    name: 'Shashtiamsa',
    purpose: 'Past Life Karma, Overall Life Assessment',
    interpretation: 'The Shashtiamsa chart provides a detailed analysis of past life karma and overall life assessment, offering deep insights into karmic patterns and life trajectory.',
    ascendant: {
      sign: ZODIAC_SIGNS[ascSignIndex] ?? 'Unknown',
      signIndex: ascSignIndex,
      degree: (ascendantLongitude % 30) * 60 % 30,
    },
    planets: d60Planets,
  };
}

/**
 * Get interpretation for divisional chart
 */
export function getDivisionalChartInterpretation(chartType: string): string {
  const interpretations: Record<string, string> = {
    D7: 'The Saptamsa chart reveals your relationship with children, creative abilities, and progeny. Strong planets here indicate good fortune with children and creative success.',
    D10: 'The Dasamsa chart shows your career path, professional success, and authority. This is crucial for understanding your life purpose and achievements.',
    D12: 'The Dwadasamsa chart indicates your relationship with parents, ancestral karma, and past life influences. It reveals family patterns and inherited traits.',
    D16: 'The Shodasamsa chart shows material comforts, vehicles, and luxuries. Strong planets indicate prosperity and comfortable living.',
    D20: 'The Vimsamsa chart reveals spiritual development and religious inclinations. It shows your path to enlightenment and spiritual practices.',
    D24: 'The Chaturvimsamsa chart indicates education, learning abilities, and knowledge acquisition. It shows academic success and intellectual pursuits.',
    D60: 'The Shashtiamsa is the most important divisional chart after D9. It reveals past life karma and provides an overall assessment of life events.',
  };
  
  return interpretations[chartType] || 'This divisional chart provides specific insights into different life areas.';
}

export default {
  calculateDivisionalChart,
  calculateD7,
  calculateD10,
  calculateD12,
  calculateD16,
  calculateD20,
  calculateD24,
  calculateD60,
  getDivisionalChartName,
  getDivisionalChartPurpose,
};
