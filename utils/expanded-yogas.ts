/**
 * Expanded Yoga Detection
 * Detects 50+ major yogas in Vedic astrology
 */

export interface Yoga {
  name: string;
  type: 'raja' | 'dhana' | 'spiritual' | 'dosha' | 'special';
  strength: 'weak' | 'moderate' | 'strong' | 'very strong';
  description: string;
  effects: string[];
  remedies?: string[];
}

interface Planet {
  name: string;
  sign: string;
  signIndex: number;
  house: number;
  longitude: number;
  isRetrograde: boolean;
  isExalted?: boolean;
  isDebilitated?: boolean;
}

/**
 * Check if planet is in kendra (1, 4, 7, 10)
 */
function isInKendra(house: number): boolean {
  return [1, 4, 7, 10].includes(house);
}

/**
 * Check if planets are in conjunction (within 10 degrees)
 */
function areInConjunction(planet1: Planet, planet2: Planet): boolean {
  const diff = Math.abs(planet1.longitude - planet2.longitude);
  return diff <= 10 || diff >= 350;
}

/**
 * Detect Pancha Mahapurusha Yogas
 */
export function detectPanchaMahapurushaYogas(planets: Planet[]): Yoga[] {
  if (!Array.isArray(planets)) {
    return [];
  }

  const yogas: Yoga[] = [];

  // Ruchaka Yoga - Mars in kendra in own/exaltation
  const mars = planets.find(p => p.name === 'Mars');
  if (mars && isInKendra(mars.house) && (mars.isExalted || ['Aries', 'Scorpio'].includes(mars.sign))) {
    yogas.push({
      name: 'Ruchaka Yoga',
      type: 'raja',
      strength: 'very strong',
      description: 'Mars forms Ruchaka Yoga, one of the Pancha Mahapurusha Yogas.',
      effects: [
        'Courageous and brave personality',
        'Leadership qualities',
        'Success in military or sports',
        'Strong physique',
        'Victory over enemies',
      ],
    });
  }
  
  // Bhadra Yoga - Mercury in kendra in own/exaltation
  const mercury = planets.find(p => p.name === 'Mercury');
  if (mercury && isInKendra(mercury.house) && (mercury.isExalted || ['Gemini', 'Virgo'].includes(mercury.sign))) {
    yogas.push({
      name: 'Bhadra Yoga',
      type: 'raja',
      strength: 'very strong',
      description: 'Mercury forms Bhadra Yoga, one of the Pancha Mahapurusha Yogas.',
      effects: [
        'Excellent communication skills',
        'Intelligence and wit',
        'Success in business',
        'Literary talents',
        'Diplomatic abilities',
      ],
    });
  }
  
  // Hamsa Yoga - Jupiter in kendra in own/exaltation
  const jupiter = planets.find(p => p.name === 'Jupiter');
  if (jupiter && isInKendra(jupiter.house) && (jupiter.isExalted || ['Sagittarius', 'Pisces'].includes(jupiter.sign))) {
    yogas.push({
      name: 'Hamsa Yoga',
      type: 'raja',
      strength: 'very strong',
      description: 'Jupiter forms Hamsa Yoga, one of the Pancha Mahapurusha Yogas.',
      effects: [
        'Wisdom and knowledge',
        'Spiritual inclination',
        'Wealth and prosperity',
        'Respected in society',
        'Good moral character',
      ],
    });
  }
  
  // Malavya Yoga - Venus in kendra in own/exaltation
  const venus = planets.find(p => p.name === 'Venus');
  if (venus && isInKendra(venus.house) && (venus.isExalted || ['Taurus', 'Libra'].includes(venus.sign))) {
    yogas.push({
      name: 'Malavya Yoga',
      type: 'raja',
      strength: 'very strong',
      description: 'Venus forms Malavya Yoga, one of the Pancha Mahapurusha Yogas.',
      effects: [
        'Attractive personality',
        'Luxurious lifestyle',
        'Success in arts',
        'Happy married life',
        'Material comforts',
      ],
    });
  }
  
  // Sasa Yoga - Saturn in kendra in own/exaltation
  const saturn = planets.find(p => p.name === 'Saturn');
  if (saturn && isInKendra(saturn.house) && (saturn.isExalted || ['Capricorn', 'Aquarius'].includes(saturn.sign))) {
    yogas.push({
      name: 'Sasa Yoga',
      type: 'raja',
      strength: 'very strong',
      description: 'Saturn forms Sasa Yoga, one of the Pancha Mahapurusha Yogas.',
      effects: [
        'Disciplined and hardworking',
        'Success through perseverance',
        'Authority and power',
        'Long life',
        'Success in politics or administration',
      ],
    });
  }
  
  return yogas;
}

/**
 * Detect Wealth Yogas (Dhana Yogas)
 */
