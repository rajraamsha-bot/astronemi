/**
 * Zodiac Signs Constants
 * 
 * Split from astrology.ts to reduce bundle size
 * Contains zodiac sign data
 */

export const ZODIAC_SIGNS = [
  { id: 'aries', name: 'Aries', symbol: '♈', element: 'Fire', quality: 'Cardinal', rulingPlanet: 'Mars', dateRange: 'Mar 21 - Apr 19' },
  { id: 'taurus', name: 'Taurus', symbol: '♉', element: 'Earth', quality: 'Fixed', rulingPlanet: 'Venus', dateRange: 'Apr 20 - May 20' },
  { id: 'gemini', name: 'Gemini', symbol: '♊', element: 'Air', quality: 'Mutable', rulingPlanet: 'Mercury', dateRange: 'May 21 - Jun 20' },
  { id: 'cancer', name: 'Cancer', symbol: '♋', element: 'Water', quality: 'Cardinal', rulingPlanet: 'Moon', dateRange: 'Jun 21 - Jul 22' },
  { id: 'leo', name: 'Leo', symbol: '♌', element: 'Fire', quality: 'Fixed', rulingPlanet: 'Sun', dateRange: 'Jul 23 - Aug 22' },
  { id: 'virgo', name: 'Virgo', symbol: '♍', element: 'Earth', quality: 'Mutable', rulingPlanet: 'Mercury', dateRange: 'Aug 23 - Sep 22' },
  { id: 'libra', name: 'Libra', symbol: '♎', element: 'Air', quality: 'Cardinal', rulingPlanet: 'Venus', dateRange: 'Sep 23 - Oct 22' },
  { id: 'scorpio', name: 'Scorpio', symbol: '♏', element: 'Water', quality: 'Fixed', rulingPlanet: 'Pluto', dateRange: 'Oct 23 - Nov 21' },
  { id: 'sagittarius', name: 'Sagittarius', symbol: '♐', element: 'Fire', quality: 'Mutable', rulingPlanet: 'Jupiter', dateRange: 'Nov 22 - Dec 21' },
  { id: 'capricorn', name: 'Capricorn', symbol: '♑', element: 'Earth', quality: 'Cardinal', rulingPlanet: 'Saturn', dateRange: 'Dec 22 - Jan 19' },
  { id: 'aquarius', name: 'Aquarius', symbol: '♒', element: 'Air', quality: 'Fixed', rulingPlanet: 'Uranus', dateRange: 'Jan 20 - Feb 18' },
  { id: 'pisces', name: 'Pisces', symbol: '♓', element: 'Water', quality: 'Mutable', rulingPlanet: 'Neptune', dateRange: 'Feb 19 - Mar 20' },
] as const;

export type ZodiacSign = typeof ZODIAC_SIGNS[number]['id'];

export function getZodiacSign(date: Date): ZodiacSign {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';
  return 'pisces';
}

export default ZODIAC_SIGNS;
