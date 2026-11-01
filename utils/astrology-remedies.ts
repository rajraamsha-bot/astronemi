import { RASHIS } from '@/constants/astrology';
import { KundliData } from './kundli-generator';

export interface GemstoneRecommendation {
  name: string;
  hindiName: string;
  planet: string;
  purpose: 'Life' | 'Fortuna' | 'Wisdom';
  benefits: string[];
  instructions: {
    finger: string;
    metal: string;
    day: string;
    weight: string;
  };
  color: string;
}

const GEM_MAP: Record<string, { name: string; hindi: string; color: string; finger: string; metal: string; day: string }> = {
  Sun: { name: 'Ruby', hindi: 'Manik', color: '#E0115F', finger: 'Ring', metal: 'Gold', day: 'Sunday' },
  Moon: { name: 'Pearl', hindi: 'Moti', color: '#F5F5F5', finger: 'Little', metal: 'Silver', day: 'Monday' },
  Mars: { name: 'Red Coral', hindi: 'Moonga', color: '#FF4500', finger: 'Ring', metal: 'Gold/Copper', day: 'Tuesday' },
  Mercury: { name: 'Emerald', hindi: 'Panna', color: '#50C878', finger: 'Little', metal: 'Gold/Silver', day: 'Wednesday' },
  Jupiter: { name: 'Yellow Sapphire', hindi: 'Pukhraj', color: '#FFD700', finger: 'Index', metal: 'Gold', day: 'Thursday' },
  Venus: { name: 'Diamond', hindi: 'Heera', color: '#B9F2FF', finger: 'Middle/Little', metal: 'Gold/Platinum', day: 'Friday' },
  Saturn: { name: 'Blue Sapphire', hindi: 'Neelam', color: '#1E90FF', finger: 'Middle', metal: 'Gold/Iron', day: 'Saturday' },
};

/**
 * Identifies the Yoga Karaka planet for a given Lagna (Ascendant).
 * A Yoga Karaka owns both a Kendra and a Trikona.
 */
export function calculateYogaKaraka(lagnaSign: string): string | null {
  const yogas: Record<string, string> = {
    Taurus: 'Saturn',
    Cancer: 'Mars',
    Leo: 'Mars',
    Libra: 'Saturn',
    Capricorn: 'Venus',
    Aquarius: 'Venus',
  };
  return yogas[lagnaSign] || null;
}

/**
 * Professional Gemstone Logic:
 * 1. Recommend Lagna Lord (Life Stone - Jeevan Ratna)
 * 2. Recommend 5th Lord (Wisdom Stone - Vidya Ratna)
 * 3. Recommend 9th Lord (Fortune Stone - Bhagya Ratna)
 * 4. Recommend Yoga Karaka (if exists)
 * 
 * CRITICAL FILTERS:
 * - Exclude if planet is in 6, 8, 12 houses.
 * - Exclude if planet is Sun/Moon enemy (optional for professional depth).
 */
