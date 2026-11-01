import { calculateAshtakoot, AshtakootResult } from './koota-engine';
import { KundliData } from './kundli-generator';

export interface ManglikStatus {
  isManglik: boolean;
  houses: number[];
  intensity: 'High' | 'Medium' | 'None';
}

export interface CompatibilityResult extends AshtakootResult {
  boyManglik: ManglikStatus;
  girlManglik: ManglikStatus;
  isManglikMatch: boolean; // Does it cancel out?
  synergyScore: number; // Weighted combination of Gunas and Doshas
  expertAdvice: string;
}

/**
 * Calculates Manglik status based on Mars position in houses 1, 2, 4, 7, 8, 12.
 */
export function calculateManglikDosha(data: KundliData): ManglikStatus {
  const mars = data.planets.find(p => p.name === 'Mars');
  if (!mars) return { isManglik: false, houses: [], intensity: 'None' };

  const manglikHouses = [1, 2, 4, 7, 8, 12];
  const house = mars.house;

  if (manglikHouses.includes(house)) {
    // 7 and 8 are traditionally higher intensity
    const intensity = (house === 7 || house === 8) ? 'High' : 'Medium';
    return { isManglik: true, houses: [house], intensity };
  }

  return { isManglik: false, houses: [], intensity: 'None' };
}

/**
 * Professional Matching Wrapper
 */
export async function calculateProfessionalMatch(
  boyData: KundliData,
  girlData: KundliData
): Promise<CompatibilityResult> {
  // 1. Basic Ashtakoot (Gunas)
  const ashtakoot = calculateAshtakoot(
    { moonLongitude: boyData.planets.find(p => p.name === 'Moon')?.longitude, nakshatraName: boyData.planets.find(p => p.name === 'Moon')?.nakshatra || '' },
    { moonLongitude: girlData.planets.find(p => p.name === 'Moon')?.longitude, nakshatraName: girlData.planets.find(p => p.name === 'Moon')?.nakshatra || '' }
  );

  // 2. Manglik Dosha
  const boyManglik = calculateManglikDosha(boyData);
  const girlManglik = calculateManglikDosha(girlData);

  // 3. Manglik Neutralization (Cancellation)
  // Both Manglik or both Non-Manglik is generally a good match.
  const isManglikMatch = (boyManglik.isManglik === girlManglik.isManglik);

  // 4. Synergy Score (Weighted)
  // Gunas count for 70%, Manglik Match counts for 30%.
  let synergyScore = (ashtakoot.totalPoints / 36) * 70;
  if (isManglikMatch) synergyScore += 30;
  else if (boyManglik.intensity === 'High' || girlManglik.intensity === 'High') synergyScore += 5; // Major mismatch
  else synergyScore += 15; // Moderate mismatch

  // 5. Expert Advice
  let expertAdvice = '';
  if (!isManglikMatch) {
    expertAdvice = boyManglik.isManglik 
      ? 'Note: Boy has Manglik Dosha. Specific remedies for Mars are recommended.'
      : 'Note: Girl has Manglik Dosha. Specific remedies for Mars are recommended.';
  } else if (boyManglik.isManglik && girlManglik.isManglik) {
    expertAdvice = 'Both partners are Manglik. The Dosha is neutralized, making this a powerful union.';
  } else {
    expertAdvice = 'No Manglik Dosha detected in either chart.';
  }

  return {
    ...ashtakoot,
    boyManglik,
    girlManglik,
    isManglikMatch,
    synergyScore: Math.round(synergyScore),
    expertAdvice
  };
}
