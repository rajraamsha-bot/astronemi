/**
 * Transit Analysis (Gochar) Calculator
 * Analyzes current planetary transits and their effects
 */

export interface Transit {
  planet: string;
  currentSign: string;
  currentHouse: number;
  natalSign: string;
  natalHouse: number;
  transitType: 'favorable' | 'unfavorable' | 'neutral';
  effect: string;
  effects: string[];
  isBenefic: boolean;
  predictions: Record<string, string[]>;
  duration: string;
  description: string;
  startDate: Date;
  endDate: Date;
  intensity: 'low' | 'medium' | 'high';
  remedies: string[];
}

export interface SadeSati {
  isActive: boolean;
  phase: 'Rising' | 'Peak' | 'Setting' | null;
  startDate?: Date;
  endDate?: Date;
  description: string;
  remedies: string[];
  effects?: string[];
  duration?: string;
}

export interface TransitPrediction {
  area: 'career' | 'health' | 'relationship' | 'finance' | 'education' | 'family';
  prediction: string;
  timing: string;
  intensity: number; // 1-10
  remedies: string[];
}

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

/**
 * Get zodiac sign index from name
 */
function getSignIndex(signName: string): number {
  return ZODIAC_SIGNS.indexOf(signName);
}

/**
 * Calculate house from natal Moon for transit analysis
 */
function calculateTransitHouse(currentSignIndex: number, natalMoonSignIndex: number): number {
  return ((currentSignIndex - natalMoonSignIndex + 12) % 12) + 1;
}

/**
 * Analyze Saturn Transit (Sade Sati)
 */
export function analyzeSadeSati(
  natalMoonSign: string,
  currentSaturnSign: string
): SadeSati {
  const natalMoonSignIndex = getSignIndex(natalMoonSign);
  const currentSaturnSignIndex = getSignIndex(currentSaturnSign);
  const transitHouse = calculateTransitHouse(currentSaturnSignIndex, natalMoonSignIndex);
  
  // Sade Sati occurs when Saturn transits 12th, 1st, or 2nd from Moon
  if (transitHouse === 12) {
    return {
      isActive: true,
      phase: 'Rising',
      description: 'Saturn is in the 12th house from your Moon (Rising Phase). This is the beginning of Sade Sati, bringing challenges in expenses, losses, and mental stress. Focus on patience and spiritual practices.',
      effects: ['Increased expenses and losses', 'Mental stress and anxiety', 'Health issues related to immune system'],
      duration: '2.5 years',
      remedies: [
        'Chant Shani mantra: "Om Sham Shanicharaya Namah" 108 times daily',
        'Donate black sesame seeds, black cloth, or iron on Saturdays',
        'Light a mustard oil lamp under a Peepal tree on Saturdays',
        'Wear blue sapphire (only after proper consultation)',
        'Help the elderly and disabled',
      ],
    };
  } else if (transitHouse === 1) {
    return {
      isActive: true,
      phase: 'Peak',
      description: 'Saturn is transiting over your Moon (Peak Phase). This is the most intense period of Sade Sati, bringing health issues, career obstacles, and emotional challenges. Stay strong and focused.',
      effects: ['Health problems', 'Career setbacks', 'Emotional turmoil', 'Relationship difficulties'],
      duration: '2.5 years',
      remedies: [
        'Perform Shani puja every Saturday',
        'Recite Hanuman Chalisa daily',
        'Donate to the poor and needy',
        'Avoid alcohol and non-vegetarian food on Saturdays',
        'Serve crows with food on Saturdays',
      ],
    };
  } else if (transitHouse === 2) {
    return {
      isActive: true,
      phase: 'Setting',
      description: 'Saturn is in the 2nd house from your Moon (Setting Phase). This is the final phase of Sade Sati, bringing family tensions, financial stress, and speech-related issues. Relief is approaching.',
      effects: ['Family conflicts', 'Financial difficulties', 'Speech and communication issues'],
      duration: '2.5 years',
      remedies: [
        'Continue Shani mantra chanting',
        'Donate black items on Saturdays',
        'Help laborers and workers',
        'Maintain discipline and hard work',
        'Practice patience in family matters',
      ],
    };
  }

  return {
    isActive: false,
    phase: null,
    description: 'You are not currently under Sade Sati. Saturn is in a favorable position relative to your Moon.',
    remedies: [],
  };
}

/**
 * Analyze Jupiter Transit
 */