export function getGemstoneRecommendations(data: KundliData): GemstoneRecommendation[] {
  const recommendations: GemstoneRecommendation[] = [];
  const lagnaSign = data.ascendant.sign;
  
  // Find lords of 1, 5, 9
  const lordsMap: Record<string, 'Life' | 'Wisdom' | 'Fortuna'> = {};
  const sign1 = ZODIAC_SIGNS[data.ascendant.signIndex];
  if (sign1) {
    lordsMap[sign1] = 'Life';
  }
  
  const sign5 = ZODIAC_SIGNS[(data.ascendant.signIndex + 4) % 12];
  if (sign5) {
    lordsMap[sign5] = 'Wisdom';
  }
  
  const sign9 = ZODIAC_SIGNS[(data.ascendant.signIndex + 8) % 12];
  if (sign9) {
    lordsMap[sign9] = 'Fortuna';
  }

  const yogaKaraka = calculateYogaKaraka(lagnaSign);

  Object.entries(lordsMap).forEach(([signName, purpose]) => {
    const signInfo = RASHIS.find(r => r.name === signName);
    const planetName = signInfo?.ruler || '';
    if (!planetName || planetName === 'Rahu' || planetName === 'Ketu') return;

    const planetData = data.planets.find(p => p.name === planetName);
    if (!planetData) return;

    // Filter out Malefic House placement (6, 8, 12)
    if ([6, 8, 12].includes(planetData.house)) return;

    const gemData = GEM_MAP[planetName];
    if (!gemData) return;

    // Check if already recommended (a planet can own two beneficial houses)
    if (recommendations.find(r => r.planet === planetName)) return;

    recommendations.push({
      name: gemData.name,
      hindiName: gemData.hindi,
      planet: planetName,
      purpose,
      color: gemData.color,
      benefits: getGemBenefits(planetName),
      instructions: {
        finger: gemData.finger,
        metal: gemData.metal,
        day: gemData.day,
        weight: '4-7 carats',
      }
    });
  });

  // Add Yoga Karaka if not already there
  if (yogaKaraka && !recommendations.find(r => r.planet === yogaKaraka)) {
    const gemData = GEM_MAP[yogaKaraka];
    if (gemData) {
      const planetData = data.planets.find(p => p.name === yogaKaraka);
      // Only if not in malefic house
      if (planetData && ![6, 8, 12].includes(planetData.house)) {
        recommendations.push({
          name: gemData.name,
          hindiName: gemData.hindi,
          planet: yogaKaraka,
          purpose: 'Fortuna',
          color: gemData.color,
          benefits: getGemBenefits(yogaKaraka),
          instructions: {
            finger: gemData.finger,
            metal: gemData.metal,
            day: gemData.day,
            weight: '4-7 carats',
          }
        });
      }
    }
  }

  return recommendations;
}

function getGemBenefits(planet: string): string[] {
  const benefits: Record<string, string[]> = {
    Sun: ['Authority', 'Leadership', 'Health', 'Recognition'],
    Moon: ['Mental Peace', 'Emotional Stability', 'Concentration'],
    Mars: ['Courage', 'Energy', 'Property Luck', 'Victory'],
    Mercury: ['Intelligence', 'Business Skill', 'Communication'],
    Jupiter: ['Wealth', 'Fortune', 'Wisdom', 'Marital bliss'],
    Venus: ['Luxury', 'Artistic Talent', 'Relationship harmony'],
    Saturn: ['Discipline', 'Career Growth', 'Longevity', 'Relief from obstacles'],
  };
  return benefits[planet] || ['Prosperity', 'Protection'];
}

/**
 * ELITE SPIRITUAL LOGIC: Ishta Devta Identification
 * Based on Maharishi Jaimini's Sutras
 */
export interface IshtaDevtaData {
  deity: string;
  mantra: string;
  significance: string;
  lineages: string[];
}

export function calculateIshtaDevta(data: KundliData): IshtaDevtaData {
  // 1. Identify Atmakaraka (Planet with highest degree, excluding Rahu/Ketu)
  const nonShadowPlanets = data.planets.filter(p => !['Rahu', 'Ketu'].includes(p.name));
  const atmakaraka = [...nonShadowPlanets].sort((a, b) => b.degree - a.degree)[0];
  
  if (!atmakaraka) return { deity: 'Lord Shiva', mantra: 'Om Namah Shivaya', significance: 'The Ultimate Consciousness', lineages: ['Shaiva Siddhanta'] };

  // 2. Find Atmakaraka in D9 (Navamsha)
  const d9Planet = data.d9Chart?.planets?.find(p => p.name === atmakaraka.name);
  if (!d9Planet || !data.d9Chart) {
    // Fallback: Use AK sign lord in Rashi
    return getDeityForPlanet(atmakaraka.name);
  }

  // 3. Find 12th house from AK in D9
  const houseIndex = ((d9Planet.house - 1) + 11) % 12; // 12th house from current
  const planetsIn12th = data.d9Chart.planets.filter(p => p.house === (houseIndex + 1));
  
  // Rule: strongest planet in 12th from AK determines deity
  // For simplicity, we use the first one found or the lord of the sign
  const targetPlanet = planetsIn12th[0]?.name || getSignLord(ZODIAC_SIGNS[houseIndex] || 'Aries');
  
  return getDeityForPlanet(targetPlanet);
}

