export interface ZodiacSign {
  id: string;
  name: string;
  symbol: string;
  emoji: string;
  dateRange: string;
  element: 'Fire' | 'Earth' | 'Air' | 'Water';
  color: string;
  rulingPlanet: string;
  traits: string[];
}

// L1: static zodiac CONFIG only (names/symbols/date ranges/traits). The
// fabricated daily/weekly/monthly prediction exports that used to live here
// (seeded-hash "predictions" with invented lucky numbers) are deleted:
// presenting canned text as today's real horoscope is worse than an honest
// error, and useHoroscope throws instead of faking. Real predictions come
// from the horoscopes table via the daily-horoscope Edge Function.

export const zodiacSigns: ZodiacSign[] = [
  {
    id: 'aries', name: 'Aries', symbol: '♈', emoji: '🐏', dateRange: 'Mar 21 - Apr 19',
    element: 'Fire', color: '#FF6B6B', rulingPlanet: 'Mars',
    traits: ['Courageous', 'Determined', 'Confident', 'Enthusiastic']
  },
  {
    id: 'taurus', name: 'Taurus', symbol: '♉', emoji: '🐂', dateRange: 'Apr 20 - May 20',
    element: 'Earth', color: '#4ECDC4', rulingPlanet: 'Venus',
    traits: ['Reliable', 'Patient', 'Practical', 'Devoted']
  },
  {
    id: 'gemini', name: 'Gemini', symbol: '♊', emoji: '👯', dateRange: 'May 21 - Jun 20',
    element: 'Air', color: '#95E1D3', rulingPlanet: 'Mercury',
    traits: ['Gentle', 'Affectionate', 'Curious', 'Adaptable']
  },
  {
    id: 'cancer', name: 'Cancer', symbol: '♋', emoji: '🦀', dateRange: 'Jun 21 - Jul 22',
    element: 'Water', color: '#A8E6CF', rulingPlanet: 'Moon',
    traits: ['Tenacious', 'Imaginative', 'Loyal', 'Emotional']
  },
  {
    id: 'leo', name: 'Leo', symbol: '♌', emoji: '🦁', dateRange: 'Jul 23 - Aug 22',
    element: 'Fire', color: '#FFD93D', rulingPlanet: 'Sun',
    traits: ['Creative', 'Passionate', 'Generous', 'Warm-hearted']
  },
  {
    id: 'virgo', name: 'Virgo', symbol: '♍', emoji: '👧', dateRange: 'Aug 23 - Sep 22',
    element: 'Earth', color: '#6BCB77', rulingPlanet: 'Mercury',
    traits: ['Loyal', 'Analytical', 'Kind', 'Hardworking']
  },
  {
    id: 'libra', name: 'Libra', symbol: '♎', emoji: '⚖️', dateRange: 'Sep 23 - Oct 22',
    element: 'Air', color: '#FDA7DF', rulingPlanet: 'Venus',
    traits: ['Cooperative', 'Diplomatic', 'Gracious', 'Fair-minded']
  },
  {
    id: 'scorpio', name: 'Scorpio', symbol: '♏', emoji: '🦂', dateRange: 'Oct 23 - Nov 21',
    element: 'Water', color: '#C23B22', rulingPlanet: 'Mars/Pluto',
    traits: ['Resourceful', 'Brave', 'Passionate', 'Stubborn']
  },
  {
    id: 'sagittarius', name: 'Sagittarius', symbol: '♐', emoji: '🏹', dateRange: 'Nov 22 - Dec 21',
    element: 'Fire', color: '#AA96DA', rulingPlanet: 'Jupiter',
    traits: ['Generous', 'Idealistic', 'Great sense of humor', 'Philosophical']
  },
  {
    id: 'capricorn', name: 'Capricorn', symbol: '♑', emoji: '🐐', dateRange: 'Dec 22 - Jan 19',
    element: 'Earth', color: '#3D5A80', rulingPlanet: 'Saturn',
    traits: ['Responsible', 'Disciplined', 'Self-control', 'Good managers']
  },
  {
    id: 'aquarius', name: 'Aquarius', symbol: '♒', emoji: '🏺', dateRange: 'Jan 20 - Feb 18',
    element: 'Air', color: '#48CAE4', rulingPlanet: 'Saturn/Uranus',
    traits: ['Progressive', 'Original', 'Independent', 'Humanitarian']
  },
  {
    id: 'pisces', name: 'Pisces', symbol: '♓', emoji: '🐟', dateRange: 'Feb 19 - Mar 20',
    element: 'Water', color: '#B8B8FF', rulingPlanet: 'Jupiter/Neptune',
    traits: ['Compassionate', 'Artistic', 'Intuitive', 'Gentle']
  }
];

