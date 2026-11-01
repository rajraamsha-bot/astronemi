/**
 * Planets Constants
 * 
 * Split from astrology.ts to reduce bundle size
 * Contains planetary data for astrology
 */

export const PLANETS = [
  { 
    id: 'sun', 
    name: 'Sun', 
    sanskrit: 'Surya', 
    symbol: '☉', 
    exaltation: 'Aries', 
    debilitation: 'Libra', 
    rulingSign: 'Leo',
    transitTime: '~27 days'
  },
  { 
    id: 'moon', 
    name: 'Moon', 
    sanskrit: 'Chandra', 
    symbol: '☾', 
    exaltation: 'Taurus', 
    debilitation: 'Scorpio', 
    rulingSign: 'Cancer',
    transitTime: '~2.5 days'
  },
  { 
    id: 'mars', 
    name: 'Mars', 
    sanskrit: 'Mangala', 
    symbol: '♂', 
    exaltation: 'Capricorn', 
    debilitation: 'Cancer', 
    rulingSign: 'Aries/Scorpio',
    transitTime: '~46 days'
  },
  { 
    id: 'mercury', 
    name: 'Mercury', 
    sanskrit: 'Budha', 
    symbol: '☿', 
    exaltation: 'Virgo', 
    debilitation: 'Pisces', 
    rulingSign: 'Gemini/Virgo',
    transitTime: '~88 days'
  },
  { 
    id: 'jupiter', 
    name: 'Jupiter', 
    sanskrit: 'Guru', 
    symbol: '♃', 
    exaltation: 'Cancer', 
    debilitation: 'Capricorn', 
    rulingSign: 'Sagittarius/Pisces',
    transitTime: '~399 days'
  },
  { 
    id: 'venus', 
    name: 'Venus', 
    sanskrit: 'Shukra', 
    symbol: '♀', 
    exaltation: 'Pisces', 
    debilitation: 'Virgo', 
    rulingSign: 'Taurus/Libra',
    transitTime: '~225 days'
  },
  { 
    id: 'saturn', 
    name: 'Saturn', 
    sanskrit: 'Shani', 
    symbol: '♄', 
    exaltation: 'Libra', 
    debilitation: 'Aries', 
    rulingSign: 'Capricorn/Aquarius',
    transitTime: '~2.5 years'
  },
  { 
    id: 'rahu', 
    name: 'Rahu', 
    sanskrit: 'Rahu', 
    symbol: '☊', 
    exaltation: 'Taurus', 
    debilitation: 'Scorpio', 
    rulingSign: 'Aquarius',
    transitTime: '~1.5 years'
  },
  { 
    id: 'ketu', 
    name: 'Ketu', 
    sanskrit: 'Ketu', 
    symbol: '☋', 
    exaltation: 'Scorpio', 
    debilitation: 'Taurus', 
    rulingSign: 'Scorpio',
    transitTime: '~1.5 years'
  },
] as const;

export type PlanetId = typeof PLANETS[number]['id'];

export const PLANET_COLORS: Record<PlanetId, string> = {
  sun: '#FFD700',
  moon: '#C0C0C0',
  mars: '#FF4500',
  mercury: '#00CED1',
  jupiter: '#FFA500',
  venus: '#FF69B4',
  saturn: '#8B4513',
  rahu: '#4B0082',
  ketu: '#800000',
};

export function getPlanetById(id: string): typeof PLANETS[number] | undefined {
  return PLANETS.find(p => p.id === id);
}

export default PLANETS;