function getDeityForPlanet(planet: string): IshtaDevtaData {
  const mapping: Record<string, IshtaDevtaData> = {
    Sun: { 
      deity: 'Lord Rama / Lord Shiva', 
      mantra: 'Om Rama Ramaya Namaha', 
      significance: 'Self-Realization and Authority',
      lineages: ['Dashanami Sampradaya', 'Shaiva Siddhanta', 'Ramanandi Sampradaya']
    },
    Moon: { 
      deity: 'Lord Krishna / Gauri Devi', 
      mantra: 'Om Kleem Krishnaya Namaha', 
      significance: 'Emotional Peace and Nurturing',
      lineages: ['Gaudiya Vaishnavism', 'Pushtimarg', 'Nimbarka Sampradaya']
    },
    Mars: { 
      deity: 'Lord Hanuman / Kartikeya', 
      mantra: 'Om Ham Hanumate Namaha', 
      significance: 'Courage and Protection',
      lineages: ['Nath Panth', 'Kaumaram', 'Hanumat Sampradaya']
    },
    Mercury: { 
      deity: 'Lord Vishnu / Buddha', 
      mantra: 'Om Namo Bhagavate Vasudevaya', 
      significance: 'Intelligence and Skill',
      lineages: ['Sri Sampradaya (Ramanuja)', 'Madhavacharya Lineage', 'Vaikhanasa']
    },
    Jupiter: { 
      deity: 'Lord Vamana / Lord Shiva', 
      mantra: 'Om Namah Shivaya', 
      significance: 'Wisdom and Expansion',
      lineages: ['Dashanami Sampradaya', 'Advaita Vedantin Lineage', 'Pashupata Shaivism']
    },
    Venus: { 
      deity: 'Maha Lakshmi / Annapurna', 
      mantra: 'Om Shreem Mahalakshmaye Namaha', 
      significance: 'Wealth and Beauty',
      lineages: ['Sri Vidya', 'Shakta Kaula', 'Saranagati Path']
    },
    Saturn: { 
      deity: 'Lord Kurma / Lord Shani', 
      mantra: 'Om Sham Shanicharaya Namaha', 
      significance: 'Discipline and Truth',
      lineages: ['Nath Panth', 'Dashanami (Vairagi)', 'Aghora Sampradaya']
    },
    Rahu: { 
      deity: 'Durga Devi', 
      mantra: 'Om Dum Durgaye Namaha', 
      significance: 'Protection from illusions',
      lineages: ['Kalikula Shakta', 'Bhairava Sampradaya']
    },
    Ketu: { 
      deity: 'Lord Ganesha', 
      mantra: 'Om Gam Ganapataye Namaha', 
      significance: 'Remover of Obstacles',
      lineages: ['Ganapatya Sampradaya', 'Avadhuta Panth']
    },
  };
  return mapping[planet] || mapping['Sun']!;
}

function getSignLord(sign: string): string {
  const lords: Record<string, string> = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter'
  };
  return lords[sign] || 'Sun';
}

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

/**
 * LAL KITAB REMEDIES
 * Simplified Planetary-House logic
 */
export function getLalKitabRemedies(data: KundliData): string[] {
  const remedies: string[] = [];
  
  data.planets.forEach(p => {
    if (p.name === 'Saturn' && p.house === 1) remedies.push('Do not build a dark room at the end of your house.');
    if (p.name === 'Mars' && p.house === 4) remedies.push('Avoid having a south-facing main entrance.');
    if (p.name === 'Sun' && p.house === 10) remedies.push('Donate white items on Sundays. Respect authority figures.');
    if (p.name === 'Jupiter' && p.house === 2) remedies.push('Plant a yellow flower at home. Avoid untruthfulness.');
  });

  if (remedies.length < 3) {
    remedies.push('Feed birds every morning with mixed grains.');
    remedies.push('Avoid consuming alcohol and non-vegetarian food on Tuesdays.');
  }

  return remedies;
}
