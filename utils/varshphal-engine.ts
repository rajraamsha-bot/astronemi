import { 
  calculateJulianDay, 
  calculateJulianCentury, 
  calculateSunPosition, 
  DateTime, 
   
} from './astronomy';
import { generateKundli, KundliData } from './kundli-generator';

export interface VarshphalResult {
  year: number;
  returnMoment: Date;
  munthaSign: string;
  munthaHouse: number;
  chartData: KundliData;
  yearlyThemes: string[];
}

/**
 * Normalizes angle to 0-360
 */
function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

/**
 * Iterative search to find the exact Solar Return moment
 */
async function findSolarReturn(
  natalSunLon: number, 
  targetYear: number, 
  birthMonth: number, 
  birthDay: number
): Promise<Date> {
  // Start window: Roughly the birthday noon in target year
  let currentMoment = new Date(targetYear, birthMonth - 1, birthDay, 12, 0, 0);
  
  // Use a binary-search style approach over +/- 2 days to find the match
  let low = currentMoment.getTime() - 48 * 60 * 60 * 1000;
  let high = currentMoment.getTime() + 48 * 60 * 60 * 1000;
  
  // Precision: 1 second
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    const testDate = new Date(mid);
    
    // Calculate Sun position at mid
    const dt: DateTime = {
      year: testDate.getFullYear(),
      month: testDate.getMonth() + 1,
      day: testDate.getDate(),
      hour: testDate.getHours(),
      minute: testDate.getMinutes(),
      second: testDate.getSeconds()
    };
    
    const jd = calculateJulianDay(dt, 5.5); // Use Indian standard default for calc
    const T = calculateJulianCentury(jd);
    const sunPos = calculateSunPosition(T);
    
    // Convert to sidereal (simplified ayanamsa for return match)
    // In a real elite engine, we'd use the precise Lahiri ayanamsa function
    const ayanamsa = 23.85 + (jd - 2451545) * 0.0000382;
    const currentSunLon = normalizeAngle(sunPos.longitude - ayanamsa);
    
    const diff = normalizeAngle(currentSunLon - natalSunLon);
    
    if (diff < 180) {
      if (diff < 0.00001) break; // Close enough precision
      high = mid;
    } else {
      low = mid;
    }
  }
  
  return new Date((low + high) / 2);
}

/**
 * Varshphal Generator
 */
export async function generateVarshphal(
  natalData: KundliData,
  targetYear: number
): Promise<VarshphalResult> {
  const natalSun = natalData.planets.find(p => p.name === 'Sun');
  const natalSunLon = natalSun?.longitude ?? 0;
  
  // 1. Find the Return Moment
  const returnMoment = await findSolarReturn(
    natalSunLon,
    targetYear,
    11, // Placeholder: Need real birth month
    19  // Placeholder: Need real birth day
  );


  // 2. Generate Chart for the Return Moment
  const chartData = await generateKundli(
    `Varshphal ${targetYear}`,
    `${returnMoment.getDate()}/${returnMoment.getMonth() + 1}/${returnMoment.getFullYear()}`,
    `${returnMoment.getHours()}:${returnMoment.getMinutes()}`,
    natalData.personalInfo.birthPlace || 'Pawan'
  );


  // 3. Calculate Muntha
  const birthYear = 1995; // Placeholder
  const yearsPassed = targetYear - birthYear;
  const munthaSignIndex = (natalData.ascendant.signIndex + yearsPassed) % 12;
  const SIGN_NAMES = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];
  const munthaSign = SIGN_NAMES[munthaSignIndex] || 'Mesha';

  // 4. Yearly Themes
  const themes = [
    `Muntha in ${munthaSign} indicates a year of ${yearsPassed % 2 === 0 ? 'steady growth' : 'dynamic changes'}.`,
    `Solar Return Ascendant is ${chartData.ascendant.sign}, suggesting focus on ${chartData.ascendant.signIndex < 6 ? 'personal development' : 'social relationships'}.`
  ];

  return {
    year: targetYear,
    returnMoment,
    munthaSign,
    munthaHouse: 1, // Simplified
    chartData,
    yearlyThemes: themes
  };
}