export function analyzeJupiterTransit(
  natalMoonSign: string,
  currentJupiterSign: string
): Transit {
  const natalMoonSignIndex = getSignIndex(natalMoonSign);
  const currentJupiterSignIndex = getSignIndex(currentJupiterSign);
  const transitHouse = calculateTransitHouse(currentJupiterSignIndex, natalMoonSignIndex);
  
  // Favorable houses: 1, 2, 5, 7, 9, 11
  const favorableHouses = [1, 2, 5, 7, 9, 11];
  const isFavorable = favorableHouses.includes(transitHouse);
  
  const effects: Record<number, string> = {
    1: 'Jupiter in 1st brings wisdom, optimism, and personal growth. Good for health and self-development.',
    2: 'Jupiter in 2nd brings wealth, family happiness, and sweet speech. Excellent for finances.',
    3: 'Jupiter in 3rd brings courage and communication skills, but may cause ego issues.',
    4: 'Jupiter in 4th brings property gains and domestic happiness, but may cause complacency.',
    5: 'Jupiter in 5th brings children, creativity, and intelligence. Excellent for education and speculation.',
    6: 'Jupiter in 6th may bring health issues and obstacles, but helps overcome enemies.',
    7: 'Jupiter in 7th brings marriage, partnerships, and business success. Very auspicious.',
    8: 'Jupiter in 8th may bring sudden changes and obstacles, but also occult knowledge.',
    9: 'Jupiter in 9th brings luck, spirituality, and father\'s blessings. Highly auspicious.',
    10: 'Jupiter in 10th brings career success but may cause delays in some matters.',
    11: 'Jupiter in 11th brings gains, fulfillment of desires, and income. Very favorable.',
    12: 'Jupiter in 12th may bring expenses and foreign travel, but also spiritual growth.',
  };
  
  return {
    planet: 'Jupiter',
    currentSign: ZODIAC_SIGNS[currentJupiterSignIndex] || 'Aries',
    currentHouse: transitHouse,
    natalSign: ZODIAC_SIGNS[natalMoonSignIndex] || 'Aries',
    natalHouse: 1,
    transitType: isFavorable ? 'favorable' : 'neutral',
    effect: effects[transitHouse] || 'Mixed results',
    effects: [effects[transitHouse] || 'Mixed results'],
    isBenefic: isFavorable,
    predictions: {
      career: [`Career prospects are ${isFavorable ? 'favorable' : 'mixed'} during this transit.`],
      relationships: [`Relationships will experience ${isFavorable ? 'positive' : 'neutral'} influences.`],
      finance: [`Financial matters indicate ${isFavorable ? 'growth and gains' : 'caution needed'}.`],
    },
    duration: '1 year',
    description: `Jupiter is transiting through the ${transitHouse}${getOrdinalSuffix(transitHouse)} house from your Moon.`,
    startDate: new Date(), // Would be calculated based on ephemeris
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // ~1 year
    intensity: isFavorable ? 'high' : 'medium',
    remedies: [
      'Wear yellow on Thursdays',
      'Chant Guru Beej Mantra',
      'Donate to teachers and priests',
    ],
  };
}

/**
 * Analyze Rahu-Ketu Transit
 */
export function analyzeRahuKetuTransit(
  natalMoonSign: string,
  currentRahuSign: string,
  currentKetuSign: string
) {
  const natalMoonSignIndex = getSignIndex(natalMoonSign);
  const currentRahuSignIndex = getSignIndex(currentRahuSign);
  const currentKetuSignIndex = getSignIndex(currentKetuSign);
  const rahuHouse = calculateTransitHouse(currentRahuSignIndex, natalMoonSignIndex);
  const ketuHouse = calculateTransitHouse(currentKetuSignIndex, natalMoonSignIndex);

  const rahuEffects = [
    'Brings confusion and sudden changes',
    'May cause health issues and identity crisis',
    'Encourages unconventional paths'
  ];

  const ketuEffects = [
    'Causes detachment and spiritual awakening',
    'May bring sudden endings',
    'Leads to liberation from material attachments'
  ];

  const karmicLessons = [
    'Learn to embrace uncertainty',
    'Practice detachment from outcomes',
    'Focus on spiritual growth over material success'
  ];

  const remedies = [
    'Chant Rahu and Ketu mantras regularly',
    'Donate black and brown items',
    'Practice meditation and yoga',
    'Avoid shortcuts and unethical means'
  ];

  return {
    rahuHouse,
    ketuHouse,
    rahuEffects,
    ketuEffects,
    karmicLessons,
    remedies,
    duration: '18 months'
  };
}

/**
 * Generate transit predictions for different life areas
 */