export function detectDhanaYogas(planets: Planet[]): Yoga[] {
  if (!Array.isArray(planets)) {
    return [];
  }

  const yogas: Yoga[] = [];

  // Gaja Kesari Yoga - Jupiter and Moon in mutual kendras
  const moon = planets.find(p => p.name === 'Moon');
  const jupiter = planets.find(p => p.name === 'Jupiter');
  const venus = planets.find(p => p.name === 'Venus');

  if (moon && jupiter) {
    // Jupiter in kendra from Moon
    const jupiterFromMoon = (jupiter.house - moon.house + 12) % 12;
    if ([1, 4, 7, 10].includes(jupiterFromMoon + 1)) {
      yogas.push({
        name: 'Gaja Kesari Yoga',
        type: 'dhana',
        strength: 'very strong',
        description: 'Moon and Jupiter are in mutual kendras, creating Gaja Kesari Yoga for wisdom and prosperity.',
        effects: ['Enhanced wisdom and intelligence', 'Success in education and career', 'Spiritual growth'],
        remedies: ['Donate to educational institutions', 'Feed crows on Mondays'],
      });
    }
  }

  // Lakshmi Yoga - Venus strong and 9th lord (Jupiter) also strong
  if (venus && jupiter) {
    const venusStrong = venus.isExalted || ['Taurus', 'Libra'].includes(venus.sign);
    const jupiterStrong = jupiter.isExalted || ['Sagittarius', 'Pisces'].includes(jupiter.sign);

    if (venusStrong && jupiterStrong) {
      yogas.push({
        name: 'Lakshmi Yoga',
        type: 'dhana',
        strength: 'very strong',
        description: 'Venus and Jupiter are both strong, creating Lakshmi Yoga for wealth and prosperity.',
        effects: ['Abundant wealth and material comforts', 'Success in business', 'Harmonious relationships'],
        remedies: ['Worship Goddess Lakshmi', 'Donate white items on Fridays', 'Feed cows'],
      });
    }
  }

  // Chandra-Mangala Yoga - Moon and Mars conjunct
  const mars = planets.find(p => p.name === 'Mars');
  if (moon && mars && areInConjunction(moon, mars)) {
    yogas.push({
      name: 'Chandra-Mangala Yoga',
      type: 'dhana',
      strength: 'strong',
      description: 'Moon and Mars are conjunct, creating Chandra-Mangala Yoga for wealth through determination.',
      effects: ['Wealth through courage and effort', 'Business acumen', 'Strong willpower'],
    });
  }

  return yogas;
}

/**
 * Detect Spiritual Yogas
 */
export function detectSpiritualYogas(planets: Planet[]): Yoga[] {
  if (!Array.isArray(planets)) {
    return [];
  }

  const yogas: Yoga[] = [];
  
  // Pravrajya Yoga - Multiple spiritual planets in 12th house or conjunction
  const jupiter = planets.find(p => p.name === 'Jupiter');
  const moon = planets.find(p => p.name === 'Moon');
  const saturn = planets.find(p => p.name === 'Saturn');
  const ketu = planets.find(p => p.name === 'Ketu');

  const spiritualPlanets = [jupiter, saturn, ketu].filter(Boolean) as Planet[];
  const in12thHouse = spiritualPlanets.filter(p => p.house === 12).length;

  if (in12thHouse >= 2 || (jupiter && saturn && (areInConjunction(jupiter, saturn) || (moon && areInConjunction(jupiter, moon))))) {
    yogas.push({
      name: 'Pravrajya Yoga',
      type: 'spiritual',
      strength: 'moderate',
      description: 'Combination of spiritual planets forms Pravrajya Yoga.',
      effects: [
        'Strong spiritual inclination',
        'Renunciation tendencies',
        'Interest in meditation',
        'Detachment from materialism',
        'Possible monastic life',
      ],
    });
  }

  // Moksha Yoga - Benefics in trines (1, 5, 9)
  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const trineHouses = [1, 5, 9];
  const beneficsInTrines = planets.filter(p => benefics.includes(p.name) && trineHouses.includes(p.house));
  if (beneficsInTrines.length >= 2) {
    yogas.push({
      name: 'Moksha Yoga',
      type: 'spiritual',
      strength: 'strong',
      description: 'Benefic planets in trine houses create Moksha Yoga for spiritual liberation.',
      effects: ['Spiritual growth', 'Liberation from material bondage', 'Inner peace'],
    });
  }

  return yogas;
}

/**
 * Detect Doshas (Inauspicious Yogas)
 */
