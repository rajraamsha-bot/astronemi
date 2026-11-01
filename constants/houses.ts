/**
 * Houses Constants
 * 
 * Split from astrology.ts to reduce bundle size
 * Contains house (bhavas) data for astrology
 */

export const HOUSES = [
  { id: 1, name: 'First House', sanskrit: 'Lagan', keyword: 'Self', description: 'Physical appearance, personality, beginnings' },
  { id: 2, name: 'Second House', sanskrit: 'Dhan', keyword: 'Values', description: 'Finance, family, possessions' },
  { id: 3, name: 'Third House', sanskrit: 'Sahaj', keyword: 'Communication', description: 'Siblings, courage, efforts' },
  { id: 4, name: 'Fourth House', sanskrit: 'Sukha', keyword: 'Home', description: 'Mother, home, emotions' },
  { id: 5, name: 'Fifth House', sanskrit: 'Putra', keyword: 'Creativity', description: 'Children, romance, intelligence' },
  { id: 6, name: 'Sixth House', sanskrit: 'Shatru', keyword: 'Health', description: 'Enemies, diseases, service' },
  { id: 7, name: 'Seventh House', sanskrit: 'Kalatra', keyword: 'Partnership', description: 'Marriage, business partners' },
  { id: 8, name: 'Eighth House', sanskrit: 'Ayu', keyword: 'Transformation', description: 'Death, inheritance, secrets' },
  { id: 9, name: 'Ninth House', sanskrit: 'Bhagya', keyword: 'Fortune', description: 'Higher education, travel, luck' },
  { id: 10, name: 'Tenth House', sanskrit: 'Karma', keyword: 'Career', description: 'Profession, status, authority' },
  { id: 11, name: 'Eleventh House', sanskrit: 'Labha', keyword: 'Gains', description: 'Friends, income, aspirations' },
  { id: 12, name: 'Twelfth House', sanskrit: 'Vyaya', keyword: 'Loss', description: 'Spirituality, isolation, expenses' },
] as const;

export type HouseId = typeof HOUSES[number]['id'];

export const HOUSE_QUALITIES = {
  1: 'Angular',
  2: 'Cadent',
  3: 'Succedent',
  4: 'Angular',
  5: 'Cadent',
  6: 'Succedent',
  7: 'Angular',
  8: 'Cadent',
  9: 'Succedent',
  10: 'Angular',
  11: 'Cadent',
  12: 'Succedent',
} as const;

export const HOUSE_ELEMENTS = {
  1: 'Fire',
  2: 'Earth',
  3: 'Air',
  4: 'Water',
  5: 'Fire',
  6: 'Earth',
  7: 'Air',
  8: 'Water',
  9: 'Fire',
  10: 'Earth',
  11: 'Air',
  12: 'Water',
} as const;

export function getHouseById(id: number): typeof HOUSES[number] | undefined {
  return HOUSES.find(h => h.id === id);
}

export function getHouseQuality(houseId: number): string {
  return HOUSE_QUALITIES[houseId as keyof typeof HOUSE_QUALITIES] || 'Unknown';
}

export function getHouseElement(houseId: number): string {
  return HOUSE_ELEMENTS[houseId as keyof typeof HOUSE_ELEMENTS] || 'Unknown';
}

export default HOUSES;