export function generateTransitPredictions(
  natalMoonSignIndex: number,
  currentPlanetPositions: Record<string, number>
): TransitPrediction[] {
  const predictions: TransitPrediction[] = [];
  
  // Career prediction based on Jupiter and Saturn
  const jupiterHouse = calculateTransitHouse(
    currentPlanetPositions.Jupiter || 0,
    natalMoonSignIndex
  );
  const saturnHouse = calculateTransitHouse(
    currentPlanetPositions.Saturn || 0,
    natalMoonSignIndex
  );
  
  if (jupiterHouse > 0) {
    predictions.push({
      area: 'career',
      prediction: 'Period for career development and opportunities.',
      timing: 'Next 6-12 months',
      intensity: 6,
      remedies: ['Wear yellow on Thursdays', 'Donate to educational institutions'],
    });
  }

  // Health prediction based on Saturn and Mars
  if (saturnHouse > 0) {
    predictions.push({
      area: 'health',
      prediction: 'Focus on health and well-being.',
      timing: 'Current period',
      intensity: 5,
      remedies: ['Practice yoga daily', 'Avoid cold foods', 'Get regular health checkups'],
    });
  }

  // Relationship prediction based on Venus
  const venusHouse = calculateTransitHouse(
    currentPlanetPositions.Venus || currentPlanetPositions.Jupiter || 0, // fallback
    natalMoonSignIndex
  );

  if (venusHouse > 0) {
    predictions.push({
      area: 'relationship',
      prediction: 'Time for relationships and partnerships.',
      timing: 'Next 3-6 months',
      intensity: 6,
      remedies: ['Wear white on Fridays', 'Donate to women in need'],
    });
  }

  // Finance prediction
  if (venusHouse > 0) {
    predictions.push({
      area: 'finance',
      prediction: 'Financial matters require attention.',
      timing: 'Next 2-4 months',
      intensity: 5,
      remedies: ['Save money', 'Avoid risky investments'],
    });
  }
  
  return predictions;
}

/**
 * Helper function for ordinal suffix
 */
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

export function getTransitPredictions(birthChart: any, currentTransits: any) {
  if (!currentTransits) return {};
  const natalMoonSignIndex = getSignIndex(birthChart.moonSign || 'Aries');
  const currentPlanetPositions: Record<string, number> = {};
  for (const [planet, sign] of Object.entries(currentTransits)) {
    currentPlanetPositions[planet] = getSignIndex(sign as string);
  }
  const predictions = generateTransitPredictions(natalMoonSignIndex, currentPlanetPositions);
  const grouped = {
    career: predictions.filter(p => p.area === 'career'),
    health: predictions.filter(p => p.area === 'health'),
    relationships: predictions.filter(p => p.area === 'relationship'),
    finance: predictions.filter(p => p.area === 'finance'),
    timing: { currentPeriod: 'Next 6 months' }
  };
  return grouped;
}

export function getTransitRemedies(planet: string, type: string): string[] {
  const remedies: Record<string, Record<string, string[]>> = {
    Saturn: {
      challenging: ['Chant Om Shan Shanicharaye Namah for Saturn', 'Donate black sesame seeds'],
      benefic: ['Wear blue sapphire', 'Feed crows']
    },
    Jupiter: {
      benefic: ['Chant Om Gurave Namah for Jupiter', 'Wear yellow sapphire'],
      challenging: ['Donate turmeric', 'Help teachers']
    },
    Rahu: {
      challenging: ['Chant Om Ram Rahave Namah for Rahu', 'Feed stray dogs'],
      benefic: ['Wear hessonite', 'Practice meditation']
    }
  };
  return remedies[planet]?.[type] || [];
}

export function calculateTransitStrength(planet: string, sign: string, house: number): number {
  let strength = 50; // base
  // Exalted signs give bonus
  const exalted: Record<string, string> = { Jupiter: 'Cancer', Saturn: 'Libra' };
  if (exalted[planet] === sign) strength += 30;
  // Benefic houses
  if ([1, 2, 5, 7, 9, 11].includes(house)) strength += 20;
  return Math.min(100, strength);
}

export function isTransitBenefic(planet: string, _sign: string, house: number): boolean {
  const beneficPlanets = ['Jupiter', 'Venus'];
  const maleficPlanets = ['Saturn', 'Mars', 'Rahu'];
  const beneficHouses = [1, 2, 5, 7, 9, 11];
  if (maleficPlanets.includes(planet)) return false;
  if (beneficPlanets.includes(planet)) return true;
  return beneficHouses.includes(house);
}

export const SadeSatiPhase = {
  Rising: 'Rising',
  Peak: 'Peak',
  Setting: 'Setting',
  None: null
};

export default {
  analyzeSadeSati,
  analyzeJupiterTransit,
  analyzeRahuKetuTransit,
  generateTransitPredictions,
  getTransitPredictions,
  getTransitRemedies,
  calculateTransitStrength,
  isTransitBenefic,
  SadeSatiPhase,
};