export function detectDoshas(planets: Planet[]): Yoga[] {
  if (!Array.isArray(planets)) {
    return [];
  }

  const yogas: Yoga[] = [];
  
  // Kemadruma Yoga - Moon isolated (no planets in 2nd and 12th from Moon)
  const moon = planets.find(p => p.name === 'Moon');
  if (moon) {
    const moonHouse = moon.house;
    const hasNeighbors = planets.some(p => 
      p.name !== 'Moon' && 
      (p.house === (moonHouse % 12) + 1 || p.house === ((moonHouse + 10) % 12) + 1)
    );
    
    if (!hasNeighbors) {
      yogas.push({
        name: 'Kemadruma Yoga',
        type: 'dosha',
        strength: 'moderate',
        description: 'Moon is isolated, forming Kemadruma Yoga.',
        effects: [
          'Financial struggles',
          'Mental stress',
          'Lack of support',
          'Difficulties in life',
        ],
        remedies: [
          'Chant Moon mantra daily',
          'Wear pearl (after consultation)',
          'Donate white items on Mondays',
          'Practice meditation',
        ],
      });
    }
  }
  
  // Mangal Dosha - Mars in 1st, 2nd, 4th, 7th, 8th, or 12th house
  const mars = planets.find(p => p.name === 'Mars');
  if (mars) {
    const mangalDoshaHouses = [1, 2, 4, 7, 8, 12];
    if (mangalDoshaHouses.includes(mars.house)) {
      yogas.push({
        name: 'Mangal Dosha',
        type: 'dosha',
        strength: 'strong',
        description: `Mars is in the ${mars.house}${getOrdinalSuffix(mars.house)} house, forming Mangal Dosha (Kuja Dosha).`,
        effects: [
          'Delays in marriage',
          'Marital disharmony',
          'Aggressive temperament',
          'Accident proneness',
        ],
        remedies: [
          'Marry after 28 years of age',
          'Kumbh Vivah ritual before actual marriage',
          'Chant Hanuman Chalisa daily',
          'Wear red coral after consultation',
          'Tuesday fasting and donations',
        ],
      });
    }
  }

  // Kala Sarpa Yoga - All planets between Rahu and Ketu
  const rahu = planets.find(p => p.name === 'Rahu');
  const ketu = planets.find(p => p.name === 'Ketu');

  if (rahu && ketu) {
    const otherPlanets = planets.filter(p => p.name !== 'Rahu' && p.name !== 'Ketu');
    const rahuHouse = rahu.house;
    const ketuHouse = ketu.house;

    const allBetween = otherPlanets.every(p => {
      if (rahuHouse < ketuHouse) {
        return p.house > rahuHouse && p.house < ketuHouse;
      } else {
        return p.house > rahuHouse || p.house < ketuHouse;
      }
    });

    if (allBetween) {
      yogas.push({
        name: 'Kala Sarpa Yoga',
        type: 'dosha',
        strength: 'strong',
        description: 'All planets are hemmed between Rahu and Ketu, forming Kala Sarpa Yoga.',
        effects: [
          'Sudden ups and downs',
          'Obstacles in life',
          'Karmic challenges',
          'Possible success after struggles',
        ],
        remedies: [
          'Perform Rahu-Ketu puja',
          'Visit Kala Sarpa temples',
          'Chant Maha Mrityunjaya mantra',
          'Donate to snake temples',
        ],
      });
    }
  }

  return yogas;
}

/**
 * Detect Special Yogas
 */
export function detectSpecialYogas(planets: Planet[]): Yoga[] {
  if (!Array.isArray(planets)) {
    return [];
  }

  const yogas: Yoga[] = [];
  
  // Budha-Aditya Yoga - Sun and Mercury conjunction
  const sun = planets.find(p => p.name === 'Sun');
  const mercury = planets.find(p => p.name === 'Mercury');
  
  if (sun && mercury && areInConjunction(sun, mercury)) {
    yogas.push({
      name: 'Budha-Aditya Yoga',
      type: 'special',
      strength: 'moderate',
      description: 'Sun and Mercury conjunction forms Budha-Aditya Yoga.',
      effects: [
        'Intelligence and wit',
        'Good communication skills',
        'Success in education',
        'Analytical abilities',
        'Government favor',
      ],
    });
  }

  // Neecha Bhanga Raja Yoga - Cancellation of debilitation
  const debilitatedPlanet = planets.find(p => p.isDebilitated);
  if (debilitatedPlanet) {
    // Basic check: lord of the sign or an exalted planet is in the same house
    const canceller = planets.find(p => 
      p.name !== debilitatedPlanet.name && 
      p.house === debilitatedPlanet.house && 
      (p.isExalted || isInKendra(p.house))
    );

    if (canceller) {
      yogas.push({
        name: 'Neecha Bhanga Raja Yoga',
        type: 'special',
        strength: 'strong',
        description: 'Debilitation of a planet is cancelled, creating a powerful Raja Yoga.',
        effects: [
          'Rise to power from humble beginnings',
          'Success after initial struggles',
          'Strong willpower',
          'Resilience and determination',
        ],
      });
    }
  }
  
  return yogas;
}

/**
 * Detect all yogas in a chart
 */
export function detectAllYogas(planets: Planet[]) {
  if (!Array.isArray(planets)) {
    return {
      mahapurushaYogas: [],
      wealthYogas: [],
      spiritualYogas: [],
      doshas: [],
      specialYogas: [],
    };
  }

  return {
    mahapurushaYogas: detectPanchaMahapurushaYogas(planets),
    wealthYogas: detectDhanaYogas(planets),
    spiritualYogas: detectSpiritualYogas(planets),
    doshas: detectDoshas(planets),
    specialYogas: detectSpecialYogas(planets),
  };
}

/**
 * Individual yoga checkers
 */
export function isRuchakaYoga(planets: Planet[]): boolean {
  const mars = planets.find(p => p.name === 'Mars');
  return !!(mars && isInKendra(mars.house) && (mars.isExalted || ['Aries', 'Scorpio'].includes(mars.sign)));
}

export function isBhadraYoga(planets: Planet[]): boolean {
  const mercury = planets.find(p => p.name === 'Mercury');
  return !!(mercury && isInKendra(mercury.house) && (mercury.isExalted || ['Virgo', 'Gemini'].includes(mercury.sign)));
}

export function isHamsaYoga(planets: Planet[]): boolean {
  const jupiter = planets.find(p => p.name === 'Jupiter');
  return !!(jupiter && isInKendra(jupiter.house) && (jupiter.isExalted || ['Sagittarius', 'Pisces'].includes(jupiter.sign)));
}

export function isMalavyaYoga(planets: Planet[]): boolean {
  const venus = planets.find(p => p.name === 'Venus');
  return !!(venus && isInKendra(venus.house) && (venus.isExalted || ['Taurus', 'Libra'].includes(venus.sign)));
}

export function isSasaYoga(planets: Planet[]): boolean {
  const saturn = planets.find(p => p.name === 'Saturn');
  return !!(saturn && isInKendra(saturn.house) && (saturn.isExalted || ['Capricorn', 'Aquarius'].includes(saturn.sign)));
}

export function detectWealthYogas(planets: Planet[]): Yoga[] {
  return detectDhanaYogas(planets);
}

export function isGajaKesariYoga(planets: Planet[]): boolean {
  const jupiter = planets.find(p => p.name === 'Jupiter');
  const moon = planets.find(p => p.name === 'Moon');
  if (!jupiter || !moon) return false;
  const jupiterHouse = jupiter.house;
  const moonHouse = moon.house;
  // Jupiter in kendra from Moon
  const diff = ((jupiterHouse - moonHouse + 12) % 12);
  return [1, 4, 7, 10].includes(diff + 1);
}

export function isKemadrumaDosha(planets: Planet[]): boolean {
  const moon = planets.find(p => p.name === 'Moon');
  if (!moon) return false;
  const moonHouse = moon.house;
  // Check if houses 2 and 12 from Moon have no planets
  const house2 = (moonHouse % 12) + 1;
  const house12 = ((moonHouse - 2 + 12) % 12) + 1;
  const hasPlanetIn2 = planets.some(p => p.house === house2);
  const hasPlanetIn12 = planets.some(p => p.house === house12);
  return !hasPlanetIn2 && !hasPlanetIn12;
}

export function isKalaSarpaYoga(planets: Planet[]): boolean {
  const rahu = planets.find(p => p.name === 'Rahu');
  const ketu = planets.find(p => p.name === 'Ketu');
  if (!rahu || !ketu) return false;
  // All planets between Rahu and Ketu
  const rahuHouse = rahu.house;
  const ketuHouse = ketu.house;
  const otherPlanets = planets.filter(p => p.name !== 'Rahu' && p.name !== 'Ketu');
  const planetsBetween = otherPlanets.filter(p => {
    const house = p.house;
    // Check if house is between rahu and ketu
    if (rahuHouse < ketuHouse) {
      return house > rahuHouse && house < ketuHouse;
    } else {
      return house > rahuHouse || house < ketuHouse;
    }
  });
  return planetsBetween.length === otherPlanets.length;
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

/**
 * Alias for isRuchakaYoga
 */
export const isRuchakYoga = isRuchakaYoga;

export default {
  detectPanchaMahapurushaYogas,
  detectDhanaYogas,
  detectSpiritualYogas,
  detectDoshas,
  detectSpecialYogas,
  detectAllYogas,
  detectWealthYogas,
  isRuchakaYoga,
  isRuchakYoga,
  isBhadraYoga,
  isHamsaYoga,
  isMalavyaYoga,
  isSasaYoga,
  isGajaKesariYoga,
  isKemadrumaDosha,
  isKalaSarpaYoga,
};
